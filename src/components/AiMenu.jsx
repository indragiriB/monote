import { useEffect, useRef, useState } from 'react'
import { Sparkles, Loader2, Plus, RefreshCw } from 'lucide-react'

const OPTIONS = [
  {
    mode: 'append',
    icon: Plus,
    title: 'Lengkapi catatan',
    desc: 'Tambah bagian yang kurang di bawah catatan. Tiap penjelasan diberi contoh.',
  },
  {
    mode: 'rewrite',
    icon: RefreshCw,
    title: 'Tulis ulang lengkap + contoh',
    desc: 'Kembangkan seluruh catatan sampai tuntas, tiap penjelasan ada contohnya. Bisa di-Undo.',
  },
]

export default function AiMenu({ loading, onPick }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function pick(mode) {
    setOpen(false)
    onPick(mode)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-3 md:px-2 md:py-2 border border-hair text-sm md:text-[11px] uppercase tracking-wide hover:bg-ink-0 hover:text-ink-1000 dark:hover:bg-ink-1000 dark:hover:text-ink-0 disabled:opacity-60"
        aria-label="Menu AI"
        aria-expanded={open}
      >
        {loading ? (
          <Loader2 size={18} className="md:w-3.5 md:h-3.5 animate-spin" />
        ) : (
          <Sparkles size={18} className="md:w-3.5 md:h-3.5" />
        )}
        AI
      </button>

      {open && (
        // Mobile: centered modal with a backdrop (an `absolute` dropdown can be
        // pushed off-screen near an edge). Desktop (`md:`): dropdown under the
        // button, right-aligned so it never runs past the editor's right edge.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 md:absolute md:inset-auto md:right-0 md:top-full md:mt-1 md:bg-transparent md:p-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            className="w-80 md:w-72 max-w-full border border-hair bg-ink-1000 dark:bg-ink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {OPTIONS.map(({ mode, icon: Icon, title, desc }, i) => (
              <button
                key={mode}
                type="button"
                onClick={() => pick(mode)}
                className={`w-full text-left px-3 py-3 hover:bg-ink-950 dark:hover:bg-ink-100 ${
                  i > 0 ? 'border-t border-hair' : ''
                }`}
              >
                <span className="flex items-center gap-2 text-sm md:text-xs font-bold">
                  <Icon size={16} className="md:w-3.5 md:h-3.5 shrink-0" /> {title}
                </span>
                <span className="mt-1 block text-xs md:text-[11px] text-ink-500 normal-case tracking-normal">
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
