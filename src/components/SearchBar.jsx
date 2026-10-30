import { Search, List, LayoutGrid } from 'lucide-react'

export default function SearchBar({ value, onChange, view, onViewChange }) {
  return (
    <div className="flex items-center gap-2 p-3 md:p-3.5 border-b border-hair min-w-0 overflow-hidden">
      <div className="glass-input flex-1 min-w-0 flex items-center gap-2 px-4 py-2.5 md:py-2">
        <Search size={17} className="md:w-4 md:h-4 text-ink-500 shrink-0" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search notes, tags..."
          className="flex-1 min-w-0 w-full bg-transparent outline-none text-base md:text-sm placeholder:text-ink-500"
        />
      </div>
      <div className="pill p-0.5 shrink-0">
        <button
          onClick={() => onViewChange('list')}
          className={`rounded-full p-2.5 md:p-2 transition-colors ${
            view === 'list' ? 'pill-invert' : 'text-ink-500 hover:text-ink-0 dark:hover:text-ink-1000'
          }`}
          aria-label="List view"
        >
          <List size={17} className="md:w-4 md:h-4" />
        </button>
        <button
          onClick={() => onViewChange('grid')}
          className={`rounded-full p-2.5 md:p-2 transition-colors ${
            view === 'grid' ? 'pill-invert' : 'text-ink-500 hover:text-ink-0 dark:hover:text-ink-1000'
          }`}
          aria-label="Grid view"
        >
          <LayoutGrid size={17} className="md:w-4 md:h-4" />
        </button>
      </div>
    </div>
  )
}
