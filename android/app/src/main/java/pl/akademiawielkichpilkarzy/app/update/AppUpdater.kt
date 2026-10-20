package pl.akademiawielkichpilkarzy.app.update

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import pl.akademiawielkichpilkarzy.app.BuildConfig
import java.io.File
import java.util.concurrent.TimeUnit

data class AppUpdateInfo(
    val versionCode: Int,
    val versionName: String,
    val apkUrl: String,
    val notes: String? = null
)

object AppUpdater {
    private val http = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

    suspend fun checkForUpdate(): AppUpdateInfo? = withContext(Dispatchers.IO) {
        val base = BuildConfig.API_BASE_URL.trim().let {
            if (it.endsWith("/")) it else "$it/"
        }
        val req = Request.Builder()
            .url(base + "api/android/version")
            .header("Accept", "application/json")
            .get()
            .build()
        http.newCall(req).execute().use { res ->
            if (!res.isSuccessful) return@withContext null
            val body = res.body?.string() ?: return@withContext null
            val code = Regex("\"versionCode\"\\s*:\\s*(\\d+)").find(body)?.groupValues?.get(1)?.toIntOrNull()
                ?: return@withContext null
            if (code <= BuildConfig.VERSION_CODE) return@withContext null
            val name = Regex("\"versionName\"\\s*:\\s*\"([^\"]+)\"").find(body)?.groupValues?.get(1)
                ?: code.toString()
            val apkUrl = Regex("\"apkUrl\"\\s*:\\s*\"([^\"]+)\"").find(body)?.groupValues?.get(1)
                ?: (base + "api/android/download?source=in-app-update")
            val notes = Regex("\"notes\"\\s*:\\s*\"([^\"]*)\"").find(body)?.groupValues?.get(1)
            AppUpdateInfo(versionCode = code, versionName = name, apkUrl = apkUrl, notes = notes)
        }
    }

    fun canRequestPackageInstalls(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
    }

    fun openUnknownSourcesSettings(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val intent = Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${activity.packageName}")
            )
            activity.startActivity(intent)
        }
    }

    suspend fun downloadApk(context: Context, info: AppUpdateInfo): File = withContext(Dispatchers.IO) {
        val dir = File(context.getExternalFilesDir(null), "updates").apply { mkdirs() }
        val out = File(dir, "akademia-wp-${info.versionCode}.apk")
        if (out.exists()) out.delete()
        val req = Request.Builder()
            .url(info.apkUrl)
            .header("User-Agent", "AWP-Android-Updater/${BuildConfig.VERSION_NAME}")
            .get()
            .build()
        http.newCall(req).execute().use { res ->
            if (!res.isSuccessful) {
                throw IllegalStateException("Pobieranie APK nieudane (${res.code})")
            }
            val body = res.body ?: throw IllegalStateException("Pusta odpowiedź APK")
            out.outputStream().use { sink ->
                body.byteStream().copyTo(sink)
            }
        }
        if (out.length() < 100_000L) {
            out.delete()
            throw IllegalStateException("Pobrany plik wygląda na uszkodzony")
        }
        out
    }

    fun installApk(activity: Activity, apkFile: File) {
        val uri = FileProvider.getUriForFile(
            activity,
            "${activity.packageName}.fileprovider",
            apkFile
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        activity.startActivity(intent)
    }
}
