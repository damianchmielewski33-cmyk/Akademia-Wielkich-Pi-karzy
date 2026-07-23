package pl.akademiawielkichpilkarzy.app.ui.nav

import android.util.Base64
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.ContactMail
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonSearch
import androidx.compose.material.icons.filled.SportsSoccer
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
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
import pl.akademiawielkichpilkarzy.app.AwpApp
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import pl.akademiawielkichpilkarzy.app.data.api.MobileConfigResponse
import pl.akademiawielkichpilkarzy.app.ui.common.EmptyHint
import pl.akademiawielkichpilkarzy.app.ui.common.PitchCard
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.common.MurawaBackground
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenHeader
import pl.akademiawielkichpilkarzy.app.ui.home.HomeScreen
import pl.akademiawielkichpilkarzy.app.ui.lineups.LineupsScreen
import pl.akademiawielkichpilkarzy.app.ui.profile.ProfileScreen
import pl.akademiawielkichpilkarzy.app.ui.rankings.RankingsScreen
import pl.akademiawielkichpilkarzy.app.ui.schedule.ScheduleScreen
import pl.akademiawielkichpilkarzy.app.ui.stats.StatsScreen
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors
import pl.akademiawielkichpilkarzy.app.ui.wallet.WalletScreen
import pl.akademiawielkichpilkarzy.app.ui.web.WebPortalScreen

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private data class PortalDest(
    val title: String,
    val path: String,
    val requireAuth: Boolean = true
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
    val tabs = listOf(
        Tab("home", "Home", Icons.Filled.Home),
        Tab("schedule", "Terminarz", Icons.Filled.CalendarMonth),
        Tab("wallet", "Portfel", Icons.Filled.AccountBalanceWallet),
        Tab("more", "Więcej", Icons.Filled.MoreHoriz),
        Tab("profile", "Profil", Icons.Filled.Person)
    )
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val current = backStack?.destination?.route
    val isWeb = current?.startsWith("web/") == true
    val barSelected = when {
        current == "stats" || current == "rankings" || current == "lineups" || isWeb -> "more"
        else -> current
    }
    val isAdmin by AwpApp.instance.sessionStore.isAdminFlow.collectAsState(initial = false)
    var mobileConfig by remember { mutableStateOf<MobileConfigResponse?>(null) }

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
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
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
                    HomeScreen(
                        onOpenTransport = { id ->
                            val transportBlock = isBlocked("transport")
                            if (transportBlock != null) return@HomeScreen
                            navController.navigate(
                                portalRoute("Transport", "/transport/$id", requireAuth = true)
                            )
                        }
                    )
                }
            }
            composable("schedule") {
                BlockedOrContent(message = isBlocked("schedule")) {
                    ScheduleScreen(
                        onOpenTransport = { id ->
                            if (isBlocked("transport") != null) return@ScheduleScreen
                            navController.navigate(
                                portalRoute("Transport", "/transport/$id", requireAuth = true)
                            )
                        }
                    )
                }
            }
            composable("wallet") {
                BlockedOrContent(message = isBlocked("wallet")) { WalletScreen() }
            }
            composable("more") {
                BlockedOrContent(message = isBlocked("more")) {
                    MoreScreen(
                        isAdmin = isAdmin,
                        showPzuCup = mobileConfig?.settings?.showPzuCup != false,
                        isPortalBlocked = { key -> isBlocked(key) },
                        onNative = { route ->
                            val blockKey = when (route) {
                                "stats" -> "stats"
                                "rankings" -> "rankings"
                                "lineups" -> "lineups"
                                else -> null
                            }
                            if (blockKey != null && isBlocked(blockKey) != null) return@MoreScreen
                            navController.navigate(route)
                        },
                        onPortal = { dest ->
                            val blockKey = when {
                                dest.path.startsWith("/pilkarze") -> "pilkarze"
                                dest.path.startsWith("/galeria") -> "galeria"
                                dest.path.startsWith("/o-nas") -> "o_nas"
                                dest.path.startsWith("/kontakt") -> "kontakt"
                                dest.path.startsWith("/pzu-cup") -> "pzu_cup"
                                else -> null
                            }
                            if (blockKey != null && isBlocked(blockKey) != null) return@MoreScreen
                            navController.navigate(
                                portalRoute(dest.title, dest.path, dest.requireAuth)
                            )
                        }
                    )
                }
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
                            navController.navigate(portalRoute(title, path, requireAuth = true))
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

@Composable
private fun MoreScreen(
    isAdmin: Boolean,
    showPzuCup: Boolean,
    isPortalBlocked: (String) -> String?,
    onNative: (String) -> Unit,
    onPortal: (PortalDest) -> Unit
) {
    MurawaBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            ScreenHeader(
                title = "Więcej",
                subtitle = "Te same opcje co na stronie akademii"
            )

            PitchCard {
                PitchLabel("Na meczu")
                Spacer(Modifier.height(8.dp))
                if (isPortalBlocked("stats") == null) {
                    MoreButton("Statystyki", Icons.Filled.SportsSoccer) { onNative("stats") }
                }
                if (isPortalBlocked("rankings") == null) {
                    MoreButton("Rankingi", Icons.Filled.Leaderboard) { onNative("rankings") }
                }
                if (isPortalBlocked("lineups") == null) {
                    MoreButton("Składy", Icons.Filled.Groups) { onNative("lineups") }
                }
                if (isPortalBlocked("pilkarze") == null) {
                    MoreButton("Piłkarze", Icons.Filled.PersonSearch) {
                        onPortal(PortalDest("Piłkarze", "/pilkarze"))
                    }
                }
                if (isPortalBlocked("galeria") == null) {
                    MoreButton("Galeria", Icons.Filled.CameraAlt) {
                        onPortal(PortalDest("Galeria", "/galeria"))
                    }
                }
            }

            PitchCard {
                PitchLabel("Informacje")
                Spacer(Modifier.height(8.dp))
                if (isPortalBlocked("o_nas") == null) {
                    MoreButton("O nas", Icons.Filled.Info) {
                        onPortal(PortalDest("O nas", "/o-nas"))
                    }
                }
                if (isPortalBlocked("kontakt") == null) {
                    MoreButton("Kontakt", Icons.Filled.ContactMail) {
                        onPortal(PortalDest("Kontakt", "/kontakt"))
                    }
                }
                if (showPzuCup && isPortalBlocked("pzu_cup") == null) {
                    MoreButton("PZU Cup", Icons.Filled.EmojiEvents) {
                        onPortal(PortalDest("PZU Cup", "/pzu-cup"))
                    }
                }
            }

            if (isAdmin) {
                PitchCard(gold = true) {
                    PitchLabel("Administracja")
                    Spacer(Modifier.height(8.dp))
                    MoreButton("Panel admina", Icons.Filled.AdminPanelSettings) {
                        onPortal(PortalDest("Panel admina", "/panel-admina"))
                    }
                }
            }
        }
    }
}

@Composable
private fun MoreButton(label: String, icon: ImageVector, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.35f)),
        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
            contentColor = AwpColors.OnPitch
        )
    ) {
        Icon(icon, contentDescription = null, tint = AwpColors.MundialGold)
        Spacer(Modifier.width(8.dp))
        Text(label, style = MaterialTheme.typography.titleMedium)
    }
}
