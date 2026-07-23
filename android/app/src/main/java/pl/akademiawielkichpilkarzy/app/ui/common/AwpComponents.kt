package pl.akademiawielkichpilkarzy.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

private val PitchShape = RoundedCornerShape(20.dp)
private val PanelShape = RoundedCornerShape(14.dp)

/** Tło murawy / boiska jak na stronie. */
@Composable
fun MurawaBackground(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        AwpColors.MurawaDark,
                        AwpColors.PitchDeep,
                        Color(0xFF083628),
                        AwpColors.MurawaDark
                    )
                )
            )
    ) {
        // Delikatne „linie boiska”
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color.White.copy(alpha = 0.04f),
                            Color.Transparent,
                            Color.White.copy(alpha = 0.03f),
                            Color.Transparent
                        )
                    )
                )
        )
        content()
    }
}

/** Nagłówek sekcji w stylu Mundial (kicker + tytuł Teko). */
@Composable
fun ScreenHeader(
    title: String,
    subtitle: String? = null,
    kicker: String = "Akademia WP"
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = kicker.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = AwpColors.MundialGold
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = title.uppercase(),
            style = MaterialTheme.typography.headlineMedium,
            color = AwpColors.OnPitch
        )
        if (!subtitle.isNullOrBlank()) {
            Spacer(Modifier.height(4.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = AwpColors.OnPitchMuted
            )
        }
    }
}

/** Karta „pitch-card” — zielona murawa z ramką kredową. */
@Composable
fun PitchCard(
    modifier: Modifier = Modifier,
    gold: Boolean = false,
    contentPadding: PaddingValues = PaddingValues(16.dp),
    content: @Composable ColumnScope.() -> Unit
) {
    val base = if (gold) Color(0xFF6D4C1B) else AwpColors.PitchCard
    val sheen = if (gold) {
        listOf(base, Color(0xFF8B6914), base)
    } else {
        listOf(
            AwpColors.PitchCard,
            Color(0xFF118060),
            AwpColors.PitchCard
        )
    }
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(PitchShape)
            .background(Brush.linearGradient(sheen))
            .border(2.dp, Color.White.copy(alpha = 0.35f), PitchShape)
            .padding(contentPadding),
        content = content
    )
}

/** Wewnętrzny panel jak .pitch-panel na stronie. */
@Composable
fun PitchPanel(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(PanelShape)
            .background(Color.Black.copy(alpha = 0.18f))
            .border(1.dp, Color.White.copy(alpha = 0.22f), PanelShape)
            .padding(12.dp),
        content = content
    )
}

/** Pasek hero navy→purple jak .awp-section-hero / mundial-header. */
@Composable
fun MundialHeroBanner(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(
                Brush.horizontalGradient(
                    listOf(
                        AwpColors.MundialNavy,
                        AwpColors.HeroMid,
                        AwpColors.MundialPurple,
                        AwpColors.HeroDeep
                    )
                )
            )
            .border(1.dp, AwpColors.MundialGold.copy(alpha = 0.35f), RoundedCornerShape(18.dp))
            .padding(horizontal = 16.dp, vertical = 18.dp)
    ) {
        Text(
            text = "MUNDIAL 2026",
            style = MaterialTheme.typography.labelSmall,
            color = AwpColors.MundialGold
        )
        Spacer(Modifier.height(6.dp))
        Text(
            text = title.uppercase(),
            style = MaterialTheme.typography.headlineSmall,
            color = Color.White
        )
        if (!subtitle.isNullOrBlank()) {
            Spacer(Modifier.height(4.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.85f)
            )
        }
    }
}

@Composable
fun AwpPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = AwpColors.MundialTeal,
            contentColor = Color.White,
            disabledContainerColor = AwpColors.MundialTeal.copy(alpha = 0.4f)
        )
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.height(20.dp),
                color = Color.White,
                strokeWidth = 2.dp
            )
        } else {
            Text(text, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun AwpSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = AwpColors.OnPitch
        ),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.4f))
    ) {
        Text(text, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun AwpGoldButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Button(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = AwpColors.MundialGold,
            contentColor = AwpColors.PageDark
        )
    ) {
        Text(text, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun ScreenScaffold(
    title: String,
    subtitle: String? = null,
    kicker: String = "Akademia WP",
    scrollable: Boolean = true,
    content: @Composable ColumnScope.() -> Unit
) {
    MurawaBackground {
        val scroll = rememberScrollState()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .then(if (scrollable) Modifier.verticalScroll(scroll) else Modifier)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            ScreenHeader(title = title, subtitle = subtitle, kicker = kicker)
            content()
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
fun LoadingBlock() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(color = AwpColors.MundialTeal)
    }
}

@Composable
fun ErrorBlock(message: String, onRetry: () -> Unit) {
    PitchCard {
        Text(message, color = AwpColors.MundialRed)
        Spacer(Modifier.height(8.dp))
        AwpSecondaryButton(text = "Odśwież", onClick = onRetry)
    }
}

@Composable
fun EmptyHint(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.bodyMedium,
        color = AwpColors.OnPitchMuted,
        textAlign = TextAlign.Start
    )
}

@Composable
fun PitchLabel(text: String) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = AwpColors.MundialGold
    )
}

@Composable
fun LinkTextButton(text: String, onClick: () -> Unit) {
    TextButton(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Text(text, color = AwpColors.MundialGold)
    }
}

/** Kafelek nawigacji jak PitchTile na WWW. */
@Composable
fun HomePitchTile(
    title: String,
    desc: String,
    onClick: () -> Unit,
    gold: Boolean = false,
    modifier: Modifier = Modifier
) {
    val shape = RoundedCornerShape(16.dp)
    val bg = if (gold) {
        Brush.verticalGradient(listOf(Color(0xFF8B6914), Color(0xFF5C4510)))
    } else {
        Brush.verticalGradient(listOf(AwpColors.PitchCard, Color(0xFF0A5C45)))
    }
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(bg)
            .border(2.dp, Color.White.copy(alpha = 0.28f), shape)
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            title,
            style = MaterialTheme.typography.titleMedium,
            color = AwpColors.OnPitch,
            fontWeight = FontWeight.Bold
        )
        Text(
            desc,
            style = MaterialTheme.typography.bodySmall,
            color = AwpColors.OnPitchMuted
        )
    }
}
