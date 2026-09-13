import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { db, queueMutation } from '../lib/localDb'
import { runSync } from '../lib/sync'
import { nextTagColor } from '../lib/tagColors'

export function useTags(userId) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['tags'],
    queryFn: () => db.tags.orderBy('name').toArray(),
  })

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
    [queryClient]
  )

  async function createTag(name, color) {
    const trimmed = name.trim()
    if (!trimmed) return null

    const existing = query.data?.find((t) => t.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing

    const tag = {
      id: uuid(),
      user_id: userId,
      name: trimmed,
      color: color || nextTagColor(query.data?.length ?? 0),
      created_at: new Date().toISOString(),
      dirty: 1,
    }
    await db.tags.put(tag)
    await queueMutation('tags', 'insert', tag)
    invalidate()
    runSync(userId)
    return tag
  }

  async function deleteTag(id, name) {
    await db.tags.delete(id)
    await queueMutation('tags', 'delete', { id })

    // Best-effort cleanup: strip this tag out of any local notes that
    // reference it by name so the UI doesn't show a colorless orphan tag.
    const affected = await db.notes.where('tags').equals(name).toArray()
    await Promise.all(
      affected.map((n) =>
        db.notes.update(n.id, { tags: (n.tags || []).filter((t) => t !== name) })
      )
    )

    invalidate()
    queryClient.invalidateQueries({ queryKey: ['notes'] })
    runSync(userId)
  }

  const colorOf = useCallback(
    (name) => query.data?.find((t) => t.name === name)?.color || '#999999',
    [query.data]
  )

  return {
    tags: query.data ?? [],
    isLoading: query.isLoading,
    createTag,
    deleteTag,
    colorOf,
  }
}
