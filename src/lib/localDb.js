import Dexie from 'dexie'

// Local-first store. Every write lands here immediately; a background
// sync job pushes rows to Supabase and pulls remote changes back in.
// `dirty` marks rows with local changes not yet confirmed synced.
export const db = new Dexie('monote')

db.version(1).stores({
  notes: 'id, title, pinned, archived, trashed, updated_at, dirty',
  tags: 'id, name, dirty',
  // Simple outbox for offline mutations (create/update/delete) replayed on reconnect.
  outbox: '++id, entity, op, payload, created_at',
})

export async function queueMutation(entity, op, payload) {
  await db.outbox.add({
    entity,
    op, // 'insert' | 'update' | 'delete'
    payload,
    created_at: Date.now(),
  })
}
