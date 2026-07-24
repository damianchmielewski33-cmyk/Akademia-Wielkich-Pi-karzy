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

/**
 * Rejestracja FCM — push jest zawsze włączony dla zalogowanego użytkownika
 * (brak przełącznika w profilu). Wymaga systemowego pozwolenia POST_NOTIFICATIONS (API 33+).
 */
object PushRegistrar {
    fun hasNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            AwpApp.instance,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
    }

    suspend fun registerCurrentToken() {
        if (!hasNotificationPermission()) return
        try {
            val token = FirebaseMessaging.getInstance().token.await()
            if (token.isNullOrBlank()) return
            ApiClient.api.registerDevice(DeviceRegisterRequest(fcmToken = token))
        } catch (_: Exception) {
            // Brak / placeholder google-services albo sieć — nie blokuj aplikacji
        }
    }

    /** Zawsze włącz push (zgoda + token) po logowaniu / starcie sesji. */
    suspend fun enablePush() {
        try {
            ApiClient.api.pushPreferences(PushConsentRequest(consent = true))
        } catch (_: Exception) {
        }
        registerCurrentToken()
    }

    /** Przy wylogowaniu usuń token urządzenia; przy kolejnym logowaniu zarejestruje się ponownie. */
    suspend fun unregisterOnLogout() {
        try {
            val token = try {
                FirebaseMessaging.getInstance().token.await()
            } catch (_: Exception) {
                null
            }
            ApiClient.api.unregisterDevice(
                DeviceUnregisterRequest(fcmToken = token, revokeConsent = false)
            )
        } catch (_: Exception) {
        }
    }
}
