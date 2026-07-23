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

    val tokenFlow: Flow<String?> = context.dataStore.data.map { it[tokenKey] }

    suspend fun getToken(): String? = context.dataStore.data.first()[tokenKey]

    suspend fun getUserId(): Int? =
        context.dataStore.data.first()[userIdKey]?.toIntOrNull()

    suspend fun saveSession(
        token: String,
        userId: Int,
        firstName: String,
        lastName: String,
        zawodnik: String
    ) {
        context.dataStore.edit { prefs ->
            prefs[tokenKey] = token
            prefs[userIdKey] = userId.toString()
            prefs[firstNameKey] = firstName
            prefs[lastNameKey] = lastName
            prefs[zawodnikKey] = zawodnik
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }

    data class UserSnapshot(
        val firstName: String,
        val lastName: String,
        val zawodnik: String
    )

    val userFlow: Flow<UserSnapshot?> = context.dataStore.data.map { prefs ->
        val fn = prefs[firstNameKey] ?: return@map null
        val ln = prefs[lastNameKey] ?: return@map null
        val zaw = prefs[zawodnikKey] ?: return@map null
        UserSnapshot(fn, ln, zaw)
    }
}
