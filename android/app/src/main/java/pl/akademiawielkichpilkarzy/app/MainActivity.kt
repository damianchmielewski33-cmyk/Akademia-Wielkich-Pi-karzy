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
        deepLinkPathState.value = intent.invitePathOrNull()
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
                    if (token.isNullOrBlank()) {
                        if (deepLinkPath != null) {
                            WebPortalScreen(
                                title = "Zaproszenie",
                                path = deepLinkPath,
                                requireAuth = false,
                                showTopBar = false
                            )
                        } else {
                            LoginScreen(onLoggedIn = {})
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
        deepLinkPathState.value = intent.invitePathOrNull()
    }

    private fun Intent?.invitePathOrNull(): String? {
        val uri = this?.data ?: return null
        val path = uri.encodedPath?.takeIf { it.startsWith("/zaproszenie") } ?: return null
        val query = uri.encodedQuery?.takeIf { it.isNotBlank() }?.let { "?$it" }.orEmpty()
        return path + query
    }
}
