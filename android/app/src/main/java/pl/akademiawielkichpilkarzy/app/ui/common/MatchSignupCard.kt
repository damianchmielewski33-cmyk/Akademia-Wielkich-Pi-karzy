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
import pl.akademiawielkichpilkarzy.app.data.api.PlayersDataEntryDto
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

@Composable
fun MatchSignupCard(
    match: MatchDto,
    signupKind: String?,
    playersEntry: PlayersDataEntryDto? = null,
    weatherLine: String? = null,
    showArchiveBadge: Boolean = false,
    needsStats: Boolean = false,
    onConfirmSignup: () -> Unit = {},
    onTentative: () -> Unit = {},
    onDeclined: () -> Unit = {},
    onUnsubscribe: () -> Unit = {},
    onTransport: (() -> Unit)? = null,
    onAddStats: (() -> Unit)? = null,
    compact: Boolean = false
) {
    val signed = match.signedUp ?: 0
    val maxSlots = match.maxSlots
    val isFull = maxSlots != null && signed >= maxSlots
    val isArchive = showArchiveBadge || match.played == 1
    val isCancelled = match.cancelled == 1

    PitchCard(gold = isCancelled) {
        PitchLabel(
            when {
                isCancelled -> "Mecz odwołany"
                isArchive -> "Archiwum"
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
        if (isCancelled) {
            Text(
                match.cancellationReason?.let { "Powód: $it" } ?: "Odwołany",
                color = AwpColors.MundialRed
            )
        }
        if (isArchive) {
            Text("Rozegrany", color = AwpColors.MundialGold)
        }
        Text(
            "Miejsca: $signed/${maxSlots ?: "?"} ${if (isFull && !isArchive) "· pełny skład" else ""}".trim(),
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

        if (playersEntry != null) {
            Spacer(Modifier.height(6.dp))
            MatchRosterBlock(playersEntry)
        }

        if (isArchive) {
            if (needsStats && onAddStats != null) {
                Spacer(Modifier.height(8.dp))
                AwpPrimaryButton("Dodaj statystyki", onClick = onAddStats)
            }
            return@PitchCard
        }

        if (isCancelled) return@PitchCard

        Spacer(Modifier.height(8.dp))
        if (compact) {
            when (signupKind) {
                "confirmed" -> {
                    LinkTextButton("Wypisz", onUnsubscribe)
                    if (onTransport != null) {
                        LinkTextButton("Transport", onTransport)
                    }
                }
                "tentative" -> {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        if (!isFull) {
                            androidx.compose.material3.Button(
                                onClick = onConfirmSignup,
                                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                                    containerColor = AwpColors.MundialTeal
                                ),
                                shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                            ) { Text("Potwierdzam") }
                        }
                        androidx.compose.material3.OutlinedButton(
                            onClick = onUnsubscribe,
                            border = androidx.compose.foundation.BorderStroke(1.dp, AwpColors.OnPitch.copy(0.4f)),
                            colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                                contentColor = AwpColors.OnPitch
                            ),
                            shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                        ) { Text("Wypisz") }
                    }
                    if (isFull) {
                        Text("Skład pełny — nie można potwierdzić miejsca.", color = AwpColors.OnPitchMuted)
                    }
                }
                "declined" -> {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        if (!isFull) {
                            androidx.compose.material3.Button(
                                onClick = onConfirmSignup,
                                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                                    containerColor = AwpColors.MundialTeal
                                ),
                                shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                            ) { Text("Zmieniam zdanie") }
                        }
                        androidx.compose.material3.OutlinedButton(
                            onClick = onUnsubscribe,
                            border = androidx.compose.foundation.BorderStroke(1.dp, AwpColors.OnPitch.copy(0.4f)),
                            colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                                contentColor = AwpColors.OnPitch
                            ),
                            shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                        ) { Text("Wypisz") }
                    }
                }
                else -> {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        if (!isFull) {
                            androidx.compose.material3.Button(
                                onClick = onConfirmSignup,
                                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                                    containerColor = AwpColors.MundialTeal
                                ),
                                shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                            ) { Text("Zapisz") }
                        }
                        androidx.compose.material3.OutlinedButton(
                            onClick = onTentative,
                            border = androidx.compose.foundation.BorderStroke(1.dp, AwpColors.OnPitch.copy(0.4f)),
                            colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                                contentColor = AwpColors.OnPitch
                            ),
                            shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                        ) { Text("Może") }
                        androidx.compose.material3.OutlinedButton(
                            onClick = onDeclined,
                            border = androidx.compose.foundation.BorderStroke(1.dp, AwpColors.OnPitch.copy(0.4f)),
                            colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                                contentColor = AwpColors.OnPitch
                            ),
                            shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                        ) { Text("Nie") }
                    }
                    if (isFull) {
                        Text("Skład pełny — możesz tylko zaznaczyć „Może” / „Nie”.", color = AwpColors.OnPitchMuted)
                    }
                }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                when (signupKind) {
                    "confirmed" -> {
                        LinkTextButton("Wypisz całkowicie", onUnsubscribe)
                        if (onTransport != null) {
                            AwpGoldButton("Transport / dojazd", onClick = onTransport)
                        }
                    }
                    "tentative" -> {
                        if (!isFull) {
                            AwpPrimaryButton("Potwierdzam udział", onClick = onConfirmSignup)
                        } else {
                            Text("Skład pełny — nie można potwierdzić miejsca.", color = AwpColors.OnPitchMuted)
                        }
                        LinkTextButton("Wypisz całkowicie", onUnsubscribe)
                    }
                    "declined" -> {
                        if (!isFull) {
                            AwpPrimaryButton("Zmieniam zdanie — zapisuję się", onClick = onConfirmSignup)
                        }
                        LinkTextButton("Wypisz całkowicie", onUnsubscribe)
                    }
                    else -> {
                        if (!isFull) {
                            AwpPrimaryButton("Zapisz się", onClick = onConfirmSignup)
                        } else {
                            Text("Skład pełny — zapis potwierdzony niedostępny.", color = AwpColors.OnPitchMuted)
                        }
                        AwpSecondaryButton("Jeszcze nie wiem", onClick = onTentative)
                        AwpSecondaryButton("Nie biorę udziału", onClick = onDeclined)
                    }
                }
            }
        }
    }
}

@Composable
private fun MatchRosterBlock(entry: PlayersDataEntryDto) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        PitchLabel("Skład")
        if (entry.players.isEmpty() && entry.tentativePlayers.isEmpty() && entry.declinedPlayers.isEmpty()) {
            Text("Brak zapisanych.", color = AwpColors.OnPitchMuted, style = MaterialTheme.typography.bodySmall)
        } else {
            if (entry.players.isNotEmpty()) {
                Text(
                    "Potwierdzeni (${entry.players.size}): " +
                        entry.players.joinToString { it.zawodnik.ifBlank { it.name } },
                    color = AwpColors.OnPitch,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            if (entry.tentativePlayers.isNotEmpty()) {
                Text(
                    "Jeszcze nie wiedzą (${entry.tentativePlayers.size}): " +
                        entry.tentativePlayers.joinToString { it.zawodnik.ifBlank { it.name } },
                    color = AwpColors.OnPitchMuted,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            if (entry.declinedPlayers.isNotEmpty()) {
                Text(
                    "Nie biorą (${entry.declinedPlayers.size}): " +
                        entry.declinedPlayers.joinToString { it.zawodnik.ifBlank { it.name } },
                    color = AwpColors.OnPitchMuted,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}
