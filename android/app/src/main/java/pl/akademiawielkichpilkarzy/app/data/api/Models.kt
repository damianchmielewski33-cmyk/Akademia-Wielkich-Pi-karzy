package pl.akademiawielkichpilkarzy.app.data.api

import com.squareup.moshi.Json

data class LoginRequest(
    @Json(name = "first_name") val firstName: String,
    @Json(name = "last_name") val lastName: String,
    val pin: String,
    @Json(name = "remember_me") val rememberMe: Boolean = true
)

data class LoginResponse(
    val ok: Boolean? = null,
    val token: String? = null,
    val error: String? = null,
    val user: LoginUser? = null
)

data class LoginUser(
    val id: Int,
    @Json(name = "first_name") val firstName: String,
    @Json(name = "last_name") val lastName: String,
    val zawodnik: String,
    @Json(name = "is_admin") val isAdmin: Int = 0
)

data class MeResponse(val user: MeUser?)

data class MeUser(
    val id: Int,
    @Json(name = "first_name") val firstName: String,
    @Json(name = "last_name") val lastName: String,
    val zawodnik: String,
    @Json(name = "is_admin") val isAdmin: Int = 0,
    @Json(name = "push_notifications_consent") val pushNotificationsConsent: Int = 0,
    val email: String? = null
)

data class MatchDto(
    val id: Int,
    @Json(name = "match_date") val matchDate: String,
    @Json(name = "match_time") val matchTime: String,
    val location: String,
    @Json(name = "max_slots") val maxSlots: Int? = null,
    @Json(name = "signed_up") val signedUp: Int? = null,
    @Json(name = "fee_pln") val feePln: Double? = null,
    val played: Int = 0,
    val cancelled: Int = 0,
    @Json(name = "cancellation_reason") val cancellationReason: String? = null,
    @Json(name = "gate_pin") val gatePin: String? = null
)

data class TerminarzResponse(
    val upcoming: List<MatchDto> = emptyList(),
    @Json(name = "playedConfirmed") val playedConfirmed: List<MatchDto> = emptyList(),
    val matches: List<MatchDto> = emptyList(),
    val userSignupKind: Map<String, String> = emptyMap(),
    val isLoggedIn: Boolean = false,
    val isAdmin: Boolean = false
)

data class SignupRequest(
    val commitment: String = "confirmed"
)

data class ApiOkResponse(
    val ok: Boolean? = null,
    val error: String? = null
)

data class WalletResponse(
    @Json(name = "balance_pln") val balancePln: Double = 0.0,
    val pending: List<WalletDeposit> = emptyList(),
    val transactions: List<WalletTx> = emptyList()
)

data class WalletDeposit(
    val id: Int,
    @Json(name = "amount_pln") val amountPln: Double,
    val status: String,
    val note: String? = null,
    @Json(name = "created_at") val createdAt: String? = null
)

data class WalletTx(
    val id: Int,
    val kind: String,
    @Json(name = "amount_pln") val amountPln: Double,
    val note: String? = null,
    @Json(name = "created_at") val createdAt: String? = null,
    @Json(name = "balance_after_pln") val balanceAfterPln: Double? = null
)

data class DepositRequest(
    @Json(name = "amount_pln") val amountPln: Double,
    val note: String? = null
)

data class ProfileResponse(
    val user: ProfileUser? = null,
    val summary: ProfileSummary? = null
)

data class ProfileUser(
    val id: Int,
    @Json(name = "first_name") val firstName: String,
    @Json(name = "last_name") val lastName: String,
    val zawodnik: String,
    @Json(name = "push_notifications_consent") val pushNotificationsConsent: Int = 0,
    val email: String? = null
)

data class ProfileSummary(
    @Json(name = "matches_with_stats") val matchesWithStats: Int = 0,
    val goals: Int = 0,
    val assists: Int = 0,
    @Json(name = "distance_km") val distanceKm: Double = 0.0,
    val saves: Int = 0
)

data class DeviceRegisterRequest(
    @Json(name = "fcm_token") val fcmToken: String,
    val platform: String = "android"
)

data class DeviceUnregisterRequest(
    @Json(name = "fcm_token") val fcmToken: String? = null,
    @Json(name = "revoke_consent") val revokeConsent: Boolean = false
)

data class PushConsentRequest(val consent: Boolean)

data class ClientLogRequest(
    val kind: String,
    val message: String,
    @Json(name = "phoneModel") val phoneModel: String? = null,
    @Json(name = "androidVersion") val androidVersion: String? = null,
    @Json(name = "appVersion") val appVersion: String? = null,
    val details: String? = null
)
