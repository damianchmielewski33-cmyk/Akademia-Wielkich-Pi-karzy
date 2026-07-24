package pl.akademiawielkichpilkarzy.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.material3.Icon
import androidx.compose.foundation.layout.matchParentSize
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import pl.akademiawielkichpilkarzy.app.R
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

val AwpPitchShape = RoundedCornerShape(24.dp)
val AwpPanelShape = RoundedCornerShape(18.dp)
val AwpButtonShape = RoundedCornerShape(16.dp)
val AwpHeroShape = RoundedCornerShape(28.dp)
val AwpTileShape = RoundedCornerShape(18.dp)

private fun pitchTileGradient(gold: Boolean): Brush {
    return if (gold) {
        Brush.verticalGradient(
            listOf(
                Color(0xFF8B6914),
                Color(0xFF6D4C1B),
                Color(0xFF5C4510)
            )
        )
    } else {
        Brush.linearGradient(
            listOf(
                Color(0xFF0F6E52),
                Color(0xFF118060),
                AwpColors.PitchCard,
                Color(0xFF07382B)
            )
        )
    }
}

/** Pasy murawy jak `.home-pitch-tile` / `.home-pitch-tile-gold` na WWW. */
fun Modifier.pitchMurawaStripes(gold: Boolean = false): Modifier = drawBehind {
    val stripeColor = if (gold) {
        Color(0xFFB48C32).copy(alpha = 0.22f)
    } else {
        Color.White.copy(alpha = 0.045f)
    }
    val period = if (gold) 24.dp.toPx() else 22.dp.toPx()
    val stroke = if (gold) 12.dp.toPx() else 11.dp.toPx()
    val stepX = period * 0.27f
    var x = -size.height
    while (x < size.width + size.height) {
        drawLine(
            color = stripeColor,
            start = Offset(x, size.height),
            end = Offset(x + stepX, 0f),
            strokeWidth = stroke
        )
        x += period
    }
    drawRect(
        brush = Brush.verticalGradient(
            listOf(
                Color.White.copy(alpha = if (gold) 0.10f else 0.07f),
                Color.Transparent
            ),
            startY = 0f,
            endY = size.height * 0.42f
        )
    )
}

/** Tło murawy / boiska jak `.murawa-bg` na stronie. */
@Composable
fun MurawaBackground(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(AwpColors.MurawaDark)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFF0B3D2E).copy(alpha = 0.55f),
                            AwpColors.MurawaMid,
                            AwpColors.PitchDeep,
                            Color(0xFF083628),
                            AwpColors.MurawaDark
                        )
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.40f),
                            Color.Transparent,
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.40f)
                        )
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color(0xFF061410).copy(alpha = 0.55f),
                            Color.Transparent,
                            Color(0xFF020A08).copy(alpha = 0.82f)
                        )
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        listOf(
                            AwpColors.NeonGrass.copy(alpha = 0.14f),
                            Color.Transparent
                        )
                    )
                )
        )
        content()
    }
}

@Composable
fun AwpScreen(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    MurawaBackground(modifier = modifier, content = content)
}

