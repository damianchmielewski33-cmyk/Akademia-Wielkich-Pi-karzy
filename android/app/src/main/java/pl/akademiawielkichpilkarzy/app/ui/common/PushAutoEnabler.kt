package pl.akademiawielkichpilkarzy.app.ui.common

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.push.PushRegistrar

/**
 * Po zalogowaniu: prosi o pozwolenie systemowe (API 33+) i rejestruje FCM.
 * Brak przełącznika w UI — push jest zawsze włączony.
 */
@Composable
fun PushAutoEnabler() {
    val scope = rememberCoroutineScope()
    var asked by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            scope.launch {
                runCatching { PushRegistrar.enablePush() }
            }
        }
    }

    LaunchedEffect(Unit) {
        if (asked) return@LaunchedEffect
        asked = true
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            !PushRegistrar.hasNotificationPermission()
        ) {
            permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            runCatching { PushRegistrar.enablePush() }
        }
    }
}
