package pl.akademiawielkichpilkarzy.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.ui.login.LoginScreen
import pl.akademiawielkichpilkarzy.app.ui.nav.MainScaffold
import pl.akademiawielkichpilkarzy.app.ui.splash.StartupSplashScreen
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpTheme
import pl.akademiawielkichpilkarzy.app.ui.update.AppUpdateGate
import pl.akademiawielkichpilkarzy.app.ui.web.WebPortalScreen

class MainActivity : FragmentActivity() {
    private val deepLinkPathState = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        deepLinkPathState.value = intent.deepLinkPathOrNull()

        val cachedMarketplace = AwpApp.instance.appConfigStore.isMarketplaceEnabledBlocking()
        window.setBackgroundDrawableResource(
            if (cachedMarketplace) R.color.awp_mp_bg else R.color.awp_green_dark
        )

        enableEdgeToEdge(
            statusBarStyle = if (cachedMarketplace) {
                SystemBarStyle.light(
                    android.graphics.Color.TRANSPARENT,
                    android.graphics.Color.TRANSPARENT
                )
            } else {
                SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
            },
            navigationBarStyle = if (cachedMarketplace) {
                SystemBarStyle.light(
                    ContextCompat.getColor(this, R.color.awp_mp_bg),
                    ContextCompat.getColor(this, R.color.awp_mp_bg)
                )
            } else {
                SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
            }
        )
        setContent {
            AwpTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    var splashMinTimeDone by remember { mutableStateOf(false) }
                    var sessionReady by remember { mutableStateOf(false) }
                    var token by remember { mutableStateOf<String?>(null) }
                    var marketplaceEnabled by remember { mutableStateOf(cachedMarketplace) }
                    var browsePitches by remember { mutableStateOf(false) }
                    val deepLinkPath = deepLinkPathState.value

                    LaunchedEffect(Unit) {
                        val store = AwpApp.instance.sessionStore
                        val configStore = AwpApp.instance.appConfigStore
                        token = store.getToken()
                        marketplaceEnabled = configStore.isMarketplaceEnabled()
                        sessionReady = true
                        try {
                            val cfg = ApiClient.api.mobileConfig()
                            val mp = cfg.appSettings?.bookingMarketplaceEnabled == true
                            marketplaceEnabled = mp
                            configStore.setMarketplaceEnabled(mp)
                        } catch (_: Exception) {
                            /* zostaw cache */
                        }
                        store.tokenFlow.collect { token = it }
                    }

                    val showSplash = !splashMinTimeDone || !sessionReady
                    val guestMarketplacePath =
                        deepLinkPath?.takeIf {
                            it.startsWith("/obiekty") ||
                                it.startsWith("/rezerwacje") ||
                                it.startsWith("/dla-obiektow") ||
                                it.startsWith("/zaproszenie") ||
                                it.startsWith("/platnosci-public")
                        }

                    Box(modifier = Modifier.fillMaxSize()) {
                        AppUpdateGate(checkOnStart = true)

                        if (!showSplash) {
                            if (token.isNullOrBlank()) {
                                if (guestMarketplacePath != null) {
                                    WebPortalScreen(
                                        title = when {
                                            guestMarketplacePath.startsWith("/zaproszenie") -> "Zaproszenie"
                                            guestMarketplacePath.startsWith("/platnosci-public") -> "Płatności"
                                            else -> "Rezerwacja boiska"
                                        },
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

                        AnimatedVisibility(
                            visible = showSplash,
                            exit = fadeOut()
                        ) {
                            StartupSplashScreen(
                                marketplaceEnabled = marketplaceEnabled,
                                onFinished = { splashMinTimeDone = true }
                            )
                        }
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

    /** App Links: zaproszenia, płatności publiczne / portfel, powrót HotPay, terminarz. */
    private fun Intent?.deepLinkPathOrNull(): String? {
        val uri = this?.data ?: return null
        val path = uri.encodedPath?.takeIf {
            it.startsWith("/zaproszenie") ||
                it.startsWith("/platnosci-public") ||
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
