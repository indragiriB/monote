// Supabase Edge Function behind the editor's AI button. It keeps the Gemini
// API key server-side (secret GEMINI_API_KEY) and only answers logged-in
// users (Supabase verifies the JWT by default).
//
// Reliability, because Gemini is often overloaded (503) or rate limited (429):
//   * each model is retried once with a short backoff,
//   * then it falls over to the next model (GEMINI_FALLBACK_MODELS),
//   * a model that no longer exists (404) is skipped,
//   * output that stops at the token limit is continued automatically, so
//     long answers are no longer cut off half way.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Mode = 'append' | 'rewrite'
type Msg = { role: 'user' | 'model'; parts: { text: string }[] }
type Attempt = { model: string; status: number; message: string }
type Result = { text: string; finishReason: string; model: string }

const COMMON_RULES = `Aturan umum:
- Tulis dalam bahasa yang SAMA dengan catatan pengguna.
- Format Markdown: judul kecil (##/###), daftar, tabel, dan blok kode bila membantu.
- Untuk contoh diagram, gunakan diagram teks (ASCII) di dalam blok kode. JANGAN pakai Mermaid, aplikasi ini tidak bisa menampilkannya.
- SETIAP penjelasan konsep WAJIB diikuti contoh konkret. Tulis dengan label "**Contoh:**" lalu contoh nyata (kasus sehari-hari, potongan kode, tabel, atau diagram teks), bukan sekadar mengulang definisi.
- Jangan beri kalimat pembuka, penutup, atau komentar tentang apa yang kamu lakukan.
- Jangan membungkus seluruh jawaban dalam blok kode.`

const SYSTEM_PROMPTS: Record<Mode, string> = {
  append: `Kamu adalah asisten penulis catatan belajar di aplikasi note-taking.
Tugas: LENGKAPI catatan pengguna.

- Keluarkan HANYA teks tambahan yang akan ditempel di bagian bawah catatan. Jangan mengulang isi yang sudah ada.
- Jika catatan berupa kerangka/daftar topik, cari topik yang belum dibahas atau masih tipis, lalu tulis lengkap, berurutan, satu per satu. Jangan ada topik yang dilewati.
- Jika catatan hanya judul atau sangat singkat, tulis catatan yang lengkap dari judul dan tag.
- Jika ada checklist (baris "- [ ] ..."), lanjutkan dengan item yang relevan, tetap berformat "- [ ] item".
- Jika ada penjelasan di catatan yang belum punya contoh, tambahkan contohnya di bagian tambahan ini dengan menyebut nama topiknya.

${COMMON_RULES}`,

  rewrite: `Kamu adalah asisten penulis catatan belajar di aplikasi note-taking.
Tugas: TULIS ULANG seluruh catatan menjadi catatan yang lengkap, rapi, dan mudah dipahami.

- Pertahankan SEMUA informasi, istilah, dan urutan topik dari catatan asli. Jangan menghapus atau meringkas apa pun.
- Jika catatan berupa kerangka/daftar topik, kembangkan SETIAP topik secara berurutan sampai tuntas. Sebelum selesai, periksa bahwa tidak ada topik yang terlewat.
- Isi bagian yang tipis atau salah. Jika ada kesalahan fakta, perbaiki.
- Jika sebuah penjelasan sudah punya contoh, pertahankan; jika contohnya kurang jelas, tambahkan satu lagi.
- Checklist "- [ ]" / "- [x]" harus dipertahankan apa adanya (jangan ubah status centang).
- Keluarkan HANYA isi catatan final. Jangan mengulang judul catatan sebagai judul besar (#).

${COMMON_RULES}`,
}

const CONTINUE_PROMPT =
  'Jawabanmu terpotong. Lanjutkan TEPAT dari kata terakhir tadi sampai selesai. Jangan mengulang bagian sebelumnya dan jangan beri kalimat pembuka.'

const RETRYABLE = new Set([429, 500, 502, 503, 504])
const MAX_ATTEMPTS_PER_MODEL = 2
const MAX_CONTINUATIONS = 3
const TOTAL_BUDGET_MS = 125_000 // Supabase caps an invocation at ~150 s
const PER_REQUEST_CAP_MS = 100_000
const MAX_OUTPUT_TOKENS = 16384 // generous: thinking models spend some of it on reasoning

class GeminiFailure extends Error {
  attempts: Attempt[]
  constructor(message: string, attempts: Attempt[]) {
    super(message)
    this.attempts = attempts
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryBaseMs() {
  const raw = Deno.env.get('AI_RETRY_BASE_MS') // only overridden in tests
  const n = raw === undefined ? NaN : Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : 1500
}

function googleMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw)
    const msg = parsed?.error?.message
    if (typeof msg === 'string' && msg) return msg.slice(0, 300)
  } catch {
    /* not JSON */
  }
  return raw.slice(0, 300)
}

