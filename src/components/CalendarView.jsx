import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, ListChecks, Pin, CheckCircle2 } from 'lucide-react'
import { getDeadlinesInRange } from '../lib/noteQueries'
import { toDayKey, isOverdue, isDeadlineNear } from '../lib/dates'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function daysInMonth(year, month) {
  const count = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1))
}

export default function CalendarView({ onSelectDay, onCreateNote, onOpenNote }) {
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  const [byDay, setByDay] = useState({})

  useEffect(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    let cancelled = false
    getDeadlinesInRange(start.toISOString(), end.toISOString()).then((notes) => {
      if (cancelled) return
      const map = {}
      notes.forEach((n) => { const key = toDayKey(n.deadline); if (!map[key]) map[key] = []; map[key].push(n) })
      Object.values(map).forEach((list) => list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)))
      setByDay(map)
    })
    return () => { cancelled = true }
  }, [cursor])

  const days = daysInMonth(cursor.getFullYear(), cursor.getMonth())
  const todayKey = toDayKey(new Date())

  async function addEvent(date, kind) {
    const deadline = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0).toISOString()
    const note = kind === 'checklist' ? await onCreateNote({ title: 'Checklist', content: '- [ ] ', deadline }) : await onCreateNote({ deadline })
    onOpenNote(note.id)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="btn-bw p-2"><ChevronLeft size={20} /></button>
        <span className="text-lg font-medium" style={{ color: 'var(--fg)' }}>{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="btn-bw p-2"><ChevronRight size={20} /></button>
      </div>
      <div className="flex flex-col gap-3">
        {days.map((date) => {
          const key = toDayKey(date)
          const notesForDay = byDay[key] || []
          const isToday = key === todayKey
          return (
            <div key={key} className="border p-4" style={{ borderColor: isToday ? 'var(--fg)' : 'var(--border)' }}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <button onClick={() => onSelectDay(key)} className="text-sm font-medium underline-offset-4 hover:underline" style={{ color: 'var(--fg)' }}>
                  {WEEKDAYS[date.getDay()]}, {date.getDate()}{isToday ? ' (Today)' : ''}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => addEvent(date, 'note')} className="btn-bw py-1 px-2 text-xs"><Plus size={12} /> Note</button>
                  <button onClick={() => addEvent(date, 'checklist')} className="btn-bw py-1 px-2 text-xs"><ListChecks size={12} /> List</button>
                </div>
              </div>
              {notesForDay.length > 0 && (
                <div className="flex flex-col gap-2">
                  {notesForDay.map((note) => (
                    <button key={note.id} onClick={() => onOpenNote(note.id)} className="text-left text-sm py-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}>
                      <span className={note.done ? 'line-through' : ''}>{note.title || 'Untitled'}</span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {new Date(note.deadline).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
