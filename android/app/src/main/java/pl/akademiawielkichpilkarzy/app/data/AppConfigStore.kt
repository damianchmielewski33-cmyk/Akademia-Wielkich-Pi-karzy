package pl.akademiawielkichpilkarzy.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.appConfigDataStore: DataStore<Preferences> by preferencesDataStore(name = "awp_app_config")

/**
 * Cache ustawień publicznych (np. V2 marketplace) — żeby splash przy cold starcie
 * od razu wyglądał jak strona WWW, bez czekania na API.
 */
class AppConfigStore(private val context: Context) {
    private val marketplaceKey = booleanPreferencesKey("booking_marketplace_enabled")
    private val nativeUiKey = booleanPreferencesKey("android_ui_native")

    val marketplaceEnabledFlow: Flow<Boolean> =
        context.appConfigDataStore.data.map { it[marketplaceKey] == true }

    suspend fun isMarketplaceEnabled(): Boolean =
        context.appConfigDataStore.data.first()[marketplaceKey] == true

    /** Szybki odczyt synchroniczny na wątku UI (tylko do tła okna przed Compose). */
    fun isMarketplaceEnabledBlocking(): Boolean {
        // DataStore nie ma sync API — używamy SharedPreferences mirror.
        return context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(PREF_MARKETPLACE, false)
    }

    suspend fun setMarketplaceEnabled(enabled: Boolean) {
        context.appConfigDataStore.edit { it[marketplaceKey] = enabled }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(PREF_MARKETPLACE, enabled)
            .apply()
    }

    fun isNativeUiBlocking(): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(PREF_NATIVE_UI, false)

    suspend fun setNativeUi(native: Boolean) {
        context.appConfigDataStore.edit { it[nativeUiKey] = native }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(PREF_NATIVE_UI, native)
            .apply()
    }

    companion object {
        private const val PREFS = "awp_app_config_mirror"
        private const val PREF_MARKETPLACE = "booking_marketplace_enabled"
        private const val PREF_NATIVE_UI = "android_ui_native"
    }
}
