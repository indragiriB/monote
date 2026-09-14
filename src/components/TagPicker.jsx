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
        className="inline-flex items-center gap-1 border border-hair px-2.5 py-1 md:px-2 md:py-0.5 text-xs md:text-[11px] uppercase tracking-wide hover:bg-ink-950 dark:hover:bg-ink-100"
      >
        <Plus size={14} className="md:w-[11px] md:h-[11px]" /> Tag
      </button>

      {open && (
        // Mobile: centered modal with backdrop (an `absolute` dropdown can
        // get clipped/pushed off-screen when the trigger sits near an
        // edge). Desktop (`md:`): normal inline dropdown under the trigger.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 md:absolute md:inset-auto md:z-50 md:mt-1 md:bg-transparent md:p-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false)
              setCreating(false)
            }
          }}
        >
          <div
            className="w-72 md:w-56 max-w-full border border-hair bg-ink-1000 dark:bg-ink-0 shadow-none max-h-[70vh] md:max-h-72 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {allTags.length === 0 && !creating && (
              <p className="px-3 py-3 text-sm md:text-xs text-ink-500">Belum ada tag.</p>
            )}

            {allTags.map((t) => {
              const active = selectedTags.includes(t.name)
              return (
                // A <div>, not a <button> — the delete action below needs
                // its own <button>, and a button can't validly nest one.
                <div
                  key={t.id}
                  className="w-full flex items-center gap-1 hover:bg-ink-950 dark:hover:bg-ink-100"
                >
                  <button
                    type="button"
                    onClick={() => onToggle(t.name, !active)}
                    className="flex-1 flex items-center justify-between gap-2 px-3 py-3 md:py-2 text-sm md:text-xs min-w-0"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 md:w-2 md:h-2 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="truncate">{t.name}</span>
                    </span>
                    {active && <Check size={16} className="md:w-3 md:h-3 shrink-0" />}
                  </button>
                  {onDeleteTag && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Hapus tag "${t.name}"? Tag ini akan dilepas dari semua note.`)) {
                          onDeleteTag(t.id, t.name)
                        }
                      }}
                      className="p-2 mr-1 text-ink-500 hover:text-red-600 dark:hover:text-red-400 shrink-0"
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
                    className="w-full border border-hair px-2 py-2 md:py-1 bg-transparent outline-none text-sm md:text-xs"
                  />
                  <div className="flex flex-wrap gap-2 md:gap-1.5">
                    {TAG_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className="w-7 h-7 md:w-5 md:h-5 rounded-full border-2"
                        style={{
                          backgroundColor: c,
                          borderColor: newColor === c ? '#000000' : 'transparent',
                        }}
                        aria-label={`Pilih warna ${c}`}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="w-full border border-hair py-2.5 md:py-1.5 text-sm md:text-[11px] uppercase tracking-wide hover:bg-ink-0 hover:text-ink-1000 dark:hover:bg-ink-1000 dark:hover:text-ink-0"
                  >
                    Tambah Tag
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-3 md:py-2 text-sm md:text-xs text-ink-500 hover:bg-ink-950 dark:hover:bg-ink-100"
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
