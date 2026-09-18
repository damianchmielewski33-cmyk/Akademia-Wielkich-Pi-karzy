package pl.akademiawielkichpilkarzy.app.ui.update

import android.app.Activity
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
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
import pl.akademiawielkichpilkarzy.app.ui.common.AwpModal
import pl.akademiawielkichpilkarzy.app.ui.common.PitchPanel
import pl.akademiawielkichpilkarzy.app.update.AppUpdateInfo
import pl.akademiawielkichpilkarzy.app.update.AppUpdateRequests
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
    var infoMessage by remember { mutableStateOf<String?>(null) }

    fun startInstall(info: AppUpdateInfo) {
        val act = activity ?: return
        if (busy) return
        scope.launch {
            busy = true
            error = null
            dismissed = false
            try {
                if (!AppUpdater.canRequestPackageInstalls(act)) {
                    status = "Włącz instalację z tej aplikacji w ustawieniach…"
                    AppUpdater.openUnknownSourcesSettings(act)
                    error = "Włącz zezwolenie i kliknij Aktualizuj ponownie."
                    return@launch
                }
                status = "Pobieranie…"
                val file = AppUpdater.downloadApk(act, info)
                status = "Uruchamianie instalatora…"
                AppUpdater.installApk(act, file)
                dismissed = true
            } catch (e: Exception) {
                error = e.message ?: "Aktualizacja nieudana"
            } finally {
                busy = false
                status = null
            }
        }
    }

    LaunchedEffect(checkOnStart) {
        if (!checkOnStart) return@LaunchedEffect
        try {
            update = AppUpdater.checkForUpdate()
        } catch (_: Exception) {
        }
    }

    LaunchedEffect(Unit) {
        AppUpdateRequests.manual.collect {
            if (busy) return@collect
            dismissed = false
            error = null
            status = null
            try {
                val info = AppUpdater.checkForUpdate()
                if (info == null) {
                    update = null
                    infoMessage = "Masz najnowszą wersję (${BuildConfig.VERSION_NAME})."
                } else {
                    infoMessage = null
                    update = info
                }
            } catch (e: Exception) {
                infoMessage = e.message ?: "Nie udało się sprawdzić aktualizacji"
            }
        }
    }

    LaunchedEffect(Unit) {
        AppUpdateRequests.install.collect {
            try {
                val info = AppUpdater.checkForUpdate() ?: update
                if (info == null) {
                    infoMessage = "Masz najnowszą wersję (${BuildConfig.VERSION_NAME})."
                    return@collect
                }
                infoMessage = null
                update = info
                startInstall(info)
            } catch (e: Exception) {
                infoMessage = e.message ?: "Nie udało się sprawdzić aktualizacji"
            }
        }
    }

    val info = update
    if (info != null && !dismissed && activity != null) {
        AwpModal(
            title = "Wymagana aktualizacja",
            subtitle = "Nowa wersja ${info.versionName}",
            onDismiss = { if (!busy) dismissed = true },
            confirmText = if (busy) "Proszę czekać…" else "Aktualizuj",
            dismissText = "Później",
            dismissOnBackPress = false,
            dismissOnClickOutside = false,
            onConfirm = {
                startInstall(info)
            }
        ) {
            PitchPanel {
                Column {
                    Text(
                        "Masz wersję ${BuildConfig.VERSION_NAME}. Żeby korzystać z rezerwacji, terminarza i portfela bez błędów, zainstaluj aktualizację ${info.versionName}."
                    )
                    info.notes?.trim()?.takeIf { it.isNotEmpty() }?.let { notes ->
                        Spacer(Modifier.height(8.dp))
                        Text(notes)
                    }
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
            }
        }
    } else if (infoMessage != null) {
        AwpModal(
            title = "Aktualizacje",
            onDismiss = { infoMessage = null },
            confirmText = "OK",
            onConfirm = { infoMessage = null }
        ) {
            PitchPanel { Text(infoMessage!!) }
        }
    }
}

/** Ręczne sprawdzenie (np. z profilu). */
@Composable
fun rememberUpdateChecker(): () -> Unit {
    return {
        AppUpdateRequests.requestManualCheck()
    }
}
