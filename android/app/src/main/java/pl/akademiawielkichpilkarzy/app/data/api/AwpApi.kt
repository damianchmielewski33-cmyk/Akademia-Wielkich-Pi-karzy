package pl.akademiawielkichpilkarzy.app.data.api

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.POST
import retrofit2.http.Path

interface AwpApi {
    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @GET("api/auth/me")
    suspend fun me(): MeResponse

    @POST("api/auth/logout")
    suspend fun logout(): ApiOkResponse

    @GET("api/terminarz")
    suspend fun terminarz(): TerminarzResponse

    @POST("api/terminarz/signup/{id}")
    suspend fun signup(
        @Path("id") matchId: Int,
        @Body body: SignupRequest
    ): ApiOkResponse

    @POST("api/terminarz/unsubscribe/{id}")
    suspend fun unsubscribe(@Path("id") matchId: Int): ApiOkResponse

    @GET("api/wallet/me")
    suspend fun wallet(): WalletResponse

    @POST("api/wallet/deposits")
    suspend fun declareDeposit(@Body body: DepositRequest): ApiOkResponse

    @GET("api/profile")
    suspend fun profile(): ProfileResponse

    @GET("api/player-stats/{userId}")
    suspend fun playerStats(@Path("userId") userId: Int): PlayerStatsResponse

    @GET("api/weather/forecast")
    suspend fun weather(@retrofit2.http.Query("q") location: String): WeatherResponse

    @GET("api/rankingi")
    suspend fun rankingi(@retrofit2.http.Query("season") seasonId: Int? = null): RankingsResponse

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

    /** Wymiana Bearer JWT na ticket do WebView (cookie sesji strony). */
    @POST("api/auth/app-bridge")
    suspend fun appBridge(@Body body: AppBridgeRequest): AppBridgeResponse

    @GET("api/mobile/config")
    suspend fun mobileConfig(): MobileConfigResponse
}
