package pl.akademiawielkichpilkarzy.app.ui.schedule

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import pl.akademiawielkichpilkarzy.app.data.api.AddMatchRequest
import pl.akademiawielkichpilkarzy.app.data.api.AdminMatchSignupRow
import pl.akademiawielkichpilkarzy.app.data.api.AdminUserDto
import pl.akademiawielkichpilkarzy.app.data.api.MatchDto
import pl.akademiawielkichpilkarzy.app.data.api.PlayersDataEntryDto
import pl.akademiawielkichpilkarzy.app.ui.common.AwpGoldButton
import pl.akademiawielkichpilkarzy.app.ui.common.AwpHeroCard
import pl.akademiawielkichpilkarzy.app.ui.common.AwpStatusMessage
import pl.akademiawielkichpilkarzy.app.ui.common.AwpModal
import pl.akademiawielkichpilkarzy.app.ui.common.AwpPrimaryButton
import pl.akademiawielkichpilkarzy.app.ui.common.AwpSecondaryButton
import pl.akademiawielkichpilkarzy.app.ui.common.AwpTextField
import pl.akademiawielkichpilkarzy.app.ui.common.EmptyHint
import pl.akademiawielkichpilkarzy.app.ui.common.ErrorBlock
import pl.akademiawielkichpilkarzy.app.ui.common.LinkTextButton
import pl.akademiawielkichpilkarzy.app.ui.common.LoadingBlock
import pl.akademiawielkichpilkarzy.app.ui.common.MatchSignupCard
import pl.akademiawielkichpilkarzy.app.ui.common.MurawaBackground
import pl.akademiawielkichpilkarzy.app.ui.common.PitchCard
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.common.PitchPanel
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

@Composable
fun ScheduleScreen(
    viewModel: ScheduleViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val clipboard = LocalClipboardManager.current
    var rosterMatch by remember { mutableStateOf<MatchDto?>(null) }
    var statsMatch by remember { mutableStateOf<MatchDto?>(null) }
    var addMatchOpen by remember { mutableStateOf(false) }
    val matches = viewModel.filteredMatches()

    MurawaBackground {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                AwpHeroCard(
                    title = "Terminarz",
                    subtitle = "Lista, kalendarz, zapisy i administracja w jednym meczowym centrum.",
                    kicker = "Mecze"
                )
            }

            item {
                ScheduleToolbar(
                    state = state,
                    onTab = viewModel::setTab,
                    onView = viewModel::setView,
                    onSearch = viewModel::setSearch,
                    onFilter = viewModel::setFilter,
                    onPeriod = viewModel::setPeriod,
                    onSort = viewModel::setSort,
                    onOnlyMine = viewModel::setOnlyMine,
                    onAddMatch = { addMatchOpen = true }
                )
            }

            state.actionMessage?.let { message ->
                item {
                    AwpStatusMessage(
                        message = message,
                        isError = message.startsWith("Nie") || message.startsWith("Błąd"),
                        actionText = "Zamknij",
                        onAction = viewModel::clearMessage
                    )
                }
            }

            when {
                state.loading -> item { LoadingBlock() }
                state.error != null -> item { ErrorBlock(state.error!!) { viewModel.reload() } }
                state.view == ScheduleView.Calendar -> item {
                    CalendarView(
                        state = state,
                        matches = matches,
                        onPrevious = { viewModel.shiftCalendar(-1) },
                        onNext = { viewModel.shiftCalendar(1) },
                        onMatch = { rosterMatch = it }
                    )
                }
                matches.isEmpty() -> item { EmptyHint("Brak meczów dla wybranych filtrów.") }
                else -> items(matches, key = { "${state.tab}-${it.id}" }) { match ->
                    ScheduleMatchCard(
                        match = match,
                        state = state,
                        showArchiveBadge = state.tab == ScheduleTab.Archive,
                        onConfirm = { viewModel.signup(match.id, "confirmed") { viewModel.openTransport(match) } },
                        onTentative = { viewModel.signup(match.id, "tentative") },
                        onDeclined = { viewModel.signup(match.id, "declined") },
                        onUnsubscribe = { viewModel.unsubscribe(match.id) },
                        onTransport = { viewModel.openTransport(match) },
                        onStats = {
                            statsMatch = match
                        },
                        onRoster = { rosterMatch = match },
                        onInvite = {
                            clipboard.setText(AnnotatedString("/zaproszenie/${match.id}"))
                            viewModel.showMessage("Skopiowano link zaproszenia")
                        },
                        onManage = { viewModel.openAdmin(match) }
                    )
                }
            }
        }
    }

    rosterMatch?.let { match ->
        RosterDialog(
            match = match,
            entry = state.data?.playersData?.get(match.id.toString()),
            onDismiss = { rosterMatch = null }
        )
    }
    if (addMatchOpen) {
        AddMatchDialog(
            defaultsLocation = state.data?.matchDefaults?.location.orEmpty(),
            defaultsSlots = state.data?.matchDefaults?.maxSlots ?: 18,
            defaultsFee = state.data?.matchDefaults?.feePln,
            onDismiss = { addMatchOpen = false },
            onSave = {
                viewModel.addMatch(it)
                addMatchOpen = false
            }
        )
    }
    state.adminPanel?.let { panel ->
        AdminMatchDialog(
            panel = panel,
            onDismiss = viewModel::closeAdmin,
            onEdit = viewModel::editMatch,
            onSetPlayed = viewModel::setPlayed,
            onCancel = viewModel::cancelMatch,
            onAddGuest = viewModel::addGuest,
            onAddSignup = viewModel::adminAddSignup,
            onRemoveSignup = viewModel::adminRemoveSignup,
                onRemoveGuest = viewModel::adminRemoveGuest,
            onToggleAttendance = viewModel::toggleAttendance,
            onSaveAttendance = viewModel::saveAttendance,
            onSettle = viewModel::settleMatch
        )
    }
    state.transportPanel?.let { panel ->
        TransportDialog(
            panel = panel,
            onDismiss = viewModel::closeTransport,
            onSavePrefs = viewModel::saveTransport,
            onSendMessage = viewModel::sendTransportMessage
        )
    }
    statsMatch?.let { match ->
        StatsDialog(
            match = match,
            onDismiss = { statsMatch = null },
            onSave = { goals, assists, distance, saves ->
                viewModel.saveStats(match.id, goals, assists, distance, saves)
                statsMatch = null
            }
        )
    }
}

