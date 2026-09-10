import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Pin, Archive, Trash2, Eye, Edit3, X } from 'lucide-react'
import TagBadge from './TagBadge'

export default function NoteEditor({ note, onChange, onTogglePin, onArchive, onDelete }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [tagInput, setTagInput] = useState('')
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    setTitle(note?.title ?? '')
    setContent(note?.content ?? '')
    setPreview(false)
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

  function addTag(e) {
    e.preventDefault()
    const t = tagInput.trim().replace(/^#/, '')
    if (t && !(note.tags || []).includes(t)) {
      onChange(note.id, { tags: [...(note.tags || []), t] })
    }
    setTagInput('')
  }

  function removeTag(tag) {
    onChange(note.id, { tags: (note.tags || []).filter((t) => t !== tag) })
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between border-b border-hair p-3">
        <div className="flex gap-1">
          <button
            onClick={() => setPreview(false)}
            className={`p-2 border border-hair ${!preview ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0' : ''}`}
            aria-label="Edit mode"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => setPreview(true)}
            className={`p-2 border border-hair border-l-0 ${preview ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0' : ''}`}
            aria-label="Preview mode"
          >
            <Eye size={14} />
          </button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onTogglePin(note.id)}
            className={`p-2 border border-hair ${note.pinned ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0' : ''}`}
            aria-label="Pin note"
          >
            <Pin size={14} />
          </button>
          <button onClick={() => onArchive(note.id)} className="p-2 border border-hair" aria-label="Archive note">
            <Archive size={14} />
          </button>
          <button onClick={() => onDelete(note.id)} className="p-2 border border-hair" aria-label="Delete note">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        className="px-4 pt-4 text-lg font-bold bg-transparent outline-none placeholder:text-ink-500"
      />

      <div className="px-4 pt-2 flex flex-wrap items-center gap-2">
        {(note.tags || []).map((t) => (
          <TagBadge key={t} tag={t} onRemove={removeTag} />
        ))}
        <form onSubmit={addTag} className="flex items-center">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="+tag"
            className="w-16 bg-transparent outline-none text-[11px] uppercase tracking-wide placeholder:text-ink-500"
          />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {preview ? (
          <div className="md-preview">
            <ReactMarkdown>{content || '*Nothing to preview.*'}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write in Markdown…"
            className="w-full h-full resize-none bg-transparent outline-none text-sm leading-relaxed placeholder:text-ink-500"
          />
        )}
      </div>
    </div>
  )
}
