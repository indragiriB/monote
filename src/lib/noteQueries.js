import { db } from './localDb'
import { toDayKey } from './dates'

/**
 * Reads notes straight off the Dexie cursor: `orderBy('updated_at')` uses
 * the index (no full-table load just to sort), and `.filter()` runs the
 * predicate lazily per row as the cursor walks — combined with `.limit()`
 * it stops as soon as enough matches are found instead of pulling every
 * row into a JS array first. This is what makes it safe for a notes table
 * with thousands of rows instead of hundreds.
 */
export async function queryNotes({ filter = 'all', search = '', tag = null, day = null, limit = 30 }) {
  const q = search.trim().toLowerCase()

  const predicate = (n) => {
    if (filter === 'trashed') {
      if (!n.trashed) return false
    } else {
      if (n.trashed) return false
      if (filter === 'archived') {
        // Archived is its own bucket — pinned/done/etc. don't matter here,
        // only "is it archived".
        if (!n.archived) return false
      } else {
        // Every other view (all/pinned/grouped/calendar/done) is meant to
        // be the "active" set — an archived note shouldn't leak into any
        // of them just because it also happens to be pinned or done.
        if (n.archived) return false
        if (filter === 'pinned' && !n.pinned) return false
        if (filter === 'done' && !n.done) return false
      }
    }

    if (tag && !(n.tags || []).includes(tag)) return false
    if (day && (!n.deadline || toDayKey(n.deadline) !== day)) return false

    if (q) {
      const hit =
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(q))
      if (!hit) return false
    }
    return true
  }

  const collection = db.notes.orderBy('updated_at').reverse().filter(predicate)
  // Fetch one extra row to know whether another page exists without a
  // separate count() query.
  const rows = await collection.limit(limit + 1).toArray()
  return { items: rows.slice(0, limit), hasMore: rows.length > limit }
}

/** Note count per tag, for the "group by tag" overview — uses the
 * multi-entry index on `tags` instead of scanning every note. */
export async function countNotesByTag(tagNames) {
  const counts = {}
  await Promise.all(
    tagNames.map(async (name) => {
      counts[name] = await db.notes
        .where('tags')
        .equals(name)
        .filter((n) => !n.trashed && !n.archived)
        .count()
    })
  )
  return counts
}

/**
 * All non-trashed, non-archived notes with a deadline inside
 * [startIso, endIso) — uses the `deadline` index range, so a month view
 * only ever touches notes that actually fall in that month.
 */
export async function getDeadlinesInRange(startIso, endIso) {
  return db.notes
    .where('deadline')
    .between(startIso, endIso, true, false)
    .filter((n) => !n.trashed && !n.archived)
    .toArray()
}

/**
 * All upcoming (not yet passed), non-trashed, non-done notes with a
 * deadline — used to re-schedule reminders on app start via
 * lib/reminders.js, since neither the in-memory web timers nor a fresh
 * Android install's alarm table survive on their own.
 */
export async function getUpcomingDeadlines() {
  const nowIso = new Date().toISOString()
  return db.notes
    .where('deadline')
    .above(nowIso)
    .filter((n) => !n.trashed && !n.done)
    .toArray()
}