@Composable
private fun ScheduleToolbar(
    state: ScheduleUiState,
    onTab: (ScheduleTab) -> Unit,
    onView: (ScheduleView) -> Unit,
    onSearch: (String) -> Unit,
    onFilter: (ScheduleFilter) -> Unit,
    onPeriod: (SchedulePeriod) -> Unit,
    onSort: (ScheduleSort) -> Unit,
    onOnlyMine: (Boolean) -> Unit,
    onAddMatch: () -> Unit
) {
    val chipColors = FilterChipDefaults.filterChipColors(
        selectedContainerColor = AwpColors.MundialTeal,
        selectedLabelColor = Color.White,
        containerColor = Color.White.copy(alpha = 0.12f),
        labelColor = AwpColors.OnPitch
    )
    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = AwpColors.MundialGold,
        unfocusedBorderColor = Color.White.copy(alpha = 0.35f),
        focusedLabelColor = AwpColors.MundialGold,
        unfocusedLabelColor = AwpColors.OnPitchMuted,
        cursorColor = AwpColors.MundialGold,
        focusedTextColor = AwpColors.OnPitch,
        unfocusedTextColor = AwpColors.OnPitch
    )

    PitchCard {
        PitchLabel("Widok")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
            FilterChip(state.tab == ScheduleTab.Upcoming, { onTab(ScheduleTab.Upcoming) }, { Text("Do rozegrania") }, colors = chipColors)
            FilterChip(state.tab == ScheduleTab.Archive, { onTab(ScheduleTab.Archive) }, { Text("Archiwum") }, colors = chipColors)
            FilterChip(state.view == ScheduleView.List, { onView(ScheduleView.List) }, { Text("Lista") }, colors = chipColors)
            FilterChip(state.view == ScheduleView.Calendar, { onView(ScheduleView.Calendar) }, { Text("Kalendarz") }, colors = chipColors)
        }
        Spacer(Modifier.height(10.dp))
        PitchLabel("Szukaj")
        OutlinedTextField(
            value = state.search,
            onValueChange = onSearch,
            label = { Text("Szukaj miejsca") },
            colors = fieldColors,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(10.dp))
        PitchLabel("Dostępność")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
            ScheduleFilter.entries.forEach { f ->
                FilterChip(state.filter == f, { onFilter(f) }, { Text(f.label()) }, colors = chipColors)
            }
        }
        Spacer(Modifier.height(10.dp))
        PitchLabel("Czas i moje mecze")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
            SchedulePeriod.entries.forEach { p ->
                FilterChip(state.period == p, { onPeriod(p) }, { Text(p.label()) }, colors = chipColors)
            }
            FilterChip(state.sort == ScheduleSort.Desc, { onSort(if (state.sort == ScheduleSort.Asc) ScheduleSort.Desc else ScheduleSort.Asc) }, { Text(if (state.sort == ScheduleSort.Asc) "Od najstarszych" else "Od najnowszych") }, colors = chipColors)
            FilterChip(state.onlyMine, { onOnlyMine(!state.onlyMine) }, { Text("Tylko moje") }, colors = chipColors)
        }
        if (state.isAdmin) {
            Spacer(Modifier.height(8.dp))
            AwpGoldButton("Dodaj mecz", onClick = onAddMatch)
        }
    }
}

