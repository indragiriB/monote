import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getDeadlinesInRange } from '../lib/noteQueries'
import { toDayKey, isOverdue, isDeadlineNear } from '../lib/dates'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

export default function CalendarView({ onSelectDay }) {
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
      setByDay(map)
    })
    return () => {
      cancelled = true
    }
  }, [cursor])

  const cells = buildMonthGrid(cursor.getFullYear(), cursor.getMonth())
  const todayKey = toDayKey(new Date())

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="p-1.5 border border-hair"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest">
          {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="p-1.5 border border-hair"
          aria-label="Next month"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-[9px] text-ink-500">
            {w[0]}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <span key={i} />
          const key = toDayKey(date)
          const notesForDay = byDay[key] || []
          const hasOverdue = notesForDay.some((n) => !n.done && isOverdue(n.deadline))
          const hasNear = notesForDay.some((n) => !n.done && isDeadlineNear(n.deadline))
          const isToday = key === todayKey

          return (
            <button
              key={i}
              onClick={() => onSelectDay(key)}
              className={`flex flex-col items-center gap-0.5 py-2 border text-[11px] hover:bg-ink-950 dark:hover:bg-ink-100 ${
                isToday ? 'border-ink-400' : 'border-transparent'
              }`}
            >
              {date.getDate()}
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  notesForDay.length === 0
                    ? 'bg-transparent'
                    : hasOverdue || hasNear
                      ? 'bg-red-500'
                      : 'bg-ink-400'
                }`}
              />
            </button>
          )
        })}
      </div>

      <p className="mt-4 text-[10px] text-ink-500">
        Titik <span className="text-red-500">merah</span> = deadline sudah lewat atau kurang dari
        24 jam lagi.
      </p>
    </div>
  )
}
