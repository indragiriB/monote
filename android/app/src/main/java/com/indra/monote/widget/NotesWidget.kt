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
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

class NotesWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val notes = WidgetDataStore.load(context)
        val pinned = notes.filter { it.pinned }
        val rest = notes.filterNot { it.pinned }
        val visible = (pinned + rest).take(6)

        provideContent {
            Column(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .background(Color.White)
            ) {
                // DIPERBAIKI: Hapus horizontalArrangement dan gunakan Spacer
                Row(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically // DIPERBAIKI: Penulisan Alignment
                ) {
                    Text(
                        text = "ALL NOTES",
                        style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    )

                    // Spacer ini berfungsi seperti SpaceBetween, mendorong konten ke ujung kiri dan kanan
                    Spacer(modifier = GlanceModifier.defaultWeight())

                    Box(
                        modifier = GlanceModifier
                            .background(Color(0xFFEDEDED))
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                            .clickable(
                                actionStartActivity(
                                    Intent(Intent.ACTION_VIEW, Uri.parse("monote://create")).apply {
                                        flags = Intent.FLAG_ACTIVITY_NEW_TASK // DIPERBAIKI: Wajib untuk widget
                                    }
                                )
                            )
                    ) {
                        Text(
                            text = "+ New",
                            style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        )
                    }
                }

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
                                        Intent(Intent.ACTION_VIEW, Uri.parse("monote://open/${note.id}")).apply {
                                            flags = Intent.FLAG_ACTIVITY_NEW_TASK // DIPERBAIKI: Wajib untuk widget
                                        }
                                    )
                                )
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) { // DIPERBAIKI: Penulisan Alignment
                                if (note.pinned) {
                                    Text(
                                        text = "\u2022 ",
                                        style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    )
                                }
                                Text(
                                    text = note.title,
                                    // DIPERBAIKI: Hapus FontWeight.Medium karena tidak didukung Glance
                                    style = TextStyle(fontSize = 13.sp),
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