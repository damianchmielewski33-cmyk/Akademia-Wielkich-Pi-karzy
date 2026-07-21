package pl.akademiawielkichpilkarzy.app.ui.nav

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier.modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import pl.akademiawielkichpilkarzy.app.ui.home.HomeScreen
import pl.akademiawielkichpilkarzy.app.ui.profile.ProfileScreen
import pl.akademiawielkichpilkarzy.app.ui.schedule.ScheduleScreen
import pl.akademiawielkichpilkarzy.app.ui.wallet.WalletScreen

private data class Tab(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

@Composable
fun MainScaffold(onLoggedOut: () -> Unit) {
    val tabs = listOf(
        Tab("home", "Home", Icons.Filled.Home),
        Tab("schedule", "Terminarz", Icons.Filled.CalendarMonth),
        Tab("wallet", "Portfel", Icons.Filled.AccountBalanceWallet),
        Tab("profile", "Profil", Icons.Filled.Person)
    )
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val current = backStack?.destination?.route

    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = current == tab.route,
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
                        label = { Text(tab.label) }
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
            composable("home") { HomeScreen() }
            composable("schedule") { ScheduleScreen() }
            composable("wallet") { WalletScreen() }
            composable("profile") { ProfileScreen(onLoggedOut = onLoggedOut) }
        }
    }
}
