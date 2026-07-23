package pl.akademiawielkichpilkarzy.app.ui.nav

import android.util.Base64
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.AwpApp
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.MobileConfigResponse
import pl.akademiawielkichpilkarzy.app.push.PushRegistrar
import pl.akademiawielkichpilkarzy.app.ui.common.EmptyHint
import pl.akademiawielkichpilkarzy.app.ui.common.MurawaBackground
import pl.akademiawielkichpilkarzy.app.ui.common.PitchCard
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenHeader
import pl.akademiawielkichpilkarzy.app.ui.home.HomeNavActions
import pl.akademiawielkichpilkarzy.app.ui.home.HomeScreen
import pl.akademiawielkichpilkarzy.app.ui.lineups.LineupsScreen
import pl.akademiawielkichpilkarzy.app.ui.profile.ProfileScreen
import pl.akademiawielkichpilkarzy.app.ui.rankings.RankingsScreen
import pl.akademiawielkichpilkarzy.app.ui.schedule.ScheduleScreen
import pl.akademiawielkichpilkarzy.app.ui.stats.StatsScreen
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors
import pl.akademiawielkichpilkarzy.app.ui.wallet.WalletScreen
import pl.akademiawielkichpilkarzy.app.ui.web.WebPortalScreen

private data class Tab(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val highlighted: Boolean = false
)

private fun encodePortalArg(value: String): String =
    Base64.encodeToString(
        value.toByteArray(Charsets.UTF_8),
        Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
    )

private fun decodePortalArg(value: String): String =
    String(
        Base64.decode(value, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING),
        Charsets.UTF_8
    )

private fun portalRoute(title: String, path: String, requireAuth: Boolean): String {
    val auth = if (requireAuth) "1" else "0"
    return "web/${encodePortalArg(title)}/${encodePortalArg(path)}/$auth"
}

