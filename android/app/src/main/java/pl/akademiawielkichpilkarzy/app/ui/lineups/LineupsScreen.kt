package pl.akademiawielkichpilkarzy.app.ui.lineups

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.LineupSlot
import pl.akademiawielkichpilkarzy.app.data.api.LineupsResponse

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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("Składy", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))

        when {
            loading -> CircularProgressIndicator()
            error != null -> {
                Text(error!!, color = MaterialTheme.colorScheme.error)
                OutlinedButton(onClick = { reload() }) { Text("Odśwież") }
            }
            data?.selected == null -> Text("Brak opublikowanych składów.")
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
                                label = { Text("${m.matchDate} ${m.matchTime.take(5)}") }
                            )
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                }
                val sel = data!!.selected!!
                Text("${sel.matchDate} · ${sel.matchTime}", fontWeight = FontWeight.SemiBold)
                Text(sel.location)
                Spacer(Modifier.height(12.dp))
                TeamBlock("Drużyna A (home)", sel.home)
                Spacer(Modifier.height(10.dp))
                TeamBlock("Drużyna B (away)", sel.away)
            }
        }
    }
}

@Composable
private fun TeamBlock(title: String, slots: List<LineupSlot?>) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            if (slots.isEmpty()) {
                Text("Brak ustawienia")
            } else {
                slots.forEachIndexed { idx, slot ->
                    val name = slot?.displayName
                        ?: listOfNotNull(slot?.firstName, slot?.lastName).joinToString(" ").ifBlank {
                            slot?.zawodnik ?: "—"
                        }
                    Text("${idx + 1}. $name")
                }
            }
        }
    }
}
