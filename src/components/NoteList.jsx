import { Pin, RotateCcw, Trash2, ArchiveRestore, CheckCircle2 } from 'lucide-react'
import { formatRelative, formatDeadline, isDeadlineNear } from '../lib/dates'

function snippet(content = '', len = 120) {
  const plain = content.replace(/[#*_`>\-]/g, '').trim()
  return plain.length > len ? plain.slice(0, len) + '…' : plain
}

export default function NoteList({
  notes, activeId, onSelect, hasMore, isFetchingMore, onLoadMore,
  trashedView = false, onRestore, onHardDelete,
  archivedView = false, onUnarchive,
}) {
  if (notes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No notes yet.</p>
      </div>
    )
  }

  function handleHardDelete(id) {
    if (window.confirm('Delete permanently? This cannot be undone.')) onHardDelete(id)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {notes.map((note) => {
        const near = !note.done && isDeadlineNear(note.deadline)
        const active = activeId === note.id
        return (
          <div key={note.id} className={`note-row px-5 md:px-6 ${active ? 'active' : ''}`} onClick={() => onSelect(note.id)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`text-base font-medium truncate ${note.done ? 'line-through' : ''}`} style={{ color: note.done ? 'var(--muted)' : 'var(--fg)' }}>
                    {note.title || 'Untitled'}
                  </h3>
                  {note.pinned && <Pin size={14} style={{ color: 'var(--fg)' }} />}
                  {note.done && <CheckCircle2 size={14} style={{ color: 'var(--fg)' }} />}
                </div>
                {note.content && (
                  <p className="mt-1 text-sm line-clamp-2" style={{ color: 'var(--muted)' }}>{snippet(note.content)}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                  <span>{formatRelative(note.updated_at)}</span>
                  {note.deadline && <span style={{ color: near ? 'var(--fg)' : 'var(--muted)', fontWeight: near ? 500 : 400 }}>{formatDeadline(note.deadline)}</span>}
                </div>
              </div>
            </div>
            {trashedView && (
              <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onRestore(note.id)} className="btn-bw py-1.5 px-3 text-xs"><RotateCcw size={14} /> Restore</button>
                <button onClick={() => handleHardDelete(note.id)} className="btn-bw py-1.5 px-3 text-xs">Delete</button>
              </div>
            )}
            {archivedView && (
              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onUnarchive(note.id)} className="btn-bw py-1.5 px-3 text-xs"><ArchiveRestore size={14} /> Unarchive</button>
              </div>
            )}
          </div>
        )
      })}
      {hasMore && (
        <div className="p-4">
          <button onClick={onLoadMore} disabled={isFetchingMore} className="btn-bw w-full py-2.5 text-sm">
            {isFetchingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
