package pl.akademiawielkichpilkarzy.app.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.TextButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.LineupSelected
import pl.akademiawielkichpilkarzy.app.data.api.SignupRequest
import pl.akademiawielkichpilkarzy.app.data.api.TerminarzResponse
import pl.akademiawielkichpilkarzy.app.ui.common.EmptyHint
import pl.akademiawielkichpilkarzy.app.ui.common.ErrorBlock
import pl.akademiawielkichpilkarzy.app.ui.common.HomePitchTile
import pl.akademiawielkichpilkarzy.app.ui.common.LoadingBlock
import pl.akademiawielkichpilkarzy.app.ui.common.MatchSignupCard
import pl.akademiawielkichpilkarzy.app.ui.common.MurawaBackground
import pl.akademiawielkichpilkarzy.app.ui.common.MundialHeroBanner
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenHeader
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
    var nextLineup by remember { mutableStateOf<LineupSelected?>(null) }
    var weatherLine by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var menuExpanded by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch {
            loading = true
            error = null
            weatherLine = null
            nextLineup = null
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
        Box(modifier = Modifier.fillMaxSize()) {
            val scroll = rememberScrollState()
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scroll)
                    .padding(horizontal = 16.dp)
                    .padding(top = if (menuExpanded) 360.dp else 96.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                ScreenHeader(
                    title = "Start",
                    subtitle = "Najbliższy mecz i skróty jak na stronie"
                )

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

                Spacer(Modifier.height(8.dp))
                PitchLabel("Szybkie skróty")
                HomeQuickActions(nav)
                EmptyHint("Pełne menu jest dostępne w rozwijanym panelu u góry ekranu.")
            }

            HomeFloatingTopPanel(
                nav = nav,
                expanded = menuExpanded,
                onToggleExpanded = { menuExpanded = !menuExpanded },
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .statusBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            )
        }
    }
}

@Composable
private fun HomeFloatingTopPanel(
    nav: HomeNavActions,
    expanded: Boolean,
    onToggleExpanded: () -> Unit,
    modifier: Modifier = Modifier
) {
    data class TopAction(
        val label: String,
        val blockedKey: String,
        val onClick: () -> Unit
    )

    val actions = buildList {
        add(TopAction("Terminarz", "schedule") { nav.onNative("schedule") })
        add(TopAction("Portfel", "wallet") { nav.onNative("wallet") })
    }.filterNot { action -> nav.isBlocked(action.blockedKey) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(
                Brush.horizontalGradient(
                    listOf(
                        AwpColors.MundialNavy.copy(alpha = 0.96f),
                        AwpColors.MundialPurple.copy(alpha = 0.96f),
                        AwpColors.MundialNavy.copy(alpha = 0.96f)
                    )
                )
            )
            .border(1.dp, AwpColors.MundialGold.copy(alpha = 0.45f), RoundedCornerShape(22.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            actions.forEach { action ->
                TopPanelButton(action.label, onClick = action.onClick)
            }
            TopPanelButton(if (expanded) "Zamknij menu" else "Menu", onClick = onToggleExpanded, gold = true)
        }

        if (expanded) {
            Spacer(Modifier.height(10.dp))
            ExpandedMenuSection(
                title = "Gra",
                actions = buildList {
                    if (!nav.isBlocked("schedule")) add("Terminarz" to { nav.onNative("schedule") })
                    if (!nav.isBlocked("lineups")) add("Składy" to { nav.onNative("lineups") })
                    if (!nav.isBlocked("stats")) add("Statystyki" to { nav.onNative("stats") })
                    if (!nav.isBlocked("rankings")) add("Rankingi" to { nav.onNative("rankings") })
                }
            )
            ExpandedMenuSection(
                title = "Akademia",
                actions = buildList {
                    if (!nav.isBlocked("pilkarze")) add("Piłkarze" to { nav.onPortal("Piłkarze", "/pilkarze") })
                    if (!nav.isBlocked("galeria")) add("Galeria" to { nav.onPortal("Galeria", "/galeria") })
                    if (!nav.isBlocked("o_nas")) add("O nas" to { nav.onPortal("O nas", "/o-nas") })
                    if (!nav.isBlocked("kontakt")) add("Kontakt" to { nav.onPortal("Kontakt", "/kontakt") })
                    if (nav.showPzuCup && !nav.isBlocked("pzu_cup")) add("PZU Cup" to { nav.onPortal("PZU Cup", "/pzu-cup") })
                    if (nav.isAdmin) add("Panel admina" to { nav.onPortal("Panel admina", "/panel-admina") })
                }
            )
            ExpandedMenuSection(
                title = "Konto",
                actions = buildList {
                    if (!nav.isBlocked("profile")) add("Profil" to { nav.onNative("profile") })
                    add("Wyloguj" to { nav.onLogout() })
                }
            )
        }
    }
}

@Composable
private fun TopPanelButton(text: String, onClick: () -> Unit, gold: Boolean = false) {
    TextButton(
        onClick = onClick,
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
        colors = ButtonDefaults.textButtonColors(
            containerColor = if (gold) AwpColors.MundialGold.copy(alpha = 0.92f) else Color.White.copy(alpha = 0.12f),
            contentColor = if (gold) AwpColors.PageDark else AwpColors.OnPitch
        ),
        shape = RoundedCornerShape(14.dp)
    ) {
        Text(text, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun ExpandedMenuSection(title: String, actions: List<Pair<String, () -> Unit>>) {
    if (actions.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 8.dp)) {
        Text(
            text = title.uppercase(),
            color = AwpColors.MundialGold,
            fontWeight = FontWeight.Bold
        )
        actions.chunked(2).forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                row.forEach { (label, onClick) ->
                    TextButton(
                        onClick = onClick,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.textButtonColors(
                            containerColor = Color.White.copy(alpha = 0.1f),
                            contentColor = AwpColors.OnPitch
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(label)
                    }
                }
                if (row.size == 1) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun HomeQuickActions(nav: HomeNavActions) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (!nav.isBlocked("schedule")) {
                HomePitchTile(
                    title = "Terminarz",
                    desc = "Mecze i zapisy",
                    onClick = { nav.onNative("schedule") },
                    modifier = Modifier.weight(1f)
                )
            }
            if (!nav.isBlocked("wallet")) {
                HomePitchTile(
                    title = "Płatności",
                    desc = "Portfel i BLIK",
                    onClick = { nav.onNative("wallet") },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}