@Composable
private fun ScheduleMatchCard(
    match: MatchDto,
    state: ScheduleUiState,
    showArchiveBadge: Boolean,
    onConfirm: () -> Unit,
    onTentative: () -> Unit,
    onDeclined: () -> Unit,
    onUnsubscribe: () -> Unit,
    onTransport: () -> Unit,
    onStats: () -> Unit,
    onRoster: () -> Unit,
    onInvite: () -> Unit,
    onManage: () -> Unit
) {
    MatchSignupCard(
        match = match,
        signupKind = state.data?.userSignupKind?.get(match.id.toString()),
        playersEntry = state.data?.playersData?.get(match.id.toString()),
        weatherLine = state.weatherByMatchId[match.id],
        showArchiveBadge = showArchiveBadge,
        needsStats = match.id in state.missingStatsIds,
        isAdmin = state.isAdmin,
        onConfirmSignup = onConfirm,
        onTentative = onTentative,
        onDeclined = onDeclined,
        onUnsubscribe = onUnsubscribe,
        onTransport = onTransport,
        onAddStats = onStats,
        onOpenRoster = onRoster,
        onCopyInvite = onInvite,
        onManage = onManage
    )
}

@Composable
private fun CalendarView(
    state: ScheduleUiState,
    matches: List<MatchDto>,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onMatch: (MatchDto) -> Unit
) {
    val monthMatches = matches.filter { it.localDateOrNull()?.let { d -> java.time.YearMonth.from(d) == state.calendarMonth } == true }
        .groupBy { it.localDateOrNull()?.dayOfMonth ?: 0 }
    PitchCard {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            TextButton(onClick = onPrevious) { Text("Poprzedni", color = AwpColors.MundialGold) }
            Text(
                "${state.calendarMonth.monthValue}.${state.calendarMonth.year}",
                color = AwpColors.OnPitch,
                fontWeight = FontWeight.Bold,
                style = MaterialTheme.typography.titleLarge
            )
            TextButton(onClick = onNext) { Text("Następny", color = AwpColors.MundialGold) }
        }
        if (monthMatches.isEmpty()) {
            EmptyHint("Brak meczów w tym miesiącu dla wybranych filtrów.")
        } else {
            monthMatches.toSortedMap().forEach { (day, dayMatches) ->
                PitchPanel {
                    PitchLabel("Dzień $day")
                    dayMatches.forEach { match ->
                        Text(
                            "${match.matchTime} · ${match.location}",
                            color = AwpColors.OnPitch,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp)
                        )
                        LinkTextButton("Podgląd składu i szczegółów") { onMatch(match) }
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun RosterDialog(match: MatchDto, entry: PlayersDataEntryDto?, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Zamknij") } },
        title = { Text("Skład: ${match.matchDate}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                RosterGroup("Potwierdzeni", entry?.players.orEmpty())
                RosterGroup("Jeszcze nie wiedzą", entry?.tentativePlayers.orEmpty())
                RosterGroup("Nie biorą", entry?.declinedPlayers.orEmpty())
            }
        }
    )
}

@Composable
private fun RosterGroup(title: String, players: List<pl.akademiawielkichpilkarzy.app.data.api.TerminarzPlayerEntry>) {
    PitchLabel("$title (${players.size})")
    Text(players.joinToString { it.displayName }.ifBlank { "Brak" }, color = AwpColors.OnPitch)
}

@Composable
private fun AddMatchDialog(
    defaultsLocation: String,
    defaultsSlots: Int,
    defaultsFee: Double?,
    onDismiss: () -> Unit,
    onSave: (AddMatchRequest) -> Unit
) {
    var date by remember { mutableStateOf("") }
    var time by remember { mutableStateOf("") }
    var location by remember { mutableStateOf(defaultsLocation) }
    var maxSlots by remember { mutableStateOf(defaultsSlots.toString()) }
    var fee by remember { mutableStateOf(defaultsFee?.toString().orEmpty()) }
    var pin by remember { mutableStateOf("") }
    FormDialog(
        title = "Dodaj mecz",
        onDismiss = onDismiss,
        onSave = {
            onSave(
                AddMatchRequest(
                    date = date,
                    time = time,
                    location = location,
                    maxSlots = maxSlots.toIntOrNull() ?: defaultsSlots,
                    feePln = fee.replace(',', '.').toDoubleOrNull(),
                    gatePin = pin
                )
            )
        }
    ) {
        TextFieldLine("Data YYYY-MM-DD", date) { date = it }
        TextFieldLine("Godzina HH:MM", time) { time = it }
        TextFieldLine("Lokalizacja", location) { location = it }
        TextFieldLine("Miejsca", maxSlots, KeyboardType.Number) { maxSlots = it.filter(Char::isDigit) }
        TextFieldLine("Wynajem PLN", fee, KeyboardType.Decimal) { fee = it.filter { ch -> ch.isDigit() || ch == '.' || ch == ',' } }
        TextFieldLine("PIN bramki", pin, KeyboardType.Number) { pin = it.filter(Char::isDigit) }
    }
}

@Composable
private fun AdminTabs(selected: AdminManageTab, onSelect: (AdminManageTab) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        AdminManageTab.entries.chunked(2).forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                row.forEach { tab ->
                    FilterChip(
                        selected = selected == tab,
                        onClick = { onSelect(tab) },
                        label = {
                            Text(
                                tab.label,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                style = MaterialTheme.typography.labelMedium
                            )
                        },
                        modifier = Modifier.weight(1f),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = if (tab == AdminManageTab.Cancel) AwpColors.MundialRed else AwpColors.MundialTeal,
                            selectedLabelColor = Color.White,
                            containerColor = AwpColors.PitchCard,
                            labelColor = AwpColors.OnPitch
                        )
                    )
                }
                if (row.size == 1) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

private enum class AdminManageTab(val label: String) {
    Edit("Edycja"),
    Guest("Gość"),
    Signups("Zapisy"),
    Cancel("Anuluj")
}

@Composable
private fun AdminMatchDialog(
    panel: AdminPanelState,
    onDismiss: () -> Unit,
    onEdit: (Int, String, String, String, Int, Double?, String?) -> Unit,
    onSetPlayed: (Int, Boolean) -> Unit,
    onCancel: (Int, String) -> Unit,
    onAddGuest: (Int, String, String, String) -> Unit,
    onAddSignup: (Int, Int) -> Unit,
    onRemoveSignup: (Int, Int) -> Unit,
    onRemoveGuest: (Int, Int) -> Unit,
    onToggleAttendance: (Int) -> Unit,
    onSaveAttendance: (Int) -> Unit,
    onSettle: (Int, Double, String?) -> Unit
) {
    val match = panel.match
    var tab by remember(match.id) { mutableStateOf(AdminManageTab.Edit) }
    var date by remember(match.id) { mutableStateOf(match.matchDate) }
    var time by remember(match.id) { mutableStateOf(match.matchTime) }
    var location by remember(match.id) { mutableStateOf(match.location) }
    var maxSlots by remember(match.id) { mutableStateOf((match.maxSlots ?: 18).toString()) }
    var fee by remember(match.id) { mutableStateOf(match.feePln?.let { "%.2f".format(it).replace(',', '.') } ?: "") }
    var pin by remember(match.id) { mutableStateOf(match.gatePin.orEmpty()) }
    var cancelReason by remember { mutableStateOf("weather") }
    var guestFirst by remember { mutableStateOf("") }
    var guestLast by remember { mutableStateOf("") }
    var guestAlias by remember { mutableStateOf("") }
    var query by remember { mutableStateOf("") }
    var settleAmount by remember { mutableStateOf("") }
    var settleNote by remember { mutableStateOf("Rozliczenie meczu") }

    FormDialog(title = "Zarządzaj meczem", onDismiss = onDismiss, onSave = {
        when (tab) {
            AdminManageTab.Edit -> onEdit(
                match.id,
                date,
                time,
                location.trim(),
                maxSlots.toIntOrNull() ?: (match.maxSlots ?: 18),
                fee.replace(',', '.').toDoubleOrNull(),
                pin.filter(Char::isDigit).takeIf { it.isNotBlank() }
            )
            AdminManageTab.Guest -> {
                if (guestFirst.isNotBlank() && guestLast.isNotBlank() && guestAlias.isNotBlank()) {
                    onAddGuest(match.id, guestFirst.trim(), guestLast.trim(), guestAlias.trim())
                    guestFirst = ""; guestLast = ""; guestAlias = ""
                }
            }
            AdminManageTab.Signups -> onDismiss()
            AdminManageTab.Cancel -> onCancel(match.id, cancelReason)
        }
    }, saveText = when (tab) {
        AdminManageTab.Edit -> "Zapisz zmiany"
        AdminManageTab.Guest -> "Dodaj gościa"
        AdminManageTab.Signups -> "Zamknij"
        AdminManageTab.Cancel -> "Anuluj mecz"
    }) {
        if (panel.loading) LoadingBlock()
        Text(
            "Edytuj termin, dopisz gościa, zarządzaj zapisami lub odwołaj mecz — zmiany widzą zapisani zawodnicy.",
            color = AwpColors.OnPitchMuted,
            style = MaterialTheme.typography.bodySmall
        )
        PitchPanel {
            Text("${match.matchDate} · ${match.matchTime}", color = AwpColors.OnPitch, fontWeight = FontWeight.SemiBold)
            Text(match.location, color = AwpColors.OnPitchMuted)
        }
        AdminTabs(tab, onSelect = { tab = it })

        when (tab) {
            AdminManageTab.Edit -> {
                PitchLabel("Edycja")
                Text("Zmień datę, godzinę, miejsce, liczbę miejsc, składkę i PIN do bramy.", color = AwpColors.OnPitchMuted)
                TextFieldLine("Data", date) { date = it }
                TextFieldLine("Godzina", time) { time = it }
                TextFieldLine("Miejsce", location) { location = it }
                TextFieldLine("Liczba graczy (miejsc)", maxSlots, KeyboardType.Number) { maxSlots = it.filter(Char::isDigit) }
                TextFieldLine("Wynajem boiska (zł)", fee, KeyboardType.Decimal) { fee = it.filter { ch -> ch.isDigit() || ch == '.' || ch == ',' } }
                TextFieldLine("PIN do bramy", pin, KeyboardType.Number) { pin = it.filter(Char::isDigit).take(6) }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(
                        onClick = { onSetPlayed(match.id, true) },
                        modifier = Modifier.weight(1f)
                    ) { Text("Rozegrany", maxLines = 1, overflow = TextOverflow.Ellipsis) }
                    OutlinedButton(
                        onClick = { onSetPlayed(match.id, false) },
                        modifier = Modifier.weight(1f)
                    ) { Text("Cofnij", maxLines = 1, overflow = TextOverflow.Ellipsis) }
                }
            }
            AdminManageTab.Guest -> {
                PitchLabel("Gość")
                Text("Zapisz osobę grającą jednorazowo. Gość może zostać usunięty, gdy saldo portfela wynosi 0.", color = AwpColors.OnPitchMuted)
                val guests = panel.signups.filter { it.isTemporary == 1 }
                if (guests.isEmpty()) {
                    EmptyHint("Brak gości zapisanych na ten mecz.")
                } else {
                    guests.forEach { guest ->
                        PitchPanel {
                            Text(guest.displayName, color = AwpColors.OnPitch, fontWeight = FontWeight.SemiBold)
                            AwpSecondaryButton("Usuń gościa") { onRemoveGuest(match.id, guest.userId) }
                        }
                    }
                }
                TextFieldLine("Imię", guestFirst) { guestFirst = it }
                TextFieldLine("Nazwisko", guestLast) { guestLast = it }
                TextFieldLine("Pseudonim (unikalny)", guestAlias) { guestAlias = it }
            }
            AdminManageTab.Signups -> {
                PitchLabel("Zapisy")
                Text("Wyszukaj piłkarza i dopisz albo wypisz z listy. Ta operacja dotyczy potwierdzonych miejsc w składzie.", color = AwpColors.OnPitchMuted)
                TextFieldLine("Szukaj piłkarza", query) { query = it }
                val signedIds = panel.signups.filter { it.commitment == 1 }.map { it.userId }.toSet()
                val users = panel.users
                    .filter { user ->
                        val q = query.trim().lowercase()
                        q.isBlank() || user.displayName.lowercase().contains(q) ||
                            user.firstName.lowercase().contains(q) ||
                            user.lastName.lowercase().contains(q)
                    }
                    .take(if (query.isBlank()) 30 else 50)
                if (users.isEmpty()) {
                    EmptyHint("Brak wyników.")
                } else {
                    users.forEach { user ->
                        AdminUserRow(
                            user = user,
                            signed = user.id in signedIds,
                            onAdd = { onAddSignup(match.id, user.id) },
                            onRemove = { onRemoveSignup(match.id, user.id) }
                        )
                    }
                }
                PitchLabel("Obecność")
                panel.signups.filter { it.commitment == 1 }.forEach { signup ->
                    SignupAdminRow(signup, signup.userId in panel.presentUserIds, onToggleAttendance, onRemoveSignup, match.id)
                }
                AwpSecondaryButton("Zapisz obecność") { onSaveAttendance(match.id) }
                PitchLabel("Rozliczenie")
                TextFieldLine("Kwota na osobę", settleAmount, KeyboardType.Decimal) { settleAmount = it.filter { ch -> ch.isDigit() || ch == '.' || ch == ',' } }
                TextFieldLine("Notatka", settleNote) { settleNote = it }
                AwpGoldButton("Rozlicz potwierdzonych") {
                    settleAmount.replace(',', '.').toDoubleOrNull()?.let { onSettle(match.id, it, settleNote.ifBlank { null }) }
                }
            }
            AdminManageTab.Cancel -> {
                PitchLabel("Anuluj")
                Text("Anulowanie oznacza termin jako odwołany. Zapisani zawodnicy zobaczą powód.", color = AwpColors.MundialRed)
                CancelReasonPicker(cancelReason) { cancelReason = it }
            }
        }
    }
}

@Composable
private fun CancelReasonPicker(selected: String, onSelect: (String) -> Unit) {
    val reasons = listOf(
        "no-lineup" to "Brak składu",
        "weather" to "Pogoda",
        "field-unavailable" to "Boisko niedostępne",
        "insufficient-players" to "Niewystarczająca liczba zawodników",
        "admin-decision" to "Decyzja administratora"
    )
    Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
        reasons.forEach { (value, label) ->
            FilterChip(
                selected = selected == value,
                onClick = { onSelect(value) },
                label = {
                    Text(
                        label,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        style = MaterialTheme.typography.bodySmall
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = AwpColors.MundialRed,
                    selectedLabelColor = Color.White,
                    containerColor = AwpColors.PitchCard,
                    labelColor = AwpColors.OnPitch
                )
            )
        }
    }
}

@Composable
private fun AdminUserRow(
    user: AdminUserDto,
    signed: Boolean,
    onAdd: () -> Unit,
    onRemove: () -> Unit
) {
    PitchPanel {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f)) {
                Text(user.displayName, color = AwpColors.OnPitch, fontWeight = FontWeight.SemiBold)
                Text("ID: ${user.id}", color = AwpColors.OnPitchMuted, style = MaterialTheme.typography.bodySmall)
            }
            OutlinedButton(onClick = if (signed) onRemove else onAdd) {
                Text(if (signed) "Wypisz" else "Zapisz")
            }
        }
    }
}

