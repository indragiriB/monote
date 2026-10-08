import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Pin, Archive, ArchiveRestore, Trash2, Eye, Edit3, RotateCcw, X, CheckCircle2, Circle, Sparkles, Loader2, Undo2 } from 'lucide-react'
import TagBadge from './TagBadge'
import TagPicker from './TagPicker'
import DeadlinePicker from './DeadlinePicker'
import { formatFullTimestamp } from '../lib/dates'
import { completeNote } from '../lib/ai'

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
  const [aiAdded, setAiAdded] = useState(null) // exact text AI appended, for Undo
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
    setAiAdded(null)
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
      <div className="flex-1 flex items-center justify-center text-ink-500 text-sm">
        Select or create a note to start writing.
      </div>
    )
  }

  async function handleAiComplete() {
    if (aiLoading) return
    const startedFor = note.id
    setAiLoading(true)
    setAiError(null)
    setAiAdded(null)
    try {
      const text = await completeNote({ title, content, tags: note.tags || [] })
      // The user may have switched notes while we waited — don't paste
      // this note's completion into a different one.
      if (noteIdRef.current !== startedFor) return
      const latest = contentRef.current
      const separator = latest.trim() ? (latest.endsWith('\n') ? '\n' : '\n\n') : ''
      const added = separator + text
      setContent(latest + added)
      setAiAdded(added)
      setPreview(false)
    } catch (err) {
      if (noteIdRef.current === startedFor) setAiError(err.message || 'AI gagal, coba lagi.')
    } finally {
      if (noteIdRef.current === startedFor) setAiLoading(false)
    }
  }

  function handleAiUndo() {
    if (!aiAdded) return
    // Only strip it if the text is still at the very end — if the user has
    // typed after the AI text, leave their note alone rather than guess.
    setContent((c) => (c.endsWith(aiAdded) ? c.slice(0, c.length - aiAdded.length) : c))
    setAiAdded(null)
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
      <div className="flex items-center justify-between border-b border-hair p-3 gap-1 flex-wrap">
        <div className="flex gap-1">
          <button
            onClick={() => setPreview(false)}
            className={`p-3 md:p-2 border border-hair ${!preview ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0' : ''}`}
            aria-label="Edit mode"
          >
            <Edit3 size={18} className="md:w-3.5 md:h-3.5" />
          </button>
          <button
            onClick={() => setPreview(true)}
            className={`p-3 md:p-2 border border-hair border-l-0 ${preview ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0' : ''}`}
            aria-label="Preview mode"
          >
            <Eye size={18} className="md:w-3.5 md:h-3.5" />
          </button>
        </div>

        {note.trashed ? (
          <div className="flex gap-1">
            <button
              onClick={() => onRestore(note.id)}
              className="flex items-center gap-1 px-3 py-3 md:px-2 md:py-2 border border-hair text-sm md:text-[11px] uppercase tracking-wide hover:bg-ink-950 dark:hover:bg-ink-100"
            >
              <RotateCcw size={18} className="md:w-3.5 md:h-3.5" /> Restore
            </button>
            <button
              onClick={handleHardDelete}
              className="flex items-center gap-1 px-3 py-3 md:px-2 md:py-2 border border-hair text-sm md:text-[11px] uppercase tracking-wide text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <Trash2 size={18} className="md:w-3.5 md:h-3.5" /> Delete Forever
            </button>
          </div>
        ) : (
          <div className="flex gap-1">
            <button
              onClick={handleAiComplete}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-3 md:px-2 md:py-2 border border-hair text-sm md:text-[11px] uppercase tracking-wide hover:bg-ink-0 hover:text-ink-1000 dark:hover:bg-ink-1000 dark:hover:text-ink-0 disabled:opacity-60"
              aria-label="Lengkapi catatan dengan AI"
            >
              {aiLoading ? (
                <Loader2 size={18} className="md:w-3.5 md:h-3.5 animate-spin" />
              ) : (
                <Sparkles size={18} className="md:w-3.5 md:h-3.5" />
              )}
              AI
            </button>
            <button
              onClick={() => onToggleDone(note.id)}
              className={`p-3 md:p-2 border border-hair ${
                note.done
                  ? 'bg-green-600 border-green-600 text-white dark:bg-green-700 dark:border-green-700'
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
              className={`p-3 md:p-2 border border-hair ${note.pinned ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0' : ''}`}
              aria-label="Pin note"
            >
              <Pin size={18} className="md:w-3.5 md:h-3.5" />
            </button>
            <button
              onClick={() => onArchive(note.id, !note.archived)}
              className={`p-3 md:p-2 border border-hair ${note.archived ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0' : ''}`}
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
              className="p-3 md:p-2 border border-hair"
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
        className={`px-4 pt-4 text-xl md:text-lg font-bold bg-transparent outline-none placeholder:text-ink-500 ${
          note.done ? 'line-through text-ink-500' : ''
        }`}
      />

      {/* Timestamps — created once, updated on every edit. */}
      <div className="px-4 pt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs md:text-[10px] uppercase tracking-wide text-ink-500">
        <span>Created: {formatFullTimestamp(note.created_at)}</span>
        <span>Updated: {formatFullTimestamp(note.updated_at)}</span>
      </div>

      <div className="px-4 pt-2 flex flex-wrap items-center gap-2">
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

      {(aiError || aiAdded) && (
        <div className="px-4 pt-2 flex items-center gap-3 text-sm md:text-xs">
          {aiError ? (
            <span className="text-red-600 dark:text-red-400">{aiError}</span>
          ) : (
            <>
              <span className="text-ink-500">AI menambahkan teks ke catatan.</span>
              <button
                onClick={handleAiUndo}
                className="flex items-center gap-1 underline hover:no-underline"
              >
                <Undo2 size={14} /> Undo
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {preview ? (
          <div className="md-preview">
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
            className="w-full h-full resize-none bg-transparent outline-none text-base md:text-sm leading-relaxed placeholder:text-ink-500"
          />
        )}
      </div>
    </div>
  )
}
