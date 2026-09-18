package pl.akademiawielkichpilkarzy.app.ui.profile

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.AwpApp
import pl.akademiawielkichpilkarzy.app.BuildConfig
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.ProfileResponse
import pl.akademiawielkichpilkarzy.app.push.PushRegistrar
import pl.akademiawielkichpilkarzy.app.ui.common.AwpGoldButton
import pl.akademiawielkichpilkarzy.app.ui.common.AwpPrimaryButton
import pl.akademiawielkichpilkarzy.app.ui.common.AwpSecondaryButton
import pl.akademiawielkichpilkarzy.app.ui.common.ErrorBlock
import pl.akademiawielkichpilkarzy.app.ui.common.LoadingBlock
import pl.akademiawielkichpilkarzy.app.ui.common.PitchCard
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenScaffold
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenPhotoTheme
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors
import pl.akademiawielkichpilkarzy.app.update.AppUpdateInfo
import pl.akademiawielkichpilkarzy.app.update.AppUpdateRequests
import pl.akademiawielkichpilkarzy.app.update.AppUpdater

@Composable
fun ProfileScreen(
    onLoggedOut: () -> Unit,
    onOpenNativeRoute: (title: String, path: String) -> Unit = { _, _ -> }
) {
    var profile by remember { mutableStateOf<ProfileResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var updateInfo by remember { mutableStateOf<AppUpdateInfo?>(null) }
    var updateChecking by remember { mutableStateOf(true) }
    var updateCheckFailed by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun refreshUpdateStatus() {
        scope.launch {
            updateChecking = true
            updateCheckFailed = false
            try {
                updateInfo = AppUpdater.checkForUpdate()
            } catch (_: Exception) {
                updateInfo = null
                updateCheckFailed = true
            } finally {
                updateChecking = false
            }
        }
    }

    LaunchedEffect(Unit) {
        refreshUpdateStatus()
    }

    fun reload() {
        scope.launch {
            loading = true
            error = null
            try {
                profile = ApiClient.api.profile()
            } catch (e: Exception) {
                error = e.message ?: "Nie udało się pobrać profilu"
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    ScreenScaffold(title = "Profil", subtitle = "Konto zawodnika", theme = ScreenPhotoTheme.Profile) {
        when {
            loading -> LoadingBlock()
            error != null -> ErrorBlock(error!!) { reload() }
            else -> {
                val user = profile?.user
                PitchCard {
                    PitchLabel("Zawodnik")
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "${user?.firstName.orEmpty()} ${user?.lastName.orEmpty()}",
                        style = MaterialTheme.typography.headlineSmall,
                        color = AwpColors.OnPitch
                    )
                    Text(user?.zawodnik.orEmpty(), color = AwpColors.MundialGold)
                    if (!user?.email.isNullOrBlank()) {
                        Spacer(Modifier.height(4.dp))
                        Text(user!!.email!!, color = AwpColors.OnPitchMuted)
                    }
                }

                val summary = profile?.summary
                if (summary != null) {
                    PitchCard {
                        PitchLabel("Podsumowanie")
                        Spacer(Modifier.height(6.dp))
                        Text("Mecze ze statystykami: ${summary.matchesWithStats}", color = AwpColors.OnPitch)
                        Text(
                            "Gole: ${summary.goals} · Asysty: ${summary.assists}",
                            color = AwpColors.OnPitch
                        )
                        Text(
                            "Dystans: %.1f km · Obrony: ${summary.saves}".format(summary.distanceKm),
                            color = AwpColors.OnPitch
                        )
                    }
                }

                PitchCard {
                    PitchLabel("Powiadomienia")
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Powiadomienia o nowych meczach są zawsze włączone. Gdy admin doda termin, dostaniesz alert na zablokowanym ekranie telefonu.",
                        color = AwpColors.OnPitchMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                PitchCard {
                    PitchLabel("Ustawienia aplikacji")
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Wersja ${BuildConfig.VERSION_NAME}",
                        style = MaterialTheme.typography.titleMedium,
                        color = AwpColors.OnPitch
                    )
                    Text(
                        "Kompilacja ${BuildConfig.VERSION_CODE}",
                        color = AwpColors.OnPitchMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        when {
                            updateChecking -> "Sprawdzanie aktualizacji…"
                            updateCheckFailed -> "Nie udało się sprawdzić aktualizacji. Spróbuj ponownie."
                            updateInfo != null -> "Dostępna nowa wersja ${updateInfo!!.versionName}."
                            else -> "Masz najnowszą wersję. Aktualizacji nie ma."
                        },
                        color = AwpColors.OnPitch,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    val notes = updateInfo?.notes?.trim().orEmpty()
                    if (notes.isNotEmpty()) {
                        Spacer(Modifier.height(4.dp))
                        Text(notes, color = AwpColors.OnPitchMuted, style = MaterialTheme.typography.bodySmall)
                    }
                }

                if (updateInfo != null) {
                    AwpGoldButton("Zainstaluj aktualizację ${updateInfo!!.versionName}") {
                        AppUpdateRequests.requestInstall()
                    }
                }

                AwpSecondaryButton(
                    if (updateChecking) "Sprawdzanie…" else "Sprawdź aktualizacje",
                    enabled = !updateChecking
                ) {
                    refreshUpdateStatus()
                }
                AwpSecondaryButton("Odśwież profil i dane zawodnika") {
                    reload()
                }
                AwpSecondaryButton("Płatności w aplikacji") {
                    onOpenNativeRoute("Płatności", "/platnosci")
                }

                Spacer(Modifier.height(8.dp))
                AwpPrimaryButton("Wyloguj") {
                    scope.launch {
                        try {
                            PushRegistrar.unregisterOnLogout()
                        } catch (_: Exception) {
                        }
                        try {
                            ApiClient.api.logout()
                        } catch (_: Exception) {
                        }
                        try {
                            android.webkit.CookieManager.getInstance().removeAllCookies(null)
                            android.webkit.CookieManager.getInstance().flush()
                        } catch (_: Exception) {
                        }
                        AwpApp.instance.sessionStore.clear()
                        onLoggedOut()
                    }
                }
            }
        }
    }
}
