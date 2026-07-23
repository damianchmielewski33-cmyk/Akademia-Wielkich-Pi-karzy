package pl.akademiawielkichpilkarzy.app.data.schedule

import pl.akademiawielkichpilkarzy.app.data.api.AddGuestRequest
import pl.akademiawielkichpilkarzy.app.data.api.AddMatchRequest
import pl.akademiawielkichpilkarzy.app.data.api.AdminEditMatchRequest
import pl.akademiawielkichpilkarzy.app.data.api.AdminMatchSignupsResponse
import pl.akademiawielkichpilkarzy.app.data.api.AdminUserDto
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.AttendanceRequest
import pl.akademiawielkichpilkarzy.app.data.api.AttendanceResponse
import pl.akademiawielkichpilkarzy.app.data.api.CancelMatchRequest
import pl.akademiawielkichpilkarzy.app.data.api.EditMatchRequest
import pl.akademiawielkichpilkarzy.app.data.api.MatchChargeRequest
import pl.akademiawielkichpilkarzy.app.data.api.MatchChargesRequest
import pl.akademiawielkichpilkarzy.app.data.api.SaveStatsRequest
import pl.akademiawielkichpilkarzy.app.data.api.SignupRequest
import pl.akademiawielkichpilkarzy.app.data.api.TerminarzResponse
import pl.akademiawielkichpilkarzy.app.data.api.TransportMessageRequest
import pl.akademiawielkichpilkarzy.app.data.api.TransportMessagesResponse
import pl.akademiawielkichpilkarzy.app.data.api.TransportPrefsRequest
import pl.akademiawielkichpilkarzy.app.data.api.UserIdRequest
import pl.akademiawielkichpilkarzy.app.data.api.WeatherResponse

class ScheduleRepository {
    private val api = ApiClient.api

    suspend fun load(): TerminarzResponse = api.terminarz()

    suspend fun weather(location: String): WeatherResponse = api.weather(location)

    suspend fun signup(matchId: Int, commitment: String) {
        api.signup(matchId, SignupRequest(commitment)).throwIfError()
    }

    suspend fun unsubscribe(matchId: Int) {
        api.unsubscribe(matchId).throwIfError()
    }

    suspend fun addMatch(request: AddMatchRequest) {
        api.addMatch(request).throwIfError()
    }

    suspend fun editMatch(request: EditMatchRequest) {
        api.editMatch(request).throwIfError()
    }

    suspend fun adminEditMatch(matchId: Int, request: AdminEditMatchRequest) {
        api.adminEditMatch(matchId, request).throwIfError()
    }

    suspend fun setPlayed(matchId: Int, played: Boolean) {
        if (played) api.setMatchPlayed(matchId).throwIfError() else api.unsetMatchPlayed(matchId).throwIfError()
    }

    suspend fun cancelMatch(matchId: Int, reason: String) {
        api.cancelMatch(matchId, CancelMatchRequest(reason)).throwIfError()
    }

    suspend fun adminSignups(matchId: Int): AdminMatchSignupsResponse = api.adminMatchSignups(matchId)

    suspend fun adminUsers(): List<AdminUserDto> = api.adminUsers()

    suspend fun adminAddSignup(matchId: Int, userId: Int) {
        api.adminAddSignup(matchId, UserIdRequest(userId)).throwIfError()
    }

    suspend fun adminRemoveSignup(matchId: Int, userId: Int) {
        api.adminRemoveSignup(matchId, UserIdRequest(userId)).throwIfError()
    }

    suspend fun adminAddGuest(matchId: Int, firstName: String, lastName: String, alias: String) {
        api.adminAddGuest(
            matchId,
            AddGuestRequest(firstName = firstName, lastName = lastName, playerAlias = alias)
        ).throwIfError()
    }

    suspend fun adminRemoveGuest(matchId: Int, userId: Int) {
        api.adminRemoveGuest(matchId, UserIdRequest(userId)).throwIfError()
    }

    suspend fun attendance(matchId: Int): AttendanceResponse = api.attendance(matchId)

    suspend fun saveAttendance(matchId: Int, presentUserIds: List<Int>) {
        api.saveAttendance(matchId, AttendanceRequest(presentUserIds)).throwIfError()
    }

    suspend fun settle(matchId: Int, charges: List<MatchChargeRequest>): String {
        val result = api.settleMatchCharges(matchId, MatchChargesRequest(charges))
        result.error?.let { error(it) }
        return "Rozliczono: ${result.applied.size}, pominięto: ${result.skipped.size}"
    }

    suspend fun updateTransport(matchId: Int, request: TransportPrefsRequest) {
        api.updateTransport(matchId, request).throwIfError()
    }

    suspend fun transportMessages(matchId: Int): TransportMessagesResponse = api.transportMessages(matchId)

    suspend fun sendTransportMessage(matchId: Int, body: String) {
        api.sendTransportMessage(matchId, TransportMessageRequest(body)).throwIfError()
    }

    suspend fun saveStats(request: SaveStatsRequest) {
        api.saveStats(request).close()
    }
}

private fun pl.akademiawielkichpilkarzy.app.data.api.ApiOkResponse.throwIfError() {
    error?.takeIf { it.isNotBlank() }?.let { kotlin.error(it) }
}
