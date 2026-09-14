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

  async function updateTag(id, changes) {
    const existing = query.data?.find((t) => t.id === id) ?? (await db.tags.get(id))
    if (!existing) return null

    const trimmedName = typeof changes.name === 'string' ? changes.name.trim() : undefined
    if (trimmedName !== undefined) {
      if (!trimmedName) return existing
      const clash = query.data?.find(
        (t) => t.id !== id && t.name.toLowerCase() === trimmedName.toLowerCase()
      )
      if (clash) return existing // name taken by another tag — no-op rather than silently merging
    }

    const updated = {
      ...existing,
      ...changes,
      ...(trimmedName !== undefined ? { name: trimmedName } : {}),
      dirty: 1,
    }
    await db.tags.put(updated)
    await queueMutation('tags', 'update', updated)

    // Renaming needs to ripple into every note that references the old
    // name, since notes store tags by name, not by id.
    if (trimmedName !== undefined && trimmedName !== existing.name) {
      const affected = await db.notes.where('tags').equals(existing.name).toArray()
      await Promise.all(
        affected.map((n) =>
          db.notes.update(n.id, {
            tags: (n.tags || []).map((t) => (t === existing.name ? trimmedName : t)),
          })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    }

    invalidate()
    runSync(userId)
    return updated
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
    updateTag,
    deleteTag,
    colorOf,
  }
}
