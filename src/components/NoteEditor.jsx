import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Pin, Archive, ArchiveRestore, Trash2, Eye, Edit3, RotateCcw, CheckCircle2, Circle, Undo2, X } from 'lucide-react'
import TagBadge from './TagBadge'
import TagPicker from './TagPicker'
import DeadlinePicker from './DeadlinePicker'
import { formatFullTimestamp } from '../lib/dates'
import { completeNote } from '../lib/ai'
import AiMenu from './AiMenu'

function toggleChecklistLine(source, lineNumber) {
  if (!lineNumber) return source
  const lines = source.split('\n')
  const idx = lineNumber - 1
  if (idx < 0 || idx >= lines.length) return source
  if (/\[ \]/.test(lines[idx])) lines[idx] = lines[idx].replace('[ ]', '[x]')
  else if (/\[[xX]\]/.test(lines[idx])) lines[idx] = lines[idx].replace(/\[[xX]\]/, '[ ]')
  return lines.join('\n')
}

export default function NoteEditor({
  note, allTags, colorOf, onCreateTag, onDeleteTag,
  onChange, onTogglePin, onToggleDone, onArchive, onDelete, onRestore, onHardDelete,
}) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [preview, setPreview] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [aiUndo, setAiUndo] = useState(null)
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

  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => {
      if (title !== note.title || content !== note.content) onChange(note.id, { title, content })
    }, 400)
    return () => clearTimeout(t)
  }, [title, content]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Select a note to view or edit.</p>
      </div>
    )
  }

  async function handleAiRun(mode) {
    if (aiLoading) return
    const startedFor = note.id
    const startContent = contentRef.current
    setAiLoading(true); setAiError(null); setAiUndo(null)
    try {
      const { text, truncated } = await completeNote({ title, content: startContent, tags: note.tags || [], mode })
      if (noteIdRef.current !== startedFor) return
      const latest = contentRef.current
      let result
      if (mode === 'rewrite') {
        if (latest !== startContent) throw new Error('Note changed while AI was working. Try again.')
        result = text
      } else {
        const sep = latest.trim() ? (latest.endsWith('\n') ? '\n' : '\n\n') : ''
        result = latest + sep + text
      }
      setContent(result); setAiUndo({ previous: latest, result, mode, truncated }); setPreview(false)
    } catch (err) {
      if (noteIdRef.current === startedFor) setAiError(err.message || 'AI failed.')
    } finally {
      if (noteIdRef.current === startedFor) setAiLoading(false)
    }
  }

  function handleToggleTag(name, shouldAdd) {
    const current = note.tags || []
    const next = shouldAdd ? [...new Set([...current, name])] : current.filter((t) => t !== name)
    onChange(note.id, { tags: next })
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b gap-2 overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setPreview(false)} className={`btn-bw py-1.5 md:py-2 px-2.5 md:px-3 text-xs ${!preview ? '!bg-[var(--fg)] !text-[var(--bg)]' : ''}`}>
            <Edit3 size={14} /> <span className="hidden sm:inline">Edit</span>
          </button>
          <button onClick={() => setPreview(true)} className={`btn-bw py-1.5 md:py-2 px-2.5 md:px-3 text-xs ${preview ? '!bg-[var(--fg)] !text-[var(--bg)]' : ''}`}>
            <Eye size={14} /> <span className="hidden sm:inline">Preview</span>
          </button>
        </div>
        {note.trashed ? (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => onRestore(note.id)} className="btn-bw py-1.5 md:py-2 px-2.5 md:px-3 text-xs whitespace-nowrap"><RotateCcw size={14} /> Restore</button>
            <button onClick={() => { if (confirm('Delete permanently?')) onHardDelete(note.id) }} className="btn-bw py-1.5 md:py-2 px-2.5 md:px-3 text-xs whitespace-nowrap">Delete Forever</button>
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <AiMenu loading={aiLoading} onPick={handleAiRun} />
            <button onClick={() => onToggleDone(note.id)} className="btn-bw p-2" aria-label="Toggle done">
              {note.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>
            <button onClick={() => onTogglePin(note.id)} className="btn-bw p-2" aria-label="Pin">
              <Pin size={18} />
            </button>
            <button onClick={() => onArchive(note.id, !note.archived)} className="btn-bw p-2" aria-label="Archive">
              {note.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
            </button>
            <button onClick={() => onDelete(note.id)} className="btn-bw p-2" aria-label="Delete">
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className={`w-full bg-transparent text-2xl md:text-4xl font-semibold tracking-tight border-none outline-none placeholder:opacity-40 ${note.done ? 'line-through' : ''}`}
          style={{ color: 'var(--fg)' }}
        />
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          <span>Created {formatFullTimestamp(note.created_at)}</span>
          <span>Updated {formatFullTimestamp(note.updated_at)}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(note.tags || []).map((t) => (
            <TagBadge key={t} tag={t} color={colorOf(t)} onRemove={(name) => handleToggleTag(name, false)} />
          ))}
          <TagPicker allTags={allTags} selectedTags={note.tags || []} onToggle={handleToggleTag} onCreateTag={onCreateTag} onDeleteTag={onDeleteTag} />
          {note.deadline && !note.trashed && (
            <button onClick={() => onChange(note.id, { deadline: null })} className="p-1" style={{ color: 'var(--muted)' }}><X size={14} /></button>
          )}
          <DeadlinePicker deadline={note.deadline} done={note.done} onSet={(iso) => onChange(note.id, { deadline: iso })} onClear={() => onChange(note.id, { deadline: null })} />
        </div>

        {aiError && <p className="mt-3 text-sm" style={{ color: 'var(--fg)' }}>⚠ {aiError}</p>}
        {aiUndo && content === aiUndo.result && !aiError && (
          <div className="mt-3 flex items-center gap-3 text-sm" style={{ color: 'var(--muted)' }}>
            <span>AI made changes.</span>
            <button onClick={handleAiUndo} className="underline" style={{ color: 'var(--fg)' }}><Undo2 size={14} className="inline" /> Undo</button>
          </div>
        )}

        <div className="mt-8">
          {preview ? (
            <div className="md-preview">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  li: ({ node, children, ...props }) => {
                    const checked = node.checked
                    if (checked === null || checked === undefined) return <li {...props}>{children}</li>
                    const rest = Array.isArray(children) ? children.filter((c) => c?.type !== 'input') : children
                    return (
                      <li {...props} className="flex items-start gap-2 list-none -ml-5">
                        <input type="checkbox" checked={checked} onChange={() => setContent((c) => toggleChecklistLine(c, node.position?.start?.line))} className="mt-1.5" />
                        <span className={checked ? 'line-through' : ''} style={checked ? { color: 'var(--muted)' } : {}}>{rest}</span>
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
              placeholder="Start writing in Markdown..."
              className="w-full min-h-[50vh] bg-transparent resize-none border-none outline-none text-base leading-relaxed"
              style={{ color: 'var(--fg)' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
