package pl.akademiawielkichpilkarzy.app.ui.schedule

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import java.time.LocalDate
import java.time.YearMonth
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.data.api.AddMatchRequest
import pl.akademiawielkichpilkarzy.app.data.api.AdminEditMatchRequest
import pl.akademiawielkichpilkarzy.app.data.api.AdminMatchSignupRow
import pl.akademiawielkichpilkarzy.app.data.api.AdminUserDto
import pl.akademiawielkichpilkarzy.app.data.api.MatchChargeRequest
import pl.akademiawielkichpilkarzy.app.data.api.MatchDto
import pl.akademiawielkichpilkarzy.app.data.api.SaveStatsRequest
import pl.akademiawielkichpilkarzy.app.data.api.TerminarzResponse
import pl.akademiawielkichpilkarzy.app.data.api.TransportMessageDto
import pl.akademiawielkichpilkarzy.app.data.api.TransportPrefsRequest
import pl.akademiawielkichpilkarzy.app.data.schedule.ScheduleRepository

enum class ScheduleTab { Upcoming, Archive }
enum class ScheduleView { List, Calendar }
enum class ScheduleFilter { All, Free, Full, Future, Past }
enum class SchedulePeriod { All, SevenDays, Month }
enum class ScheduleSort { Asc, Desc }

data class AdminPanelState(
    val match: MatchDto,
    val loading: Boolean = true,
    val signups: List<AdminMatchSignupRow> = emptyList(),
    val users: List<AdminUserDto> = emptyList(),
    val presentUserIds: Set<Int> = emptySet()
)

data class TransportPanelState(
    val match: MatchDto,
    val loading: Boolean = true,
    val messages: List<TransportMessageDto> = emptyList()
)

data class ScheduleUiState(
    val data: TerminarzResponse? = null,
    val loading: Boolean = true,
    val error: String? = null,
    val actionMessage: String? = null,
    val weatherByMatchId: Map<Int, String> = emptyMap(),
    val tab: ScheduleTab = ScheduleTab.Upcoming,
    val view: ScheduleView = ScheduleView.List,
    val filter: ScheduleFilter = ScheduleFilter.All,
    val period: SchedulePeriod = SchedulePeriod.All,
    val sort: ScheduleSort = ScheduleSort.Asc,
    val onlyMine: Boolean = false,
    val search: String = "",
    val calendarMonth: YearMonth = YearMonth.now(),
    val adminPanel: AdminPanelState? = null,
    val transportPanel: TransportPanelState? = null
) {
    val upcoming: List<MatchDto> get() = data?.upcoming.orEmpty()
    val archive: List<MatchDto> get() = data?.playedConfirmed.orEmpty()
    val missingStatsIds: Set<Int> get() = data?.playedMissingStatsMatchIds.orEmpty().toSet()
    val isAdmin: Boolean get() = data?.isAdmin == true
}

