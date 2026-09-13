import { supabase } from './supabaseClient'
import { db } from './localDb'
import { scheduleDeadlineReminder, cancelDeadlineReminder } from './reminders'

let syncing = false
let channel = null

/**
 * `dirty` (and any other purely-local bookkeeping field) only exists in
 * Dexie — Supabase's `notes`/`tags` tables have no such column, so it must
 * never be sent in an upsert payload or PostgREST rejects the whole row.
 */
function toRemotePayload(payload) {
  const { dirty, ...remote } = payload
  return remote
}

/** Push every queued local mutation to Supabase, oldest first. */
export async function pushOutbox() {
  if (!navigator.onLine) return
  const jobs = await db.outbox.orderBy('created_at').toArray()

  for (const job of jobs) {
    try {
      if (job.entity === 'notes') {
        if (job.op === 'delete') {
          const { error } = await supabase.from('notes').delete().eq('id', job.payload.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('notes').upsert(toRemotePayload(job.payload))
          if (error) throw error
        }
      } else if (job.entity === 'tags') {
        if (job.op === 'delete') {
          const { error } = await supabase.from('tags').delete().eq('id', job.payload.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('tags').upsert(toRemotePayload(job.payload))
          if (error) throw error
        }
      }
      await db.outbox.delete(job.id)
      // Local copy is now confirmed synced.
      if (job.entity === 'notes' && job.op !== 'delete') {
        await db.notes.update(job.payload.id, { dirty: 0 })
      }
      if (job.entity === 'tags' && job.op !== 'delete') {
        await db.tags.update(job.payload.id, { dirty: 0 })
      }
    } catch (err) {
      // Leave the job queued; it'll retry on the next pushOutbox() call
      // (network event, app resume, or the polling interval). Supabase
      // errors carry a real `.message` — log it instead of the raw
      // exception object so the actual reason shows up in devtools.
      console.error('[sync] gagal push job:', job.entity, job.op, err?.message || err)
      break
    }
  }
}

/** Pull remote rows, but never clobber a local edit that's still waiting
 * in the outbox — otherwise a slow/failed push followed by a pull would
 * silently overwrite unsynced local changes with the older server copy. */
export async function pullRemote(userId) {
  if (!navigator.onLine || !userId) return

  const pendingNoteIds = new Set(
    (await db.outbox.where('entity').equals('notes').toArray()).map((j) => j.payload.id)
  )
  const { data: notes, error: notesErr } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
  if (!notesErr && notes) {
    const safeToApply = notes.filter((n) => !pendingNoteIds.has(n.id))
    await db.notes.bulkPut(safeToApply.map((n) => ({ ...n, dirty: 0 })))
  }

  const pendingTagIds = new Set(
    (await db.outbox.where('entity').equals('tags').toArray()).map((j) => j.payload.id)
  )
  const { data: tags, error: tagsErr } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)
  if (!tagsErr && tags) {
    const safeToApply = tags.filter((t) => !pendingTagIds.has(t.id))
    await db.tags.bulkPut(safeToApply.map((t) => ({ ...t, dirty: 0 })))
  }
}

export async function runSync(userId) {
  if (syncing) return
  syncing = true
  try {
    await pushOutbox()
    await pullRemote(userId)
  } finally {
    syncing = false
  }
}

/** Subscribe to Supabase Realtime so other devices' edits show up live. */
export function subscribeRealtime(userId, onChange) {
  if (channel) supabase.removeChannel(channel)
  channel = supabase
    .channel('notes-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${userId}` },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          await db.notes.delete(payload.old.id)
          cancelDeadlineReminder(payload.old.id).catch(() => {})
        } else {
          const pending = await db.outbox
            .where('entity')
            .equals('notes')
            .and((j) => j.payload.id === payload.new.id)
            .first()
          if (!pending) {
            await db.notes.put({ ...payload.new, dirty: 0 })
            // A deadline change made on another device still needs a local
            // reminder scheduled on this one.
            scheduleDeadlineReminder(payload.new).catch(() => {})
          }
        }
        onChange?.()
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tags', filter: `user_id=eq.${userId}` },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          await db.tags.delete(payload.old.id)
        } else {
          const pending = await db.outbox
            .where('entity')
            .equals('tags')
            .and((j) => j.payload.id === payload.new.id)
            .first()
          if (!pending) await db.tags.put({ ...payload.new, dirty: 0 })
        }
        onChange?.()
      }
    )
    .subscribe()

  return () => {
    if (channel) supabase.removeChannel(channel)
    channel = null
  }
}

// Fire a sync whenever connectivity returns.
window.addEventListener('online', () => {
  const uid = supabase.auth.getUser().then((r) => r.data.user?.id)
  uid.then((id) => id && runSync(id))
})
