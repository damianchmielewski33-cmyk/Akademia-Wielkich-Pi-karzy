package pl.akademiawielkichpilkarzy.app.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
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
import pl.akademiawielkichpilkarzy.app.ui.common.HomePitchTile
import pl.akademiawielkichpilkarzy.app.ui.common.LoadingBlock
import pl.akademiawielkichpilkarzy.app.ui.common.MatchSignupCard
import pl.akademiawielkichpilkarzy.app.ui.common.MundialHeroBanner
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenScaffold
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

data class HomeNavActions(
    val onNative: (String) -> Unit,
    val onPortal: (title: String, path: String) -> Unit,
    val onOpenTransport: (matchId: Int) -> Unit,
    val onOpenStatsForMatch: (matchId: Int) -> Unit,
    val onLogout: () -> Unit,
    val isAdmin: Boolean = false,
    val showPzuCup: Boolean = true,
    val isBlocked: (String) -> Boolean = { false }
)

@Composable
fun HomeScreen(nav: HomeNavActions) {
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
        subtitle = "Najbliższy mecz i skróty jak na stronie"
    ) {
        MundialHeroBanner(
            title = "Boisko czeka",
            subtitle = "Zapisz się na najbliższy termin"
        )

        PitchLabel("Najbliższy mecz")
        when {
            loading -> LoadingBlock()
            error != null -> ErrorBlock(error!!) { reload() }
            else -> {
                val next = data?.upcoming?.firstOrNull()
                if (next == null) {
                    EmptyHint("Brak nadchodzących meczów w terminarzu.")
                } else {
                    val kind = data?.userSignupKind?.get(next.id.toString())
                    MatchSignupCard(
                        match = next,
                        signupKind = kind,
                        playersEntry = data?.playersData?.get(next.id.toString()),
                        weatherLine = weatherLine,
                        onConfirmSignup = {
                            scope.launch {
                                actionError = null
                                try {
                                    val res = ApiClient.api.signup(next.id, SignupRequest("confirmed"))
                                    if (res.error != null) {
                                        actionError = res.error
                                        return@launch
                                    }
                                    reload()
                                    nav.onOpenTransport(next.id)
                                } catch (e: Exception) {
                                    actionError = e.message
                                }
                            }
                        },
                        onTentative = {
                            scope.launch {
                                actionError = null
                                try {
                                    val res = ApiClient.api.signup(next.id, SignupRequest("tentative"))
                                    if (res.error != null) actionError = res.error
                                    reload()
                                } catch (e: Exception) {
                                    actionError = e.message
                                }
                            }
                        },
                        onDeclined = {
                            scope.launch {
                                actionError = null
                                try {
                                    val res = ApiClient.api.signup(next.id, SignupRequest("declined"))
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
                        onTransport = { nav.onOpenTransport(next.id) }
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

        Spacer(Modifier.height(8.dp))
        PitchLabel("Menu")
        HomeTilesGrid(nav)
    }
}

@Composable
private fun HomeTilesGrid(nav: HomeNavActions) {
    data class Tile(
        val title: String,
        val desc: String,
        val gold: Boolean = false,
        val blockKey: String? = null,
        val onClick: () -> Unit
    )

    val tiles = buildList {
        if (!nav.isBlocked("schedule")) {
            add(Tile("Terminarz", "Mecze, zapisy, terminy") { nav.onNative("schedule") })
        }
        if (!nav.isBlocked("wallet")) {
            add(Tile("Płatności", "Portfel i BLIK") { nav.onNative("wallet") })
        }
        if (!nav.isBlocked("pilkarze")) {
            add(Tile("Piłkarze", "Skład i profile") { nav.onPortal("Piłkarze", "/pilkarze") })
        }
        if (!nav.isBlocked("lineups")) {
            add(Tile("Składy", "Opublikowane ustawienia") { nav.onNative("lineups") })
        }
        if (!nav.isBlocked("galeria")) {
            add(Tile("Galeria", "Zdjęcia i filmy") { nav.onPortal("Galeria", "/galeria") })
        }
        if (!nav.isBlocked("stats")) {
            add(Tile("Statystyki", "Twoje liczby z boiska") { nav.onNative("stats") })
        }
        if (!nav.isBlocked("rankings")) {
            add(Tile("Rankingi", "Gole, asysty, punkty", gold = true) { nav.onNative("rankings") })
        }
        if (!nav.isBlocked("o_nas")) {
            add(Tile("O nas", "O akademii") { nav.onPortal("O nas", "/o-nas") })
        }
        if (!nav.isBlocked("kontakt")) {
            add(Tile("Kontakt", "Napisz do organizatorów") { nav.onPortal("Kontakt", "/kontakt") })
        }
        if (nav.showPzuCup && !nav.isBlocked("pzu_cup")) {
            add(
                Tile("PZU Cup", "Turniej PZU Cup 2026", gold = true) {
                    nav.onPortal("PZU Cup", "/pzu-cup")
                }
            )
        }
        if (nav.isAdmin) {
            add(
                Tile("Panel admina", "Zarządzanie akademią", gold = true) {
                    nav.onPortal("Panel admina", "/panel-admina")
                }
            )
        }
        if (!nav.isBlocked("profile")) {
            add(Tile("Profil", "Konto zawodnika") { nav.onNative("profile") })
        }
        add(Tile("Wyloguj", "Zakończ sesję") { nav.onLogout() })
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        tiles.chunked(2).forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                row.forEach { tile ->
                    HomePitchTile(
                        title = tile.title,
                        desc = tile.desc,
                        gold = tile.gold,
                        onClick = tile.onClick,
                        modifier = Modifier.weight(1f)
                    )
                }
                if (row.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}
