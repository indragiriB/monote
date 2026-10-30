import { FileText, Pin, Archive, Trash2, Plus, Moon, Sun, X, Tags, CalendarDays, CheckCircle2 } from 'lucide-react'

const NAV_ITEMS = [
  { key: 'all', label: 'All Notes', icon: FileText },
  { key: 'pinned', label: 'Pinned', icon: Pin },
  { key: 'done', label: 'Done', icon: CheckCircle2 },
  { key: 'grouped', label: 'By Tag', icon: Tags },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'archived', label: 'Archived', icon: Archive },
  { key: 'trashed', label: 'Trash', icon: Trash2 },
]

export default function Sidebar({ filter, onFilterChange, onCreateNote, darkMode, onToggleDark, tags = [], activeTag, onTagSelect, onClose }) {
  return (
    <aside className="w-72 md:w-64 shrink-0 sidebar-glass rounded-r-[2rem] md:rounded-[2rem] h-full flex flex-col overflow-hidden">
      <div className="px-4 py-4 border-b border-hair flex items-center justify-between">
        <span className="dot-display text-2xl leading-none flex items-center gap-1.5 select-none">
          monote
          <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-glow" />
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleDark}
            className="icon-btn p-2"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="icon-btn p-2 md:hidden"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onCreateNote}
        className="pill pill-invert mx-3 mt-4 py-3 md:py-2.5 text-xs shadow-glass"
      >
        <Plus size={16} />
        <span className="dot-label text-[11px]">New Note</span>
      </button>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-left transition-colors ${
              filter === key
                ? 'pill-invert shadow-glass'
                : 'text-ink-500 hover:text-ink-0 dark:hover:text-ink-1000 hover:bg-white/45 dark:hover:bg-white/[0.06]'
            }`}
          >
            <Icon size={17} className="shrink-0" />
            <span className="dot-label text-[12px] leading-none">{label}</span>
            {filter === key && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
            )}
          </button>
        ))}

        {tags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-hair">
            <p className="px-3 pb-2 dot-label text-[10px] text-ink-500">Tags</p>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onTagSelect(activeTag === tag.name ? null : tag.name)}
                className={`w-full flex items-center gap-3 text-left px-3.5 py-2 rounded-full transition-colors ${
                  activeTag === tag.name
                    ? 'pill-invert shadow-glass'
                    : 'text-ink-500 hover:text-ink-0 dark:hover:text-ink-1000 hover:bg-white/45 dark:hover:bg-white/[0.06]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color, boxShadow: `0 0 8px ${tag.color}66` }}
                />
                <span className="truncate text-sm md:text-xs">{tag.name}</span>
                {activeTag === tag.name && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className="px-4 py-3.5 border-t border-hair flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="h-2 w-2 rounded-full bg-ink-0 dark:bg-ink-1000 opacity-80" />
        <span className="h-2 w-2 rounded-full bg-ink-400 opacity-40" />
        <span className="ml-auto dot-label text-[9px] text-ink-500">dot matrix</span>
      </div>
    </aside>
  )
}
