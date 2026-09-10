import { Capacitor, registerPlugin } from '@capacitor/core'

// The native WidgetBridge plugin only exists on the Android build
// (see docs/android-widget.md). Registering it on web is harmless —
// syncWidget() below just no-ops there.
const WidgetBridge = registerPlugin('WidgetBridge')

export async function syncWidget(notes) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return

  const snapshot = notes
    .filter((n) => !n.archived && !n.trashed)
    .slice(0, 10)
    .map((n) => ({
      id: n.id,
      title: n.title || 'Untitled',
      snippet: (n.content || '').slice(0, 60),
      pinned: !!n.pinned,
    }))

  try {
    await WidgetBridge.updateNotes({ notesJson: JSON.stringify(snapshot) })
  } catch (err) {
    console.warn('[widgetBridge] gagal update widget', err)
  }
}
