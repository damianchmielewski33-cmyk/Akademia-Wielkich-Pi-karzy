package pl.akademiawielkichpilkarzy.app.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import pl.akademiawielkichpilkarzy.app.data.api.MatchDto
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

@Composable
fun MatchSignupCard(
    match: MatchDto,
    signupKind: String?,
    weatherLine: String? = null,
    showArchiveBadge: Boolean = false,
    onCommitment: (String) -> Unit,
    onUnsubscribe: () -> Unit,
    onTransport: (() -> Unit)? = null,
    compact: Boolean = false
) {
    PitchCard(gold = match.cancelled == 1) {
        PitchLabel(
            when {
                match.cancelled == 1 -> "Mecz odwołany"
                showArchiveBadge || match.played == 1 -> "Archiwum"
                else -> "Termin"
            }
        )
        Spacer(Modifier.height(6.dp))
        Text(
            "${match.matchDate} · ${match.matchTime}",
            style = MaterialTheme.typography.titleLarge,
            color = AwpColors.OnPitch,
            fontWeight = FontWeight.SemiBold
        )
        Text(match.location, color = AwpColors.OnPitchMuted)
        if (match.cancelled == 1) {
            Text(
                match.cancellationReason?.let { "Powód: $it" } ?: "Odwołany",
                color = AwpColors.MundialRed
            )
        }
        if (showArchiveBadge || match.played == 1) {
            Text("Rozegrany", color = AwpColors.MundialGold)
        }
        Text(
            "Zapisani: ${match.signedUp ?: 0}/${match.maxSlots ?: "?"}",
            color = AwpColors.OnPitch
        )
        if (match.feePln != null) {
            Text("Wynajem: ${"%.2f".format(match.feePln)} zł", color = AwpColors.OnPitchMuted)
        }
        if (!match.gatePin.isNullOrBlank()) {
            Text("PIN bramki: ${match.gatePin}", color = AwpColors.MundialGold)
        }
        weatherLine?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = AwpColors.OnPitchMuted)
        }

        val status = when (signupKind) {
            "confirmed" -> "Status: biorę udział"
            "tentative" -> "Status: jeszcze nie wiem"
            "declined" -> "Status: nie biorę"
            else -> "Status: brak zapisu"
        }
        Text(status, color = AwpColors.MundialGold, fontWeight = FontWeight.SemiBold)

        if (match.cancelled == 1 || match.played == 1) return@PitchCard

        Spacer(Modifier.height(8.dp))
        if (compact) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                androidx.compose.material3.Button(
                    onClick = { onCommitment("confirmed") },
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                        containerColor = AwpColors.MundialTeal
                    ),
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                ) { Text("Tak") }
                androidx.compose.material3.OutlinedButton(
                    onClick = { onCommitment("tentative") },
                    border = androidx.compose.foundation.BorderStroke(1.dp, AwpColors.OnPitch.copy(0.4f)),
                    colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                        contentColor = AwpColors.OnPitch
                    ),
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                ) { Text("Może") }
                androidx.compose.material3.OutlinedButton(
                    onClick = { onCommitment("declined") },
                    border = androidx.compose.foundation.BorderStroke(1.dp, AwpColors.OnPitch.copy(0.4f)),
                    colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                        contentColor = AwpColors.OnPitch
                    ),
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                ) { Text("Nie") }
            }
            if (signupKind != null) {
                LinkTextButton("Wypisz całkowicie", onUnsubscribe)
            }
            if (signupKind == "confirmed" && onTransport != null) {
                LinkTextButton("Transport", onTransport)
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                AwpPrimaryButton("Biorę udział") { onCommitment("confirmed") }
                AwpSecondaryButton("Jeszcze nie wiem") { onCommitment("tentative") }
                AwpSecondaryButton("Nie biorę udziału") { onCommitment("declined") }
                if (signupKind != null) {
                    LinkTextButton("Wypisz całkowicie", onUnsubscribe)
                }
                if (signupKind == "confirmed" && onTransport != null) {
                    AwpGoldButton("Transport / dojazd", onTransport)
                }
            }
        }
    }
}
