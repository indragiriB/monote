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
    <div className="flex-1 overflow-y-auto p-3">
      <div className="sticky top-0 z-10 mb-3 flex items-center justify-between gap-2 rounded-full border border-hair bg-white/60 dark:bg-[#101010]/70 px-2.5 py-2 shadow-glass backdrop-blur-2xl">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="icon-btn p-2 md:p-1.5"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} className="md:w-3.5 md:h-3.5" />
        </button>
        <span className="dot-label text-xs md:text-[11px]">
          {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="icon-btn p-2 md:p-1.5"
          aria-label="Next month"
        >
          <ChevronRight size={18} className="md:w-3.5 md:h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {days.map((date) => {
          const key = toDayKey(date)
          const notesForDay = byDay[key] || []
          const isToday = key === todayKey

          return (
            <div
              key={key}
              className={`rounded-[1.35rem] border p-3 transition-colors ${
                isToday
                  ? 'border-accent/40 bg-accent/[0.05]'
                  : 'border-hair bg-white/40 dark:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <button
                  onClick={() => onSelectDay(key)}
                  className={`dot-label text-[11px] text-left transition-colors hover:text-accent ${
                    isToday ? 'text-accent' : 'text-ink-500'
                  }`}
                >
                  {WEEKDAYS[date.getDay()].slice(0, 3)}, {date.getDate()}
                  {isToday && (
                    <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle shadow-glow" />
                  )}
                </button>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => addEvent(date, 'note')}
                    className="pill px-2.5 py-1.5 md:py-1 text-[9px] uppercase tracking-[0.1em]"
                  >
                    <Plus size={13} className="md:w-[11px] md:h-[11px]" /> Note
                  </button>
                  <button
                    onClick={() => addEvent(date, 'checklist')}
                    className="pill px-2.5 py-1.5 md:py-1 text-[9px] uppercase tracking-[0.1em]"
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
                        className={`text-left px-3 py-2 rounded-2xl border text-sm md:text-xs transition-colors ${
                          note.done
                            ? 'bg-emerald-500/10 border-emerald-500/25'
                            : near
                              ? 'bg-accent/[0.07] border-accent/35'
                              : 'border-hair hover:bg-white/60 dark:hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {note.done && (
                            <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                          {note.pinned && <Pin size={12} className="shrink-0 text-accent" />}
                          <span className={`truncate font-medium ${note.done ? 'line-through text-ink-500' : ''}`}>
                            {note.title || 'Untitled'}
                          </span>
                        </div>
                        <span className="text-[9px] uppercase tracking-[0.1em] text-ink-500">
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
