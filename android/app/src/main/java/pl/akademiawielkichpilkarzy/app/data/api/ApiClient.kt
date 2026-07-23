package pl.akademiawielkichpilkarzy.app.data.api

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
import pl.akademiawielkichpilkarzy.app.data.auth.SessionStore
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private lateinit var sessionStore: SessionStore

    fun init(store: SessionStore) {
        sessionStore = store
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
                val req = Request.Builder()
                    .url(baseUrl + "api/client-log")
                    .post(json.toRequestBody("application/json; charset=utf-8".toMediaType()))
                    .header("Accept", "application/json")
                    .build()
                plainHttp.newCall(req).execute().close()
            } catch (_: Exception) {
            }
        }.start()
    }

    private val errorReportInterceptor = Interceptor { chain ->
        val request = chain.request()
        val path = request.url.encodedPath
        if (path.contains("client-log")) {
            return@Interceptor chain.proceed(request)
        }
        try {
            val response = chain.proceed(request)
            if (!response.isSuccessful && response.code >= 400) {
                reportAsync(
                    ClientLogRequest(
                        kind = "api_error",
                        message = "HTTP ${response.code} ${request.method} $path",
                        appVersion = BuildConfig.VERSION_NAME,
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
                    appVersion = BuildConfig.VERSION_NAME,
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
