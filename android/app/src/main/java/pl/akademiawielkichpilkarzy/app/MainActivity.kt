package pl.akademiawielkichpilkarzy.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
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
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.delay
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.push.NotificationBadge
import pl.akademiawielkichpilkarzy.app.ui.login.EmailAuthSetupHost
import pl.akademiawielkichpilkarzy.app.ui.login.LoginScreen
import pl.akademiawielkichpilkarzy.app.ui.nav.MainScaffold
import pl.akademiawielkichpilkarzy.app.ui.splash.StartupSplashScreen
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpTheme
import pl.akademiawielkichpilkarzy.app.ui.update.AppUpdateGate
import pl.akademiawielkichpilkarzy.app.ui.web.WebPortalScreen
import retrofit2.HttpException

class MainActivity : FragmentActivity() {
    private val deepLinkPathState = mutableStateOf<String?>(null)

    /** Systemowy splash trzymany, aż Compose narysuje pierwszą klatkę animacji. */
    private val composeSplashDrawn = mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition { !composeSplashDrawn.value }

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
                    var sessionReady by remember { mutableStateOf(false) }
                    var initialContentReady by remember { mutableStateOf(false) }
                    var token by remember { mutableStateOf<String?>(null) }
                    var marketplaceEnabled by remember { mutableStateOf(cachedMarketplace) }
                    var browsePitches by remember { mutableStateOf(false) }
                    val deepLinkPath = deepLinkPathState.value

                    LaunchedEffect(Unit) {
                        val store = AwpApp.instance.sessionStore
                        val configStore = AwpApp.instance.appConfigStore
                        var current = store.getToken()
                        token = current
                        marketplaceEnabled = configStore.isMarketplaceEnabled()
                        sessionReady = true

                        if (!current.isNullOrBlank()) {
                            try {
                                val me = ApiClient.api.me()
                                if (me.user == null) {
                                    ApiClient.invalidateLocalSession()
                                    current = null
                                    token = null
                                }
                            } catch (e: HttpException) {
                                if (e.code() == 401) {
                                    ApiClient.invalidateLocalSession()
                                    current = null
                                    token = null
                                }
                            } catch (_: Exception) {
                                /* brak sieci — zostaw lokalną sesję */
                            }
                        }
                        try {
                            val cfg = ApiClient.api.mobileConfig()
                            val mp = cfg.appSettings?.bookingMarketplaceEnabled == true
                            marketplaceEnabled = mp
                            configStore.setMarketplaceEnabled(mp)
                            configStore.setNativeUi(cfg.settings?.androidUiMode == "native")
                        } catch (_: Exception) {
                            /* zostaw cache */
                        }
                        store.tokenFlow.collect { token = it }
                    }

                    // Awaryjnie: nie trzymaj splash w nieskończoność, gdy ekran nie zgłosi gotowości.
                    LaunchedEffect(sessionReady) {
                        if (!sessionReady) return@LaunchedEffect
                        delay(2_400L)
                        initialContentReady = true
                    }

                    // Animacja startowa tylko do pierwszego ekranu — bez dodatkowego „min. czasu marki”.
                    val showSplash = !sessionReady || !initialContentReady
                    val guestMarketplacePath =
                        deepLinkPath?.takeIf {
                            it.startsWith("/obiekty") ||
                                it.startsWith("/rezerwacje") ||
                                it.startsWith("/dla-obiektow") ||
                                it.startsWith("/zaproszenie") ||
                                it.startsWith("/platnosci-public")
                        }

                    fun markInitialReady() {
                        initialContentReady = true
                    }

                    Box(modifier = Modifier.fillMaxSize()) {
                        AppUpdateGate(checkOnStart = true)

                        // Montuj UI pod splashiem — równoległe ładowanie zamiast kolejki.
                        if (sessionReady) {
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
                                        showTopBar = false,
                                        onInitialContentReady = { markInitialReady() }
                                    )
                                } else if (browsePitches) {
                                    WebPortalScreen(
                                        title = "Rezerwacja boiska",
                                        path = "/?mode=booking",
                                        requireAuth = false,
                                        showTopBar = false,
                                        onBack = { browsePitches = false },
                                        onInitialContentReady = { markInitialReady() }
                                    )
                                } else {
                                    LoginScreen(
                                        onLoggedIn = {},
                                        onBrowsePitches = { browsePitches = true },
                                        onInitialContentReady = { markInitialReady() }
                                    )
                                }
                            } else {
                                MainScaffold(
                                    initialPath = deepLinkPath,
                                    onLoggedOut = {},
                                    onInitialContentReady = { markInitialReady() }
                                )
                                EmailAuthSetupHost()
                            }
                        }

                        AnimatedVisibility(
                            visible = showSplash,
                            exit = fadeOut(animationSpec = tween(durationMillis = 280, easing = FastOutSlowInEasing))
                        ) {
                            StartupSplashScreen(
                                marketplaceEnabled = marketplaceEnabled,
                                onFirstFrame = { composeSplashDrawn.value = true }
                            )
                        }
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        NotificationBadge.clear(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        deepLinkPathState.value = intent.deepLinkPathOrNull()
    }

    /** App Links: zaproszenia, płatności publiczne / portfel, powrót HotPay, terminarz.
     *  Push FCM przekazuje match_id w extra, bez URI. */
    private fun Intent?.deepLinkPathOrNull(): String? {
        val uri = this?.data
        if (uri != null) {
            val path = uri.encodedPath?.takeIf {
                it.startsWith("/zaproszenie") ||
                    it.startsWith("/platnosci-public") ||
                    it.startsWith("/platnosci") ||
                    it.startsWith("/terminarz") ||
                    it.startsWith("/obiekty") ||
                    it.startsWith("/rezerwacje") ||
                    it.startsWith("/dla-obiektow")
            }
            if (path != null) {
                val query = uri.encodedQuery?.takeIf { it.isNotBlank() }?.let { "?$it" }.orEmpty()
                return path + query
            }
        }
        val matchId = this?.getStringExtra("match_id")?.trim().orEmpty()
        if (matchId.isNotEmpty() && matchId.all { it.isDigit() }) {
            return "/terminarz?mecz=$matchId"
        }
        return null
    }
}
