export function formatShortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatFullTimestamp(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "3m ago", "2h ago", "5d ago", falling back to a short date further out. */
export function formatRelative(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatShortDate(iso)
}

/** yyyy-mm-dd in local time — used as the calendar's day key. */
export function toDayKey(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isOverdue(deadlineIso) {
  if (!deadlineIso) return false
  return new Date(deadlineIso).getTime() < Date.now()
}

/** True once a deadline is overdue or within `thresholdHours` of now. */
export function isDeadlineNear(deadlineIso, thresholdHours = 24) {
  if (!deadlineIso) return false
  const diff = new Date(deadlineIso).getTime() - Date.now()
  return diff <= thresholdHours * 60 * 60 * 1000
}

/** "Overdue", "Due in 3h", "Due in 2d", or a short date further out. */
export function formatDeadline(deadlineIso) {
  if (!deadlineIso) return ''
  const diff = new Date(deadlineIso).getTime() - Date.now()
  if (diff < 0) return 'Overdue'
  const hours = Math.round(diff / (60 * 60 * 1000))
  if (hours < 1) return 'Due soon'
  if (hours < 24) return `Due in ${hours}h`
  const days = Math.round(hours / 24)
  if (days < 7) return `Due in ${days}d`
  return `Due ${formatShortDate(deadlineIso)}`
}
