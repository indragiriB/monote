import { Pin, RotateCcw, Trash2, ArchiveRestore, CheckCircle2 } from 'lucide-react'
import TagBadge from './TagBadge'
import { formatRelative, formatDeadline, isDeadlineNear } from '../lib/dates'

function snippet(content = '', len = 90) {
  const plain = content.replace(/[#*_`>\-]/g, '').trim()
  return plain.length > len ? plain.slice(0, len) + '…' : plain
}

export default function NoteList({
  notes,
  activeId,
  onSelect,
  view = 'list',
  colorOf = () => '#999999',
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
  trashedView = false,
  onRestore,
  onHardDelete,
  archivedView = false,
  onUnarchive,
}) {
  if (notes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-500 text-sm">
        No notes here.
      </div>
    )
  }

  function handleHardDelete(id) {
    if (window.confirm('Hapus permanen? Tindakan ini tidak bisa dibatalkan.')) {
      onHardDelete(id)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div
        className={
          view === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-px bg-ink-800 dark:bg-ink-200'
            : 'flex flex-col'
        }
      >
        {notes.map((note) => {
          // A note that's done is never flagged as "near deadline" — it's
          // finished, so there's nothing left to be alarmed about.
          const near = !note.done && isDeadlineNear(note.deadline)
          return (
            // A <div> wrapper, not a <button> — the trashed-view action row
            // below needs its own <button>s, and nesting a <button> inside
            // a <button> is invalid HTML that browsers will silently
            // restructure (breaking the click targets).
            <div
              key={note.id}
              className={`border-hair ${view === 'grid' ? '' : 'border-b'} ${
                note.done
                  ? 'bg-green-50 dark:bg-green-950/40'
                  : near
                    ? 'bg-red-50 dark:bg-red-950/40'
                    : activeId === note.id
                      ? 'bg-ink-950 dark:bg-ink-100'
                      : 'bg-ink-1000 dark:bg-ink-0'
              }`}
            >
              <button
                onClick={() => onSelect(note.id)}
                className={`w-full text-left p-4 ${
                  note.done || near
                    ? ''
                    : activeId === note.id
                      ? ''
                      : 'hover:bg-ink-950 dark:hover:bg-ink-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={`text-base md:text-sm font-semibold truncate ${
                      note.done ? 'line-through text-ink-500' : ''
                    }`}
                  >
                    {note.title || 'Untitled'}
                  </h3>
                  <div className="flex items-center gap-1.5 md:gap-1 shrink-0 mt-0.5">
                    {note.done && (
                      <CheckCircle2 size={16} className="md:w-3 md:h-3 text-green-600 dark:text-green-400" />
                    )}
                    {note.pinned && <Pin size={16} className="md:w-3 md:h-3" />}
                  </div>
                </div>
                <p className="mt-1 text-sm md:text-xs text-ink-500 line-clamp-2">
                  {snippet(note.content)}
                </p>

                {note.deadline && (
                  <p
                    className={`mt-1 text-xs md:text-[10px] uppercase tracking-wide ${
                      near ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-ink-500'
                    }`}
                  >
                    {formatDeadline(note.deadline)}
                  </p>
                )}

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1 min-w-0">
                    {(note.tags || []).slice(0, 3).map((t) => (
                      <TagBadge key={t} tag={t} color={colorOf(t)} />
                    ))}
                  </div>
                  {!trashedView && (
                    <span className="text-xs md:text-[10px] text-ink-500 shrink-0">
                      {formatRelative(note.updated_at)}
                    </span>
                  )}
                </div>
              </button>

              {trashedView && (
                <div className="flex gap-2 px-4 pb-3 -mt-1">
                  <button
                    onClick={() => onRestore(note.id)}
                    className="flex-1 flex items-center justify-center gap-1 border border-hair py-2 md:py-1 text-xs md:text-[10px] uppercase tracking-wide hover:bg-ink-950 dark:hover:bg-ink-100"
                  >
                    <RotateCcw size={14} className="md:w-[11px] md:h-[11px]" /> Restore
                  </button>
                  <button
                    onClick={() => handleHardDelete(note.id)}
                    className="flex-1 flex items-center justify-center gap-1 border border-hair py-2 md:py-1 text-xs md:text-[10px] uppercase tracking-wide text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 size={14} className="md:w-[11px] md:h-[11px]" /> Delete
                  </button>
                </div>
              )}

              {archivedView && (
                <div className="flex gap-2 px-4 pb-3 -mt-1">
                  <button
                    onClick={() => onUnarchive(note.id)}
                    className="flex-1 flex items-center justify-center gap-1 border border-hair py-2 md:py-1 text-xs md:text-[10px] uppercase tracking-wide hover:bg-ink-950 dark:hover:bg-ink-100"
                  >
                    <ArchiveRestore size={14} className="md:w-[11px] md:h-[11px]" /> Unarchive
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isFetchingMore}
          className="m-3 border border-hair py-3 md:py-2 text-sm md:text-xs uppercase tracking-wide hover:bg-ink-950 dark:hover:bg-ink-100 disabled:opacity-50"
        >
          {isFetchingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