@Composable
private fun SignupAdminRow(
    signup: AdminMatchSignupRow,
    present: Boolean,
    onToggleAttendance: (Int) -> Unit,
    onRemoveSignup: (Int, Int) -> Unit,
    matchId: Int
) {
    PitchPanel {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f)) {
                Text(signup.displayName, color = AwpColors.OnPitch, fontWeight = FontWeight.SemiBold)
                Text("Status: ${signup.commitment} · opłata: ${if (signup.paid == 1) "tak" else "nie"}", color = AwpColors.OnPitchMuted)
            }
            Checkbox(checked = present, onCheckedChange = { onToggleAttendance(signup.userId) })
        }
        LinkTextButton("Wypisz") { onRemoveSignup(matchId, signup.userId) }
    }
}

@Composable
private fun TransportDialog(
    panel: TransportPanelState,
    onDismiss: () -> Unit,
    onSavePrefs: (Int, Boolean, Boolean, Boolean) -> Unit,
    onSendMessage: (Int, String) -> Unit
) {
    var drives by remember { mutableStateOf(false) }
    var seats by remember { mutableStateOf(false) }
    var needs by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    FormDialog(title = "Transport", onDismiss = onDismiss, onSave = {
        onSavePrefs(panel.match.id, drives, seats, needs)
    }, saveText = "Zapisz transport") {
        Row { Checkbox(drives, { drives = it }); Text("Jadę autem", color = AwpColors.OnPitch) }
        Row { Checkbox(seats, { seats = it }); Text("Mogę zabrać pasażerów", color = AwpColors.OnPitch) }
        Row { Checkbox(needs, { needs = it }); Text("Potrzebuję transportu", color = AwpColors.OnPitch) }
        PitchLabel("Czat")
        if (panel.loading) LoadingBlock()
        panel.messages.forEach { msg ->
            PitchPanel {
                Text(msg.displayName, color = AwpColors.MundialGold, fontWeight = FontWeight.SemiBold)
                Text(msg.body, color = AwpColors.OnPitch)
            }
        }
        TextFieldLine("Wiadomość", message) { message = it }
        AwpSecondaryButton("Wyślij") {
            if (message.isNotBlank()) {
                onSendMessage(panel.match.id, message)
                message = ""
            }
        }
    }
}

