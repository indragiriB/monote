import { Pin } from 'lucide-react'
import TagBadge from './TagBadge'

function snippet(content = '', len = 90) {
  const plain = content.replace(/[#*_`>\-]/g, '').trim()
  return plain.length > len ? plain.slice(0, len) + '…' : plain
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function NoteList({ notes, activeId, onSelect, view = 'list' }) {
  if (notes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-500 text-sm">
        No notes here.
      </div>
    )
  }

  return (
    <div
      className={
        view === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px bg-ink-800 dark:bg-ink-200 overflow-y-auto flex-1'
          : 'flex flex-col overflow-y-auto flex-1'
      }
    >
      {notes.map((note) => (
        <button
          key={note.id}
          onClick={() => onSelect(note.id)}
          className={`text-left p-4 bg-ink-1000 dark:bg-ink-0 border-hair ${
            view === 'grid' ? '' : 'border-b'
          } ${activeId === note.id ? 'bg-ink-950 dark:bg-ink-100' : 'hover:bg-ink-950 dark:hover:bg-ink-100'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold truncate">{note.title || 'Untitled'}</h3>
            {note.pinned && <Pin size={12} className="shrink-0 mt-0.5" />}
          </div>
          <p className="mt-1 text-xs text-ink-500 line-clamp-2">{snippet(note.content)}</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {(note.tags || []).slice(0, 3).map((t) => (
                <TagBadge key={t} tag={t} />
              ))}
            </div>
            <span className="text-[10px] text-ink-500">{formatDate(note.updated_at)}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
