package pl.akademiawielkichpilkarzy.app.ui.stats

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.AwpApp
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.PlayerStatsResponse
import pl.akademiawielkichpilkarzy.app.ui.common.ErrorBlock
import pl.akademiawielkichpilkarzy.app.ui.common.LoadingBlock
import pl.akademiawielkichpilkarzy.app.ui.common.MurawaBackground
import pl.akademiawielkichpilkarzy.app.ui.common.PitchCard
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.common.PitchPanel
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenHeader
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

@Composable
fun StatsScreen() {
    var data by remember { mutableStateOf<PlayerStatsResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch {
            loading = true
            error = null
            try {
                val uid = AwpApp.instance.sessionStore.getUserId()
                    ?: ApiClient.api.me().user?.id
                    ?: throw IllegalStateException("Brak ID użytkownika — zaloguj się ponownie")
                data = ApiClient.api.playerStats(uid)
            } catch (e: Exception) {
                error = e.message ?: "Nie udało się pobrać statystyk"
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
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                ScreenHeader(title = "Statystyki", subtitle = "Twoje wyniki sezonu")
            }
            when {
                loading -> item { LoadingBlock() }
                error != null -> item { ErrorBlock(error!!) { reload() } }
                else -> {
                    val s = data!!
                    item {
                        PitchCard {
                            PitchLabel("Podsumowanie")
                            Spacer(Modifier.height(8.dp))
                            Text("Mecze: ${s.matches}", color = AwpColors.OnPitch)
                            Text(
                                "Gole: ${s.goals} · Asysty: ${s.assists}",
                                color = AwpColors.OnPitch
                            )
                            Text(
                                "Dystans: %.1f km · Obrony: ${s.saves}".format(s.distance),
                                color = AwpColors.OnPitch
                            )
                        }
                    }
                    item { PitchLabel("Historia") }
                    items(s.games) { g ->
                        PitchPanel {
                            Text(
                                "${g.date} ${g.time.orEmpty()}",
                                style = MaterialTheme.typography.titleMedium,
                                color = AwpColors.OnPitch
                            )
                            Text(g.location.orEmpty(), color = AwpColors.OnPitchMuted)
                            Text(
                                "G ${g.goals} · A ${g.assists} · ${"%.1f".format(g.distance)} km · O ${g.saves}",
                                color = AwpColors.MundialGold
                            )
                        }
                    }
                }
            }
        }
    }
}
