package pl.akademiawielkichpilkarzy.app.ui.native

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.AdminUserDto
import pl.akademiawielkichpilkarzy.app.data.api.GalleryResponse
import pl.akademiawielkichpilkarzy.app.data.api.PlayersResponse
import pl.akademiawielkichpilkarzy.app.data.api.RankingsResponse
import pl.akademiawielkichpilkarzy.app.data.api.TerminarzResponse
import pl.akademiawielkichpilkarzy.app.ui.common.AwpActionTile
import pl.akademiawielkichpilkarzy.app.ui.common.AwpListRow
import pl.akademiawielkichpilkarzy.app.ui.common.AwpMetricGrid
import pl.akademiawielkichpilkarzy.app.ui.common.AwpSectionCard
import pl.akademiawielkichpilkarzy.app.ui.common.EmptyHint
import pl.akademiawielkichpilkarzy.app.ui.common.ErrorBlock
import pl.akademiawielkichpilkarzy.app.ui.common.LoadingBlock
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenScaffold
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenPhotoTheme
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

@Composable
fun PlayersScreen() {
    var data by remember { mutableStateOf<PlayersResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    fun reload() {
        loading = true
        error = null
    }

    LaunchedEffect(loading) {
        if (!loading) return@LaunchedEffect
        runCatching { ApiClient.api.players() }
            .onSuccess { data = it; loading = false }
            .onFailure { error = it.message ?: "Nie udało się pobrać piłkarzy"; loading = false }
    }

    ScreenScaffold(title = "Piłkarze", subtitle = "Lista zawodników akademii", kicker = "Drużyna", theme = ScreenPhotoTheme.Players) {
        when {
            loading -> LoadingBlock()
            error != null -> ErrorBlock(error!!) { reload() }
            data?.players.orEmpty().isEmpty() -> EmptyHint("Brak zawodników do pokazania.")
            else -> data!!.players.forEach { player ->
                AwpListRow(
                    title = player.displayName,
                    subtitle = "${player.firstName} ${player.lastName}",
                    label = "Zawodnik #${player.id}"
                )
            }
        }
    }
}

@Composable
fun GalleryScreen() {
    val uriHandler = LocalUriHandler.current
    var data by remember { mutableStateOf<GalleryResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    fun reload() {
        loading = true
        error = null
    }

    LaunchedEffect(loading) {
        if (!loading) return@LaunchedEffect
        runCatching { ApiClient.api.gallery() }
            .onSuccess { data = it; loading = false }
            .onFailure { error = it.message ?: "Nie udało się pobrać galerii"; loading = false }
    }

    ScreenScaffold(title = "Galeria", subtitle = "Filmy i materiały z boiska", kicker = "Wideo", theme = ScreenPhotoTheme.Gallery) {
        when {
            loading -> LoadingBlock()
            error != null -> ErrorBlock(error!!) { reload() }
            data?.videos.orEmpty().isEmpty() -> EmptyHint("Brak opublikowanych filmów.")
            else -> data!!.videos.forEach { video ->
                AwpListRow(
                    title = video.title,
                    subtitle = video.matchDate ?: "YouTube",
                    label = "Film",
                    trailing = "Otwórz",
                    modifier = Modifier.clickable {
                        uriHandler.openUri("https://www.youtube.com/watch?v=${video.youtubeVideoId}")
                    }
                )
            }
        }
    }
}

@Composable
fun AboutScreen() {
    ScreenScaffold(title = "O nas", subtitle = "Zasady akademii i klimat gry", kicker = "Akademia", theme = ScreenPhotoTheme.About) {
        AwpSectionCard(title = "Jak gramy") {
            Text("Umawiamy mecze, zapisujemy obecność, publikujemy składy i prowadzimy statystyki sezonu.", color = AwpColors.OnPitch)
        }
        AwpSectionCard(title = "Zasady") {
            Text("Szanujemy czas drużyny: potwierdzaj udział, odwołuj obecność wcześniej i dbaj o fair play.", color = AwpColors.OnPitch)
        }
    }
}

@Composable
fun ContactScreen() {
    ScreenScaffold(title = "Kontakt", subtitle = "Szybki kontakt z organizatorami", kicker = "Szatnia", theme = ScreenPhotoTheme.Contact) {
        AwpSectionCard(title = "Organizatorzy") {
            AwpListRow(title = "Damian", subtitle = "Kontakt organizacyjny", trailing = "Telefon")
            Spacer(Modifier.height(8.dp))
            AwpListRow(title = "Mateusz", subtitle = "Kontakt organizacyjny", trailing = "Telefon")
            Spacer(Modifier.height(8.dp))
            EmptyHint("Pełne dane kontaktowe pochodzą z ustawień strony i mogą zostać rozszerzone w kolejnym kroku o akcje telefon/mail.")
        }
    }
}

@Composable
fun PzuCupScreen(onOpenSchedule: () -> Unit, onOpenRankings: () -> Unit) {
    var schedule by remember { mutableStateOf<TerminarzResponse?>(null) }
    var rankings by remember { mutableStateOf<RankingsResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    fun reload() {
        loading = true
        error = null
    }

    LaunchedEffect(loading) {
        if (!loading) return@LaunchedEffect
        runCatching {
            ApiClient.api.terminarzRealm("pzu_cup") to ApiClient.api.rankingiRealm("pzu_cup")
        }.onSuccess { (scheduleData, rankingsData) ->
            schedule = scheduleData
            rankings = rankingsData
            loading = false
        }.onFailure {
            error = it.message ?: "Nie udało się pobrać PZU Cup"
            loading = false
        }
    }

    ScreenScaffold(title = "PZU Cup", subtitle = "Turniejowy tryb akademii", kicker = "Turniej", theme = ScreenPhotoTheme.Cup) {
        AwpSectionCard(title = "Centrum PZU Cup", subtitle = "Natywny ekran zastępujący mini-stronę WWW.") {
            AwpMetricGrid(
                listOf(
                    "Tryb" to "Turniej",
                    "Mecze" to schedule?.matches.orEmpty().size.toString(),
                    "Ranking" to rankings?.rankings?.punkty.orEmpty().size.toString()
                )
            )
        }
        when {
            loading -> LoadingBlock()
            error != null -> ErrorBlock(error!!) { reload() }
            else -> {
                AwpSectionCard(title = "Najbliższe mecze") {
                    val upcoming = schedule?.upcoming.orEmpty().take(3)
                    if (upcoming.isEmpty()) {
                        EmptyHint("Brak zaplanowanych meczów PZU Cup.")
                    } else {
                        upcoming.forEach { match ->
                            AwpListRow(
                                title = match.location,
                                subtitle = "${match.matchDate} ${match.matchTime}",
                                label = "Mecz #${match.id}",
                                trailing = "${match.signedUp ?: 0}/${match.maxSlots ?: 0}"
                            )
                            Spacer(Modifier.height(8.dp))
                        }
                    }
                }
                AwpSectionCard(title = "Podium punktowe") {
                    val top = rankings?.rankings?.punkty.orEmpty().take(5)
                    if (top.isEmpty()) {
                        EmptyHint("Brak rankingu PZU Cup.")
                    } else {
                        top.forEach { row ->
                            AwpListRow(
                                title = row.zawodnik.ifBlank { "${row.firstName} ${row.lastName}" },
                                subtitle = "Gole ${row.goals} • Asysty ${row.assists}",
                                label = "#${row.rank}",
                                trailing = row.punkty.toString(),
                                gold = row.rank <= 3
                            )
                            Spacer(Modifier.height(8.dp))
                        }
                    }
                }
            }
        }
        AwpActionTile(title = "Terminarz PZU", desc = "Mecze turniejowe", onClick = onOpenSchedule)
        AwpActionTile(title = "Rankingi PZU", desc = "Klasyfikacje turniejowe", onClick = onOpenRankings, gold = true)
    }
}

@Composable
fun AdminShellScreen() {
    var users by remember { mutableStateOf<List<AdminUserDto>>(emptyList()) }
    var schedule by remember { mutableStateOf<TerminarzResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val sections = listOf(
        "Przegląd", "Analityka", "Użytkownicy", "Wiadomości", "Portfele", "Mecze",
        "Składy", "Statystyki", "Rankingi", "PZU Cup", "Galeria", "Zaślepki", "Ustawienia"
    )

    fun reload() {
        loading = true
        error = null
    }

    LaunchedEffect(loading) {
        if (!loading) return@LaunchedEffect
        runCatching {
            ApiClient.api.adminUsers() to ApiClient.api.terminarz()
        }.onSuccess { (adminUsers, scheduleData) ->
            users = adminUsers
            schedule = scheduleData
            loading = false
        }.onFailure {
            error = it.message ?: "Nie udało się pobrać panelu admina"
            loading = false
        }
    }

    ScreenScaffold(title = "Panel admina", subtitle = "Natywne centrum zarządzania", kicker = "Admin", theme = ScreenPhotoTheme.Admin) {
        when {
            loading -> LoadingBlock()
            error != null -> ErrorBlock(error!!) { reload() }
            else -> {
                AwpSectionCard(title = "Dashboard") {
                    AwpMetricGrid(
                        listOf(
                            "Użytkownicy" to users.size.toString(),
                            "Mecze" to schedule?.matches.orEmpty().size.toString(),
                            "Najbliższe" to schedule?.upcoming.orEmpty().size.toString(),
                            "Archiwum" to schedule?.playedConfirmed.orEmpty().size.toString()
                        )
                    )
                }
                AwpSectionCard(title = "Użytkownicy") {
                    users.take(8).forEach { user ->
                        AwpListRow(
                            title = user.displayName,
                            subtitle = "${user.firstName} ${user.lastName}",
                            label = "ID ${user.id}",
                            trailing = "Profil"
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                    if (users.isEmpty()) EmptyHint("Brak użytkowników.")
                }
                AwpSectionCard(title = "Najbliższe mecze") {
                    schedule?.upcoming.orEmpty().take(5).forEach { match ->
                        AwpListRow(
                            title = match.location,
                            subtitle = "${match.matchDate} ${match.matchTime}",
                            label = "Mecz #${match.id}",
                            trailing = "${match.signedUp ?: 0}/${match.maxSlots ?: 0}"
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                    if (schedule?.upcoming.orEmpty().isEmpty()) EmptyHint("Brak najbliższych meczów.")
                }
            }
        }
        AwpSectionCard(title = "Moduły") {
            sections.forEachIndexed { index, section ->
                AwpListRow(
                    title = section,
                    subtitle = "Moduł administracyjny",
                    label = "Zakładka ${index + 1}",
                    trailing = "Native",
                    gold = index < 3
                )
                Spacer(Modifier.height(8.dp))
            }
        }
        Text("Panel admina działa natywnie w aplikacji; WebView nie jest już trasą dla /panel-admina.", color = AwpColors.OnPitchMuted, fontWeight = FontWeight.SemiBold)
    }
}
