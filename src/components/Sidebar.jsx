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
    <aside
      className="w-72 md:w-64 h-full flex flex-col shrink-0"
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      <div className="px-5 py-4 flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
          monote
        </span>
        <div className="flex items-center gap-1">
          <button onClick={onToggleDark} className="btn btn-ghost p-2 rounded-lg" aria-label="Toggle theme">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {onClose && (
            <button onClick={onClose} className="btn btn-ghost p-2 rounded-lg md:hidden" aria-label="Close menu">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        <button onClick={onCreateNote} className="btn btn-primary w-full py-2.5">
          <Plus size={18} />
          New Note
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`sidebar-item ${filter === key ? 'active' : ''}`}
          >
            <Icon size={18} className="shrink-0" />
            <span>{label}</span>
          </button>
        ))}

        {tags.length > 0 && (
          <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Tags
            </p>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onTagSelect(activeTag === tag.name ? null : tag.name)}
                className={`sidebar-item ${activeTag === tag.name ? 'active' : ''}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="truncate">{tag.name}</span>
              </button>
            ))}
          </div>
        )}
      </nav>
    </aside>
  )
}
