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
      <div className="flex-1 flex items-center justify-center p-3">
        <div className="dot-panel flex h-full min-h-[180px] w-full items-center justify-center rounded-[1.75rem] border border-hair p-6 text-center text-sm text-ink-500">
          Belum ada tag. Buat tag lewat editor note untuk mulai mengelompokkan.
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4">
      <p className="px-1 pb-3 dot-label text-[10px] text-ink-500">
        Kelompok berdasarkan tag
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {tags.map((tag) => {
          const isEditing = editingId === tag.id
          return (
            <div
              key={tag.id}
              className="relative overflow-hidden rounded-[1.4rem] border border-hair bg-white/45 dark:bg-white/[0.035] transition-colors hover:bg-white/70 dark:hover:bg-white/[0.07]"
            >
              {isEditing ? (
                <div className="p-3 space-y-2.5">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="glass-input w-full px-3 py-2 md:py-1.5 outline-none text-sm md:text-xs"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {TAG_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className="w-6 h-6 md:w-5 md:h-5 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          borderColor: editColor === c ? '#d71921' : 'transparent',
                          boxShadow: editColor === c ? '0 0 0 2px rgba(215, 25, 33, 0.2)' : undefined,
                        }}
                        aria-label={`Pilih warna ${c}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => saveEdit(tag)}
                      className="pill flex-1 py-1.5 md:py-1 text-[10px] uppercase tracking-[0.12em]"
                    >
                      <Check size={12} /> Simpan
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="icon-btn px-2"
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
                    className="w-full text-left p-4 pr-14"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color, boxShadow: `0 0 8px ${tag.color}66` }}
                      />
                      <span className="text-sm font-semibold truncate">{tag.name}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-500">{counts[tag.name] ?? 0} notes</p>
                  </button>

                  {/* Siblings of the button above, not nested inside it —
                      a <button> can't validly contain another <button>. */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => startEdit(tag)}
                      className="icon-btn p-1.5"
                      aria-label={`Edit tag ${tag.name}`}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(tag)}
                      className="icon-btn p-1.5 text-accent hover:border-accent/40 hover:bg-accent/10"
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
