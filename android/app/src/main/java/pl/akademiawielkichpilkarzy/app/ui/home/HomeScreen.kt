package pl.akademiawielkichpilkarzy.app.ui.home

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.LineupSelected
import pl.akademiawielkichpilkarzy.app.data.api.MeUser
import pl.akademiawielkichpilkarzy.app.data.api.SignupRequest
import pl.akademiawielkichpilkarzy.app.data.api.TerminarzResponse
import pl.akademiawielkichpilkarzy.app.ui.common.AwpHeroCard
import pl.akademiawielkichpilkarzy.app.ui.common.EmptyHint
import pl.akademiawielkichpilkarzy.app.ui.common.ErrorBlock
import pl.akademiawielkichpilkarzy.app.ui.common.HomeLogoutTile
import pl.akademiawielkichpilkarzy.app.ui.common.HomePitchTile
import pl.akademiawielkichpilkarzy.app.ui.common.HomeWelcomeBanner
import pl.akademiawielkichpilkarzy.app.ui.common.LoadingBlock
import pl.akademiawielkichpilkarzy.app.ui.common.MatchSignupCard
import pl.akademiawielkichpilkarzy.app.ui.common.MurawaBackground
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
    var user by remember { mutableStateOf<MeUser?>(null) }
    var nextLineup by remember { mutableStateOf<LineupSelected?>(null) }
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
            nextLineup = null
            try {
                user = ApiClient.api.me().user
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
                if (next != null) {
                    try {
                        val lineup = ApiClient.api.sklady(next.id).selected
                        if (lineup?.id == next.id) {
                            nextLineup = lineup
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

    MurawaBackground {
        val scroll = rememberScrollState()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scroll)
                .padding(horizontal = 16.dp, vertical = 18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            user?.let { me ->
                HomeWelcomeBanner(
                    firstName = me.firstName,
                    lastName = me.lastName,
                    zawodnik = me.zawodnik
                )
            }

            AwpHeroCard(
                title = "Co dziś na boisku?",
                subtitle = "Wybierz sekcję poniżej — terminarz, składy, statystyki i portfel.",
                kicker = "Start"
            )

            when {
                loading -> LoadingBlock()
                error != null -> ErrorBlock(error!!) { reload() }
                else -> {
                    val next = data?.upcoming?.firstOrNull()
                    if (next != null) {
                        MatchSignupCard(
                            match = next,
                            signupKind = data?.userSignupKind?.get(next.id.toString()),
                            playersEntry = data?.playersData?.get(next.id.toString()),
                            weatherLine = weatherLine,
                            lineup = nextLineup,
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
                            onTransport = { nav.onOpenTransport(next.id) },
                            onOpenLineups = { nav.onNative("lineups") }
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

            HomeTileGrid(nav)

            Spacer(Modifier.height(8.dp))
        }
    }
}

private data class HomeTile(
    val title: String,
    val desc: String,
    val gold: Boolean,
    val icon: ImageVector,
    val onClick: () -> Unit
)

@Composable
private fun HomeTileGrid(nav: HomeNavActions) {
    val tiles = buildList {
        if (!nav.isBlocked("schedule")) {
            add(
                HomeTile(
                    title = "Terminarz",
                    desc = "Mecze, zapisy, terminy",
                    gold = false,
                    icon = Icons.Filled.CalendarMonth,
                    onClick = { nav.onNative("schedule") }
                )
            )
        }
        if (!nav.isBlocked("pilkarze")) {
            add(
                HomeTile(
                    title = "Piłkarze",
                    desc = "Skład i profile",
                    gold = false,
                    icon = Icons.Filled.Groups,
                    onClick = { nav.onPortal("Piłkarze", "/pilkarze") }
                )
            )
        }
        if (!nav.isBlocked("wallet")) {
            add(
                HomeTile(
                    title = "Płatności",
                    desc = "BLIK i status wpłaty za mecz",
                    gold = false,
                    icon = Icons.Filled.AccountBalanceWallet,
                    onClick = { nav.onNative("wallet") }
                )
            )
        }
        if (!nav.isBlocked("stats")) {
            add(
                HomeTile(
                    title = "Statystyki",
                    desc = "Twoje liczby z boiska",
                    gold = false,
                    icon = Icons.Filled.Assessment,
                    onClick = { nav.onNative("stats") }
                )
            )
        }
        if (!nav.isBlocked("rankings")) {
            add(
                HomeTile(
                    title = "Rankingi",
                    desc = "Gole, asysty, punkty",
                    gold = true,
                    icon = Icons.Filled.EmojiEvents,
                    onClick = { nav.onNative("rankings") }
                )
            )
        }
        if (nav.showPzuCup && !nav.isBlocked("pzu_cup")) {
            add(
                HomeTile(
                    title = "PZU Cup",
                    desc = "Organizacja turnieju PZU Cup 2026",
                    gold = true,
                    icon = Icons.Filled.Star,
                    onClick = { nav.onPortal("PZU Cup", "/pzu-cup") }
                )
            )
        }
        if (nav.isAdmin) {
            add(
                HomeTile(
                    title = "Panel admina",
                    desc = "Zarządzanie akademią",
                    gold = false,
                    icon = Icons.Filled.Shield,
                    onClick = { nav.onPortal("Panel admina", "/panel-admina") }
                )
            )
        }
    }

    if (tiles.isEmpty()) {
        EmptyHint("Brak dostępnych skrótów.")
        return
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
                        icon = tile.icon,
                        onClick = tile.onClick,
                        modifier = Modifier.weight(1f)
                    )
                }
                if (row.size == 1) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
        HomeLogoutTile(
            onClick = nav.onLogout,
            icon = Icons.Filled.Logout,
            modifier = Modifier.fillMaxWidth()
        )
    }
}
