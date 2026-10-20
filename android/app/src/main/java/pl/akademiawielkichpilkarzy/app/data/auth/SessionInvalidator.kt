package pl.akademiawielkichpilkarzy.app.data.auth

import android.webkit.CookieManager
import kotlinx.coroutines.runBlocking

/**
 * Lokalne wylogowanie przy nieważnym JWT (401): czyści DataStore i cookies WebView,
 * żeby UI wrócił na ekran logowania zamiast wisieć na błędach mostka.
 */
object SessionInvalidator {
    @Volatile
    private var clearing = false

    fun clearLocalSession(sessionStore: SessionStore) {
        if (clearing) return
        synchronized(this) {
            if (clearing) return
            clearing = true
        }
        try {
            try {
                CookieManager.getInstance().removeAllCookies(null)
                CookieManager.getInstance().flush()
            } catch (_: Exception) {
            }
            runBlocking { sessionStore.clear() }
        } finally {
            clearing = false
        }
    }

    /** Endpointy, gdzie 401 oznacza złe dane / publiczny błąd — nie kasujemy sesji. */
    fun shouldInvalidateOn401(encodedPath: String): Boolean {
        val path = encodedPath.trimStart('/').lowercase()
        if (path.contains("client-log")) return false
        return when (path) {
            "api/auth/login",
            "api/auth/register",
            "api/auth/register/verify",
            "api/auth/email-auth/send-code",
            "api/auth/email-auth/complete",
            "api/auth/forgot-pin-request",
            "api/auth/forgot-password/send-code",
            "api/auth/forgot-password/reset",
            "api/auth/set-initial-pin" -> false
            else -> true
        }
    }
}
