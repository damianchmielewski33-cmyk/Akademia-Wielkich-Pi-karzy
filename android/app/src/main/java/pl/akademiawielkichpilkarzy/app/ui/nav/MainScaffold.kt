package pl.akademiawielkichpilkarzy.app.ui.nav

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.SportsSoccer
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import pl.akademiawielkichpilkarzy.app.ui.home.HomeScreen
import pl.akademiawielkichpilkarzy.app.ui.lineups.LineupsScreen
import pl.akademiawielkichpilkarzy.app.ui.profile.ProfileScreen
import pl.akademiawielkichpilkarzy.app.ui.rankings.RankingsScreen
import pl.akademiawielkichpilkarzy.app.ui.schedule.ScheduleScreen
import pl.akademiawielkichpilkarzy.app.ui.stats.StatsScreen
import pl.akademiawielkichpilkarzy.app.ui.wallet.WalletScreen

private data class Tab(val route: String, val label: String, val icon: ImageVector)

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
    val barSelected = when (current) {
        "stats", "rankings", "lineups" -> "more"
        else -> current
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
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
            composable("more") {
                MoreScreen(
                    onStats = { navController.navigate("stats") },
                    onRankings = { navController.navigate("rankings") },
                    onLineups = { navController.navigate("lineups") }
                )
            }
            composable("stats") { StatsScreen() }
            composable("rankings") { RankingsScreen() }
            composable("lineups") { LineupsScreen() }
            composable("profile") { ProfileScreen(onLoggedOut = onLoggedOut) }
        }
    }
}

@Composable
private fun MoreScreen(
    onStats: () -> Unit,
    onRankings: () -> Unit,
    onLineups: () -> Unit
) {
    Column(
        modifier = Modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            "Więcej",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        MoreButton("Statystyki", Icons.Filled.SportsSoccer, onStats)
        MoreButton("Rankingi", Icons.Filled.Leaderboard, onRankings)
        MoreButton("Składy", Icons.Filled.Groups, onLineups)
    }
}

@Composable
private fun MoreButton(label: String, icon: ImageVector, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(icon, contentDescription = null)
        Spacer(Modifier.width(8.dp))
        Text(label)
    }
}
