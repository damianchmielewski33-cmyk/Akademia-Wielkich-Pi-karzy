package pl.akademiawielkichpilkarzy.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import pl.akademiawielkichpilkarzy.app.ui.login.LoginScreen
import pl.akademiawielkichpilkarzy.app.ui.nav.MainScaffold
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AwpTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    val token by AwpApp.instance.sessionStore.tokenFlow.collectAsState(initial = null)
                    if (token.isNullOrBlank()) {
                        LoginScreen(onLoggedIn = {})
                    } else {
                        MainScaffold(onLoggedOut = {})
                    }
                }
            }
        }
    }
}
