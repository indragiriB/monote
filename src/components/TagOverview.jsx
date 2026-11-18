import { useEffect, useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { countNotesByTag } from '../lib/noteQueries'
import { TAG_PALETTE } from '../lib/tagColors'

export default function TagOverview({ tags, onSelectTag, onUpdateTag, onDeleteTag }) {
  const [counts, setCounts] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#999999')

  useEffect(() => {
    let cancelled = false
    countNotesByTag(tags.map((t) => t.name)).then((c) => { if (!cancelled) setCounts(c) })
    return () => { cancelled = true }
  }, [tags])

  function startEdit(tag) { setEditingId(tag.id); setEditName(tag.name); setEditColor(tag.color) }
  async function saveEdit(tag) { await onUpdateTag(tag.id, { name: editName, color: editColor }); setEditingId(null) }
  function handleDelete(tag) { if (window.confirm(`Delete tag "${tag.name}"?`)) onDeleteTag(tag.id, tag.name) }

  if (tags.length === 0) {
    return <div className="flex-1 flex items-center justify-center p-8"><p className="text-sm" style={{ color: 'var(--muted)' }}>No tags yet.</p></div>
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-sm font-medium uppercase tracking-wider mb-6" style={{ color: 'var(--muted)' }}>Tags</h2>
      <div className="grid grid-cols-2 gap-4">
        {tags.map((tag) => {
          const isEditing = editingId === tag.id
          return (
            <div key={tag.id} className="border p-4" style={{ borderColor: 'var(--border)' }}>
              {isEditing ? (
                <div className="space-y-3">
                  <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="input-line text-sm" />
                  <div className="flex flex-wrap gap-1.5">
                    {TAG_PALETTE.map((c) => (
                      <button key={c} type="button" onClick={() => setEditColor(c)} className="w-6 h-6 border-2" style={{ backgroundColor: c, borderColor: editColor === c ? 'var(--fg)' : 'transparent' }} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(tag)} className="btn-bw-solid flex-1 py-1.5 text-xs"><Check size={14} /> Save</button>
                    <button onClick={() => setEditingId(null)} className="btn-bw px-2"><X size={14} /></button>
                  </div>
                </div>
              ) : (
                <div>
                  <button onClick={() => onSelectTag(tag.name)} className="w-full text-left">
                    <span className="text-base font-medium" style={{ color: 'var(--fg)' }}>{tag.name}</span>
                    <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{counts[tag.name] ?? 0} notes</p>
                  </button>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => startEdit(tag)} className="btn-bw py-1 px-2 text-xs"><Pencil size={12} /></button>
                    <button onClick={() => handleDelete(tag)} className="btn-bw py-1 px-2 text-xs">Delete</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