@Composable
fun MainScaffold(onLoggedOut: () -> Unit) {
    val isAdmin by AwpApp.instance.sessionStore.isAdminFlow.collectAsState(initial = false)
    val tabs = listOf(
        Tab("home", "Start", Icons.Filled.Home),
        Tab("wallet", "Portfel", Icons.Filled.AccountBalanceWallet),
        Tab(
            route = "schedule",
            label = if (isAdmin) "Panel admina" else "Terminarz",
            icon = Icons.Filled.CalendarMonth,
            highlighted = true
        ),
        Tab("lineups", "Składy", Icons.Filled.Groups),
        Tab("profile", "Profil", Icons.Filled.Person)
    )
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val current = backStack?.destination?.route
    val isWeb = current?.startsWith("web/") == true
    val barSelected = when {
        current == "stats" || current == "rankings" -> "home"
        else -> current
    }
    var mobileConfig by remember { mutableStateOf<MobileConfigResponse?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            val me = ApiClient.api.me().user
            if (me != null) {
                AwpApp.instance.sessionStore.setIsAdmin(me.isAdmin == 1)
            }
        } catch (_: Exception) {
        }
        try {
            mobileConfig = ApiClient.api.mobileConfig()
            if ((mobileConfig?.isAdmin ?: 0) == 1) {
                AwpApp.instance.sessionStore.setIsAdmin(true)
            }
        } catch (_: Exception) {
        }
    }

    fun isBlocked(key: String): String? {
        if (isAdmin) return null
        return mobileConfig?.blocked?.get(key)?.message
    }

    fun goTab(route: String) {
        val isBottomTab = route == "home" || route == "schedule" || route == "wallet" || route == "lineups" || route == "profile"
        if (isBottomTab) {
            navController.navigate(route) {
                popUpTo(navController.graph.findStartDestination().id) {
                    saveState = true
                }
                launchSingleTop = true
                restoreState = true
            }
        } else {
            navController.navigate(route)
        }
    }

    fun openPortal(title: String, path: String, requireAuth: Boolean = true) {
        navController.navigate(portalRoute(title, path, requireAuth))
    }

    fun openTransport(matchId: Int) {
        if (isBlocked("transport") != null) return
        openPortal("Transport", "/transport/$matchId", requireAuth = true)
    }

    fun openStatsForMatch(matchId: Int) {
        if (isBlocked("schedule") != null) return
        openPortal("Statystyki meczu", "/terminarz?mecz=$matchId&statystyki=1", requireAuth = true)
    }

    fun logout() {
        scope.launch {
            try {
                PushRegistrar.unregisterAndRevokeConsent()
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

    val homeNav = HomeNavActions(
        onNative = { route ->
            val blockKey = when (route) {
                "schedule" -> "schedule"
                "wallet" -> "wallet"
                "stats" -> "stats"
                "rankings" -> "rankings"
                "lineups" -> "lineups"
                "profile" -> "profile"
                else -> null
            }
            if (blockKey != null && isBlocked(blockKey) != null) return@HomeNavActions
            goTab(route)
        },
        onPortal = { title, path ->
            val blockKey = when {
                path.startsWith("/pilkarze") -> "pilkarze"
                path.startsWith("/galeria") -> "galeria"
                path.startsWith("/o-nas") -> "o_nas"
                path.startsWith("/kontakt") -> "kontakt"
                path.startsWith("/pzu-cup") -> "pzu_cup"
                else -> null
            }
            if (blockKey != null && isBlocked(blockKey) != null) return@HomeNavActions
            openPortal(title, path)
        },
        onOpenTransport = { openTransport(it) },
        onOpenStatsForMatch = { openStatsForMatch(it) },
        onLogout = { logout() },
        isAdmin = isAdmin,
        showPzuCup = mobileConfig?.settings?.showPzuCup != false,
        isBlocked = { key -> isBlocked(key) != null }
    )

    Scaffold(
        containerColor = AwpColors.MurawaDark,
        bottomBar = {
            if (!isWeb) {
                NavigationBar(
                    containerColor = Color.Transparent,
                    modifier = Modifier.background(
                        Brush.horizontalGradient(
                            listOf(
                                AwpColors.MundialNavy,
                                AwpColors.MundialPurple,
                                AwpColors.MundialNavy
                            )
                        )
                    ),
                    tonalElevation = 0.dp
                ) {
                    tabs.forEach { tab ->
                        NavigationBarItem(
                            selected = barSelected == tab.route,
                            onClick = { goTab(tab.route) },
                            icon = {
                                if (tab.highlighted) {
                                    Box(
                                        modifier = Modifier
                                            .size(42.dp)
                                            .clip(RoundedCornerShape(16.dp))
                                            .background(AwpColors.MundialGold)
                                            .border(1.dp, Color.White.copy(alpha = 0.65f), RoundedCornerShape(16.dp)),
                                        contentAlignment = androidx.compose.ui.Alignment.Center
                                    ) {
                                        Icon(tab.icon, contentDescription = tab.label, tint = AwpColors.PageDark)
                                    }
                                } else {
                                    Icon(tab.icon, contentDescription = tab.label)
                                }
                            },
                            label = { Text(tab.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = AwpColors.MundialGold,
                                selectedTextColor = AwpColors.MundialGold,
                                unselectedIconColor = Color.White.copy(alpha = 0.75f),
                                unselectedTextColor = Color.White.copy(alpha = 0.75f),
                                indicatorColor = Color.White.copy(alpha = 0.14f)
                            )
                        )
                    }
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.padding(padding)
        ) {
            composable("home") {
                BlockedOrContent(message = isBlocked("home")) {
                    HomeScreen(nav = homeNav)
                }
            }
            composable("schedule") {
                BlockedOrContent(message = isBlocked("schedule")) {
                    ScheduleScreen()
                }
            }
            composable("wallet") {
                BlockedOrContent(message = isBlocked("wallet")) { WalletScreen() }
            }
            composable("stats") {
                BlockedOrContent(message = isBlocked("stats")) { StatsScreen() }
            }
            composable("rankings") {
                BlockedOrContent(message = isBlocked("rankings")) { RankingsScreen() }
            }
            composable("lineups") {
                BlockedOrContent(message = isBlocked("lineups")) { LineupsScreen() }
            }
            composable("profile") {
                BlockedOrContent(message = isBlocked("profile")) {
                    ProfileScreen(
                        onLoggedOut = onLoggedOut,
                        onOpenWeb = { title, path ->
                            val key = when {
                                path.startsWith("/profil") -> "profil_web"
                                path.startsWith("/platnosci") -> "platnosci_web"
                                else -> null
                            }
                            if (key != null && isBlocked(key) != null) return@ProfileScreen
                            openPortal(title, path, requireAuth = true)
                        }
                    )
                }
            }
            composable(
                route = "web/{title}/{path}/{auth}",
                arguments = listOf(
                    navArgument("title") { type = NavType.StringType },
                    navArgument("path") { type = NavType.StringType },
                    navArgument("auth") { type = NavType.StringType }
                )
            ) { entry ->
                val title = decodePortalArg(entry.arguments?.getString("title").orEmpty())
                val path = decodePortalArg(entry.arguments?.getString("path").orEmpty())
                val requireAuth = entry.arguments?.getString("auth") != "0"
                WebPortalScreen(
                    title = title,
                    path = path,
                    requireAuth = requireAuth,
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}

@Composable
private fun BlockedOrContent(message: String?, content: @Composable () -> Unit) {
    if (message != null) {
        MurawaBackground {
            Column(modifier = Modifier.padding(16.dp)) {
                ScreenHeader(title = "Niedostępne", subtitle = "Zaślepka z panelu admina")
                PitchCard {
                    PitchLabel("Komunikat")
                    EmptyHint(message)
                }
            }
        }
    } else {
        content()
    }
}
