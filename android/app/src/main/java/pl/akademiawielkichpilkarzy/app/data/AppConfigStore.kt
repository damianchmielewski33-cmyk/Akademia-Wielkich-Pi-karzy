package pl.akademiawielkichpilkarzy.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore

private val Context.appConfigDataStore: DataStore<Preferences> by preferencesDataStore(name = "awp_app_config")

/** Cache ustawień publicznych aplikacji Android (np. tryb UI). */
class AppConfigStore(private val context: Context) {
    private val nativeUiKey = booleanPreferencesKey("android_ui_native")

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
        private const val PREF_NATIVE_UI = "android_ui_native"
    }
}
