import { Search, List, LayoutGrid } from 'lucide-react'

export default function SearchBar({ value, onChange, view, onViewChange }) {
  return (
    <div className="flex items-center gap-2 p-3 border-b border-hair">
      <div className="flex-1 flex items-center gap-2 border border-hair px-3 py-2">
        <Search size={14} className="text-ink-500" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search notes, tags..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-500"
        />
      </div>
      <div className="flex border border-hair">
        <button
          onClick={() => onViewChange('list')}
          className={`p-2 ${view === 'list' ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0' : ''}`}
          aria-label="List view"
        >
          <List size={14} />
        </button>
        <button
          onClick={() => onViewChange('grid')}
          className={`p-2 border-l border-hair ${view === 'grid' ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0' : ''}`}
          aria-label="Grid view"
        >
          <LayoutGrid size={14} />
        </button>
      </div>
    </div>
  )
}
