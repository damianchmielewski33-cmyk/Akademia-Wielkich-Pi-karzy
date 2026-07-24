package pl.akademiawielkichpilkarzy.app.ui.web

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
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
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.AwpApp
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.push.PushRegistrar
import pl.akademiawielkichpilkarzy.app.ui.common.EmptyHint
import pl.akademiawielkichpilkarzy.app.ui.common.MurawaBackground
import pl.akademiawielkichpilkarzy.app.ui.common.PitchCard
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.common.PushAutoEnabler
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenHeader
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

private data class WebTab(
    val id: String,
    val label: String,
    val icon: ImageVector,
    val path: String,
    val blockKey: String
)

/** Cała aplikacja w WebView — dolny pasek jak w trybie natywnym, treści ze strony WWW. */
@Composable
fun WebAppShell(
    isBlocked: (String) -> String?,
    onLoggedOut: () -> Unit
) {
    PushAutoEnabler()
    val tabs = listOf(
        WebTab("home", "Start", Icons.Filled.Home, "/", "home"),
        WebTab("schedule", "Terminarz", Icons.Filled.CalendarMonth, "/terminarz", "schedule"),
        WebTab("wallet", "Portfel", Icons.Filled.AccountBalanceWallet, "/platnosci", "wallet"),
        WebTab("profile", "Profil", Icons.Filled.Person, "/profil", "profile")
    )
    var selectedId by remember { mutableStateOf("home") }
    val selected = tabs.firstOrNull { it.id == selectedId } ?: tabs.first()
    val blockedMessage = isBlocked(selected.blockKey)
    val scope = rememberCoroutineScope()

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
                        selected = selectedId == tab.id,
                        onClick = { selectedId = tab.id },
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
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            if (blockedMessage != null) {
                MurawaBackground {
                    Column(modifier = Modifier.padding(16.dp)) {
                        ScreenHeader(title = "Niedostępne", subtitle = "Zaślepka z panelu admina")
                        PitchCard {
                            PitchLabel("Komunikat")
                            EmptyHint(blockedMessage)
                        }
                    }
                }
            } else {
                key(selected.id) {
                    WebPortalScreen(
                        title = selected.label,
                        path = selected.path,
                        requireAuth = true,
                        showTopBar = false,
                        onBack = null,
                        onNavigatedToLogin = { logout() }
                    )
                }
            }
        }
    }
}
