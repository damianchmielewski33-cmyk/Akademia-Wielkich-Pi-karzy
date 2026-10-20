package pl.akademiawielkichpilkarzy.app.data.auth

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "awp_session")

class SessionStore(private val context: Context) {
    private val tokenKey = stringPreferencesKey("jwt")
    private val userIdKey = stringPreferencesKey("user_id")
    private val firstNameKey = stringPreferencesKey("first_name")
    private val lastNameKey = stringPreferencesKey("last_name")
    private val zawodnikKey = stringPreferencesKey("zawodnik")
    private val isAdminKey = stringPreferencesKey("is_admin")

    val tokenFlow: Flow<String?> = context.dataStore.data.map { it[tokenKey] }

    val isAdminFlow: Flow<Boolean> = context.dataStore.data.map {
        it[isAdminKey] == "1"
    }

    suspend fun getToken(): String? = context.dataStore.data.first()[tokenKey]

    suspend fun getUserId(): Int? =
        context.dataStore.data.first()[userIdKey]?.toIntOrNull()

    suspend fun isAdmin(): Boolean =
        context.dataStore.data.first()[isAdminKey] == "1"

    suspend fun saveSession(
        token: String,
        userId: Int,
        firstName: String,
        lastName: String,
        zawodnik: String,
        isAdmin: Boolean = false
    ) {
        context.dataStore.edit { prefs ->
            prefs[tokenKey] = token
            prefs[userIdKey] = userId.toString()
            prefs[firstNameKey] = firstName
            prefs[lastNameKey] = lastName
            prefs[zawodnikKey] = zawodnik
            prefs[isAdminKey] = if (isAdmin) "1" else "0"
        }
    }

    suspend fun setIsAdmin(isAdmin: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[isAdminKey] = if (isAdmin) "1" else "0"
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }

    data class UserSnapshot(
        val firstName: String,
        val lastName: String,
        val zawodnik: String,
        val isAdmin: Boolean
    )

    val userFlow: Flow<UserSnapshot?> = context.dataStore.data.map { prefs ->
        val fn = prefs[firstNameKey] ?: return@map null
        val ln = prefs[lastNameKey] ?: return@map null
        val zaw = prefs[zawodnikKey] ?: return@map null
        UserSnapshot(fn, ln, zaw, prefs[isAdminKey] == "1")
    }
}
