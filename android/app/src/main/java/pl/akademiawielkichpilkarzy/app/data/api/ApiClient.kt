package pl.akademiawielkichpilkarzy.app.data.api

import android.os.Build
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import pl.akademiawielkichpilkarzy.app.BuildConfig
import pl.akademiawielkichpilkarzy.app.data.auth.SessionInvalidator
import pl.akademiawielkichpilkarzy.app.data.auth.SessionStore
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private lateinit var sessionStore: SessionStore

    fun init(store: SessionStore) {
        sessionStore = store
    }

    /** Wymusza lokalne wylogowanie (np. po wykryciu wygasłej sesji poza interceptorami). */
    fun invalidateLocalSession() {
        if (!::sessionStore.isInitialized) return
        SessionInvalidator.clearLocalSession(sessionStore)
    }

    private val moshi: Moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val clientLogAdapter = moshi.adapter(ClientLogRequest::class.java)

    private val baseUrl: String = normalizeBaseUrl(BuildConfig.API_BASE_URL)

    private val authInterceptor = Interceptor { chain ->
        val token = if (::sessionStore.isInitialized) {
            runBlocking { sessionStore.getToken() }
        } else {
            null
        }
        val req = if (!token.isNullOrBlank()) {
            chain.request().newBuilder()
                .header("Authorization", "Bearer $token")
                .header("Accept", "application/json")
                .header("X-AWP-Client", "android")
                .build()
        } else {
            chain.request().newBuilder()
                .header("Accept", "application/json")
                .header("X-AWP-Client", "android")
                .build()
        }
        chain.proceed(req)
    }

    private val logging = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BASIC
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
    }

    /** Osobny klient bez interceptorów raportujących — żeby uniknąć pętli. */
    private val plainHttp: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private fun reportAsync(body: ClientLogRequest) {
        Thread {
            try {
                val json = clientLogAdapter.toJson(body)
                val token = if (::sessionStore.isInitialized) {
                    runBlocking { sessionStore.getToken() }
                } else {
                    null
                }
                val builder = Request.Builder()
                    .url(baseUrl + "api/client-log")
                    .post(json.toRequestBody("application/json; charset=utf-8".toMediaType()))
                    .header("Accept", "application/json")
                    .header("X-AWP-Client", "android")
                if (!token.isNullOrBlank()) {
                    builder.header("Authorization", "Bearer $token")
                }
                plainHttp.newCall(builder.build()).execute().close()
            } catch (_: Exception) {
            }
        }.start()
    }

    private fun deviceLogFields(): Triple<String?, String?, String?> =
        Triple(Build.MODEL, Build.VERSION.RELEASE, BuildConfig.VERSION_NAME)

    /**
     * 401 na chronionych endpointach = nieważny JWT → lokalne wylogowanie.
     * MainActivity słucha tokenFlow i wraca na login.
     */
    private val sessionGuardInterceptor = Interceptor { chain ->
        val request = chain.request()
        val path = request.url.encodedPath
        val response = chain.proceed(request)
        if (
            response.code == 401 &&
            ::sessionStore.isInitialized &&
            SessionInvalidator.shouldInvalidateOn401(path)
        ) {
            SessionInvalidator.clearLocalSession(sessionStore)
        }
        response
    }

    private val errorReportInterceptor = Interceptor { chain ->
        val request = chain.request()
        val path = request.url.encodedPath
        if (path.contains("client-log")) {
            return@Interceptor chain.proceed(request)
        }
        val (phone, androidVer, appVer) = deviceLogFields()
        try {
            val response = chain.proceed(request)
            // 401 z wygasłą sesją to oczekiwany scenariusz — nie spamuj activity_log.
            val sessionExpired401 =
                response.code == 401 && SessionInvalidator.shouldInvalidateOn401(path)
            if (!response.isSuccessful && response.code >= 400 && !sessionExpired401) {
                reportAsync(
                    ClientLogRequest(
                        kind = "api_error",
                        message = "HTTP ${response.code} ${request.method} $path",
                        phoneModel = phone,
                        androidVersion = androidVer,
                        appVersion = appVer,
                        details = "base=$baseUrl"
                    )
                )
            }
            response
        } catch (e: Exception) {
            reportAsync(
                ClientLogRequest(
                    kind = "download_failed",
                    message = e.message ?: e.javaClass.simpleName,
                    phoneModel = phone,
                    androidVersion = androidVer,
                    appVersion = appVer,
                    details = "${request.method} $path"
                )
            )
            throw e
        }
    }

    private val okHttp: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(authInterceptor)
        .addInterceptor(sessionGuardInterceptor)
        .addInterceptor(errorReportInterceptor)
        .addInterceptor(logging)
        .build()

    private val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(okHttp)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    val api: AwpApi = retrofit.create(AwpApi::class.java)

    private fun normalizeBaseUrl(raw: String): String {
        val trimmed = raw.trim()
        return if (trimmed.endsWith("/")) trimmed else "$trimmed/"
    }
}
