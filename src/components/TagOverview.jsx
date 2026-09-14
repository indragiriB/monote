import { useEffect, useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { countNotesByTag } from '../lib/noteQueries'
import { TAG_PALETTE } from '../lib/tagColors'

export default function TagOverview({ tags, onSelectTag, onUpdateTag, onDeleteTag }) {
  const [counts, setCounts] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#999999')

  useEffect(() => {
    let cancelled = false
    countNotesByTag(tags.map((t) => t.name)).then((c) => {
      if (!cancelled) setCounts(c)
    })
    return () => {
      cancelled = true
    }
  }, [tags])

  function startEdit(tag) {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  async function saveEdit(tag) {
    await onUpdateTag(tag.id, { name: editName, color: editColor })
    setEditingId(null)
  }

  function handleDelete(tag) {
    if (window.confirm(`Hapus tag "${tag.name}"? Tag ini akan dilepas dari semua note.`)) {
      onDeleteTag(tag.id, tag.name)
    }
  }

  if (tags.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-500 text-sm p-6 text-center">
        Belum ada tag. Buat tag lewat editor note untuk mulai mengelompokkan.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <p className="px-1 pb-2 text-xs md:text-[10px] uppercase tracking-widest text-ink-500">
        Kelompok berdasarkan tag
      </p>
      <div className="grid grid-cols-2 gap-px bg-ink-800 dark:bg-ink-200">
        {tags.map((tag) => {
          const isEditing = editingId === tag.id
          return (
            <div key={tag.id} className="relative bg-ink-1000 dark:bg-ink-0">
              {isEditing ? (
                <div className="p-3 space-y-2">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-hair px-2 py-1.5 md:py-1 bg-transparent outline-none text-sm md:text-xs"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {TAG_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className="w-6 h-6 md:w-5 md:h-5 rounded-full border-2"
                        style={{
                          backgroundColor: c,
                          borderColor: editColor === c ? '#000000' : 'transparent',
                        }}
                        aria-label={`Pilih warna ${c}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => saveEdit(tag)}
                      className="flex-1 flex items-center justify-center gap-1 border border-hair py-1.5 md:py-1 text-xs md:text-[10px] uppercase tracking-wide hover:bg-ink-0 hover:text-ink-1000 dark:hover:bg-ink-1000 dark:hover:text-ink-0"
                    >
                      <Check size={12} /> Simpan
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="border border-hair px-2 hover:bg-ink-950 dark:hover:bg-ink-100"
                      aria-label="Batal"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onSelectTag(tag.name)}
                    className="w-full text-left p-4 pr-14 hover:bg-ink-950 dark:hover:bg-ink-100"
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

                  {/* Siblings of the button above, not nested inside it —
                      a <button> can't validly contain another <button>. */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => startEdit(tag)}
                      className="p-1.5 border border-hair bg-ink-1000 dark:bg-ink-0 hover:bg-ink-950 dark:hover:bg-ink-100"
                      aria-label={`Edit tag ${tag.name}`}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(tag)}
                      className="p-1.5 border border-hair bg-ink-1000 dark:bg-ink-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      aria-label={`Hapus tag ${tag.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
