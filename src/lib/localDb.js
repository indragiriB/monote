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

// v2: adds a multi-entry index on notes.tags (the `*` prefix) so we can
// query/count "which notes have tag X" directly via the index instead of
// scanning every row in JS — needed for the tag overview counts and for
// filtering by tag without loading the whole table.
db.version(2).stores({
  notes: 'id, title, pinned, archived, trashed, updated_at, dirty, *tags',
  tags: 'id, name, dirty',
  outbox: '++id, entity, op, payload, created_at',
})

// v3: adds a `deadline` index — notes without a deadline are simply left
// out of it (IndexedDB skips undefined indexed fields), so range queries
// over "notes due in this month" only ever touch notes that actually have
// one set.
db.version(3).stores({
  notes: 'id, title, pinned, archived, trashed, updated_at, dirty, *tags, deadline',
  tags: 'id, name, dirty',
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
