import { useEffect, useState } from 'react'
import { countNotesByTag } from '../lib/noteQueries'

export default function TagOverview({ tags, onSelectTag }) {
  const [counts, setCounts] = useState({})

  useEffect(() => {
    let cancelled = false
    countNotesByTag(tags.map((t) => t.name)).then((c) => {
      if (!cancelled) setCounts(c)
    })
    return () => {
      cancelled = true
    }
  }, [tags])

  if (tags.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-500 text-sm p-6 text-center">
        Belum ada tag. Buat tag lewat editor note untuk mulai mengelompokkan.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <p className="px-1 pb-2 text-[10px] uppercase tracking-widest text-ink-500">
        Kelompok berdasarkan tag
      </p>
      <div className="grid grid-cols-2 gap-px bg-ink-800 dark:bg-ink-200">
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onSelectTag(tag.name)}
            className="bg-ink-1000 dark:bg-ink-0 p-4 text-left hover:bg-ink-950 dark:hover:bg-ink-100"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="text-sm font-semibold truncate">{tag.name}</span>
            </div>
            <p className="mt-1 text-xs text-ink-500">{counts[tag.name] ?? 0} notes</p>
          </button>
        ))}
      </div>
    </div>
  )
}
