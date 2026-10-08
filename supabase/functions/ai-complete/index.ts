// Supabase Edge Function: proxies "complete my note" requests to Gemini so
// the API key stays server-side (secret GEMINI_API_KEY) instead of being
// baked into the public JS bundle. Supabase verifies the caller's JWT by
// default, so only logged-in users of the app can hit this.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Kamu adalah asisten penulis catatan di aplikasi note-taking.
Tugasmu: melengkapi catatan pengguna.

Aturan:
- Tulis dalam bahasa yang SAMA dengan catatan pengguna.
- Keluarkan HANYA teks tambahan yang akan ditempel di bagian bawah catatan. Jangan ulangi isi yang sudah ada.
- Jika catatan hanya berisi judul atau sangat singkat, tulis isi catatan yang lengkap dan berguna berdasarkan judul/tag.
- Jika catatan sudah berisi tulisan, lanjutkan dan lengkapi bagian yang kurang dengan gaya yang sama.
- Jika catatan berisi checklist (baris "- [ ] ..."), lanjutkan checklist dengan item yang relevan, tetap format "- [ ] item".
- Gunakan format Markdown ringan (judul kecil, daftar, checklist) seperlunya.
- Jangan beri kata pembuka, penutup, atau penjelasan tentang apa yang kamu lakukan.`

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY belum di-set di Supabase secrets.' }, 500)
    }
    // `gemini-flash-latest` is Google's alias for the newest Flash model, so
    // this keeps working when a specific version is retired (the old default,
    // gemini-2.5-flash, started returning 404 once Google shut it down).
    // Pin a specific model any time with:
    //   supabase secrets set GEMINI_MODEL=<model-name>
    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-latest'

    const body = await req.json()
    const title = String(body?.title ?? '').slice(0, 500)
    const content = String(body?.content ?? '').slice(0, 12000)
    const tags: string[] = Array.isArray(body?.tags) ? body.tags.slice(0, 20).map(String) : []

    if (!title.trim() && !content.trim()) {
      return json({ error: 'Catatan masih kosong — tulis judul atau sedikit isi dulu.' }, 400)
    }

    const userText = [
      `Judul: ${title || '(tanpa judul)'}`,
      tags.length ? `Tag: ${tags.join(', ')}` : '',
      '',
      'Isi catatan saat ini:',
      content || '(masih kosong)',
    ]
      .filter((line, i) => line !== '' || i === 2)
      .join('\n')

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }],
          // Generous cap: thinking-capable models can spend part of the
          // budget on reasoning before they emit any visible text.
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      }
    )

    if (!res.ok) {
      const raw = await res.text()
      // Google's error body is JSON like {"error":{"message":"..."}} — show
      // that message instead of a bare status code so the cause is visible.
      let googleMessage = raw.slice(0, 300)
      try {
        googleMessage = JSON.parse(raw)?.error?.message ?? googleMessage
      } catch {
        /* not JSON — keep the raw snippet */
      }
      if (res.status === 404) {
        return json(
          {
            error:
              `Model "${model}" tidak ditemukan atau sudah dipensiunkan Google. ` +
              `Set model lain: supabase secrets set GEMINI_MODEL=gemini-flash-latest`,
            detail: googleMessage,
          },
          502
        )
      }
      return json({ error: `Gemini menolak request (${res.status}): ${googleMessage}` }, 502)
    }

    const data = await res.json()
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''

    if (!text.trim()) {
      return json({ error: 'Gemini tidak mengembalikan teks. Coba lagi.' }, 502)
    }
    return json({ text: text.trim() })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
