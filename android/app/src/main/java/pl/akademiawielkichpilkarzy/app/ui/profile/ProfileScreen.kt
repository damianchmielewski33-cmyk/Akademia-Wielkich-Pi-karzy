package pl.akademiawielkichpilkarzy.app.ui.profile

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.AwpApp
import pl.akademiawielkichpilkarzy.app.BuildConfig
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.ProfileResponse
import pl.akademiawielkichpilkarzy.app.push.PushRegistrar
import pl.akademiawielkichpilkarzy.app.ui.update.rememberUpdateChecker

@Composable
fun ProfileScreen(onLoggedOut: () -> Unit) {
    var profile by remember { mutableStateOf<ProfileResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var pushEnabled by remember { mutableStateOf(false) }
    var pushBusy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val checkUpdate = rememberUpdateChecker()

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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("Profil", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))

        when {
            loading -> CircularProgressIndicator()
            error != null -> {
                Text(error!!, color = MaterialTheme.colorScheme.error)
                OutlinedButton(onClick = { reload() }) { Text("Odśwież") }
            }
            else -> {
                val user = profile?.user
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "${user?.firstName.orEmpty()} ${user?.lastName.orEmpty()}",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleLarge
                        )
                        Text(user?.zawodnik.orEmpty(), color = MaterialTheme.colorScheme.primary)
                        if (!user?.email.isNullOrBlank()) {
                            Spacer(Modifier.height(4.dp))
                            Text(user!!.email!!)
                        }
                    }
                }

                val summary = profile?.summary
                if (summary != null) {
                    Spacer(Modifier.height(12.dp))
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Podsumowanie", fontWeight = FontWeight.SemiBold)
                            Text("Mecze ze statystykami: ${summary.matchesWithStats}")
                            Text("Gole: ${summary.goals} · Asysty: ${summary.assists}")
                            Text("Dystans: %.1f km · Obrony: ${summary.saves}".format(summary.distanceKm))
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Powiadomienia push", fontWeight = FontWeight.SemiBold)
                            Text(
                                "Nowe i odwołane mecze",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                        Switch(
                            checked = pushEnabled,
                            enabled = !pushBusy,
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

                Spacer(Modifier.height(16.dp))
                OutlinedButton(
                    onClick = { checkUpdate() },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Sprawdź aktualizacje (v${BuildConfig.VERSION_NAME})")
                }

                Spacer(Modifier.height(24.dp))
                Button(
                    onClick = {
                        scope.launch {
                            try {
                                PushRegistrar.unregisterAndRevokeConsent()
                            } catch (_: Exception) {
                            }
                            try {
                                ApiClient.api.logout()
                            } catch (_: Exception) {
                            }
                            AwpApp.instance.sessionStore.clear()
                            onLoggedOut()
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Wyloguj")
                }
            }
        }
    }
}
