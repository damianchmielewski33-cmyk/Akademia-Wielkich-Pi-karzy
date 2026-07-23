package pl.akademiawielkichpilkarzy.app.ui.lineups

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.LineupSlot
import pl.akademiawielkichpilkarzy.app.data.api.LineupsResponse
import pl.akademiawielkichpilkarzy.app.ui.common.EmptyHint
import pl.akademiawielkichpilkarzy.app.ui.common.ErrorBlock
import pl.akademiawielkichpilkarzy.app.ui.common.LoadingBlock
import pl.akademiawielkichpilkarzy.app.ui.common.PitchCard
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.common.PitchPanel
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenScaffold
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

@Composable
fun LineupsScreen() {
    var data by remember { mutableStateOf<LineupsResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun reload(matchId: Int? = null) {
        scope.launch {
            loading = true
            error = null
            try {
                data = ApiClient.api.sklady(matchId)
            } catch (e: Exception) {
                error = e.message ?: "Błąd składów"
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    ScreenScaffold(title = "Składy", subtitle = "Opublikowane ustawienia") {
        when {
            loading -> LoadingBlock()
            error != null -> ErrorBlock(error!!) { reload() }
            data?.selected == null -> EmptyHint("Brak opublikowanych składów.")
            else -> {
                val matches = data!!.matches
                if (matches.size > 1) {
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        matches.forEach { m ->
                            FilterChip(
                                selected = data?.selected?.id == m.id,
                                onClick = { reload(m.id) },
                                label = { Text("${m.matchDate} ${m.matchTime.take(5)}") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = AwpColors.MundialTeal,
                                    selectedLabelColor = Color.White,
                                    containerColor = AwpColors.PitchCard,
                                    labelColor = AwpColors.OnPitch
                                )
                            )
                        }
                    }
                }
                val sel = data!!.selected!!
                PitchCard {
                    PitchLabel("Mecz")
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "${sel.matchDate} · ${sel.matchTime}",
                        style = MaterialTheme.typography.titleLarge,
                        color = AwpColors.OnPitch
                    )
                    Text(sel.location, color = AwpColors.OnPitchMuted)
                }
                TeamBlock("Drużyna A (home)", sel.home)
                TeamBlock("Drużyna B (away)", sel.away)
            }
        }
    }
}

@Composable
private fun TeamBlock(title: String, slots: List<LineupSlot?>) {
    PitchCard {
        PitchLabel(title)
        Spacer(Modifier.height(8.dp))
        if (slots.isEmpty()) {
            Text("Brak ustawienia", color = AwpColors.OnPitchMuted)
        } else {
            slots.forEachIndexed { idx, slot ->
                val name = slot?.displayName
                    ?: listOfNotNull(slot?.firstName, slot?.lastName).joinToString(" ").ifBlank {
                        slot?.zawodnik ?: "—"
                    }
                PitchPanel {
                    Text("${idx + 1}. $name", color = AwpColors.OnPitch)
                }
                Spacer(Modifier.height(4.dp))
            }
        }
    }
}