@Composable
fun AwpTopBrandBar(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(
                Brush.horizontalGradient(
                    listOf(AwpColors.MundialNavy, AwpColors.MundialPurple, AwpColors.HeroDeep)
                )
            )
            .border(1.dp, AwpColors.MundialGold.copy(alpha = 0.35f), RoundedCornerShape(22.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Image(
            painter = painterResource(id = R.drawable.app_logo),
            contentDescription = "Logo Akademia Wielkich Piłkarzy",
            modifier = Modifier.size(52.dp)
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "MUNDIAL 2026",
                style = MaterialTheme.typography.labelSmall,
                color = AwpColors.MundialGold
            )
            Text(
                text = title.uppercase(),
                style = MaterialTheme.typography.headlineSmall,
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            if (!subtitle.isNullOrBlank()) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.82f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
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
            style = MaterialTheme.typography.headlineLarge,
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

/** Powitanie zalogowanego gracza jak na stronie startowej WWW. */
@Composable
fun HomeWelcomeBanner(
    firstName: String,
    lastName: String,
    zawodnik: String,
    modifier: Modifier = Modifier
) {
    val fullName = "$firstName $lastName".trim()
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = "Witaj!",
            style = MaterialTheme.typography.headlineSmall,
            color = AwpColors.OnPitch,
            fontWeight = FontWeight.Bold
        )
        if (fullName.isNotBlank()) {
            Text(
                text = fullName,
                style = MaterialTheme.typography.titleLarge,
                color = AwpColors.EmeraldSoft,
                fontWeight = FontWeight.SemiBold
            )
        }
        if (zawodnik.isNotBlank() && fullName.isNotBlank()) {
            Text(
                text = zawodnik,
                style = MaterialTheme.typography.bodyMedium,
                color = AwpColors.OnPitchMuted
            )
        }
    }
}

@Composable
fun AwpHeroCard(
    title: String,
    subtitle: String? = null,
    kicker: String = "Akademia WP",
    modifier: Modifier = Modifier,
    content: (@Composable ColumnScope.() -> Unit)? = null
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(AwpHeroShape)
            .background(
                Brush.linearGradient(
                    listOf(
                        AwpColors.MundialNavy,
                        AwpColors.HeroMid,
                        AwpColors.MundialPurple,
                        AwpColors.HeroDeep
                    )
                )
            )
            .border(1.dp, AwpColors.MundialGold.copy(alpha = 0.28f), AwpHeroShape)
    ) {
        Box(
            modifier = Modifier
                .matchParentSize()
                .pitchMurawaStripes(gold = false)
                .background(Color.White.copy(alpha = 0.03f))
        )
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .size(180.dp)
                .background(
                    Brush.radialGradient(
                        listOf(
                            AwpColors.MundialGold.copy(alpha = 0.12f),
                            Color.Transparent
                        )
                    )
                )
        )
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(
                        Brush.horizontalGradient(
                            listOf(
                                Color.Transparent,
                                AwpColors.MundialGold,
                                AwpColors.MundialTeal,
                                AwpColors.MundialGold,
                                Color.Transparent
                            )
                        )
                    )
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.app_logo),
                    contentDescription = "Logo Akademia Wielkich Piłkarzy",
                    modifier = Modifier.size(64.dp)
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(kicker.uppercase(), style = MaterialTheme.typography.labelSmall, color = AwpColors.MundialGold)
                    Text(
                        title.uppercase(),
                        style = MaterialTheme.typography.displayMedium,
                        color = Color.White,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (!subtitle.isNullOrBlank()) {
                        Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.86f))
                    }
                }
            }
            content?.invoke(this)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(
                        Brush.horizontalGradient(
                            listOf(
                                Color.Transparent,
                                AwpColors.MundialGold.copy(alpha = 0.55f),
                                AwpColors.MundialTeal.copy(alpha = 0.65f),
                                AwpColors.MundialGold.copy(alpha = 0.55f),
                                Color.Transparent
                            )
                        )
                    )
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
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(AwpPitchShape)
            .background(pitchTileGradient(gold))
            .pitchMurawaStripes(gold)
            .border(1.dp, Color.White.copy(alpha = 0.35f), AwpPitchShape)
    ) {
        PitchCardDecorations(gold)
        Column(
            modifier = Modifier.padding(contentPadding),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            content = content
        )
    }
}

@Composable
fun BoxScope.PitchCardDecorations(gold: Boolean = false) {
    Box(
        modifier = Modifier
            .align(Alignment.BottomCenter)
            .fillMaxWidth()
            .height(2.dp)
            .background(Color.White.copy(alpha = 0.45f))
    )
    Box(
        modifier = Modifier
            .align(Alignment.TopStart)
            .size(28.dp)
            .border(
                width = 2.dp,
                color = Color.White.copy(alpha = 0.40f),
                shape = RoundedCornerShape(bottomEnd = 8.dp)
            )
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
            .clip(AwpPanelShape)
            .background(Color.Black.copy(alpha = 0.22f))
            .border(1.dp, Color.White.copy(alpha = 0.28f), AwpPanelShape)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(7.dp),
        content = content
    )
}

@Composable
fun AwpSectionCard(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    gold: Boolean = false,
    content: @Composable ColumnScope.() -> Unit
) {
    PitchCard(
        modifier = modifier,
        gold = gold,
        contentPadding = PaddingValues(18.dp)
    ) {
        PitchLabel(title)
        if (!subtitle.isNullOrBlank()) {
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = AwpColors.OnPitchMuted
            )
        }
        Spacer(Modifier.height(4.dp))
        content()
    }
}

@Composable
fun AwpActionTile(
    title: String,
    desc: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    gold: Boolean = false,
    icon: ImageVector? = null
) {
    HomePitchTile(
        title = title,
        desc = desc,
        onClick = onClick,
        gold = gold,
        icon = icon,
        modifier = modifier
    )
}

@Composable
fun AwpStatTile(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    gold: Boolean = false
) {
    AwpMetricTile(label = label, value = value, modifier = modifier, gold = gold)
}

@Composable
fun AwpStatusBanner(
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    danger: Boolean = false
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(if (danger) AwpColors.MundialRed.copy(alpha = 0.22f) else AwpColors.GlassPanel)
            .border(
                1.dp,
                if (danger) AwpColors.MundialRed.copy(alpha = 0.55f) else AwpColors.MundialGold.copy(alpha = 0.35f),
                RoundedCornerShape(18.dp)
            )
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(title.uppercase(), style = MaterialTheme.typography.labelSmall, color = AwpColors.MundialGold)
        Text(message, style = MaterialTheme.typography.bodyMedium, color = AwpColors.OnPitch)
    }
}

