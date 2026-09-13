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
    <aside className="w-64 shrink-0 border-r border-hair h-full flex flex-col bg-ink-1000 dark:bg-ink-0">
      <div className="p-4 border-b border-hair flex items-center justify-between">
        <span className="text-base md:text-sm font-bold tracking-widest uppercase">monote</span>
        <div className="flex items-center gap-1.5 md:gap-1">
          <button
            onClick={onToggleDark}
            className="p-2 md:p-1 border border-hair hover:bg-ink-950 dark:hover:bg-ink-100"
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <Sun size={18} className="md:w-3.5 md:h-3.5" />
            ) : (
              <Moon size={18} className="md:w-3.5 md:h-3.5" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 md:p-1 border border-hair hover:bg-ink-950 dark:hover:bg-ink-100 md:hidden"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onCreateNote}
        className="m-3 flex items-center justify-center gap-2 border border-hair py-3 md:py-2 text-sm md:text-xs uppercase tracking-wide hover:bg-ink-0 hover:text-ink-1000 dark:hover:bg-ink-1000 dark:hover:text-ink-0 transition-colors"
      >
        <Plus size={18} className="md:w-3.5 md:h-3.5" /> New Note
      </button>

      <nav className="flex-1 overflow-y-auto px-2">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`w-full flex items-center gap-2.5 md:gap-2 px-2 py-3 md:py-2 text-sm md:text-xs uppercase tracking-wide text-left ${
              filter === key
                ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0'
                : 'hover:bg-ink-950 dark:hover:bg-ink-100'
            }`}
          >
            <Icon size={18} className="md:w-3.5 md:h-3.5 shrink-0" /> {label}
          </button>
        ))}

        {tags.length > 0 && (
          <div className="mt-4 pt-3 border-t border-hair">
            <p className="px-2 pb-2 text-xs md:text-[10px] uppercase tracking-widest text-ink-500">Tags</p>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onTagSelect(activeTag === tag.name ? null : tag.name)}
                className={`w-full flex items-center gap-2.5 md:gap-2 text-left px-2 py-2.5 md:py-1.5 text-sm md:text-xs ${
                  activeTag === tag.name
                    ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0'
                    : 'hover:bg-ink-950 dark:hover:bg-ink-100'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 md:w-2 md:h-2 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </nav>
    </aside>
  )
}
