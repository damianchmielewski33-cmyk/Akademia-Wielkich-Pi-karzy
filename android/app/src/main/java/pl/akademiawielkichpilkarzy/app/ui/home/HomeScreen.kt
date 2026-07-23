package pl.akademiawielkichpilkarzy.app.ui.home

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.SignupRequest
import pl.akademiawielkichpilkarzy.app.data.api.TerminarzResponse
import pl.akademiawielkichpilkarzy.app.ui.common.EmptyHint
import pl.akademiawielkichpilkarzy.app.ui.common.ErrorBlock
import pl.akademiawielkichpilkarzy.app.ui.common.LoadingBlock
import pl.akademiawielkichpilkarzy.app.ui.common.MatchSignupCard
import pl.akademiawielkichpilkarzy.app.ui.common.MundialHeroBanner
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenScaffold
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

@Composable
fun HomeScreen(onOpenTransport: (matchId: Int) -> Unit = {}) {
    var data by remember { mutableStateOf<TerminarzResponse?>(null) }
    var weatherLine by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch {
            loading = true
            error = null
            weatherLine = null
            try {
                val t = ApiClient.api.terminarz()
                data = t
                val next = t.upcoming.firstOrNull()
                if (next != null && next.location.isNotBlank()) {
                    try {
                        val w = ApiClient.api.weather(next.location)
                        val day = w.days.firstOrNull { it.date == next.matchDate } ?: w.days.firstOrNull()
                        if (day != null) {
                            val max = day.maxC?.let { "%.0f°C".format(it) } ?: ""
                            val desc = day.description.orEmpty()
                            val rain = day.precipChance?.let { " · deszcz $it%" } ?: ""
                            weatherLine = listOf(desc, max).filter { it.isNotBlank() }.joinToString(" · ") + rain
                        }
                    } catch (_: Exception) {
                    }
                }
            } catch (e: Exception) {
                error = e.message ?: "Nie udało się pobrać danych"
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    ScreenScaffold(
        title = "Start",
        subtitle = "Kolejny mecz akademii"
    ) {
        MundialHeroBanner(
            title = "Boisko czeka",
            subtitle = "Zapisz się na najbliższy termin"
        )

        when {
            loading -> LoadingBlock()
            error != null -> ErrorBlock(error!!) { reload() }
            else -> {
                val next = data?.upcoming?.firstOrNull()
                if (next == null) {
                    EmptyHint("Brak nadchodzących meczów w terminarzu.")
                } else {
                    MatchSignupCard(
                        match = next,
                        signupKind = data?.userSignupKind?.get(next.id.toString()),
                        weatherLine = weatherLine,
                        onCommitment = { commitment ->
                            scope.launch {
                                actionError = null
                                try {
                                    val res = ApiClient.api.signup(next.id, SignupRequest(commitment))
                                    if (res.error != null) actionError = res.error
                                    reload()
                                } catch (e: Exception) {
                                    actionError = e.message
                                }
                            }
                        },
                        onUnsubscribe = {
                            scope.launch {
                                actionError = null
                                try {
                                    val res = ApiClient.api.unsubscribe(next.id)
                                    if (res.error != null) actionError = res.error
                                    reload()
                                } catch (e: Exception) {
                                    actionError = e.message
                                }
                            }
                        },
                        onTransport = { onOpenTransport(next.id) }
                    )
                    if (actionError != null) {
                        Text(
                            actionError!!,
                            color = AwpColors.MundialRed,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            }
        }
        Spacer(Modifier.height(4.dp))
    }
}
