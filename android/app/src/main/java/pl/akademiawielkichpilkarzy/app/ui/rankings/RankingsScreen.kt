package pl.akademiawielkichpilkarzy.app.ui.rankings

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
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
import pl.akademiawielkichpilkarzy.app.data.api.RankingRow
import pl.akademiawielkichpilkarzy.app.data.api.RankingsResponse
import pl.akademiawielkichpilkarzy.app.ui.common.AwpHeroCard
import pl.akademiawielkichpilkarzy.app.ui.common.AwpListRow
import pl.akademiawielkichpilkarzy.app.ui.common.EmptyHint
import pl.akademiawielkichpilkarzy.app.ui.common.ErrorBlock
import pl.akademiawielkichpilkarzy.app.ui.common.LoadingBlock
import pl.akademiawielkichpilkarzy.app.ui.common.MurawaBackground
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

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

    MurawaBackground {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item {
                AwpHeroCard(
                    title = "Rankingi",
                    subtitle = data?.season?.let {
                        it.name + if (it.isActive) " (aktywny)" else ""
                    } ?: "Klasyfikacje zawodników i sezonu.",
                    kicker = "Tabela"
                )
            }

            when {
                loading -> item { LoadingBlock() }
                error != null -> item { ErrorBlock(error!!) { reload() } }
                else -> {
                    item {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState())
                        ) {
                            RankTab.entries.forEach { t ->
                                FilterChip(
                                    selected = tab == t,
                                    onClick = { tab = t },
                                    label = { Text(t.label) },
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
                    val rows: List<RankingRow> = when (tab) {
                        RankTab.PUNKTY -> data?.rankings?.punkty.orEmpty()
                        RankTab.GOLE -> data?.rankings?.goals.orEmpty()
                        RankTab.ASYSTY -> data?.rankings?.assists.orEmpty()
                        RankTab.DYSTANS -> data?.rankings?.distance.orEmpty()
                        RankTab.OBRONY -> data?.rankings?.saves.orEmpty()
                    }
                    if (rows.isEmpty()) {
                        item { EmptyHint("Brak wyników dla tej klasyfikacji.") }
                    } else {
                        items(rows) { r ->
                            val valueText = when (tab) {
                                RankTab.DYSTANS -> "%.1f km".format(r.value)
                                RankTab.PUNKTY -> "%.1f pkt".format(r.value)
                                else -> "%.0f".format(r.value)
                            }
                            AwpListRow(
                                title = "${r.firstName} ${r.lastName}",
                                label = "#${r.rank} · ${r.zawodnik}",
                                trailing = valueText,
                                gold = r.rank <= 3
                            )
                        }
                    }
                }
            }
        }
    }
}
