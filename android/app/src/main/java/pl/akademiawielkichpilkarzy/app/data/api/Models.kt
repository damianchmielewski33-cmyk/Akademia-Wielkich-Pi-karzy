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

data class RegisterRequest(
    @Json(name = "first_name") val firstName: String,
    @Json(name = "last_name") val lastName: String,
    val zawodnik: String,
    val pin: String,
    @Json(name = "pin_confirm") val pinConfirm: String,
    @Json(name = "auto_login") val autoLogin: Boolean = false,
    val realm: String = "academy"
)

data class RegisterResponse(
    val ok: Boolean? = null,
    @Json(name = "logged_in") val loggedIn: Boolean? = null,
    val error: String? = null,
    val user: LoginUser? = null
)

data class ForgotPinRequest(
    @Json(name = "first_name") val firstName: String,
    @Json(name = "last_name") val lastName: String,
    val zawodnik: String,
    val pin: String,
    @Json(name = "pin_confirm") val pinConfirm: String
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

data class TerminarzPlayerEntry(
    val userId: Int = 0,
    @Json(name = "user_id") val userIdSnake: Int? = null,
    val firstName: String = "",
    @Json(name = "first_name") val firstNameSnake: String? = null,
    val lastName: String = "",
    @Json(name = "last_name") val lastNameSnake: String? = null,
    val name: String = "",
    val zawodnik: String = "",
    val initials: String = "",
    val paid: Int = 0,
    val commitment: String = "confirmed",
    @Json(name = "is_temporary") val isTemporary: Int = 0
) {
    val resolvedUserId: Int get() = userId.takeIf { it != 0 } ?: userIdSnake ?: 0
    val resolvedFirstName: String get() = firstName.ifBlank { firstNameSnake.orEmpty() }
    val resolvedLastName: String get() = lastName.ifBlank { lastNameSnake.orEmpty() }
    val displayName: String
        get() = zawodnik.ifBlank {
            name.ifBlank {
                listOf(resolvedFirstName, resolvedLastName).filter { it.isNotBlank() }.joinToString(" ")
            }
        }.ifBlank { "Zawodnik" }
}

data class PlayersDataEntryDto(
    val date: String = "",
    val time: String = "",
    val location: String = "",
    val max: Int = 0,
    val players: List<TerminarzPlayerEntry> = emptyList(),
    val tentativePlayers: List<TerminarzPlayerEntry> = emptyList(),
    val declinedPlayers: List<TerminarzPlayerEntry> = emptyList()
)

data class TerminarzResponse(
    val upcoming: List<MatchDto> = emptyList(),
    @Json(name = "playedConfirmed") val playedConfirmed: List<MatchDto> = emptyList(),
    val matches: List<MatchDto> = emptyList(),
    val userSignupKind: Map<String, String> = emptyMap(),
    val playersData: Map<String, PlayersDataEntryDto> = emptyMap(),
    val playedMissingStatsMatchIds: List<Int> = emptyList(),
    val isLoggedIn: Boolean = false,
    val isAdmin: Boolean = false,
    val matchDefaults: MatchDefaultsDto? = null
)

data class SignupRequest(
    val commitment: String = "confirmed"
)

data class ApiOkResponse(
    val ok: Boolean? = null,
    val status: String? = null,
    val id: Int? = null,
    val duplicate: Boolean? = null,
    val error: String? = null
)

data class MatchDefaultsDto(
    val maxSlots: Int? = null,
    val location: String? = null,
    val feePln: Double? = null
)

data class AddMatchRequest(
    val date: String,
    val time: String,
    val location: String,
    @Json(name = "max_slots") val maxSlots: Int,
    @Json(name = "fee_pln") val feePln: Double? = null,
    @Json(name = "gate_pin") val gatePin: String
)

data class EditMatchRequest(
    @Json(name = "match_id") val matchId: Int,
    val date: String,
    val time: String,
    val location: String,
    @Json(name = "max_slots") val maxSlots: Int
)

data class AdminEditMatchRequest(
    val date: String,
    val time: String,
    val location: String,
    @Json(name = "max_slots") val maxSlots: Int,
    @Json(name = "fee_pln") val feePln: Double? = null,
    @Json(name = "gate_pin") val gatePin: String? = null
)

data class CancelMatchRequest(val reason: String)

data class UserIdRequest(@Json(name = "user_id") val userId: Int)

data class AddGuestRequest(
    @Json(name = "first_name") val firstName: String,
    @Json(name = "last_name") val lastName: String,
    @Json(name = "player_alias") val playerAlias: String
)

data class AdminMatchSignupRow(
    @Json(name = "user_id") val userId: Int,
    @Json(name = "first_name") val firstName: String = "",
    @Json(name = "last_name") val lastName: String = "",
    val zawodnik: String = "",
    val paid: Int = 0,
    val commitment: Int = 1,
    @Json(name = "is_temporary") val isTemporary: Int = 0
) {
    val displayName: String
        get() = zawodnik.ifBlank {
            listOf(firstName, lastName).filter { it.isNotBlank() }.joinToString(" ")
        }.ifBlank { "Zawodnik #$userId" }
}

data class AdminMatchSignupsResponse(
    val signups: List<AdminMatchSignupRow> = emptyList(),
    val error: String? = null
)

data class AdminUserDto(
    val id: Int,
    @Json(name = "first_name") val firstName: String = "",
    @Json(name = "last_name") val lastName: String = "",
    val zawodnik: String = "",
    @Json(name = "profile_photo_path") val profilePhotoPath: String? = null
) {
    val displayName: String
        get() = zawodnik.ifBlank {
            listOf(firstName, lastName).filter { it.isNotBlank() }.joinToString(" ")
        }.ifBlank { "Zawodnik #$id" }
}

data class AttendanceResponse(
    @Json(name = "present_user_ids") val presentUserIds: List<Int> = emptyList(),
    val error: String? = null
)

data class AttendanceRequest(
    @Json(name = "present_user_ids") val presentUserIds: List<Int>
)

data class MatchChargeRequest(
    @Json(name = "user_id") val userId: Int,
    @Json(name = "amount_pln") val amountPln: Double,
    val note: String? = null
)

data class MatchChargesRequest(val charges: List<MatchChargeRequest>)

data class MatchChargeResult(
    @Json(name = "user_id") val userId: Int,
    @Json(name = "amount_pln") val amountPln: Double? = null,
    val reason: String? = null
)

data class MatchChargesResponse(
    val ok: Boolean? = null,
    val applied: List<MatchChargeResult> = emptyList(),
    val skipped: List<MatchChargeResult> = emptyList(),
    val error: String? = null
)

data class TransportPrefsRequest(
    val drivesCar: Boolean,
    val canTakePassengers: Boolean? = null,
    val needsTransport: Boolean? = null
)

data class TransportMessageDto(
    val id: Int,
    val body: String,
    val createdAt: String = "",
    val userId: Int = 0,
    val firstName: String = "",
    val lastName: String = "",
    val zawodnik: String = ""
) {
    val displayName: String
        get() = zawodnik.ifBlank {
            listOf(firstName, lastName).filter { it.isNotBlank() }.joinToString(" ")
        }.ifBlank { "Zawodnik" }
}

data class TransportMessagesResponse(
    val messages: List<TransportMessageDto> = emptyList(),
    val error: String? = null
)

data class TransportMessageRequest(val body: String)

data class SaveStatsRequest(
    @Json(name = "match_id") val matchId: Int,
    val goals: Int = 0,
    val assists: Int = 0,
    val distance: Double = 0.0,
    val saves: Int = 0
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

data class WeatherResponse(
    val days: List<WeatherDay> = emptyList(),
    val source: String? = null
)

data class WeatherDay(
    val date: String,
    val description: String? = null,
    val maxC: Double? = null,
    val minC: Double? = null,
    val precipChance: Int? = null
)

data class PlayerStatsResponse(
    @Json(name = "first_name") val firstName: String? = null,
    @Json(name = "last_name") val lastName: String? = null,
    val zawodnik: String? = null,
    val matches: Int = 0,
    val goals: Int = 0,
    val assists: Int = 0,
    val distance: Double = 0.0,
    val saves: Int = 0,
    val games: List<PlayerStatsMatch> = emptyList()
)

data class PlayersResponse(
    val players: List<PlayerListItem> = emptyList()
)

data class PlayerListItem(
    val id: Int,
    @Json(name = "first_name") val firstName: String,
    @Json(name = "last_name") val lastName: String,
    val zawodnik: String,
    @Json(name = "profile_photo_path") val profilePhotoPath: String? = null
) {
    val displayName: String
        get() = zawodnik.ifBlank {
            listOf(firstName, lastName).filter { it.isNotBlank() }.joinToString(" ")
        }.ifBlank { "Zawodnik #$id" }
}

data class GalleryResponse(
    val videos: List<GalleryVideoDto> = emptyList()
)

data class GalleryVideoDto(
    val id: Int,
    val title: String,
    @Json(name = "youtubeVideoId") val youtubeVideoId: String,
    @Json(name = "matchDate") val matchDate: String? = null,
    @Json(name = "sortOrder") val sortOrder: Int = 0
)

data class PlayerStatsMatch(
    val date: String,
    val time: String? = null,
    val location: String? = null,
    val goals: Int = 0,
    val assists: Int = 0,
    val distance: Double = 0.0,
    val saves: Int = 0
)

data class RankingsResponse(
    val season: RankingSeason? = null,
    val seasons: List<RankingSeason> = emptyList(),
    val points: RankingPoints? = null,
    val rankings: RankingTables? = null
)

data class RankingSeason(
    val id: Int,
    val name: String,
    val isActive: Boolean = false
)

data class RankingPoints(
    val goal: Double = 0.0,
    val assist: Double = 0.0,
    val km: Double = 0.0,
    val save: Double = 0.0
)

data class RankingTables(
    val punkty: List<RankingRow> = emptyList(),
    val goals: List<RankingRow> = emptyList(),
    val assists: List<RankingRow> = emptyList(),
    val distance: List<RankingRow> = emptyList(),
    val saves: List<RankingRow> = emptyList()
)

data class RankingRow(
    val rank: Int,
    val userId: Int,
    val firstName: String,
    val lastName: String,
    val zawodnik: String,
    val value: Double,
    val goals: Int = 0,
    val assists: Int = 0,
    val distance: Double = 0.0,
    val saves: Int = 0,
    val punkty: Double = 0.0
)

data class LineupsResponse(
    val matches: List<LineupMatchRef> = emptyList(),
    val selected: LineupSelected? = null
)

data class LineupMatchRef(
    val id: Int,
    val matchDate: String,
    val matchTime: String,
    val location: String
)

data class LineupSelected(
    val id: Int,
    val matchDate: String,
    val matchTime: String,
    val location: String,
    val home: List<LineupSlot?> = emptyList(),
    val away: List<LineupSlot?> = emptyList(),
    val players: List<LineupSlot> = emptyList()
)

data class LineupSlot(
    val userId: Int,
    val displayName: String? = null,
    val firstName: String? = null,
    val lastName: String? = null,
    val zawodnik: String? = null
)

data class MobileConfigResponse(
    val ok: Boolean? = null,
    val settings: MobileChannelSettingsDto? = null,
    @Json(name = "screen_blocks") val screenBlocks: Map<String, MobileBlockedEntry> = emptyMap(),
    val blocked: Map<String, MobileBlockedEntry> = emptyMap(),
    @Json(name = "app_settings") val appSettings: AppSettingsSnapshotDto? = null,
    @Json(name = "site_assets") val siteAssets: SiteAssetsDto? = null,
    @Json(name = "is_admin") val isAdmin: Int = 0
)

data class MobileChannelSettingsDto(
    @Json(name = "match_notification_prompt_enabled") val matchNotificationPromptEnabled: Boolean = false,
    @Json(name = "home_youtube_url") val homeYoutubeUrl: String? = null,
    @Json(name = "site_name") val siteName: String? = null,
    @Json(name = "site_description") val siteDescription: String? = null,
    @Json(name = "contact_email") val contactEmail: String? = null,
    @Json(name = "blik_phone") val blikPhone: String? = null,
    @Json(name = "organizer_damian_name") val organizerDamianName: String? = null,
    @Json(name = "organizer_damian_phone") val organizerDamianPhone: String? = null,
    @Json(name = "organizer_damian_email") val organizerDamianEmail: String? = null,
    @Json(name = "organizer_mateusz_name") val organizerMateuszName: String? = null,
    @Json(name = "organizer_mateusz_phone") val organizerMateuszPhone: String? = null,
    @Json(name = "organizer_mateusz_email") val organizerMateuszEmail: String? = null,
    @Json(name = "facebook_damian_url") val facebookDamianUrl: String? = null,
    @Json(name = "facebook_mateusz_url") val facebookMateuszUrl: String? = null,
    @Json(name = "allow_self_registration") val allowSelfRegistration: Boolean? = null,
    @Json(name = "default_match_max_slots") val defaultMatchMaxSlots: Int? = null,
    @Json(name = "default_match_fee_pln") val defaultMatchFeePln: Double? = null,
    @Json(name = "default_match_location") val defaultMatchLocation: String? = null,
    @Json(name = "ranking_pt_goal") val rankingPtGoal: Double? = null,
    @Json(name = "ranking_pt_assist") val rankingPtAssist: Double? = null,
    @Json(name = "ranking_pt_km") val rankingPtKm: Double? = null,
    @Json(name = "ranking_pt_save") val rankingPtSave: Double? = null,
    @Json(name = "match_email_notifications_enabled") val matchEmailNotificationsEnabled: Boolean = true,
    @Json(name = "lineup_pitch_slots_min") val lineupPitchSlotsMin: Int? = null,
    @Json(name = "lineup_pitch_slots_max") val lineupPitchSlotsMax: Int? = null,
    @Json(name = "match_cancel_reasons") val matchCancelReasons: List<MatchCancelReasonDto> = emptyList(),
    @Json(name = "show_pzu_cup") val showPzuCup: Boolean = true,
    @Json(name = "login_banner") val loginBanner: String? = null,
    @Json(name = "android_ui_mode") val androidUiMode: String = "webview"
)

data class MatchCancelReasonDto(
    val value: String = "",
    val label: String = ""
)

data class AppSettingsSnapshotDto(
    @Json(name = "site_name") val siteName: String? = null,
    @Json(name = "site_description") val siteDescription: String? = null,
    @Json(name = "contact_email") val contactEmail: String? = null,
    @Json(name = "blik_phone") val blikPhone: String? = null,
    @Json(name = "match_notification_prompt_enabled") val matchNotificationPromptEnabled: Boolean = false,
    @Json(name = "home_youtube_url") val homeYoutubeUrl: String? = null,
    @Json(name = "default_match_max_slots") val defaultMatchMaxSlots: Int? = null,
    @Json(name = "default_match_fee_pln") val defaultMatchFeePln: Double? = null,
    @Json(name = "default_match_location") val defaultMatchLocation: String? = null,
    @Json(name = "ranking_pt_goal") val rankingPtGoal: Double? = null,
    @Json(name = "ranking_pt_assist") val rankingPtAssist: Double? = null,
    @Json(name = "ranking_pt_km") val rankingPtKm: Double? = null,
    @Json(name = "ranking_pt_save") val rankingPtSave: Double? = null,
    @Json(name = "lineup_pitch_slots_min") val lineupPitchSlotsMin: Int? = null,
    @Json(name = "lineup_pitch_slots_max") val lineupPitchSlotsMax: Int? = null,
    @Json(name = "match_cancel_reasons") val matchCancelReasons: List<MatchCancelReasonDto> = emptyList()
)

data class SiteAssetsDto(
    @Json(name = "logo_header") val logoHeader: String? = null,
    @Json(name = "logo_crest") val logoCrest: String? = null,
    @Json(name = "logo_login") val logoLogin: String? = null,
    @Json(name = "logo_favicon") val logoFavicon: String? = null,
    @Json(name = "bg_soccer_ball") val bgSoccerBall: String? = null,
    @Json(name = "bg_stadium") val bgStadium: String? = null,
    @Json(name = "bg_pitch_lines") val bgPitchLines: String? = null
)

data class AppBridgeRequest(val next: String)

data class AppBridgeResponse(
    val ok: Boolean? = null,
    val path: String? = null,
    val error: String? = null
)

data class MobileBlockedEntry(
    val message: String? = null
)
