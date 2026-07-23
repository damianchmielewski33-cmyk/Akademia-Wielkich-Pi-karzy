package pl.akademiawielkichpilkarzy.app.ui.stats

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
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
import pl.akademiawielkichpilkarzy.app.AwpApp
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.PlayerStatsResponse

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

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Statystyki", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))
        when {
            loading -> CircularProgressIndicator()
            error != null -> {
                Text(error!!, color = MaterialTheme.colorScheme.error)
                OutlinedButton(onClick = { reload() }) { Text("Odśwież") }
            }
            else -> {
                val s = data!!
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Mecze: ${s.matches}")
                        Text("Gole: ${s.goals} · Asysty: ${s.assists}")
                        Text("Dystans: %.1f km · Obrony: ${s.saves}".format(s.distance))
                    }
                }
                Spacer(Modifier.height(12.dp))
                Text("Historia", fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(s.games) { g ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text("${g.date} ${g.time.orEmpty()}", fontWeight = FontWeight.Medium)
                                Text(g.location.orEmpty())
                                Text("G ${g.goals} · A ${g.assists} · ${"%.1f".format(g.distance)} km · O ${g.saves}")
                            }
                        }
                    }
                }
            }
        }
    }
}
