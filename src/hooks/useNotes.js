import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { db, queueMutation } from '../lib/localDb'
import { runSync, subscribeRealtime } from '../lib/sync'
import { queryNotes } from '../lib/noteQueries'
import { scheduleDeadlineReminder, cancelDeadlineReminder } from '../lib/reminders'

const PAGE_SIZE = 30

/**
 * Notes are always read from and written to Dexie (IndexedDB) first, so the
 * UI never blocks on network. Every mutation is queued to `outbox` and
 * replayed against Supabase as soon as the app is back online.
 *
 * Reads are paginated: the first render only pulls PAGE_SIZE rows off the
 * Dexie cursor (see lib/noteQueries.js), not the entire notes table — that
 * used to be the bottleneck once a user has thousands of notes.
 */
export function useNotes({ userId, filter = 'all', search = '', tag = null, day = null }) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)

  // Any change to what we're viewing starts back at page 0.
  useEffect(() => setPage(0), [filter, search, tag, day])

  const query = useQuery({
    queryKey: ['notes', filter, search, tag, day, page],
    queryFn: () => queryNotes({ filter, search, tag, day, limit: PAGE_SIZE * (page + 1) }),
    keepPreviousData: true,
  })

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
    [queryClient]
  )

  useEffect(() => {
    if (!userId) return
    runSync(userId).then(invalidate)
    const unsubscribe = subscribeRealtime(userId, invalidate)
    const interval = setInterval(() => runSync(userId).then(invalidate), 20000)
    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [userId, invalidate])

  async function createNote(partial = {}) {
    const now = new Date().toISOString()
    const note = {
      id: uuid(),
      user_id: userId,
      title: partial.title ?? 'Untitled',
      content: partial.content ?? '',
      tags: partial.tags ?? [],
      pinned: false,
      archived: false,
      trashed: false,
      done: partial.done ?? false,
      deadline: partial.deadline ?? null,
      created_at: now,
      updated_at: now,
      dirty: 1,
    }
    await db.notes.put(note)
    await queueMutation('notes', 'insert', note)
    invalidate()
    runSync(userId)
    scheduleDeadlineReminder(note).catch(() => {})
    return note
  }

  async function updateNote(id, changes) {
    const existing = await db.notes.get(id)
    const updated = { ...existing, ...changes, updated_at: new Date().toISOString(), dirty: 1 }
    await db.notes.put(updated)
    await queueMutation('notes', 'update', updated)
    invalidate()
    runSync(userId)
    // Cheap to call unconditionally: it re-cancels+reschedules based on the
    // note's current deadline/done/trashed state either way, so it quietly
    // does nothing when none of those changed.
    scheduleDeadlineReminder(updated).catch(() => {})
    return updated
  }

  async function deleteNote(id, { hard = false } = {}) {
    if (hard) {
      await db.notes.delete(id)
      await queueMutation('notes', 'delete', { id })
      cancelDeadlineReminder(id).catch(() => {})
    } else {
      await updateNote(id, { trashed: true })
      return
    }
    invalidate()
    runSync(userId)
  }

  async function togglePin(id) {
    const existing = await db.notes.get(id)
    return updateNote(id, { pinned: !existing.pinned })
  }

  async function toggleDone(id) {
    const existing = await db.notes.get(id)
    return updateNote(id, { done: !existing.done })
  }

  return {
    notes: query.data?.items ?? [],
    hasMore: query.data?.hasMore ?? false,
    loadMore: () => setPage((p) => p + 1),
    isLoading: query.isLoading,
    isFetchingMore: query.isFetching && page > 0,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleDone,
    refetch: invalidate,
  }
}
