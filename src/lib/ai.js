import { supabase } from './supabaseClient'

/**
 * Asks the `ai-complete` Supabase Edge Function (which holds the Gemini API
 * key server-side) to continue/fill in the note. Resolves with the text that
 * should be appended; throws an Error with a human-readable message.
 */
export async function completeNote({ title, content, tags }) {
  if (!navigator.onLine) {
    throw new Error('Fitur AI butuh koneksi internet.')
  }

  const { data, error } = await supabase.functions.invoke('ai-complete', {
    body: { title, content, tags },
  })

  if (error) {
    // For non-2xx responses supabase-js puts the raw Response on
    // error.context — pull our function's own message out of it if present.
    let message = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      /* body wasn't JSON — keep the generic message */
    }
    throw new Error(message)
  }

  if (data?.error) throw new Error(data.error)
  if (!data?.text) throw new Error('AI tidak mengembalikan teks.')
  return data.text
}