/** One logical Gemini call: retries, then falls over to the next model. */
async function generate(
  models: string[],
  system: string,
  contents: Msg[],
  apiKey: string,
  deadline: number
): Promise<Result> {
  const attempts: Attempt[] = []

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      const remaining = deadline - Date.now()
      if (remaining < 4000) {
        throw new GeminiFailure('Waktu habis sebelum Gemini selesai menjawab.', attempts)
      }

      const controller = new AbortController()
      const timer = setTimeout(
        () => controller.abort(),
        Math.min(remaining - 2000, PER_REQUEST_CAP_MS)
      )

      let res: Response
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents,
              generationConfig: { temperature: 0.6, maxOutputTokens: MAX_OUTPUT_TOKENS },
            }),
            signal: controller.signal,
          }
        )
      } catch (err) {
        clearTimeout(timer)
        const aborted = err instanceof Error && err.name === 'AbortError'
        attempts.push({
          model,
          status: 0,
          message: aborted ? 'terlalu lama merespons' : String(err),
        })
        if (aborted) break // this model is too slow right now, try the next one
        if (attempt < MAX_ATTEMPTS_PER_MODEL) await sleep(retryBaseMs() * attempt)
        continue
      }
      clearTimeout(timer)

      if (!res.ok) {
        const message = googleMessage(await res.text())
        attempts.push({ model, status: res.status, message })
        if (res.status === 404) break // model retired/unknown: next model
        if (RETRYABLE.has(res.status)) {
          if (attempt < MAX_ATTEMPTS_PER_MODEL) {
            await sleep(retryBaseMs() * attempt + Math.random() * 400)
            continue
          }
          break
        }
        break // 400/401/403 etc: retrying the same model won't change anything
      }

      // deno-lint-ignore no-explicit-any
      const data: any = await res.json().catch(() => null)
      const cand = data?.candidates?.[0]
      const blockReason = data?.promptFeedback?.blockReason
      if (!cand && blockReason) {
        throw new GeminiFailure(`Isi catatan ditolak filter Gemini (${blockReason}).`, attempts)
      }
      const text: string = (cand?.content?.parts ?? [])
        // deno-lint-ignore no-explicit-any
        .filter((p: any) => !p.thought)
        // deno-lint-ignore no-explicit-any
        .map((p: any) => p.text ?? '')
        .join('')

      if (!text.trim()) {
        attempts.push({
          model,
          status: 200,
          message: `jawaban kosong (finishReason=${cand?.finishReason ?? 'tidak ada'})`,
        })
        if (attempt < MAX_ATTEMPTS_PER_MODEL) await sleep(retryBaseMs() * attempt)
        continue
      }

      return { text, finishReason: cand?.finishReason ?? 'STOP', model }
    }
  }

  throw new GeminiFailure('Semua model Gemini gagal.', attempts)
}

function describeFailure(err: GeminiFailure, models: string[]): string {
  const attempts = err.attempts
  if (attempts.length === 0) return err.message
  if (attempts.every((a) => a.status === 404)) {
    return (
      `Model Gemini tidak ditemukan (${models.join(', ')}). ` +
      `Set model yang masih aktif: supabase secrets set GEMINI_MODEL=gemini-flash-latest`
    )
  }
  const busy = attempts.every((a) => a.status === 0 || a.status === 200 || RETRYABLE.has(a.status) || a.status === 404)
  if (busy) {
    return (
      'Server Gemini sedang penuh atau dibatasi (banyak pengguna). Sudah dicoba ulang otomatis ' +
      'dengan beberapa model. Tunggu sekitar satu menit lalu coba lagi.'
    )
  }
  const last = attempts[attempts.length - 1]
  return `Gemini menolak request (${last.status}): ${last.message}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // `gemini-flash-latest` follows Google's newest Flash, so it survives a
  // specific version being retired. Pin one with GEMINI_MODEL, and list
  // backups (comma separated) in GEMINI_FALLBACK_MODELS.
  const primary = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-latest'
  const fallbacks = (Deno.env.get('GEMINI_FALLBACK_MODELS') ?? 'gemini-flash-lite-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
  const models = [primary, ...fallbacks.filter((m) => m !== primary)]

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY belum di-set di Supabase secrets.' }, 500)
    }

    const body = await req.json()
    const mode: Mode = body?.mode === 'rewrite' ? 'rewrite' : 'append'
    const title = String(body?.title ?? '').slice(0, 500)
    const content = String(body?.content ?? '').slice(0, 20000)
    const tags: string[] = Array.isArray(body?.tags) ? body.tags.slice(0, 20).map(String) : []

    if (!title.trim() && !content.trim()) {
      return json({ error: 'Catatan masih kosong. Tulis judul atau sedikit isi dulu.' }, 400)
    }

    const userText = [
      `Judul: ${title || '(tanpa judul)'}`,
      tags.length ? `Tag: ${tags.join(', ')}` : null,
      '',
      'Isi catatan saat ini:',
      content || '(masih kosong)',
    ]
      .filter((line) => line !== null)
      .join('\n')

    const system = SYSTEM_PROMPTS[mode]
    const baseContents: Msg[] = [{ role: 'user', parts: [{ text: userText }] }]
    const deadline = Date.now() + TOTAL_BUDGET_MS

    const first = await generate(models, system, baseContents, apiKey, deadline)
    let text = first.text
    let reason = first.finishReason
    // Keep using the model that just worked, others as backup.
    const ordered = [first.model, ...models.filter((m) => m !== first.model)]

    // Long answers can hit the output cap; ask the model to carry on.
    for (let pass = 0; reason === 'MAX_TOKENS' && pass < MAX_CONTINUATIONS; pass++) {
      try {
        const next = await generate(
          ordered,
          system,
          [
            ...baseContents,
            { role: 'model', parts: [{ text }] },
            { role: 'user', parts: [{ text: CONTINUE_PROMPT }] },
          ],
          apiKey,
          deadline
        )
        text += next.text
        reason = next.finishReason
      } catch {
        break // return what we already have, flagged as truncated below
      }
    }

    return json({ text: text.trim(), truncated: reason === 'MAX_TOKENS', model: first.model })
  } catch (err) {
    if (err instanceof GeminiFailure) {
      return json({ error: describeFailure(err, models), attempts: err.attempts }, 502)
    }
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
