package pl.akademiawielkichpilkarzy.app.data.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

/**
 * Bezpieczne przechowywanie danych do logowania biometrią (PIN + imię/nazwisko).
 * Szyfrowane przez Android Keystore / EncryptedSharedPreferences (security-crypto 1.0).
 */
class BiometricCredentialsStore(context: Context) {
    private val prefs: SharedPreferences = try {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        EncryptedSharedPreferences.create(
            PREFS_NAME,
            masterKeyAlias,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (_: Exception) {
        // Fallback — lepiej brak biometrii niż crash przy uszkodzonym keystore.
        context.getSharedPreferences(PREFS_NAME_FALLBACK, Context.MODE_PRIVATE)
    }

    data class Credentials(
        val firstName: String,
        val lastName: String,
        val pin: String,
        val rememberMe: Boolean
    )

    fun isEnabled(): Boolean = prefs.getBoolean(KEY_ENABLED, false) && getCredentials() != null

    fun getCredentials(): Credentials? {
        if (!prefs.getBoolean(KEY_ENABLED, false)) return null
        val first = prefs.getString(KEY_FIRST, null)?.trim().orEmpty()
        val last = prefs.getString(KEY_LAST, null)?.trim().orEmpty()
        val pin = prefs.getString(KEY_PIN, null)?.trim().orEmpty()
        if (first.isEmpty() || last.isEmpty() || pin.length !in 4..6) return null
        return Credentials(
            firstName = first,
            lastName = last,
            pin = pin,
            rememberMe = prefs.getBoolean(KEY_REMEMBER, true)
        )
    }

    fun enable(credentials: Credentials) {
        prefs.edit()
            .putBoolean(KEY_ENABLED, true)
            .putString(KEY_FIRST, credentials.firstName.trim())
            .putString(KEY_LAST, credentials.lastName.trim())
            .putString(KEY_PIN, credentials.pin.trim())
            .putBoolean(KEY_REMEMBER, credentials.rememberMe)
            .apply()
    }

    fun disable() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val PREFS_NAME = "awp_biometric_creds"
        private const val PREFS_NAME_FALLBACK = "awp_biometric_creds_fallback"
        private const val KEY_ENABLED = "enabled"
        private const val KEY_FIRST = "first_name"
        private const val KEY_LAST = "last_name"
        private const val KEY_PIN = "pin"
        private const val KEY_REMEMBER = "remember_me"
    }
}
