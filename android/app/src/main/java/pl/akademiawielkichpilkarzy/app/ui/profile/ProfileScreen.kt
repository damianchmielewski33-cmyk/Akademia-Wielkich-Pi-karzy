package pl.akademiawielkichpilkarzy.app.ui.profile

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
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
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors
import pl.akademiawielkichpilkarzy.app.ui.update.rememberUpdateChecker
import pl.akademiawielkichpilkarzy.app.update.AppUpdater

@Composable
fun ProfileScreen(
    onLoggedOut: () -> Unit,
    onOpenWeb: (title: String, path: String) -> Unit = { _, _ -> }
) {
    var profile by remember { mutableStateOf<ProfileResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var pushEnabled by remember { mutableStateOf(false) }
    var pushBusy by remember { mutableStateOf(false) }
    var updateAvailable by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val checkUpdate = rememberUpdateChecker()

    LaunchedEffect(Unit) {
        updateAvailable = runCatching { AppUpdater.checkForUpdate() != null }.getOrDefault(false)
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            scope.launch {
                pushBusy = true
                try {
                    PushRegistrar.enablePush()
                    pushEnabled = true
                } catch (_: Exception) {
                } finally {
                    pushBusy = false
                }
            }
        }
    }

    fun reload() {
        scope.launch {
            loading = true
            error = null
            try {
                profile = ApiClient.api.profile()
                pushEnabled = (profile?.user?.pushNotificationsConsent ?: 0) == 1
            } catch (e: Exception) {
                error = e.message ?: "Nie udało się pobrać profilu"
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    ScreenScaffold(title = "Profil", subtitle = "Konto zawodnika") {
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
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        androidx.compose.foundation.layout.Column(modifier = Modifier.weight(1f)) {
                            Text("Powiadomienia push", color = AwpColors.OnPitch)
                            Text(
                                "Nowe i odwołane mecze",
                                style = MaterialTheme.typography.bodySmall,
                                color = AwpColors.OnPitchMuted
                            )
                        }
                        Switch(
                            checked = pushEnabled,
                            enabled = !pushBusy,
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = AwpColors.MundialGold,
                                checkedTrackColor = AwpColors.MundialTeal,
                                uncheckedTrackColor = AwpColors.PitchDeep
                            ),
                            onCheckedChange = { enabled ->
                                scope.launch {
                                    pushBusy = true
                                    try {
                                        if (enabled) {
                                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                                                !PushRegistrar.hasNotificationPermission()
                                            ) {
                                                permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                                            } else {
                                                PushRegistrar.enablePush()
                                                pushEnabled = true
                                            }
                                        } else {
                                            PushRegistrar.unregisterAndRevokeConsent()
                                            pushEnabled = false
                                        }
                                    } catch (_: Exception) {
                                    } finally {
                                        pushBusy = false
                                    }
                                }
                            }
                        )
                    }
                }

                AwpSecondaryButton("Edytuj profil (zdjęcie, dane, motyw)") {
                    onOpenWeb("Mój profil", "/profil")
                }
                AwpSecondaryButton("Płatności na stronie") {
                    onOpenWeb("Płatności", "/platnosci")
                }
                if (updateAvailable) {
                    AwpGoldButton("Dostępna aktualizacja — sprawdź (v${BuildConfig.VERSION_NAME})") {
                        checkUpdate()
                    }
                } else {
                    AwpSecondaryButton("Sprawdź aktualizacje (v${BuildConfig.VERSION_NAME})") {
                        checkUpdate()
                    }
                }

                Spacer(Modifier.height(8.dp))
                AwpPrimaryButton("Wyloguj") {
                    scope.launch {
                        try {
                            PushRegistrar.unregisterAndRevokeConsent()
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
