package pl.akademiawielkichpilkarzy.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import pl.akademiawielkichpilkarzy.app.R
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

val AwpPitchShape = RoundedCornerShape(20.dp)
val AwpPanelShape = RoundedCornerShape(14.dp)
val AwpButtonShape = RoundedCornerShape(14.dp)

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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        listOf(
                            AwpColors.MundialTeal.copy(alpha = 0.18f),
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
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(AwpPitchShape)
            .background(Brush.linearGradient(sheen))
            .border(2.dp, Color.White.copy(alpha = 0.35f), AwpPitchShape)
    ) {
        PitchCardDecorations()
        Column(
            modifier = Modifier.padding(contentPadding),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            content = content
        )
    }
}

@Composable
fun PitchCardDecorations() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    listOf(
                        Color.White.copy(alpha = 0.06f),
                        Color.Transparent,
                        Color.White.copy(alpha = 0.04f)
                    )
                )
            )
    )
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(4.dp)
            .background(Color.White.copy(alpha = 0.4f))
    )
    Box(
        modifier = Modifier
            .padding(top = 2.dp)
            .fillMaxWidth()
            .height(2.dp)
            .background(
                Brush.horizontalGradient(
                    listOf(AwpColors.MundialGold, AwpColors.MundialTeal, AwpColors.MundialGold)
                )
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
            .background(Color.Black.copy(alpha = 0.16f))
            .border(1.dp, Color.White.copy(alpha = 0.25f), AwpPanelShape)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
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
            Text(text, fontWeight = FontWeight.SemiBold)
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
        Text(text, fontWeight = FontWeight.SemiBold)
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
        Text(text, fontWeight = FontWeight.Bold)
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
    MurawaBackground {
        val scroll = rememberScrollState()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .then(if (scrollable) Modifier.verticalScroll(scroll) else Modifier)
                .padding(horizontal = 16.dp, vertical = 18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
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
