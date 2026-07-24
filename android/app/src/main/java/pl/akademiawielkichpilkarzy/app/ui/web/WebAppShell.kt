package pl.akademiawielkichpilkarzy.app.ui.web

import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.AwpApp
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.push.PushRegistrar
import pl.akademiawielkichpilkarzy.app.ui.common.PushAutoEnabler

/** Cała aplikacja w WebView — bez natywnego chrome, żeby strona wyglądała 1:1 jak web. */
@Composable
fun WebAppShell(
    isBlocked: (String) -> String?,
    initialPath: String? = null,
    onLoggedOut: () -> Unit
) {
    PushAutoEnabler()
    val scope = rememberCoroutineScope()
    val startPath = initialPath?.takeIf { it.startsWith("/") } ?: "/"

    fun logout() {
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

    WebPortalScreen(
        title = if (startPath.startsWith("/zaproszenie")) "Zaproszenie" else "Akademia Wielkich Piłkarzy",
        path = startPath,
        requireAuth = !startPath.startsWith("/zaproszenie"),
        showTopBar = false,
        onBack = null,
        onNavigatedToLogin = { logout() }
    )
}
