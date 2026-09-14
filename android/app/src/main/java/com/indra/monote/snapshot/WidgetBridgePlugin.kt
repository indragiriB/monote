package com.indra.monote.snapshot

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.runBlocking
import com.indra.monote.widget.NotesWidget
import com.indra.monote.widget.WidgetDataStore

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