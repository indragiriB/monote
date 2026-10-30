import { useEffect, useRef, useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { toDayKey, formatDeadline, isDeadlineNear } from '../lib/dates'
import { ensureNotificationPermission } from '../lib/reminders'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

export default function DeadlinePicker({ deadline, done = false, onSet, onClear }) {
  const [open, setOpen] = useState(false)
  const initial = deadline ? new Date(deadline) : new Date()
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(deadline ? toDayKey(deadline) : null)
  const [time, setTime] = useState(
    deadline ? new Date(deadline).toTimeString().slice(0, 5) : '09:00'
  )
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const cells = buildMonthGrid(cursor.getFullYear(), cursor.getMonth())
  const todayKey = toDayKey(new Date())

  function pickDay(date) {
    setSelectedDay(toDayKey(date))
  }

  function confirm() {
    if (!selectedDay) return
    const [h, m] = time.split(':').map(Number)
    const [y, mo, d] = selectedDay.split('-').map(Number)
    const dt = new Date(y, mo - 1, d, h, m)
    // Fired from a real click, so this is a safe place to ask the browser
    // for notification permission (most browsers ignore the request
    // otherwise). On Android it's just a normal permission dialog either way.
    ensureNotificationPermission().catch(() => {})
    onSet(dt.toISOString())
    setOpen(false)
  }

  function clearDeadline() {
    onClear()
    setSelectedDay(null)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`pill inline-flex items-center gap-1.5 px-2.5 py-1 md:px-2 md:py-0.5 text-xs md:text-[11px] uppercase tracking-[0.1em] ${
          deadline
            ? !done && isDeadlineNear(deadline)
              ? 'border-accent/50 text-accent font-semibold bg-accent/5'
              : 'text-ink-500'
            : 'text-ink-500'
        }`}
      >
        <CalendarClock size={14} className="md:w-[11px] md:h-[11px]" />{' '}
        {deadline ? formatDeadline(deadline) : 'Deadline'}
      </button>

      {open && (
        // Mobile: a centered modal with a backdrop (the old `absolute`
        // dropdown could get clipped/pushed off-screen when the trigger
        // sat near a screen edge). Desktop (`md:`): back to the normal
        // inline dropdown anchored under the trigger button.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:absolute md:inset-auto md:z-50 md:mt-1 md:bg-transparent md:backdrop-blur-none md:p-0"
          onClick={(e) => {
            // Only closes on a direct click on the backdrop, not one that
            // bubbles up from the card — the outside-click listener above
            // still handles clicks truly outside this whole component.
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            className="glass-strong w-80 md:w-64 max-w-full rounded-[1.75rem] p-4 md:p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 md:mb-2">
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                className="icon-btn p-2 md:p-1"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} className="md:w-3 md:h-3" />
              </button>
              <span className="dot-label text-xs md:text-[11px]">
                {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                className="icon-btn p-2 md:p-1"
                aria-label="Next month"
              >
                <ChevronRight size={16} className="md:w-3 md:h-3" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 md:gap-1 text-center">
              {WEEKDAYS.map((w, i) => (
                <span key={i} className="text-[10px] md:text-[9px] dot-label text-ink-500">
                  {w}
                </span>
              ))}
              {cells.map((date, i) => {
                if (!date) return <span key={i} />
                const key = toDayKey(date)
                const isToday = key === todayKey
                const isSelected = key === selectedDay
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickDay(date)}
                    className={`flex h-9 md:h-7 items-center justify-center rounded-full text-sm md:text-[11px] transition-colors ${
                      isSelected
                        ? 'bg-ink-0 text-ink-1000 dark:bg-ink-1000 dark:text-ink-0 shadow-glass'
                        : isToday
                          ? 'text-accent ring-1 ring-accent/60 hover:bg-accent/10'
                          : 'text-ink-500 hover:bg-white/60 dark:hover:bg-white/10'
                    }`}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 md:mt-3 flex items-center gap-2">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="glass-input flex-1 px-3 py-2 md:py-1 outline-none text-sm md:text-xs"
              />
            </div>

            <div className="mt-3 md:mt-2 flex gap-2">
              <button
                type="button"
                onClick={confirm}
                disabled={!selectedDay}
                className="pill pill-invert flex-1 py-2.5 md:py-1.5 text-[11px] uppercase tracking-[0.12em] disabled:opacity-50"
              >
                Set
              </button>
              {deadline && (
                <button
                  type="button"
                  onClick={clearDeadline}
                  className="pill px-3 md:px-2.5 text-ink-500"
                  aria-label="Clear deadline"
                >
                  <X size={16} className="md:w-3 md:h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