@Composable
fun AwpStatusMessage(
    message: String,
    modifier: Modifier = Modifier,
    isError: Boolean = false,
    actionText: String? = null,
    onAction: (() -> Unit)? = null
) {
    PitchCard(modifier = modifier, gold = isError) {
        PitchLabel(if (isError) "Uwaga" else "Status")
        Text(
            text = message,
            color = if (isError) Color.White else AwpColors.OnPitch,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold
        )
        if (actionText != null && onAction != null) {
            LinkTextButton(actionText, onAction)
        }
    }
}

@Composable
fun AwpMetricGrid(
    metrics: List<Pair<String, String>>,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        metrics.chunked(2).forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                row.forEach { (label, value) ->
                    AwpMetricTile(
                        label = label,
                        value = value,
                        modifier = Modifier.weight(1f)
                    )
                }
                if (row.size == 1) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
fun AwpMetricTile(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    gold: Boolean = false
) {
    PitchPanel(modifier = modifier) {
        Text(
            text = label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = AwpColors.OnPitchMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Text(
            text = value,
            style = MaterialTheme.typography.titleLarge,
            color = if (gold) AwpColors.MundialGold else AwpColors.OnPitch,
            fontWeight = FontWeight.Bold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
fun AwpListRow(
    title: String,
    modifier: Modifier = Modifier,
    label: String? = null,
    subtitle: String? = null,
    trailing: String? = null,
    gold: Boolean = false
) {
    PitchPanel(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                if (!label.isNullOrBlank()) {
                    Text(
                        text = label.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        color = AwpColors.MundialGold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Text(
                    text = title,
                    color = AwpColors.OnPitch,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        text = subtitle,
                        color = AwpColors.OnPitchMuted,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            if (!trailing.isNullOrBlank()) {
                Text(
                    text = trailing,
                    color = if (gold) AwpColors.MundialGold else AwpColors.OnPitch,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.End,
                    modifier = Modifier.padding(start = 12.dp)
                )
            }
        }
    }
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
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(3.dp)
                .background(
                    Brush.horizontalGradient(
                        listOf(AwpColors.MundialGold, AwpColors.MundialTeal, AwpColors.MundialGold)
                    )
                )
        )
        Spacer(Modifier.height(12.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Image(
                painter = painterResource(id = R.drawable.app_logo),
                contentDescription = "Logo Akademia Wielkich Piłkarzy",
                modifier = Modifier.size(58.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "MUNDIAL 2026",
                    style = MaterialTheme.typography.labelSmall,
                    color = AwpColors.MundialGold
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = title.uppercase(),
                    style = MaterialTheme.typography.headlineSmall,
                    color = Color.White,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
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
    }
}

@Composable
fun AwpPrimaryButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier.fillMaxWidth(),
        shape = AwpButtonShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = AwpColors.PitchCard,
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
            Text(
                text = text,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
fun AwpSecondaryButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.fillMaxWidth(),
        shape = AwpButtonShape,
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = AwpColors.OnPitch
        ),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.4f))
    ) {
        Text(
            text = text,
            fontWeight = FontWeight.SemiBold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
fun AwpGoldButton(
    text: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        shape = AwpButtonShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = AwpColors.MundialGold,
            contentColor = AwpColors.PageDark
        )
    ) {
        Text(
            text = text,
            fontWeight = FontWeight.Bold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
fun AwpDangerButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.fillMaxWidth(),
        shape = AwpButtonShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = AwpColors.MundialRed,
            contentColor = Color.White,
            disabledContainerColor = AwpColors.MundialRed.copy(alpha = 0.45f)
        )
    ) {
        Text(text, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun AwpTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    singleLine: Boolean = true,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    error: String? = null
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = if (error == null) AwpColors.MundialGold else AwpColors.MundialRed
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = singleLine,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            visualTransformation = visualTransformation,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp),
            shape = RoundedCornerShape(14.dp),
            isError = error != null,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = AwpColors.MundialTeal,
                unfocusedBorderColor = Color.White.copy(alpha = 0.32f),
                errorBorderColor = AwpColors.MundialRed,
                focusedContainerColor = Color.Black.copy(alpha = 0.14f),
                unfocusedContainerColor = Color.Black.copy(alpha = 0.12f),
                errorContainerColor = AwpColors.MundialRed.copy(alpha = 0.08f),
                cursorColor = AwpColors.MundialGold,
                focusedTextColor = AwpColors.OnPitch,
                unfocusedTextColor = AwpColors.OnPitch,
                focusedLabelColor = AwpColors.MundialGold,
                unfocusedLabelColor = AwpColors.OnPitchMuted
            )
        )
        if (!error.isNullOrBlank()) {
            Text(error, color = AwpColors.MundialRed, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
fun AwpModal(
    title: String,
    subtitle: String? = null,
    onDismiss: () -> Unit,
    confirmText: String = "Zapisz",
    dismissText: String = "Zamknij",
    onConfirm: (() -> Unit)? = null,
    danger: Boolean = false,
    content: @Composable ColumnScope.() -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxWidth(0.94f),
        properties = DialogProperties(usePlatformDefaultWidth = false),
        confirmButton = {
            if (onConfirm != null) {
                TextButton(onClick = onConfirm) {
                    Text(confirmText, color = if (danger) AwpColors.MundialRed else AwpColors.MundialGold)
                }
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(dismissText) } },
        title = {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .background(
                            Brush.horizontalGradient(
                                listOf(AwpColors.MundialGold, AwpColors.MundialTeal, AwpColors.MundialGold)
                            )
                        )
                )
                Text(title.uppercase(), style = MaterialTheme.typography.headlineSmall)
                if (!subtitle.isNullOrBlank()) {
                    Text(subtitle, style = MaterialTheme.typography.bodySmall, color = AwpColors.OnPitchMuted)
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 520.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                content = content
            )
        },
        containerColor = AwpColors.PitchDeep,
        titleContentColor = AwpColors.OnPitch,
        textContentColor = AwpColors.OnPitch
    )
}

@Composable
fun AwpBadge(text: String, modifier: Modifier = Modifier, gold: Boolean = false) {
    Text(
        text = text,
        color = if (gold) AwpColors.PageDark else AwpColors.OnPitch,
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.Bold,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(if (gold) AwpColors.MundialGold else Color.White.copy(alpha = 0.14f))
            .border(1.dp, Color.White.copy(alpha = 0.24f), RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp)
    )
}

@Composable
fun ScreenScaffold(
    title: String,
    subtitle: String? = null,
    kicker: String = "Akademia WP",
    scrollable: Boolean = true,
    content: @Composable ColumnScope.() -> Unit
) {
    AwpScreen {
        val scroll = rememberScrollState()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .then(if (scrollable) Modifier.verticalScroll(scroll) else Modifier)
                .padding(horizontal = 16.dp, vertical = 18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            AwpHeroCard(title = title, subtitle = subtitle, kicker = kicker)
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
    icon: ImageVector? = null,
    modifier: Modifier = Modifier
) {
    val shape = RoundedCornerShape(16.dp)
    val titleColor = if (gold) Color.White else AwpColors.OnPitch
    val descColor = if (gold) Color(0xFFFEF3C7).copy(alpha = 0.95f) else AwpColors.OnPitchMuted
    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 88.dp)
            .clip(shape)
            .background(pitchTileGradient(gold))
            .pitchMurawaStripes(gold)
            .border(2.dp, Color.White.copy(alpha = 0.30f), shape)
            .clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .height(2.dp)
                .background(Color.White.copy(alpha = 0.45f))
        )
        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .size(28.dp)
                .border(
                    width = 2.dp,
                    color = Color.White.copy(alpha = 0.40f),
                    shape = RoundedCornerShape(bottomEnd = 8.dp)
                )
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (icon != null) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(50))
                        .background(Color.White.copy(alpha = 0.15f))
                        .border(2.dp, Color.White.copy(alpha = 0.35f), RoundedCornerShape(50)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(22.dp))
                }
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium,
                    color = titleColor,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    desc,
                    style = MaterialTheme.typography.bodySmall,
                    color = descColor,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

/** Kafelek wylogowania jak LogoutPitchTile na WWW. */
@Composable
fun HomeLogoutTile(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null
) {
    val shape = RoundedCornerShape(16.dp)
    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 88.dp)
            .clip(shape)
            .background(Color(0xFF064E3B).copy(alpha = 0.25f))
            .pitchMurawaStripes(gold = false)
            .border(2.dp, Color.White.copy(alpha = 0.35f), shape)
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (icon != null) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(50))
                        .background(Color.White.copy(alpha = 0.10f))
                        .border(2.dp, Color.White.copy(alpha = 0.25f), RoundedCornerShape(50)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = null, tint = Color.White.copy(alpha = 0.9f), modifier = Modifier.size(22.dp))
                }
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    "Wyloguj się",
                    style = MaterialTheme.typography.titleMedium,
                    color = AwpColors.OnPitch,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "Zakończ sesję",
                    style = MaterialTheme.typography.bodySmall,
                    color = AwpColors.OnPitchMuted
                )
            }
        }
    }
}
