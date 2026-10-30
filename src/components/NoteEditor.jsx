import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Pin, Archive, ArchiveRestore, Trash2, Eye, Edit3, RotateCcw, X, CheckCircle2, Circle, Undo2 } from 'lucide-react'
import TagBadge from './TagBadge'
import TagPicker from './TagPicker'
import DeadlinePicker from './DeadlinePicker'
import { formatFullTimestamp } from '../lib/dates'
import { completeNote } from '../lib/ai'
import AiMenu from './AiMenu'

// Flips a single `- [ ]` / `- [x]` line in the raw Markdown source, used to
// make checklist items in Preview mode actually clickable instead of just
// rendered as static (disabled) checkboxes.
function toggleChecklistLine(source, lineNumber) {
  if (!lineNumber) return source
  const lines = source.split('\n')
  const idx = lineNumber - 1
  if (idx < 0 || idx >= lines.length) return source
  if (/\[ \]/.test(lines[idx])) {
    lines[idx] = lines[idx].replace('[ ]', '[x]')
  } else if (/\[[xX]\]/.test(lines[idx])) {
    lines[idx] = lines[idx].replace(/\[[xX]\]/, '[ ]')
  }
  return lines.join('\n')
}

export default function NoteEditor({
  note,
  allTags,
  colorOf,
  onCreateTag,
  onDeleteTag,
  onChange,
  onTogglePin,
  onToggleDone,
  onArchive,
  onDelete,
  onRestore,
  onHardDelete,
}) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [preview, setPreview] = useState(false)

  // AI completion (Gemini via the `ai-complete` Edge Function).
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  // { previous, result, mode, truncated } for the last AI change, powers Undo
  const [aiUndo, setAiUndo] = useState(null)
  // Refs so an in-flight AI request reads the *latest* content/note id when
  // it finishes, not whatever they were when the button was clicked.
  const contentRef = useRef(content)
  const noteIdRef = useRef(note?.id)
  contentRef.current = content
  noteIdRef.current = note?.id

  useEffect(() => {
    setTitle(note?.title ?? '')
    setContent(note?.content ?? '')
    setPreview(false)
    setAiLoading(false)
    setAiError(null)
    setAiUndo(null)
  }, [note?.id])

  // Debounced autosave so every keystroke doesn't hit Dexie/outbox.
  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => {
      if (title !== note.title || content !== note.content) {
        onChange(note.id, { title, content })
      }
    }, 400)
    return () => clearTimeout(t)
  }, [title, content]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="dot-panel flex h-full min-h-[180px] w-full items-center justify-center rounded-[2rem] border border-hair px-6 text-center text-sm text-ink-500">
          Select or create a note to start writing.
        </div>
      </div>
    )
  }

  async function handleAiRun(mode) {
    if (aiLoading) return
    const startedFor = note.id
    const startContent = contentRef.current
    setAiLoading(true)
    setAiError(null)
    setAiUndo(null)
    try {
      const { text, truncated } = await completeNote({
        title,
        content: startContent,
        tags: note.tags || [],
        mode,
      })
      // The user may have switched notes while we waited, so don't paste
      // this note's result into a different one.
      if (noteIdRef.current !== startedFor) return

      const latest = contentRef.current
      let result
      if (mode === 'rewrite') {
        // A rewrite replaces everything, so refuse if the note changed
        // while the AI was working rather than silently drop those edits.
        if (latest !== startContent) {
          throw new Error('Catatan berubah saat AI bekerja. Coba jalankan lagi.')
        }
        result = text
      } else {
        const separator = latest.trim() ? (latest.endsWith('\n') ? '\n' : '\n\n') : ''
        result = latest + separator + text
      }
      setContent(result)
      setAiUndo({ previous: latest, result, mode, truncated })
      setPreview(false)
    } catch (err) {
      if (noteIdRef.current === startedFor) setAiError(err.message || 'AI gagal, coba lagi.')
    } finally {
      if (noteIdRef.current === startedFor) setAiLoading(false)
    }
  }

  function handleAiUndo() {
    if (!aiUndo) return
    setContent(aiUndo.previous)
    setAiUndo(null)
  }

  function handleToggleTag(name, shouldAdd) {
    const current = note.tags || []
    const next = shouldAdd ? [...new Set([...current, name])] : current.filter((t) => t !== name)
    onChange(note.id, { tags: next })
  }

  function handleHardDelete() {
    if (window.confirm('Hapus permanen? Tindakan ini tidak bisa dibatalkan.')) {
      onHardDelete(note.id)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <div className="flex items-center justify-between border-b border-hair px-3 py-2.5 md:px-4 gap-1.5 flex-wrap bg-white/70 dark:bg-black/60 md:bg-white/30 md:dark:bg-white/[0.02] md:backdrop-blur-xl">
        <div className="pill p-0.5">
          <button
            onClick={() => setPreview(false)}
            className={`rounded-full p-3 md:p-2 transition-colors ${!preview ? 'pill-invert' : 'text-ink-500 hover:text-ink-0 dark:hover:text-ink-1000'}`}
            aria-label="Edit mode"
          >
            <Edit3 size={18} className="md:w-3.5 md:h-3.5" />
          </button>
          <button
            onClick={() => setPreview(true)}
            className={`rounded-full p-3 md:p-2 transition-colors ${preview ? 'pill-invert' : 'text-ink-500 hover:text-ink-0 dark:hover:text-ink-1000'}`}
            aria-label="Preview mode"
          >
            <Eye size={18} className="md:w-3.5 md:h-3.5" />
          </button>
        </div>

        {note.trashed ? (
          <div className="flex gap-1.5">
            <button
              onClick={() => onRestore(note.id)}
              className="pill px-3 py-3 md:px-3 md:py-2 text-sm md:text-[11px] uppercase tracking-[0.12em]"
            >
              <RotateCcw size={18} className="md:w-3.5 md:h-3.5" /> Restore
            </button>
            <button
              onClick={handleHardDelete}
              className="pill px-3 py-3 md:px-3 md:py-2 text-sm md:text-[11px] uppercase tracking-[0.12em] text-accent border-accent/30 hover:bg-accent/10"
            >
              <Trash2 size={18} className="md:w-3.5 md:h-3.5" /> Delete Forever
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <AiMenu loading={aiLoading} onPick={handleAiRun} />
            <button
              onClick={() => onToggleDone(note.id)}
              className={`icon-btn p-3 md:p-2 ${
                note.done
                  ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-600'
                  : ''
              }`}
              aria-label={note.done ? 'Mark as not done' : 'Mark as done'}
            >
              {note.done ? (
                <CheckCircle2 size={18} className="md:w-3.5 md:h-3.5" />
              ) : (
                <Circle size={18} className="md:w-3.5 md:h-3.5" />
              )}
            </button>
            <button
              onClick={() => onTogglePin(note.id)}
              className={`icon-btn p-3 md:p-2 ${note.pinned ? 'icon-btn-active' : ''}`}
              aria-label="Pin note"
            >
              <Pin size={18} className="md:w-3.5 md:h-3.5" />
            </button>
            <button
              onClick={() => onArchive(note.id, !note.archived)}
              className={`icon-btn p-3 md:p-2 ${note.archived ? 'icon-btn-active' : ''}`}
              aria-label={note.archived ? 'Unarchive note' : 'Archive note'}
            >
              {note.archived ? (
                <ArchiveRestore size={18} className="md:w-3.5 md:h-3.5" />
              ) : (
                <Archive size={18} className="md:w-3.5 md:h-3.5" />
              )}
            </button>
            <button
              onClick={() => onDelete(note.id)}
              className="icon-btn p-3 md:p-2 hover:text-accent hover:border-accent/40"
              aria-label="Move to trash"
            >
              <Trash2 size={18} className="md:w-3.5 md:h-3.5" />
            </button>
          </div>
        )}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        className={`px-5 pt-5 pb-1 text-2xl md:text-xl font-semibold tracking-tight bg-transparent outline-none placeholder:text-ink-500 ${
          note.done ? 'line-through text-ink-500' : ''
        }`}
      />

      {/* Timestamps — created once, updated on every edit. */}
      <div className="px-5 pt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-500">
        <span>Created: {formatFullTimestamp(note.created_at)}</span>
        <span>Updated: {formatFullTimestamp(note.updated_at)}</span>
      </div>

      <div className="px-5 pt-2.5 flex flex-wrap items-center gap-2">
        {(note.tags || []).map((t) => (
          <TagBadge key={t} tag={t} color={colorOf(t)} onRemove={(name) => handleToggleTag(name, false)} />
        ))}
        <TagPicker
          allTags={allTags}
          selectedTags={note.tags || []}
          onToggle={handleToggleTag}
          onCreateTag={onCreateTag}
          onDeleteTag={onDeleteTag}
        />

        {note.deadline && !note.trashed && (
          <button
            onClick={() => onChange(note.id, { deadline: null })}
            className="text-ink-500 opacity-70 hover:opacity-100 p-1"
            aria-label="Clear deadline"
          >
            <X size={16} className="md:w-[13px] md:h-[13px]" />
          </button>
        )}
        <DeadlinePicker
          deadline={note.deadline}
          done={note.done}
          onSet={(iso) => onChange(note.id, { deadline: iso })}
          onClear={() => onChange(note.id, { deadline: null })}
        />
      </div>

      {(aiError || (aiUndo && content === aiUndo.result)) && (
        <div className="px-4 pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm md:text-xs">
          {aiError ? (
            <span className="text-red-600 dark:text-red-400">{aiError}</span>
          ) : (
            <>
              <span className="text-ink-500">
                {aiUndo.mode === 'rewrite'
                  ? 'AI menulis ulang seluruh catatan.'
                  : 'AI menambahkan teks ke catatan.'}
              </span>
              <button
                onClick={handleAiUndo}
                className="flex items-center gap-1 underline hover:no-underline"
              >
                <Undo2 size={14} /> Undo
              </button>
              {aiUndo.truncated && (
                <span className="text-red-600 dark:text-red-400 w-full">
                  Hasil terlalu panjang dan terpotong. Pilih AI, Lengkapi catatan untuk melanjutkannya.
                </span>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {preview ? (
          <div className="md-preview min-h-full glass rounded-[1.5rem] p-4 md:p-6">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                li: ({ node, children, ...props }) => {
                  const checked = node.checked
                  if (checked === null || checked === undefined) {
                    return <li {...props}>{children}</li>
                  }
                  // remark-gfm renders its own disabled checkbox as the
                  // first child — drop it so ours is the only one shown.
                  const rest = Array.isArray(children)
                    ? children.filter((c) => c?.type !== 'input')
                    : children
                  return (
                    <li {...props} className="flex items-start gap-2 list-none -ml-5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setContent((c) => toggleChecklistLine(c, node.position?.start?.line))
                        }
                        className="mt-1 shrink-0"
                      />
                      <span className={checked ? 'line-through text-ink-500' : ''}>{rest}</span>
                    </li>
                  )
                },
              }}
            >
              {content || '*Nothing to preview.*'}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write in Markdown…"
            className="w-full h-full resize-none rounded-[1.5rem] border border-hair bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl p-4 md:p-5 outline-none text-base md:text-sm leading-relaxed placeholder:text-ink-500 focus:border-accent/40 transition-colors"
          />
        )}
      </div>
    </div>
  )
}
