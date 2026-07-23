package pl.akademiawielkichpilkarzy.app.ui.update

import android.app.Activity
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.BuildConfig
import pl.akademiawielkichpilkarzy.app.update.AppUpdateInfo
import pl.akademiawielkichpilkarzy.app.update.AppUpdater

@Composable
fun AppUpdateGate(checkOnStart: Boolean = true) {
    val context = LocalContext.current
    val activity = context as? Activity
    val scope = rememberCoroutineScope()

    var update by remember { mutableStateOf<AppUpdateInfo?>(null) }
    var busy by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var dismissed by remember { mutableStateOf(false) }

    LaunchedEffect(checkOnStart) {
        if (!checkOnStart || dismissed) return@LaunchedEffect
        try {
            update = AppUpdater.checkForUpdate()
        } catch (_: Exception) {
        }
    }

    val info = update
    if (info != null && !dismissed && activity != null) {
        AlertDialog(
            onDismissRequest = { /* wymuszamy wybór */ },
            title = { Text("Dostępna aktualizacja") },
            text = {
                Column {
                    Text(
                        "Nowa wersja ${info.versionName} (masz ${BuildConfig.VERSION_NAME}). " +
                            "Aplikacja pobierze APK i poprosi o instalację — bez GitHuba."
                    )
                    if (busy) {
                        Spacer(Modifier.height(12.dp))
                        CircularProgressIndicator()
                        status?.let {
                            Spacer(Modifier.height(8.dp))
                            Text(it)
                        }
                    }
                    error?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(it)
                    }
                }
            },
            confirmButton = {
                TextButton(
                    enabled = !busy,
                    onClick = {
                        scope.launch {
                            busy = true
                            error = null
                            try {
                                if (!AppUpdater.canRequestPackageInstalls(activity)) {
                                    status = "Włącz instalację z tej aplikacji w ustawieniach…"
                                    AppUpdater.openUnknownSourcesSettings(activity)
                                    error = "Włącz zezwolenie i kliknij Aktualizuj ponownie."
                                    return@launch
                                }
                                status = "Pobieranie…"
                                val file = AppUpdater.downloadApk(activity, info)
                                status = "Uruchamianie instalatora…"
                                AppUpdater.installApk(activity, file)
                                dismissed = true
                            } catch (e: Exception) {
                                error = e.message ?: "Aktualizacja nieudana"
                            } finally {
                                busy = false
                                status = null
                            }
                        }
                    }
                ) {
                    Text(if (busy) "Proszę czekać…" else "Aktualizuj")
                }
            },
            dismissButton = {
                TextButton(
                    enabled = !busy,
                    onClick = { dismissed = true }
                ) {
                    Text("Później")
                }
            }
        )
    }
}

/** Ręczne sprawdzenie (np. z profilu). */
@Composable
fun rememberUpdateChecker(): () -> Unit {
    val context = LocalContext.current
    val activity = context as? Activity
    val scope = rememberCoroutineScope()
    var update by remember { mutableStateOf<AppUpdateInfo?>(null) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    if (update != null && activity != null) {
        val info = update!!
        AlertDialog(
            onDismissRequest = { update = null },
            title = { Text("Aktualizacja ${info.versionName}") },
            text = {
                Column {
                    Text("Zainstalować nową wersję?")
                    message?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(it)
                    }
                    if (busy) {
                        Spacer(Modifier.height(12.dp))
                        CircularProgressIndicator()
                    }
                }
            },
            confirmButton = {
                TextButton(
                    enabled = !busy,
                    onClick = {
                        scope.launch {
                            busy = true
                            message = null
                            try {
                                if (!AppUpdater.canRequestPackageInstalls(activity)) {
                                    AppUpdater.openUnknownSourcesSettings(activity)
                                    message = "Włącz zezwolenie i spróbuj ponownie."
                                    return@launch
                                }
                                message = "Pobieranie…"
                                val file = AppUpdater.downloadApk(activity, info)
                                AppUpdater.installApk(activity, file)
                                update = null
                            } catch (e: Exception) {
                                message = e.message ?: "Błąd"
                            } finally {
                                busy = false
                            }
                        }
                    }
                ) { Text("Aktualizuj") }
            },
            dismissButton = {
                TextButton(onClick = { update = null }) { Text("Anuluj") }
            }
        )
    } else if (message != null) {
        AlertDialog(
            onDismissRequest = { message = null },
            title = { Text("Aktualizacje") },
            text = { Text(message!!) },
            confirmButton = {
                TextButton(onClick = { message = null }) { Text("OK") }
            }
        )
    }

    return {
        scope.launch {
            try {
                val info = AppUpdater.checkForUpdate()
                if (info == null) {
                    message = "Masz najnowszą wersję (${BuildConfig.VERSION_NAME})."
                } else {
                    update = info
                }
            } catch (e: Exception) {
                message = e.message ?: "Nie udało się sprawdzić aktualizacji"
            }
        }
    }
}
