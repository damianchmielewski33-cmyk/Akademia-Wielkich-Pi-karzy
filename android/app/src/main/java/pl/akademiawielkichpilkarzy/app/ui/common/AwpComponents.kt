package pl.akademiawielkichpilkarzy.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

val AwpPanelShape = RoundedCornerShape(18.dp)

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
fun AwpTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    singleLine: Boolean = true,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    error: String? = null,
    light: Boolean = false
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = when {
                error != null -> AwpColors.MundialRed
                light -> AwpColors.Zinc400
                else -> AwpColors.MundialGold
            }
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
            colors = if (light) {
                OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = AwpColors.MpTeal,
                    unfocusedBorderColor = Color(0xFFE4E4E7),
                    errorBorderColor = AwpColors.MundialRed,
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                    errorContainerColor = AwpColors.MundialRed.copy(alpha = 0.08f),
                    cursorColor = AwpColors.MpTealDark,
                    focusedTextColor = AwpColors.TextOnLight,
                    unfocusedTextColor = AwpColors.TextOnLight
                )
            } else {
                OutlinedTextFieldDefaults.colors(
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
            }
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
    dismissOnBackPress: Boolean = true,
    dismissOnClickOutside: Boolean = true,
    showDismissButton: Boolean = true,
    content: @Composable ColumnScope.() -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxWidth(0.94f),
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = dismissOnBackPress,
            dismissOnClickOutside = dismissOnClickOutside
        ),
        confirmButton = {
            if (onConfirm != null) {
                TextButton(onClick = onConfirm) {
                    Text(confirmText, color = if (danger) AwpColors.MundialRed else AwpColors.MundialGold)
                }
            }
        },
        dismissButton = if (showDismissButton) {
            { TextButton(onClick = onDismiss) { Text(dismissText) } }
        } else {
            null
        },
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