@Composable
private fun StatsDialog(
    match: MatchDto,
    onDismiss: () -> Unit,
    onSave: (Int, Int, Double, Int) -> Unit
) {
    var goals by remember { mutableStateOf("0") }
    var assists by remember { mutableStateOf("0") }
    var distance by remember { mutableStateOf("0") }
    var saves by remember { mutableStateOf("0") }
    FormDialog(title = "Statystyki: ${match.matchDate}", onDismiss = onDismiss, onSave = {
        onSave(goals.toIntOrNull() ?: 0, assists.toIntOrNull() ?: 0, distance.replace(',', '.').toDoubleOrNull() ?: 0.0, saves.toIntOrNull() ?: 0)
    }) {
        TextFieldLine("Gole", goals, KeyboardType.Number) { goals = it.filter(Char::isDigit) }
        TextFieldLine("Asysty", assists, KeyboardType.Number) { assists = it.filter(Char::isDigit) }
        TextFieldLine("Dystans km", distance, KeyboardType.Decimal) { distance = it.filter { ch -> ch.isDigit() || ch == '.' || ch == ',' } }
        TextFieldLine("Obrony", saves, KeyboardType.Number) { saves = it.filter(Char::isDigit) }
    }
}

@Composable
private fun FormDialog(
    title: String,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
    saveText: String = "Zapisz",
    content: @Composable ColumnScope.() -> Unit
) {
    AwpModal(
        title = title,
        onDismiss = onDismiss,
        confirmText = saveText,
        onConfirm = onSave,
        danger = saveText.contains("Anuluj", ignoreCase = true),
        content = content
    )
}

@Composable
private fun TextFieldLine(
    label: String,
    value: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    modifier: Modifier = Modifier.fillMaxWidth(),
    onChange: (String) -> Unit
) {
    AwpTextField(
        label = label,
        value = value,
        onValueChange = onChange,
        keyboardType = keyboardType,
        modifier = modifier
    )
}

private fun ScheduleFilter.label() = when (this) {
    ScheduleFilter.All -> "Wszystkie"
    ScheduleFilter.Free -> "Wolne"
    ScheduleFilter.Full -> "Pełne"
    ScheduleFilter.Future -> "Przyszłe"
    ScheduleFilter.Past -> "Minione"
}

private fun SchedulePeriod.label() = when (this) {
    SchedulePeriod.All -> "Całość"
    SchedulePeriod.SevenDays -> "7 dni"
    SchedulePeriod.Month -> "Miesiąc"
}
