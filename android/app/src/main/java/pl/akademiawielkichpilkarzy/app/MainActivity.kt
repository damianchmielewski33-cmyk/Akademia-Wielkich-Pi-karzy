package pl.akademiawielkichpilkarzy.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.fragment.app.FragmentActivity
import pl.akademiawielkichpilkarzy.app.ui.login.LoginScreen
import pl.akademiawielkichpilkarzy.app.ui.nav.MainScaffold
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpTheme
import pl.akademiawielkichpilkarzy.app.ui.update.AppUpdateGate
import pl.akademiawielkichpilkarzy.app.ui.web.WebPortalScreen

class MainActivity : FragmentActivity() {
    private val deepLinkPathState = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        deepLinkPathState.value = intent.deepLinkPathOrNull()
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        )
        setContent {
            AwpTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AppUpdateGate(checkOnStart = true)
                    val token by AwpApp.instance.sessionStore.tokenFlow.collectAsState(initial = null)
                    val deepLinkPath = deepLinkPathState.value
                    var browsePitches by remember { mutableStateOf(false) }
                    val guestMarketplacePath =
                        deepLinkPath?.takeIf {
                            it.startsWith("/obiekty") ||
                                it.startsWith("/rezerwacje") ||
                                it.startsWith("/dla-obiektow") ||
                                it.startsWith("/zaproszenie")
                        }
                    if (token.isNullOrBlank()) {
                        if (guestMarketplacePath != null) {
                            WebPortalScreen(
                                title = if (guestMarketplacePath.startsWith("/zaproszenie")) "Zaproszenie" else "Rezerwacja boiska",
                                path = guestMarketplacePath,
                                requireAuth = false,
                                showTopBar = false
                            )
                        } else if (browsePitches) {
                            WebPortalScreen(
                                title = "Rezerwacja boiska",
                                path = "/?mode=booking",
                                requireAuth = false,
                                showTopBar = false,
                                onBack = { browsePitches = false }
                            )
                        } else {
                            LoginScreen(
                                onLoggedIn = {},
                                onBrowsePitches = { browsePitches = true }
                            )
                        }
                    } else {
                        MainScaffold(
                            initialPath = deepLinkPath,
                            onLoggedOut = {}
                        )
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        deepLinkPathState.value = intent.deepLinkPathOrNull()
    }

    /** App Links: zaproszenia oraz powrót z HotPay (/platnosci, /terminarz). */
    private fun Intent?.deepLinkPathOrNull(): String? {
        val uri = this?.data ?: return null
        val path = uri.encodedPath?.takeIf {
            it.startsWith("/zaproszenie") ||
                it.startsWith("/platnosci") ||
                it.startsWith("/terminarz") ||
                it.startsWith("/obiekty") ||
                it.startsWith("/rezerwacje") ||
                it.startsWith("/dla-obiektow")
        } ?: return null
        val query = uri.encodedQuery?.takeIf { it.isNotBlank() }?.let { "?$it" }.orEmpty()
        return path + query
    }
}
