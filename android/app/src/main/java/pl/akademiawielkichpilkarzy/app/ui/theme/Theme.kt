package pl.akademiawielkichpilkarzy.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColors = darkColorScheme(
    primary = AwpColors.MundialTeal,
    onPrimary = Color.White,
    primaryContainer = AwpColors.PitchCard,
    onPrimaryContainer = AwpColors.OnPitch,
    secondary = AwpColors.MundialGold,
    onSecondary = AwpColors.PageDark,
    secondaryContainer = AwpColors.MundialNavy,
    onSecondaryContainer = AwpColors.OnPitch,
    tertiary = AwpColors.MundialPurple,
    onTertiary = Color.White,
    background = AwpColors.MurawaDark,
    onBackground = AwpColors.OnPitch,
    surface = AwpColors.PitchCard,
    onSurface = AwpColors.OnPitch,
    surfaceVariant = Color(0xFF0F4A38),
    onSurfaceVariant = AwpColors.OnPitchMuted,
    outline = Color.White.copy(alpha = 0.35f),
    error = AwpColors.MundialRed,
    onError = Color.White
)

private val LightColors = lightColorScheme(
    primary = AwpColors.MundialTealDark,
    onPrimary = Color.White,
    primaryContainer = AwpColors.EmeraldSoft,
    onPrimaryContainer = AwpColors.PitchDeep,
    secondary = AwpColors.MundialNavy,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE8EEF8),
    onSecondaryContainer = AwpColors.MundialNavy,
    tertiary = AwpColors.MundialPurple,
    onTertiary = Color.White,
    background = AwpColors.PageLight,
    onBackground = AwpColors.TextOnLight,
    surface = Color.White,
    onSurface = AwpColors.TextOnLight,
    surfaceVariant = Color(0xFFE8F5EF),
    onSurfaceVariant = Color(0xFF334155),
    outline = Color(0xFF94A3B8),
    error = AwpColors.MundialRed,
    onError = Color.White
)

/**
 * Domyślnie ciemny motyw boiskowy — jak strona (murawa / Mundial).
 * [darkTheme] = null → zawsze dark (brand).
 */
@Composable
fun AwpTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = AwpTypography,
        content = content
    )
}
