package pl.akademiawielkichpilkarzy.app.ui.nav

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.Alignment
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.AwpApp
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.MobileConfigResponse
import pl.akademiawielkichpilkarzy.app.push.PushRegistrar
import pl.akademiawielkichpilkarzy.app.ui.common.EmptyHint
import pl.akademiawielkichpilkarzy.app.ui.common.MurawaBackground
import pl.akademiawielkichpilkarzy.app.ui.common.PitchCard
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.common.PushAutoEnabler
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenHeader
import pl.akademiawielkichpilkarzy.app.ui.home.HomeNavActions
import pl.akademiawielkichpilkarzy.app.ui.home.HomeScreen
import pl.akademiawielkichpilkarzy.app.ui.lineups.LineupsScreen
import pl.akademiawielkichpilkarzy.app.ui.native.TransportScreen
import pl.akademiawielkichpilkarzy.app.ui.profile.ProfileScreen
import pl.akademiawielkichpilkarzy.app.ui.rankings.RankingsScreen
import pl.akademiawielkichpilkarzy.app.ui.schedule.ScheduleScreen
import pl.akademiawielkichpilkarzy.app.ui.stats.StatsScreen
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors
import pl.akademiawielkichpilkarzy.app.ui.wallet.WalletScreen
import pl.akademiawielkichpilkarzy.app.ui.web.WebAppShell
import pl.akademiawielkichpilkarzy.app.ui.web.WebPortalScreen

private data class Tab(
    val route: String,
    val label: String,
    val icon: ImageVector
)

@Composable
fun MainScaffold(
    initialPath: String? = null,
    onLoggedOut: () -> Unit
) {
    PushAutoEnabler()
    val isAdmin by AwpApp.instance.sessionStore.isAdminFlow.collectAsState(initial = false)
    val tabs = listOf(
        Tab("home", "Start", Icons.Filled.Home),
        Tab("schedule", "Terminarz", Icons.Filled.CalendarMonth),
        Tab("wallet", "Portfel", Icons.Filled.AccountBalanceWallet),
        Tab("profile", "Profil", Icons.Filled.Person)
    )
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val current = backStack?.destination?.route
    val barSelected = when {
        current == "stats" || current == "rankings" || current == "lineups" -> "home"
        current?.startsWith("web/") == true -> "home"
        current?.startsWith("transport/") == true -> "schedule"
        else -> current
    }
    var mobileConfig by remember { mutableStateOf<MobileConfigResponse?>(null) }
    var configLoaded by remember { mutableStateOf(false) }
    val useWebView = mobileConfig?.settings?.androidUiMode != "native"

    LaunchedEffect(Unit) {
        try {
            val me = ApiClient.api.me().user
            if (me != null) {
                AwpApp.instance.sessionStore.setIsAdmin(me.isAdmin == 1)
            }
        } catch (_: Exception) {
        }
        while (isActive) {
            try {
                mobileConfig = ApiClient.api.mobileConfig()
                if ((mobileConfig?.isAdmin ?: 0) == 1) {
                    AwpApp.instance.sessionStore.setIsAdmin(true)
                }
            } catch (_: Exception) {
            } finally {
                configLoaded = true
            }
            delay(45_000L)
        }
    }

    fun isBlocked(key: String): String? {
        if (isAdmin) return null
        return mobileConfig?.blocked?.get(key)?.message
    }

    when {
        !configLoaded -> {
            MurawaBackground {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = AwpColors.MundialGold)
                }
            }
        }
        useWebView -> {
            WebAppShell(
                isBlocked = { key -> isBlocked(key) },
                initialPath = initialPath,
                onLoggedOut = onLoggedOut
            )
        }
        else -> {
            NativeMainScaffold(
                tabs = tabs,
                barSelected = barSelected,
                isAdmin = isAdmin,
                isBlocked = { key -> isBlocked(key) },
                mobileConfig = mobileConfig,
                initialPath = initialPath,
                onLoggedOut = onLoggedOut,
                navController = navController
            )
        }
    }
}

