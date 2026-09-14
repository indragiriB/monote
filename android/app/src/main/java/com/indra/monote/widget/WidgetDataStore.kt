package com.indra.monote.widget

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