package pl.akademiawielkichpilkarzy.app.data.api

import okhttp3.ResponseBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.HTTP
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.PUT

interface AwpApi {
    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @GET("api/auth/me")
    suspend fun me(): MeResponse

    @POST("api/auth/logout")
    suspend fun logout(): ApiOkResponse

    @POST("api/auth/register")
    suspend fun register(@Body body: RegisterRequest): RegisterResponse

    @POST("api/auth/forgot-pin-request")
    suspend fun forgotPin(@Body body: ForgotPinRequest): ApiOkResponse

    @GET("api/terminarz")
    suspend fun terminarz(): TerminarzResponse

    @GET("api/terminarz")
    suspend fun terminarzRealm(@Header("X-AWP-Realm") realm: String): TerminarzResponse

    @POST("api/terminarz/signup/{id}")
    suspend fun signup(
        @Path("id") matchId: Int,
        @Body body: SignupRequest
    ): ApiOkResponse

    @POST("api/terminarz/unsubscribe/{id}")
    suspend fun unsubscribe(@Path("id") matchId: Int): ApiOkResponse

    @POST("api/terminarz/add")
    suspend fun addMatch(@Body body: AddMatchRequest): ApiOkResponse

    @POST("api/terminarz/edit")
    suspend fun editMatch(@Body body: EditMatchRequest): ApiOkResponse

    @PUT("api/admin/match/{id}")
    suspend fun adminEditMatch(
        @Path("id") matchId: Int,
        @Body body: AdminEditMatchRequest
    ): ApiOkResponse

    @GET("api/admin/users")
    suspend fun adminUsers(): List<AdminUserDto>

    @POST("api/admin/match/{id}/set-played")
    suspend fun setMatchPlayed(@Path("id") matchId: Int): ApiOkResponse

    @POST("api/admin/match/{id}/unset-played")
    suspend fun unsetMatchPlayed(@Path("id") matchId: Int): ApiOkResponse

    @POST("api/admin/match/{id}/cancel")
    suspend fun cancelMatch(
        @Path("id") matchId: Int,
        @Body body: CancelMatchRequest
    ): ApiOkResponse

    @GET("api/admin/match/{id}/signups")
    suspend fun adminMatchSignups(@Path("id") matchId: Int): AdminMatchSignupsResponse

    @POST("api/admin/match/{id}/signups")
    suspend fun adminAddSignup(
        @Path("id") matchId: Int,
        @Body body: UserIdRequest
    ): ApiOkResponse

    @HTTP(method = "DELETE", path = "api/admin/match/{id}/signups", hasBody = true)
    suspend fun adminRemoveSignup(
        @Path("id") matchId: Int,
        @Body body: UserIdRequest
    ): ApiOkResponse

    @POST("api/admin/match/{id}/add-guest")
    suspend fun adminAddGuest(
        @Path("id") matchId: Int,
        @Body body: AddGuestRequest
    ): ApiOkResponse

    @POST("api/admin/match/{id}/remove-guest")
    suspend fun adminRemoveGuest(
        @Path("id") matchId: Int,
        @Body body: UserIdRequest
    ): ApiOkResponse

    @GET("api/admin/match/{id}/attendance")
    suspend fun attendance(@Path("id") matchId: Int): AttendanceResponse

    @POST("api/admin/match/{id}/attendance")
    suspend fun saveAttendance(
        @Path("id") matchId: Int,
        @Body body: AttendanceRequest
    ): ApiOkResponse

    @POST("api/admin/wallet/match/{id}/charges")
    suspend fun settleMatchCharges(
        @Path("id") matchId: Int,
        @Body body: MatchChargesRequest
    ): MatchChargesResponse

    @PATCH("api/terminarz/signup/{id}/transport")
    suspend fun updateTransport(
        @Path("id") matchId: Int,
        @Body body: TransportPrefsRequest
    ): ApiOkResponse

    @GET("api/terminarz/transport/{matchId}/messages")
    suspend fun transportMessages(@Path("matchId") matchId: Int): TransportMessagesResponse

    @POST("api/terminarz/transport/{matchId}/messages")
    suspend fun sendTransportMessage(
        @Path("matchId") matchId: Int,
        @Body body: TransportMessageRequest
    ): ApiOkResponse

    @POST("api/stats/save")
    suspend fun saveStats(@Body body: SaveStatsRequest): ResponseBody

    @GET("api/wallet/me")
    suspend fun wallet(): WalletResponse

    @POST("api/wallet/deposits")
    suspend fun declareDeposit(@Body body: DepositRequest): ApiOkResponse

    @GET("api/profile")
    suspend fun profile(): ProfileResponse

    @GET("api/player-stats/{userId}")
    suspend fun playerStats(@Path("userId") userId: Int): PlayerStatsResponse

    @GET("api/player-stats/{userId}")
    suspend fun playerStatsRealm(
        @Path("userId") userId: Int,
        @Header("X-AWP-Realm") realm: String
    ): PlayerStatsResponse

    @GET("api/players")
    suspend fun players(): PlayersResponse

    @GET("api/gallery")
    suspend fun gallery(): GalleryResponse

    @GET("api/weather/forecast")
    suspend fun weather(@retrofit2.http.Query("q") location: String): WeatherResponse

    @GET("api/rankingi")
    suspend fun rankingi(@retrofit2.http.Query("season") seasonId: Int? = null): RankingsResponse

    @GET("api/rankingi")
    suspend fun rankingiRealm(
        @Header("X-AWP-Realm") realm: String,
        @retrofit2.http.Query("season") seasonId: Int? = null
    ): RankingsResponse

    @GET("api/sklady")
    suspend fun sklady(@retrofit2.http.Query("m") matchId: Int? = null): LineupsResponse

    @POST("api/devices/register")
    suspend fun registerDevice(@Body body: DeviceRegisterRequest): ApiOkResponse

    @HTTP(method = "DELETE", path = "api/devices/register", hasBody = true)
    suspend fun unregisterDevice(@Body body: DeviceUnregisterRequest): ApiOkResponse

    @POST("api/user/push-preferences")
    suspend fun pushPreferences(@Body body: PushConsentRequest): ApiOkResponse

    @POST("api/client-log")
    suspend fun clientLog(@Body body: ClientLogRequest): ApiOkResponse

    @POST("api/auth/app-bridge")
    suspend fun appBridge(@Body body: AppBridgeRequest): AppBridgeResponse

    @GET("api/mobile/config")
    suspend fun mobileConfig(): MobileConfigResponse
}