@Composable
private fun NativeMainScaffold(
    tabs: List<Tab>,
    barSelected: String?,
    isAdmin: Boolean,
    isBlocked: (String) -> String?,
    mobileConfig: MobileConfigResponse?,
    initialPath: String?,
    onLoggedOut: () -> Unit,
    navController: androidx.navigation.NavHostController
) {
    val scope = rememberCoroutineScope()

    fun goTab(route: String) {
        val isBottomTab = route == "home" || route == "schedule" || route == "wallet" || route == "profile"
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
        val route = when {
            path.startsWith("/profil") -> "profile"
            path.startsWith("/platnosci") -> "wallet"
            path.startsWith("/terminarz") -> "schedule"
            else -> "web/${Uri.encode(title)}/${Uri.encode(path)}/${requireAuth}"
        }
        goTab(route)
    }

    LaunchedEffect(initialPath) {
        if (initialPath?.startsWith("/zaproszenie") == true) {
            openPortal("Zaproszenie", initialPath, requireAuth = false)
        }
    }

    fun openTransport(matchId: Int) {
        if (isBlocked("transport") != null) return
        navController.navigate("transport/$matchId")
    }

    fun openStatsForMatch(matchId: Int) {
        if (isBlocked("schedule") != null) return
        goTab("stats")
    }

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
        siteName = mobileConfig?.settings?.siteName?.takeIf { it.isNotBlank() }
            ?: mobileConfig?.appSettings?.siteName?.takeIf { it.isNotBlank() }
            ?: "Akademia Wielkich Piłkarzy",
        siteDescription = mobileConfig?.settings?.siteDescription?.takeIf { it.isNotBlank() }
            ?: mobileConfig?.appSettings?.siteDescription?.takeIf { it.isNotBlank() }
            ?: "Terminarz, składy, statystyki i portfel.",
        isBlocked = { key -> isBlocked(key) != null }
    )

    Scaffold(
        containerColor = AwpColors.MurawaDark,
        bottomBar = {
            NavigationBar(
                    containerColor = Color.Transparent,
                    modifier = Modifier
                        .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                        .background(
                            Brush.horizontalGradient(
                                listOf(
                                    AwpColors.HeroDeep,
                                    AwpColors.MundialPurple,
                                    AwpColors.MundialNavy,
                                    AwpColors.HeroDeep
                                )
                            )
                        )
                        .border(
                            1.dp,
                            AwpColors.MundialGold.copy(alpha = 0.32f),
                            RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
                        ),
                    tonalElevation = 0.dp
                ) {
                    tabs.forEach { tab ->
                        NavigationBarItem(
                            selected = barSelected == tab.route,
                            onClick = { goTab(tab.route) },
                            icon = {
                                Icon(tab.icon, contentDescription = tab.label)
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
                        onOpenNativeRoute = { title, path ->
                            val key = when {
                                path.startsWith("/profil") -> "profile"
                                path.startsWith("/platnosci") -> "wallet"
                                else -> null
                            }
                            if (key != null && isBlocked(key) != null) return@ProfileScreen
                            openPortal(title, path, requireAuth = true)
                        }
                    )
                }
            }
            composable(
                route = "web/{title}/{path}/{requireAuth}",
                arguments = listOf(
                    navArgument("title") { type = NavType.StringType },
                    navArgument("path") { type = NavType.StringType },
                    navArgument("requireAuth") { type = NavType.BoolType }
                )
            ) { entry ->
                val title = Uri.decode(entry.arguments?.getString("title").orEmpty()).ifBlank { "Strona" }
                val path = Uri.decode(entry.arguments?.getString("path").orEmpty()).ifBlank { "/" }
                val requireAuth = entry.arguments?.getBoolean("requireAuth") ?: true
                val blockKey = when {
                    path.startsWith("/pilkarze") -> "pilkarze"
                    path.startsWith("/galeria") -> "galeria"
                    path.startsWith("/o-nas") -> "o_nas"
                    path.startsWith("/kontakt") -> "kontakt"
                    path.startsWith("/pzu-cup") -> "pzu_cup"
                    path.startsWith("/panel-admina") -> if (isAdmin) null else "admin"
                    else -> null
                }
                val message = when {
                    blockKey == "admin" -> "Panel admina jest dostępny tylko dla administratora."
                    blockKey != null -> isBlocked(blockKey)
                    else -> null
                }
                BlockedOrContent(message = message) {
                    WebPortalScreen(
                        title = title,
                        path = path,
                        requireAuth = requireAuth,
                        showTopBar = true,
                        onBack = { navController.popBackStack() }
                    )
                }
            }
            composable(
                route = "transport/{matchId}",
                arguments = listOf(navArgument("matchId") { type = NavType.IntType })
            ) { entry ->
                val matchId = entry.arguments?.getInt("matchId") ?: return@composable
                BlockedOrContent(message = isBlocked("transport")) { TransportScreen(matchId) }
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
