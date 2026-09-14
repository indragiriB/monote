import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, ListChecks, Pin, CheckCircle2 } from 'lucide-react'
import { getDeadlinesInRange } from '../lib/noteQueries'
import { toDayKey, isOverdue, isDeadlineNear } from '../lib/dates'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function daysInMonth(year, month) {
  const count = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1))
}

/**
 * Google-Calendar-style vertical agenda: every day of the month gets its
 * own row (not a compact month grid), you scroll down through them, and
 * each row lets you add an "event" — which here is just a regular note or
 * a checklist note, both seeded with that day as their deadline.
 */
export default function CalendarView({ onSelectDay, onCreateNote, onOpenNote }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [byDay, setByDay] = useState({})

  useEffect(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    let cancelled = false
    getDeadlinesInRange(start.toISOString(), end.toISOString()).then((notes) => {
      if (cancelled) return
      const map = {}
      notes.forEach((n) => {
        const key = toDayKey(n.deadline)
        if (!map[key]) map[key] = []
        map[key].push(n)
      })
      Object.values(map).forEach((list) =>
        list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      )
      setByDay(map)
    })
    return () => {
      cancelled = true
    }
  }, [cursor])

  const days = daysInMonth(cursor.getFullYear(), cursor.getMonth())
  const todayKey = toDayKey(new Date())

  async function addEvent(date, kind) {
    const deadline = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      9,
      0
    ).toISOString()
    const note =
      kind === 'checklist'
        ? await onCreateNote({ title: 'Checklist', content: '- [ ] ', deadline })
        : await onCreateNote({ deadline })
    onOpenNote(note.id)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b border-hair bg-ink-1000 dark:bg-ink-0">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="p-2 md:p-1.5 border border-hair"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} className="md:w-3.5 md:h-3.5" />
        </button>
        <span className="text-sm md:text-xs font-bold uppercase tracking-widest">
          {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="p-2 md:p-1.5 border border-hair"
          aria-label="Next month"
        >
          <ChevronRight size={18} className="md:w-3.5 md:h-3.5" />
        </button>
      </div>

      <div className="flex flex-col">
        {days.map((date) => {
          const key = toDayKey(date)
          const notesForDay = byDay[key] || []
          const isToday = key === todayKey

          return (
            <div key={key} className="border-b border-hair px-3 py-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <button
                  onClick={() => onSelectDay(key)}
                  className={`text-sm md:text-xs uppercase tracking-wide text-left hover:underline ${
                    isToday ? 'font-bold' : 'text-ink-500'
                  }`}
                >
                  {WEEKDAYS[date.getDay()].slice(0, 3)}, {date.getDate()}
                  {isToday && <span className="ml-2 text-[10px] normal-case">Today</span>}
                </button>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => addEvent(date, 'note')}
                    className="flex items-center gap-1 border border-hair px-2 py-1.5 md:py-1 text-xs md:text-[10px] uppercase tracking-wide hover:bg-ink-950 dark:hover:bg-ink-100"
                  >
                    <Plus size={13} className="md:w-[11px] md:h-[11px]" /> Note
                  </button>
                  <button
                    onClick={() => addEvent(date, 'checklist')}
                    className="flex items-center gap-1 border border-hair px-2 py-1.5 md:py-1 text-xs md:text-[10px] uppercase tracking-wide hover:bg-ink-950 dark:hover:bg-ink-100"
                  >
                    <ListChecks size={13} className="md:w-[11px] md:h-[11px]" /> Checklist
                  </button>
                </div>
              </div>

              {notesForDay.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {notesForDay.map((note) => {
                    const near = !note.done && isDeadlineNear(note.deadline)
                    return (
                      <button
                        key={note.id}
                        onClick={() => onOpenNote(note.id)}
                        className={`text-left px-3 py-2 border text-sm md:text-xs ${
                          note.done
                            ? 'bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-800'
                            : near
                              ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800'
                              : 'border-hair hover:bg-ink-950 dark:hover:bg-ink-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {note.done && (
                            <CheckCircle2 size={12} className="text-green-600 dark:text-green-400 shrink-0" />
                          )}
                          {note.pinned && <Pin size={12} className="shrink-0" />}
                          <span className={`truncate font-medium ${note.done ? 'line-through text-ink-500' : ''}`}>
                            {note.title || 'Untitled'}
                          </span>
                        </div>
                        <span className="text-[10px] text-ink-500">
                          {new Date(note.deadline).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {isOverdue(note.deadline) && !note.done && ' · Overdue'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
