package pl.akademiawielkichpilkarzy.app.ui.common

import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import pl.akademiawielkichpilkarzy.app.R
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

/**
 * Zdjęcia z katalogu rezerwacji boisk — każde tło inne, ale z tej samej tematyki.
 */
enum class ScreenPhotoTheme {
    Home,
    Schedule,
    Wallet,
    Profile,
    Rankings,
    Stats,
    Lineups,
    Players,
    Gallery,
    Transport,
    About,
    Contact,
    Cup,
    Admin,
    Default
}

fun ScreenPhotoTheme.photoRes(): Int = when (this) {
    ScreenPhotoTheme.Home -> R.drawable.bg_pitch_gallery
    ScreenPhotoTheme.Schedule -> R.drawable.bg_pitch_schedule
    ScreenPhotoTheme.Wallet -> R.drawable.bg_pitch_wallet
    ScreenPhotoTheme.Profile -> R.drawable.bg_pitch_profile
    ScreenPhotoTheme.Rankings -> R.drawable.bg_pitch_rankings
    ScreenPhotoTheme.Stats -> R.drawable.bg_pitch_stats
    ScreenPhotoTheme.Lineups -> R.drawable.bg_pitch_home
    ScreenPhotoTheme.Players -> R.drawable.bg_pitch_players
    ScreenPhotoTheme.Gallery -> R.drawable.bg_pitch_profile
    ScreenPhotoTheme.Transport -> R.drawable.bg_pitch_gallery
    ScreenPhotoTheme.About -> R.drawable.stadium_hero
    ScreenPhotoTheme.Contact -> R.drawable.bg_pitch_players
    ScreenPhotoTheme.Cup -> R.drawable.bg_pitch_schedule
    ScreenPhotoTheme.Admin, ScreenPhotoTheme.Default -> R.drawable.stadium_hero
}

fun ScreenPhotoTheme.photoAlignment(): Alignment = when (this) {
    ScreenPhotoTheme.Home -> Alignment.Center
    ScreenPhotoTheme.Schedule -> Alignment.TopCenter
    ScreenPhotoTheme.Wallet -> Alignment.CenterEnd
    ScreenPhotoTheme.Profile -> Alignment.CenterStart
    ScreenPhotoTheme.Rankings -> Alignment.BottomCenter
    ScreenPhotoTheme.Stats -> Alignment.Center
    ScreenPhotoTheme.Lineups -> Alignment.BottomCenter
    ScreenPhotoTheme.Players -> Alignment.TopStart
    ScreenPhotoTheme.Gallery -> Alignment.Center
    ScreenPhotoTheme.Transport -> Alignment.BottomStart
    ScreenPhotoTheme.About -> Alignment.TopCenter
    ScreenPhotoTheme.Contact -> Alignment.CenterEnd
    ScreenPhotoTheme.Cup -> Alignment.TopEnd
    ScreenPhotoTheme.Admin -> Alignment.Center
    ScreenPhotoTheme.Default -> Alignment.Center
}

/** Ciemna poświata — karty zostają czytelne, a zdjęcie widać w tle. */
fun ScreenPhotoTheme.washColors(): List<Color> = when (this) {
    ScreenPhotoTheme.Home -> listOf(
        Color(0xB3081018),
        Color(0x990B1C18),
        Color(0xE6061410)
    )
    ScreenPhotoTheme.Schedule -> listOf(
        Color(0xA3062E1F),
        Color(0x880B3D2E),
        Color(0xE6041A12)
    )
    ScreenPhotoTheme.Wallet -> listOf(
        Color(0xB3152847),
        Color(0x991A2D5A),
        Color(0xE6081018)
    )
    ScreenPhotoTheme.Profile -> listOf(
        Color(0xB3243563),
        Color(0x993D2A6E),
        Color(0xE6081018)
    )
    ScreenPhotoTheme.Rankings -> listOf(
        Color(0xA31A2D5A),
        Color(0x668B6914),
        Color(0xE6081018)
    )
    ScreenPhotoTheme.Stats -> listOf(
        Color(0xA300A394),
        Color(0x770B3D2E),
        Color(0xE6061410)
    )
    ScreenPhotoTheme.Lineups -> listOf(
        Color(0x99073A2B),
        Color(0x880F6E52),
        Color(0xE6041A12)
    )
    ScreenPhotoTheme.Players -> listOf(
        Color(0xB3152847),
        Color(0x880B3D2E),
        Color(0xE6081018)
    )
    ScreenPhotoTheme.Gallery -> listOf(
        Color(0xA3081018),
        Color(0x77000A08),
        Color(0xE6061410)
    )
    ScreenPhotoTheme.Transport -> listOf(
        Color(0xA31A2D5A),
        Color(0x770B1C18),
        Color(0xE6081018)
    )
    ScreenPhotoTheme.Cup -> listOf(
        Color(0xB31A2D5A),
        Color(0x668B6914),
        Color(0xE6081018)
    )
    ScreenPhotoTheme.About, ScreenPhotoTheme.Contact, ScreenPhotoTheme.Admin, ScreenPhotoTheme.Default -> listOf(
        Color(0xB3081018),
        AwpColors.MurawaDark.copy(alpha = 0.72f),
        Color(0xE6061410)
    )
}
