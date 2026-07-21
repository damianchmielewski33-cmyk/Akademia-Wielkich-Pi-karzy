package pl.akademiawielkichpilkarzy.app.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Green = Color(0xFF1B5E20)
private val GreenDark = Color(0xFF0D3B12)
private val Pitch = Color(0xFF2E7D32)
private val Cream = Color(0xFFF5F7F4)

private val LightColors = lightColorScheme(
    primary = Green,
    onPrimary = Color.White,
    primaryContainer = Pitch,
    onPrimaryContainer = Color.White,
    secondary = GreenDark,
    background = Cream,
    surface = Color.White,
    onBackground = Color(0xFF122016),
    onSurface = Color(0xFF122016)
)

private val DarkColors = darkColorScheme(
    primary = Pitch,
    onPrimary = Color.White,
    background = GreenDark,
    surface = Color(0xFF14301A),
    onBackground = Color(0xFFE8F5E9),
    onSurface = Color(0xFFE8F5E9)
)

@Composable
fun AwpTheme(darkTheme: Boolean = false, content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content
    )
}
