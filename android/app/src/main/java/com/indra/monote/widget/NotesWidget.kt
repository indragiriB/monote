package com.indra.monote.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Arrangement
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

/**
 * Styled to echo the app's "All Notes" list (NoteList.jsx): a header row
 * with a "+" add button, then flat rows separated by hairline dividers.
 * Re-implemented with Glance's own layout primitives since the widget
 * can't share React/Tailwind code with the web app — Glance has no CSS,
 * no border modifier, and no dark-mode-aware color tokens wired up here,
 * so this is a deliberately simplified, always-light-background version
 * of the same shape rather than a pixel-perfect port.
 */
class NotesWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val notes = WidgetDataStore.load(context)
        // Same ordering spirit as "All Notes": pinned notes float to the
        // top, the rest keep the most-recent-first order they arrive in
        // from syncWidget() on the JS side.
        val pinned = notes.filter { it.pinned }
        val rest = notes.filterNot { it.pinned }
        val visible = (pinned + rest).take(6)

        provideContent {
            Column(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .background(Color.White)
            ) {
                // Header: title + "+ New", mirroring the app's sidebar
                // "New Note" button. SpaceBetween pushes them to opposite
                // ends without needing a weight modifier.
                Row(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.Vertical.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "ALL NOTES",
                        style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    )
                    Box(
                        modifier = GlanceModifier
                            .background(Color(0xFFEDEDED))
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                            .clickable(
                                actionStartActivity(
                                    Intent(Intent.ACTION_VIEW, Uri.parse("monote://create"))
                                )
                            )
                    ) {
                        Text(
                            text = "+ New",
                            style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        )
                    }
                }

                // Divider — Box always needs a content lambda in Glance,
                // even an empty one, or it fails to compile.
                Box(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(Color(0xFFDDDDDD))
                ) {}

                if (visible.isEmpty()) {
                    Text(
                        text = "No notes yet.",
                        modifier = GlanceModifier.padding(12.dp),
                        style = TextStyle(fontSize = 12.sp)
                    )
                } else {
                    visible.forEachIndexed { index, note ->
                        Column(
                            modifier = GlanceModifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp)
                                .clickable(
                                    actionStartActivity(
                                        Intent(Intent.ACTION_VIEW, Uri.parse("monote://open/${note.id}"))
                                    )
                                )
                        ) {
                            Row(verticalAlignment = Alignment.Vertical.CenterVertically) {
                                if (note.pinned) {
                                    Text(text = "\u2022 ", style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 13.sp))
                                }
                                Text(
                                    text = note.title,
                                    style = TextStyle(fontWeight = FontWeight.Medium, fontSize = 13.sp),
                                    maxLines = 1
                                )
                            }
                            if (note.snippet.isNotBlank()) {
                                Text(
                                    text = note.snippet,
                                    style = TextStyle(fontSize = 11.sp),
                                    maxLines = 1
                                )
                            }
                        }
                        if (index != visible.lastIndex) {
                            Box(
                                modifier = GlanceModifier
                                    .fillMaxWidth()
                                    .height(1.dp)
                                    .background(Color(0xFFEFEFEF))
                            ) {}
                        }
                    }
                }
            }
        }
    }
}
