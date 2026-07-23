package pl.akademiawielkichpilkarzy.app.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import pl.akademiawielkichpilkarzy.app.data.api.MatchDto

@Composable
fun MatchSignupCard(
    match: MatchDto,
    signupKind: String?,
    weatherLine: String? = null,
    showArchiveBadge: Boolean = false,
    onCommitment: (String) -> Unit,
    onUnsubscribe: () -> Unit,
    compact: Boolean = false
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(if (compact) 14.dp else 16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                "${match.matchDate} · ${match.matchTime}",
                fontWeight = FontWeight.SemiBold
            )
            Text(match.location)
            if (match.cancelled == 1) {
                Text(
                    "Odwołany" + (match.cancellationReason?.let { ": $it" } ?: ""),
                    color = MaterialTheme.colorScheme.error
                )
            }
            if (showArchiveBadge || match.played == 1) {
                Text("Rozegrany", color = MaterialTheme.colorScheme.secondary)
            }
            Text("Zapisani: ${match.signedUp ?: 0}/${match.maxSlots ?: "?"}")
            if (match.feePln != null) {
                Text("Wynajem: ${"%.2f".format(match.feePln)} zł")
            }
            if (!match.gatePin.isNullOrBlank()) {
                Text("PIN bramki: ${match.gatePin}")
            }
            weatherLine?.let { Text(it, style = MaterialTheme.typography.bodySmall) }

            val status = when (signupKind) {
                "confirmed" -> "Status: biorę udział"
                "tentative" -> "Status: jeszcze nie wiem"
                "declined" -> "Status: nie biorę"
                else -> "Status: brak zapisu"
            }
            Text(status, color = MaterialTheme.colorScheme.primary)

            if (match.cancelled == 1 || match.played == 1) return@Column

            Spacer(Modifier.height(6.dp))
            if (compact) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Button(onClick = { onCommitment("confirmed") }) { Text("Tak") }
                    OutlinedButton(onClick = { onCommitment("tentative") }) { Text("Może") }
                    OutlinedButton(onClick = { onCommitment("declined") }) { Text("Nie") }
                }
                if (signupKind != null) {
                    TextButton(onClick = onUnsubscribe) { Text("Wypisz całkowicie") }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Button(
                        onClick = { onCommitment("confirmed") },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("Biorę udział") }
                    OutlinedButton(
                        onClick = { onCommitment("tentative") },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("Jeszcze nie wiem") }
                    OutlinedButton(
                        onClick = { onCommitment("declined") },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("Nie biorę udziału") }
                    if (signupKind != null) {
                        TextButton(
                            onClick = onUnsubscribe,
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("Wypisz całkowicie") }
                    }
                }
            }
        }
    }
}
