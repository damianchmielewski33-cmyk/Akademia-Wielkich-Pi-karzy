package pl.akademiawielkichpilkarzy.app

import android.os.Bundle
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
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AwpTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AppUpdateGate(checkOnStart = true)
                    val token by AwpApp.instance.sessionStore.tokenFlow.collectAsState(initial = null)
                    if (token.isNullOrBlank()) {
                        var guestPortal by remember {
                            mutableStateOf<Pair<String, String>?>(null)
                        }
                        val portal = guestPortal
                        if (portal != null) {
                            WebPortalScreen(
                                title = portal.first,
                                path = portal.second,
                                requireAuth = false,
                                onBack = { guestPortal = null }
                            )
                        } else {
                            LoginScreen(
                                onLoggedIn = {},
                                onOpenWeb = { title, path -> guestPortal = title to path }
                            )
                        }
                    } else {
                        MainScaffold(onLoggedOut = {})
                    }
                }
            }
        }
    }
}
