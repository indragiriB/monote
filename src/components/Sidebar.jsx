import { FileText, Pin, Archive, Trash2, Plus, Moon, Sun, X } from 'lucide-react'

const NAV_ITEMS = [
  { key: 'all', label: 'All Notes', icon: FileText },
  { key: 'pinned', label: 'Pinned', icon: Pin },
  { key: 'archived', label: 'Archived', icon: Archive },
  { key: 'trashed', label: 'Trash', icon: Trash2 },
]

export default function Sidebar({ filter, onFilterChange, onCreateNote, darkMode, onToggleDark, tags = [], activeTag, onTagSelect, onClose }) {
  return (
    <aside className="w-64 shrink-0 border-r border-hair h-full flex flex-col bg-ink-1000 dark:bg-ink-0">
      <div className="p-4 border-b border-hair flex items-center justify-between">
        <span className="text-sm font-bold tracking-widest uppercase">monote</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleDark}
            className="p-1 border border-hair hover:bg-ink-950 dark:hover:bg-ink-100"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 border border-hair hover:bg-ink-950 dark:hover:bg-ink-100 md:hidden"
              aria-label="Close menu"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onCreateNote}
        className="m-3 flex items-center justify-center gap-2 border border-hair py-2 text-xs uppercase tracking-wide hover:bg-ink-0 hover:text-ink-1000 dark:hover:bg-ink-1000 dark:hover:text-ink-0 transition-colors"
      >
        <Plus size={14} /> New Note
      </button>

      <nav className="flex-1 overflow-y-auto px-2">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`w-full flex items-center gap-2 px-2 py-2 text-xs uppercase tracking-wide text-left ${
              filter === key
                ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0'
                : 'hover:bg-ink-950 dark:hover:bg-ink-100'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}

        {tags.length > 0 && (
          <div className="mt-4 pt-3 border-t border-hair">
            <p className="px-2 pb-2 text-[10px] uppercase tracking-widest text-ink-500">Tags</p>
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagSelect(activeTag === tag ? null : tag)}
                className={`w-full text-left px-2 py-1.5 text-xs ${
                  activeTag === tag
                    ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0'
                    : 'hover:bg-ink-950 dark:hover:bg-ink-100'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </nav>
    </aside>
  )
}
