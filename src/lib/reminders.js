import { Capacitor } from '@capacitor/core'

// The native plugin is only ever loaded on Android — importing it eagerly
// would pull native-only code into the web bundle for no reason.
let LocalNotificationsPromise = null
function getLocalNotifications() {
  if (!LocalNotificationsPromise) {
    LocalNotificationsPromise = import('@capacitor/local-notifications').then(
      (mod) => mod.LocalNotifications
    )
  }
  return LocalNotificationsPromise
}

const isNative = () => Capacitor.isNativePlatform()

/**
 * Ask for notification permission. On Android this is a real system
 * permission dialog (and covers POST_NOTIFICATIONS on Android 13+). On the
 * web this must be called from a genuine user gesture (a click) or most
 * browsers will silently ignore it — call it from the "Set" button handler
 * in DeadlinePicker, not on page load.
 */
export async function ensureNotificationPermission() {
  if (isNative()) {
    const LocalNotifications = await getLocalNotifications()
    const status = await LocalNotifications.checkPermissions()
    if (status.display !== 'granted') {
      await LocalNotifications.requestPermissions()
    }
    return
  }

  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

/** LocalNotifications needs a 32-bit integer id — hash the uuid + a suffix
 * (so "1 hour before" and "at the deadline" get distinct, stable ids that
 * can be cancelled individually later). */
function notificationId(noteId, suffix) {
  const str = noteId + suffix
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
  return Math.abs(hash) || 1
}

const ONE_HOUR_MS = 60 * 60 * 1000

// Web-only: setTimeout handles, since the browser Notification API has no
// built-in scheduler. These only fire while this tab stays open — real
// background/closed-app alarms are an Android-only capability (native OS
// AlarmManager via the plugin above).
const webTimers = new Map()

function reminderTargets(note) {
  const deadlineMs = new Date(note.deadline).getTime()
  const now = Date.now()
  const title = note.title || 'Untitled'
  return [
    { suffix: 'before', at: deadlineMs - ONE_HOUR_MS, body: `Deadline dalam 1 jam: ${title}` },
    { suffix: 'due', at: deadlineMs, body: `Deadline sekarang: ${title}` },
  ].filter((t) => t.at > now)
}

/** Cancel any reminder previously scheduled for this note. Safe to call
 * even if nothing was ever scheduled. */
export async function cancelDeadlineReminder(noteId) {
  if (isNative()) {
    const LocalNotifications = await getLocalNotifications()
    await LocalNotifications.cancel({
      notifications: [
        { id: notificationId(noteId, 'before') },
        { id: notificationId(noteId, 'due') },
      ],
    })
    return
  }

  const timers = webTimers.get(noteId)
  if (timers) {
    timers.forEach(clearTimeout)
    webTimers.delete(noteId)
  }
}

/**
 * (Re)schedule a note's deadline reminders: one an hour before, one right
 * at the deadline. Always cancels any previous schedule first, so this is
 * safe to call on every note change — it naturally handles a moved,
 * cleared, done, or trashed deadline by just not rescheduling anything.
 */
export async function scheduleDeadlineReminder(note) {
  await cancelDeadlineReminder(note.id)
  if (!note.deadline || note.done || note.trashed) return

  const targets = reminderTargets(note)
  if (targets.length === 0) return

  if (isNative()) {
    const LocalNotifications = await getLocalNotifications()
    const status = await LocalNotifications.checkPermissions()
    if (status.display !== 'granted') return
    await LocalNotifications.schedule({
      notifications: targets.map((t) => ({
        id: notificationId(note.id, t.suffix),
        title: 'monote',
        body: t.body,
        schedule: { at: new Date(t.at) },
        extra: { noteId: note.id },
      })),
    })
    return
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const now = Date.now()
  const timers = targets.map((t) =>
    setTimeout(() => new Notification('monote', { body: t.body }), t.at - now)
  )
  webTimers.set(note.id, timers)
}

/**
 * Re-schedule reminders for every upcoming, non-done, non-trashed deadline.
 * Call this once after login/app start — it's what makes reminders survive
 * an app restart (in-memory web timers and, on a fresh Android install,
 * the OS alarm table both start out empty).
 */
export async function rehydrateReminders(getUpcomingDeadlines) {
  const notes = await getUpcomingDeadlines()
  await Promise.all(notes.map((n) => scheduleDeadlineReminder(n).catch(() => {})))
}

/** Wire up "tap the notification" -> open that note. No-op on web. */
export async function onNotificationTap(onOpenNote) {
  if (!isNative()) return () => {}
  const LocalNotifications = await getLocalNotifications()
  const handle = await LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (action) => {
      const noteId = action.notification?.extra?.noteId
      if (noteId) onOpenNote(noteId)
    }
  )
  return () => handle.remove()
}
