import { useEffect, useRef, useState } from 'react'
import { Plus, Check, Trash2 } from 'lucide-react'
import { TAG_PALETTE, nextTagColor } from '../lib/tagColors'

export default function TagPicker({ allTags, selectedTags = [], onToggle, onCreateTag, onDeleteTag }) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(() => nextTagColor(allTags.length))
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    const tag = await onCreateTag(newName, newColor)
    if (tag) onToggle(tag.name, true)
    setNewName('')
    setNewColor(nextTagColor(allTags.length + 1))
    setCreating(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pill inline-flex items-center gap-1 px-2.5 py-1 md:px-2 md:py-0.5 text-xs md:text-[11px] uppercase tracking-[0.1em] text-ink-500"
      >
        <Plus size={14} className="md:w-[11px] md:h-[11px]" /> Tag
      </button>

      {open && (
        // Mobile: centered modal with backdrop (an `absolute` dropdown can
        // get clipped/pushed off-screen when the trigger sits near an
        // edge). Desktop (`md:`): normal inline dropdown under the trigger.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:absolute md:inset-auto md:z-50 md:mt-1 md:bg-transparent md:backdrop-blur-none md:p-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false)
              setCreating(false)
            }
          }}
        >
          <div
            className="glass-strong w-72 md:w-56 max-w-full rounded-[1.75rem] max-h-[70vh] md:max-h-72 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {allTags.length === 0 && !creating && (
              <p className="px-4 py-4 text-sm md:text-xs text-ink-500">Belum ada tag.</p>
            )}

            {allTags.map((t) => {
              const active = selectedTags.includes(t.name)
              return (
                // A <div>, not a <button> — the delete action below needs
                // its own <button>, and a button can't validly nest one.
                <div
                  key={t.id}
                  className="w-full flex items-center gap-1 hover:bg-white/50 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onToggle(t.name, !active)}
                    className="flex-1 flex items-center justify-between gap-2 px-4 py-3 md:py-2 text-sm md:text-xs min-w-0"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 md:w-2 md:h-2 rounded-full shrink-0"
                        style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}66` }}
                      />
                      <span className="truncate">{t.name}</span>
                    </span>
                    {active && <Check size={16} className="md:w-3 md:h-3 shrink-0 text-accent" />}
                  </button>
                  {onDeleteTag && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Hapus tag "${t.name}"? Tag ini akan dilepas dari semua note.`)) {
                          onDeleteTag(t.id, t.name)
                        }
                      }}
                      className="p-2 mr-2 text-ink-500 hover:text-accent shrink-0"
                      aria-label={`Hapus tag ${t.name}`}
                    >
                      <Trash2 size={14} className="md:w-3 md:h-3" />
                    </button>
                  )}
                </div>
              )
            })}

            <div className="border-t border-hair">
              {creating ? (
                <form onSubmit={handleCreate} className="p-3 space-y-2.5 md:space-y-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nama tag baru"
                    className="glass-input w-full px-3 py-2 md:py-1.5 outline-none text-sm md:text-xs"
                  />
                  <div className="flex flex-wrap gap-2 md:gap-1.5">
                    {TAG_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className="w-7 h-7 md:w-5 md:h-5 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          borderColor: newColor === c ? '#d71921' : 'transparent',
                          boxShadow: newColor === c ? '0 0 0 2px rgba(215, 25, 33, 0.2)' : undefined,
                        }}
                        aria-label={`Pilih warna ${c}`}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="pill pill-invert w-full py-2.5 md:py-1.5 text-[10px] uppercase tracking-[0.12em]"
                  >
                    Tambah Tag
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 md:py-2 text-sm md:text-xs text-ink-500 hover:bg-white/50 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <Plus size={16} className="md:w-3 md:h-3" /> Buat tag baru
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
