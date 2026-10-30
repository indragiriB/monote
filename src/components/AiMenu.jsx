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
        className="pill flex items-center gap-1.5 px-3 py-3 md:px-2.5 md:py-2 text-sm md:text-[11px] uppercase tracking-[0.12em] text-ink-500 disabled:opacity-60"
        aria-label="Menu AI"
        aria-expanded={open}
      >
        {loading ? (
          <Loader2 size={18} className="md:w-3.5 md:h-3.5 animate-spin text-accent" />
        ) : (
          <Sparkles size={18} className="md:w-3.5 md:h-3.5 text-accent" />
        )}
        AI
      </button>

      {open && (
        // Mobile: centered modal with a backdrop (an `absolute` dropdown can be
        // pushed off-screen near an edge). Desktop (`md:`): dropdown under the
        // button, right-aligned so it never runs past the editor's right edge.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:absolute md:inset-auto md:right-0 md:top-full md:mt-1 md:bg-transparent md:backdrop-blur-none md:p-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            className="glass-strong w-80 md:w-72 max-w-full rounded-[1.75rem] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {OPTIONS.map(({ mode, icon: Icon, title, desc }, i) => (
              <button
                key={mode}
                type="button"
                onClick={() => pick(mode)}
                className={`w-full text-left px-4 py-3.5 hover:bg-white/50 dark:hover:bg-white/[0.06] transition-colors ${
                  i > 0 ? 'border-t border-hair' : ''
                }`}
              >
                <span className="flex items-center gap-2 text-sm md:text-xs font-bold">
                  <Icon size={16} className="md:w-3.5 md:h-3.5 shrink-0 text-accent" /> {title}
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