class ScheduleViewModel(
    private val repository: ScheduleRepository = ScheduleRepository()
) : ViewModel() {
    private val _state = MutableStateFlow(ScheduleUiState())
    val state: StateFlow<ScheduleUiState> = _state.asStateFlow()

    init {
        reload()
    }

    fun reload() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            runCatching { repository.load() }
                .onSuccess { data ->
                    _state.update { it.copy(data = data, loading = false) }
                    loadWeatherFor(data.upcoming.take(12))
                }
                .onFailure { e ->
                    _state.update { it.copy(loading = false, error = e.message ?: "Błąd pobierania terminarza") }
                }
        }
    }

    private fun loadWeatherFor(matches: List<MatchDto>) {
        matches.forEach { match ->
            if (match.location.isBlank() || _state.value.weatherByMatchId.containsKey(match.id)) return@forEach
            viewModelScope.launch {
                runCatching { repository.weather(match.location) }.onSuccess { weather ->
                    val day = weather.days.firstOrNull { it.date == match.matchDate } ?: weather.days.firstOrNull()
                    val line = day?.let {
                        val max = it.maxC?.let { c -> "%.0f°C".format(c) }.orEmpty()
                        val rain = it.precipChance?.let { p -> " · deszcz $p%" }.orEmpty()
                        listOf(it.description.orEmpty(), max).filter { v -> v.isNotBlank() }.joinToString(" · ") + rain
                    }?.takeIf { it.isNotBlank() }
                    if (line != null) {
                        _state.update { s -> s.copy(weatherByMatchId = s.weatherByMatchId + (match.id to line)) }
                    }
                }
            }
        }
    }

    fun setTab(tab: ScheduleTab) = _state.update { it.copy(tab = tab) }
    fun setView(view: ScheduleView) = _state.update { it.copy(view = view) }
    fun setSearch(search: String) = _state.update { it.copy(search = search) }
    fun setFilter(filter: ScheduleFilter) = _state.update { it.copy(filter = filter) }
    fun setPeriod(period: SchedulePeriod) = _state.update { it.copy(period = period) }
    fun setSort(sort: ScheduleSort) = _state.update { it.copy(sort = sort) }
    fun setOnlyMine(onlyMine: Boolean) = _state.update { it.copy(onlyMine = onlyMine) }
    fun shiftCalendar(months: Long) = _state.update { it.copy(calendarMonth = it.calendarMonth.plusMonths(months)) }
    fun showMessage(message: String) = _state.update { it.copy(actionMessage = message) }
    fun clearMessage() = _state.update { it.copy(actionMessage = null) }

    fun filteredMatches(): List<MatchDto> {
        val s = _state.value
        val today = LocalDate.now()
        val query = s.search.trim().lowercase()
        val base = if (s.tab == ScheduleTab.Upcoming) s.upcoming else s.archive
        return base.asSequence()
            .filter { query.isBlank() || it.location.lowercase().contains(query) }
            .filter { match ->
                val date = match.localDateOrNull()
                when (s.period) {
                    SchedulePeriod.All -> true
                    SchedulePeriod.SevenDays -> date == null || (!date.isBefore(today) && !date.isAfter(today.plusDays(7)))
                    SchedulePeriod.Month -> date == null || YearMonth.from(date) == YearMonth.from(today)
                }
            }
            .filter { match ->
                val signed = match.signedUp ?: 0
                val max = match.maxSlots ?: 0
                val date = match.localDateOrNull()
                when (s.filter) {
                    ScheduleFilter.All -> true
                    ScheduleFilter.Free -> max <= 0 || signed < max
                    ScheduleFilter.Full -> max > 0 && signed >= max
                    ScheduleFilter.Future -> date == null || !date.isBefore(today)
                    ScheduleFilter.Past -> date != null && date.isBefore(today)
                }
            }
            .filter { match ->
                !s.onlyMine || s.data?.userSignupKind?.containsKey(match.id.toString()) == true
            }
            .sortedWith(compareBy<MatchDto> { it.matchDate }.thenBy { it.matchTime })
            .let { if (s.sort == ScheduleSort.Desc) it.toList().asReversed() else it.toList() }
    }

    fun signup(matchId: Int, commitment: String, openTransport: (Int) -> Unit = {}) {
        runAction(reloadAfter = true) {
            repository.signup(matchId, commitment)
            if (commitment == "confirmed") openTransport(matchId)
            "Zapis zaktualizowany"
        }
    }

    fun unsubscribe(matchId: Int) {
        runAction(reloadAfter = true) {
            repository.unsubscribe(matchId)
            "Wypisano z meczu"
        }
    }

    fun addMatch(request: AddMatchRequest) {
        runAction(reloadAfter = true) {
            repository.addMatch(request)
            "Mecz dodany"
        }
    }

    fun editMatch(matchId: Int, date: String, time: String, location: String, maxSlots: Int, feePln: Double?, gatePin: String?) {
        runAction(reloadAfter = true) {
            repository.adminEditMatch(
                matchId,
                AdminEditMatchRequest(
                    date = date,
                    time = time,
                    location = location,
                    maxSlots = maxSlots,
                    feePln = feePln,
                    gatePin = gatePin
                )
            )
            "Mecz zapisany"
        }
    }

    fun setPlayed(matchId: Int, played: Boolean) {
        runAction(reloadAfter = true) {
            repository.setPlayed(matchId, played)
            if (played) "Mecz przeniesiony do archiwum" else "Mecz wrócił do nadchodzących"
        }
    }

    fun cancelMatch(matchId: Int, reason: String) {
        runAction(reloadAfter = true) {
            repository.cancelMatch(matchId, reason)
            "Mecz anulowany"
        }
    }

    fun openAdmin(match: MatchDto) {
        _state.update { it.copy(adminPanel = AdminPanelState(match = match)) }
        viewModelScope.launch {
            val signups = runCatching { repository.adminSignups(match.id).signups }.getOrElse { emptyList() }
            val users = runCatching { repository.adminUsers() }.getOrElse { emptyList() }
            val present = runCatching { repository.attendance(match.id).presentUserIds.toSet() }.getOrElse { emptySet() }
            _state.update { it.copy(adminPanel = it.adminPanel?.copy(loading = false, signups = signups, users = users, presentUserIds = present)) }
        }
    }

    fun closeAdmin() = _state.update { it.copy(adminPanel = null) }

    fun addGuest(matchId: Int, firstName: String, lastName: String, alias: String) {
        runAction(reloadAfter = true) {
            repository.adminAddGuest(matchId, firstName, lastName, alias)
            refreshAdmin(matchId)
            "Gość dodany"
        }
    }

    fun adminAddSignup(matchId: Int, userId: Int) {
        runAction(reloadAfter = true) {
            repository.adminAddSignup(matchId, userId)
            refreshAdmin(matchId)
            "Zawodnik dopisany"
        }
    }

    fun adminRemoveSignup(matchId: Int, userId: Int) {
        runAction(reloadAfter = true) {
            repository.adminRemoveSignup(matchId, userId)
            refreshAdmin(matchId)
            "Zawodnik wypisany"
        }
    }

    fun adminRemoveGuest(matchId: Int, userId: Int) {
        runAction(reloadAfter = true) {
            repository.adminRemoveGuest(matchId, userId)
            refreshAdmin(matchId)
            "Gość usunięty"
        }
    }

    fun toggleAttendance(userId: Int) {
        _state.update { s ->
            val panel = s.adminPanel ?: return@update s
            val next = if (userId in panel.presentUserIds) panel.presentUserIds - userId else panel.presentUserIds + userId
            s.copy(adminPanel = panel.copy(presentUserIds = next))
        }
    }

    fun saveAttendance(matchId: Int) {
        runAction(reloadAfter = false) {
            repository.saveAttendance(matchId, _state.value.adminPanel?.presentUserIds.orEmpty().toList())
            "Obecność zapisana"
        }
    }

    fun settleMatch(matchId: Int, amount: Double, note: String?) {
        val signups = _state.value.adminPanel?.signups.orEmpty().filter { it.commitment == 1 }
        runAction(reloadAfter = false) {
            val charges = signups.map { MatchChargeRequest(it.userId, amount, note) }
            repository.settle(matchId, charges)
        }
    }

    fun openTransport(match: MatchDto) {
        _state.update { it.copy(transportPanel = TransportPanelState(match = match)) }
        refreshTransport(match.id)
    }

    fun closeTransport() = _state.update { it.copy(transportPanel = null) }

    fun saveTransport(matchId: Int, drivesCar: Boolean, canTakePassengers: Boolean, needsTransport: Boolean) {
        runAction(reloadAfter = false) {
            repository.updateTransport(matchId, TransportPrefsRequest(drivesCar, canTakePassengers, needsTransport))
            refreshTransport(matchId)
            "Transport zapisany"
        }
    }

    fun sendTransportMessage(matchId: Int, body: String) {
        runAction(reloadAfter = false) {
            repository.sendTransportMessage(matchId, body)
            refreshTransport(matchId)
            "Wiadomość wysłana"
        }
    }

    fun saveStats(matchId: Int, goals: Int, assists: Int, distance: Double, saves: Int) {
        runAction(reloadAfter = true) {
            repository.saveStats(SaveStatsRequest(matchId, goals, assists, distance, saves))
            "Statystyki zapisane"
        }
    }

    private fun refreshAdmin(matchId: Int) {
        viewModelScope.launch {
            val panel = _state.value.adminPanel ?: return@launch
            if (panel.match.id != matchId) return@launch
            val signups = runCatching { repository.adminSignups(matchId).signups }.getOrElse { panel.signups }
            val present = runCatching { repository.attendance(matchId).presentUserIds.toSet() }.getOrElse { panel.presentUserIds }
            _state.update { it.copy(adminPanel = panel.copy(loading = false, signups = signups, presentUserIds = present)) }
        }
    }

    private fun refreshTransport(matchId: Int) {
        viewModelScope.launch {
            val panel = _state.value.transportPanel ?: return@launch
            if (panel.match.id != matchId) return@launch
            val messages = runCatching { repository.transportMessages(matchId).messages }.getOrElse { panel.messages }
            _state.update { it.copy(transportPanel = panel.copy(loading = false, messages = messages)) }
        }
    }

    private fun runAction(reloadAfter: Boolean, block: suspend () -> String) {
        viewModelScope.launch {
            _state.update { it.copy(actionMessage = null) }
            runCatching { block() }
                .onSuccess { message ->
                    _state.update { it.copy(actionMessage = message) }
                    if (reloadAfter) reload()
                }
                .onFailure { e ->
                    _state.update { it.copy(actionMessage = e.message ?: "Nie udało się wykonać akcji") }
                }
        }
    }
}

fun MatchDto.localDateOrNull(): LocalDate? = runCatching { LocalDate.parse(matchDate) }.getOrNull()
