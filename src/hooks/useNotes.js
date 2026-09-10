import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { db, queueMutation } from '../lib/localDb'
import { runSync, subscribeRealtime } from '../lib/sync'

/**
 * Notes are always read from and written to Dexie (IndexedDB) first, so the
 * UI never blocks on network. Every mutation is queued to `outbox` and
 * replayed against Supabase as soon as the app is back online.
 */
export function useNotes({ userId, filter = 'all', search = '' }) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notes', filter, search],
    queryFn: async () => {
      let collection = db.notes.orderBy('updated_at').reverse()
      let notes = await collection.toArray()

      if (filter === 'pinned') notes = notes.filter((n) => n.pinned && !n.trashed)
      else if (filter === 'archived') notes = notes.filter((n) => n.archived && !n.trashed)
      else if (filter === 'trashed') notes = notes.filter((n) => n.trashed)
      else notes = notes.filter((n) => !n.archived && !n.trashed)

      if (search.trim()) {
        const q = search.toLowerCase()
        notes = notes.filter(
          (n) =>
            n.title?.toLowerCase().includes(q) ||
            n.content?.toLowerCase().includes(q) ||
            (n.tags || []).some((t) => t.toLowerCase().includes(q))
        )
      }
      return notes
    },
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
      created_at: now,
      updated_at: now,
      dirty: 1,
    }
    await db.notes.put(note)
    await queueMutation('notes', 'insert', note)
    invalidate()
    runSync(userId)
    return note
  }

  async function updateNote(id, changes) {
    const existing = await db.notes.get(id)
    const updated = { ...existing, ...changes, updated_at: new Date().toISOString(), dirty: 1 }
    await db.notes.put(updated)
    await queueMutation('notes', 'update', updated)
    invalidate()
    runSync(userId)
    return updated
  }

  async function deleteNote(id, { hard = false } = {}) {
    if (hard) {
      await db.notes.delete(id)
      await queueMutation('notes', 'delete', { id })
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

  return {
    notes: query.data ?? [],
    isLoading: query.isLoading,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    refetch: invalidate,
  }
}
