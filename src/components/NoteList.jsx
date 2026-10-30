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
      <div className="flex-1 flex items-center justify-center p-3">
        <div className="dot-panel flex h-full min-h-[180px] w-full items-center justify-center rounded-[1.75rem] border border-hair text-sm text-ink-500">
          No notes here.
        </div>
      </div>
    )
  }

  function handleHardDelete(id) {
    if (window.confirm('Hapus permanen? Tindakan ini tidak bisa dibatalkan.')) {
      onHardDelete(id)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-2.5">
      <div
        className={
          view === 'grid'
            ? 'grid grid-cols-2 xl:grid-cols-3 gap-2.5'
            : 'flex flex-col gap-2.5'
        }
      >
        {notes.map((note) => {
          // A note that's done is never flagged as "near deadline" — it's
          // finished, so there's nothing left to be alarmed about.
          const near = !note.done && isDeadlineNear(note.deadline)
          const active = activeId === note.id
          return (
            // A <div> wrapper, not a <button> — the trashed-view action row
            // below needs its own <button>s, and nesting a <button> inside
            // a <button> is invalid HTML that browsers will silently
            // restructure (breaking the click targets).
            <div
              key={note.id}
              className={`relative overflow-hidden rounded-[1.4rem] border transition-colors duration-200 ${
                note.done
                  ? 'border-emerald-500/25 bg-emerald-500/10'
                  : near
                    ? 'border-accent/40 bg-accent/[0.07]'
                    : active
                      ? 'border-accent/50 bg-white/75 dark:bg-white/[0.1] shadow-glass ring-1 ring-accent/15'
                      : 'border-hair bg-white/45 dark:bg-white/[0.035] hover:bg-white/70 dark:hover:bg-white/[0.07]'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full bg-accent shadow-glow" />
              )}
              <button
                onClick={() => onSelect(note.id)}
                className="w-full text-left p-4 md:p-3.5"
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
                      <CheckCircle2 size={16} className="md:w-3.5 md:h-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {note.pinned && (
                      <Pin size={16} className="md:w-3.5 md:h-3.5 text-accent" />
                    )}
                  </div>
                </div>
                <p className="mt-1.5 text-sm md:text-xs text-ink-500 line-clamp-2 leading-relaxed">
                  {snippet(note.content)}
                </p>

                {note.deadline && (
                  <p
                    className={`mt-1.5 text-[11px] md:text-[10px] uppercase tracking-[0.12em] ${
                      near ? 'text-accent font-semibold' : 'text-ink-500'
                    }`}
                  >
                    {formatDeadline(note.deadline)}
                  </p>
                )}

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1 min-w-0">
                    {(note.tags || []).slice(0, 3).map((t) => (
                      <TagBadge key={t} tag={t} color={colorOf(t)} />
                    ))}
                  </div>
                  {!trashedView && (
                    <span className="text-[10px] md:text-[9px] uppercase tracking-[0.1em] text-ink-500 shrink-0">
                      {formatRelative(note.updated_at)}
                    </span>
                  )}
                </div>
              </button>

              {trashedView && (
                <div className="flex gap-2 px-3 pb-3 -mt-1">
                  <button
                    onClick={() => onRestore(note.id)}
                    className="pill flex-1 py-2 md:py-1.5 text-[11px] md:text-[10px] uppercase tracking-[0.12em]"
                  >
                    <RotateCcw size={14} className="md:w-[12px] md:h-[12px]" /> Restore
                  </button>
                  <button
                    onClick={() => handleHardDelete(note.id)}
                    className="pill flex-1 py-2 md:py-1.5 text-[11px] md:text-[10px] uppercase tracking-[0.12em] text-accent hover:bg-accent/10 border-accent/30"
                  >
                    <Trash2 size={14} className="md:w-[12px] md:h-[12px]" /> Delete
                  </button>
                </div>
              )}

              {archivedView && (
                <div className="flex gap-2 px-3 pb-3 -mt-1">
                  <button
                    onClick={() => onUnarchive(note.id)}
                    className="pill flex-1 py-2 md:py-1.5 text-[11px] md:text-[10px] uppercase tracking-[0.12em]"
                  >
                    <ArchiveRestore size={14} className="md:w-[12px] md:h-[12px]" /> Unarchive
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
          className="pill mt-3 py-3 md:py-2.5 text-xs disabled:opacity-50"
        >
          <span className="dot-label text-[10px]">{isFetchingMore ? 'Loading…' : 'Load more'}</span>
        </button>
      )}
    </div>
  )
}
