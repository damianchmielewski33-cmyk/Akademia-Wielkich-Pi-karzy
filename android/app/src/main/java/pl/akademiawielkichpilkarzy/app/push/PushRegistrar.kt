package pl.akademiawielkichpilkarzy.app.push

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await
import pl.akademiawielkichpilkarzy.app.AwpApp
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.DeviceRegisterRequest
import pl.akademiawielkichpilkarzy.app.data.api.DeviceUnregisterRequest
import pl.akademiawielkichpilkarzy.app.data.api.PushConsentRequest

object PushRegistrar {
    suspend fun registerCurrentToken() {
        if (!hasNotificationPermission()) return
        try {
            val token = FirebaseMessaging.getInstance().token.await()
            if (token.isNullOrBlank()) return
            ApiClient.api.registerDevice(DeviceRegisterRequest(fcmToken = token))
        } catch (_: Exception) {
            // Placeholder google-services / brak sieci — nie blokuj aplikacji
        }
    }

    suspend fun unregisterAndRevokeConsent() {
        try {
            val token = try {
                FirebaseMessaging.getInstance().token.await()
            } catch (_: Exception) {
                null
            }
            ApiClient.api.unregisterDevice(
                DeviceUnregisterRequest(fcmToken = token, revokeConsent = true)
            )
            ApiClient.api.pushPreferences(PushConsentRequest(consent = false))
        } catch (_: Exception) {
        }
    }

    suspend fun enablePush() {
        ApiClient.api.pushPreferences(PushConsentRequest(consent = true))
        registerCurrentToken()
    }

    fun hasNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            AwpApp.instance,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
    }
}
