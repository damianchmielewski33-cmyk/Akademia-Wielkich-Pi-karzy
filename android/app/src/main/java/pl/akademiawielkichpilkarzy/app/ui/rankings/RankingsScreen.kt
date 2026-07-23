package pl.akademiawielkichpilkarzy.app.ui.rankings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import pl.akademiawielkichpilkarzy.app.data.api.RankingRow
import pl.akademiawielkichpilkarzy.app.data.api.RankingsResponse

private enum class RankTab(val label: String) {
    PUNKTY("Punkty"),
    GOLE("Gole"),
    ASYSTY("Asysty"),
    DYSTANS("Km"),
    OBRONY("Obrony")
}

@Composable
fun RankingsScreen() {
    var data by remember { mutableStateOf<RankingsResponse?>(null) }
    var tab by remember { mutableStateOf(RankTab.PUNKTY) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun reload(seasonId: Int? = null) {
        scope.launch {
            loading = true
            error = null
            try {
                data = ApiClient.api.rankingi(seasonId)
            } catch (e: Exception) {
                error = e.message ?: "Błąd rankingów"
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Rankingi", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        data?.season?.let {
            Text(
                it.name + if (it.isActive) " (aktywny)" else "",
                style = MaterialTheme.typography.bodyMedium
            )
        }
        Spacer(Modifier.height(8.dp))

        when {
            loading -> CircularProgressIndicator()
            error != null -> {
                Text(error!!, color = MaterialTheme.colorScheme.error)
                OutlinedButton(onClick = { reload() }) { Text("Odśwież") }
            }
            else -> {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    RankTab.entries.forEach { t ->
                        FilterChip(
                            selected = tab == t,
                            onClick = { tab = t },
                            label = { Text(t.label) }
                        )
                    }
                }
                Spacer(Modifier.height(10.dp))
                val rows: List<RankingRow> = when (tab) {
                    RankTab.PUNKTY -> data?.rankings?.punkty.orEmpty()
                    RankTab.GOLE -> data?.rankings?.goals.orEmpty()
                    RankTab.ASYSTY -> data?.rankings?.assists.orEmpty()
                    RankTab.DYSTANS -> data?.rankings?.distance.orEmpty()
                    RankTab.OBRONY -> data?.rankings?.saves.orEmpty()
                }
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(rows) { r ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(
                                    "${r.rank}. ${r.firstName} ${r.lastName}",
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(r.zawodnik, style = MaterialTheme.typography.bodySmall)
                                val valueText = when (tab) {
                                    RankTab.DYSTANS -> "%.1f km".format(r.value)
                                    RankTab.PUNKTY -> "%.1f pkt".format(r.value)
                                    else -> "%.0f".format(r.value)
                                }
                                Text(valueText, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }
        }
    }
}
