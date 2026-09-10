# Android Home Screen Widget — Architecture Guide

## The core problem
A home screen widget runs in Android's `RemoteViews`/Glance rendering
pipeline — a separate process from your Capacitor `WebView`. It has **no
access to JS memory, IndexedDB (Dexie), or localStorage**. So the widget
can't "ask React for the pinned notes" directly; the data has to be handed
off to native Android storage that both sides can read.

**The bridge:** a small custom Capacitor plugin. Whenever notes change in
React (after every `useNotes` mutation and after every sync pull), call the
plugin to mirror a lightweight snapshot — just what the widget needs (id,
title, snippet, pinned) — into Android `SharedPreferences` as JSON. The
widget reads that JSON on its own update cycle. This keeps the widget fast
and avoids needing SQLite from the JS side.

```
React (useNotes) ──on change──▶ WidgetBridge.updateNotes(json)
                                        │
                                 (Capacitor plugin, Kotlin)
                                        │
                                 SharedPreferences "monote_widget"
                                        │
                        Glance AppWidget reads on update/click
```

## Recommended: Jetpack Glance (Kotlin, Compose-style)
Simpler and more maintainable than classic `RemoteViews` XML.

### 1. Folder structure inside `android/app/src/main/java/com/yourorg/monote/`
```
widget/
├── NotesWidget.kt          # GlanceAppWidget — layout & data binding
├── NotesWidgetReceiver.kt  # GlanceAppWidgetReceiver — registers the widget
├── WidgetDataStore.kt      # Reads/writes the SharedPreferences JSON snapshot
└── WidgetBridgePlugin.kt   # Capacitor plugin exposed to JS as `WidgetBridge`
```
And the manifest/resource glue:
```
android/app/src/main/res/xml/notes_widget_info.xml
android/app/src/main/AndroidManifest.xml   (register the receiver)
```

### 2. `WidgetDataStore.kt` — shared data contract
```kotlin
package com.yourorg.monote.widget

import android.content.Context
import org.json.JSONArray

data class WidgetNote(val id: String, val title: String, val snippet: String, val pinned: Boolean)

object WidgetDataStore {
    private const val PREFS = "monote_widget"
    private const val KEY_NOTES = "notes_json"

    fun save(context: Context, notesJson: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(KEY_NOTES, notesJson).apply()
    }

    fun load(context: Context): List<WidgetNote> {
        val json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_NOTES, "[]") ?: "[]"
        val arr = JSONArray(json)
        return (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            WidgetNote(o.getString("id"), o.getString("title"), o.getString("snippet"), o.getBoolean("pinned"))
        }
    }
}
```

### 3. `WidgetBridgePlugin.kt` — the Capacitor plugin JS calls into
```kotlin
package com.yourorg.monote.widget

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.runBlocking

@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridgePlugin : Plugin() {

    @PluginMethod
    fun updateNotes(call: PluginCall) {
        val json = call.getString("notesJson") ?: "[]"
        WidgetDataStore.save(context, json)

        // Ask Glance to redraw every placed instance of the widget.
        runBlocking { NotesWidget().updateAll(context) }

        call.resolve()
    }
}
```
Register it in `MainActivity.kt`:
```kotlin
import com.yourorg.monote.widget.WidgetBridgePlugin
// inside onCreate, before super.onCreate's plugin registration finishes:
registerPlugin(WidgetBridgePlugin::class.java)
```

### 4. `NotesWidget.kt` — the Glance UI
```kotlin
package com.yourorg.monote.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.text.Text
import androidx.glance.layout.Column
import androidx.glance.action.clickable
import androidx.glance.appwidget.action.actionStartActivity
import android.content.Intent
import android.net.Uri

class NotesWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val notes = WidgetDataStore.load(context)
        val pinnedOrRecent = notes.filter { it.pinned }.ifEmpty { notes }.take(5)

        provideContent {
            Column {
                Text("monote", style = TextStyleTitle)
                pinnedOrRecent.forEach { note ->
                    Text(
                        text = "${note.title} — ${note.snippet}",
                        modifier = GlanceModifier.clickable(
                            actionStartActivity(
                                Intent(Intent.ACTION_VIEW, Uri.parse("monote://open/${note.id}"))
                            )
                        )
                    )
                }
                Text(
                    text = "+ New note",
                    modifier = GlanceModifier.clickable(
                        actionStartActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse("monote://create"))
                        )
                    )
                )
            }
        }
    }
}
```
(`TextStyleTitle`/`GlanceModifier` imports trimmed for brevity — fill in
standard Glance `TextStyle`/`GlanceModifier` usage per the Jetpack Glance
docs for weight/padding/border to match the app's 1px-border aesthetic.)

### 5. `NotesWidgetReceiver.kt`
```kotlin
package com.yourorg.monote.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

class NotesWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = NotesWidget()
}
```

### 6. Manifest registration
```xml
<receiver
    android:name=".widget.NotesWidgetReceiver"
    android:exported="false">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/notes_widget_info" />
</receiver>
```

`res/xml/notes_widget_info.xml`:
```xml
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:updatePeriodMillis="1800000"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:previewImage="@drawable/widget_preview" />
```
`updatePeriodMillis` is a *floor* (Android won't go below ~30 min) — the
real-time updates come from `WidgetBridge.updateNotes()` pushing whenever
notes change, not from this polling interval.

## 7. Calling the bridge from React
```js
// src/lib/widgetBridge.js
import { registerPlugin } from '@capacitor/core'
const WidgetBridge = registerPlugin('WidgetBridge')

export async function syncWidget(notes) {
  const snapshot = notes
    .filter((n) => !n.archived && !n.trashed)
    .slice(0, 10)
    .map((n) => ({
      id: n.id,
      title: n.title || 'Untitled',
      snippet: (n.content || '').slice(0, 60),
      pinned: !!n.pinned,
    }))
  await WidgetBridge.updateNotes({ notesJson: JSON.stringify(snapshot) })
}
```
Call `syncWidget(notes)` from `useNotes`'s `invalidate()` path (or a
`useEffect` watching `notes` in `App.jsx`) so the widget mirrors state
right after every local mutation and every sync pull. Guard the import so
it's a no-op on web (`Capacitor.isNativePlatform()` check) since the plugin
only exists on Android.

## 8. "Create Note" shortcut
The widget's `+ New note` row fires `monote://create`, which — per
`capacitor-setup.md` §5 — is caught by `MainActivity`'s intent filter and
forwarded into the WebView as `?action=create`, which `App.jsx` already
handles by calling `createNote()` and focusing the editor.

## Alternative: classic RemoteViews (if you'd rather avoid Glance/Compose)
Same data contract (`WidgetDataStore`), but the UI is built with
`RemoteViews` + an XML layout (`res/layout/widget_notes.xml`) and a plain
`AppWidgetProvider` subclass instead of `GlanceAppWidget`. Glance is
recommended here since it's less boilerplate and easier to keep in sync
with the B&W/JetBrains-Mono-inspired look (flat text rows, no imagery), but
either approach reads from the same `SharedPreferences` snapshot the
Capacitor plugin writes.
