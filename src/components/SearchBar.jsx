import { Search, List, LayoutGrid } from 'lucide-react'

export default function SearchBar({ value, onChange, view, onViewChange }) {
  return (
    <div className="flex items-center gap-2 p-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search notes..."
          className="input-field pl-9 py-2"
        />
      </div>
      <div className="flex items-center rounded-lg p-0.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <button
          onClick={() => onViewChange('list')}
          className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-white dark:bg-neutral-700 shadow-sm' : ''}`}
          style={{ color: view === 'list' ? 'var(--text)' : 'var(--muted)' }}
          aria-label="List view"
        >
          <List size={18} />
        </button>
        <button
          onClick={() => onViewChange('grid')}
          className={`p-2 rounded-md transition-colors ${view === 'grid' ? 'bg-white dark:bg-neutral-700 shadow-sm' : ''}`}
          style={{ color: view === 'grid' ? 'var(--text)' : 'var(--muted)' }}
          aria-label="Grid view"
        >
          <LayoutGrid size={18} />
        </button>
      </div>
    </div>
  )
}
