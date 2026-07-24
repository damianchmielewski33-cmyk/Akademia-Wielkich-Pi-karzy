package pl.akademiawielkichpilkarzy.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import pl.akademiawielkichpilkarzy.app.data.api.LineupSelected
import pl.akademiawielkichpilkarzy.app.data.api.LineupSlot
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
    onOpenLineups: (() -> Unit)? = null,
    onAddStats: (() -> Unit)? = null,
    onOpenRoster: (() -> Unit)? = null,
    onCopyInvite: (() -> Unit)? = null,
    onManage: (() -> Unit)? = null,
    compact: Boolean = false,
    isAdmin: Boolean = false,
    lineup: LineupSelected? = null
) {
    val signed = match.signedUp ?: 0
    val maxSlots = match.maxSlots
    val isFull = maxSlots != null && signed >= maxSlots
    val isArchive = showArchiveBadge || match.played == 1
    val isCancelled = match.cancelled == 1
    val fillPercent = if ((maxSlots ?: 0) > 0) (signed.toFloat() / maxSlots!!.toFloat()).coerceIn(0f, 1f) else 0f
    val progressColor = when {
        isFull -> AwpColors.MundialRed
        fillPercent >= 0.8f -> AwpColors.MundialGold
        else -> Color(0xFFDDFCE7)
    }
    val freeSlots = maxSlots?.let { (it - signed).coerceAtLeast(0) }
    val weekday = formatMatchWeekday(match.matchDate)
    val dateLabel = formatMatchDate(match.matchDate)
    val perPersonFee = match.feePln?.takeIf { it > 0.0 && signed > 0 }?.div(signed)
    val tentativeLine = playersEntry?.tentativePlayers?.takeIf { it.isNotEmpty() }?.let { players ->
        "Jeszcze nie wiedzą (${players.size}): ${players.joinToString { it.displayName }}"
    }

    if (compact) {
        CompactMatchSignupCard(
            match = match,
            signupKind = signupKind,
            playersEntry = playersEntry,
            weatherLine = weatherLine,
            showArchiveBadge = showArchiveBadge,
            needsStats = needsStats,
            onConfirmSignup = onConfirmSignup,
            onTentative = onTentative,
            onDeclined = onDeclined,
            onUnsubscribe = onUnsubscribe,
            onTransport = onTransport,
            onAddStats = onAddStats,
            onOpenRoster = onOpenRoster,
            onCopyInvite = onCopyInvite,
            onManage = onManage,
            isAdmin = isAdmin
        )
        return
    }

    PitchCard(gold = isCancelled) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            PitchLabel(
                when {
                    isCancelled -> "Mecz odwołany"
                    isArchive -> "Archiwum"
                    else -> "Kolejny termin"
                }
            )
            Spacer(Modifier.height(6.dp))
            Text(
                dateLabel,
                style = MaterialTheme.typography.displayMedium,
                color = AwpColors.OnPitch,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
            if (weekday.isNotBlank()) {
                Text(
                    "$weekday · ${match.matchTime}",
                    color = AwpColors.MundialGold,
                    style = MaterialTheme.typography.titleMedium,
                    textAlign = TextAlign.Center
                )
            }
            Text(
                match.location,
                color = AwpColors.OnPitchMuted,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
        Spacer(Modifier.height(12.dp))

        PitchPanel {
            PitchLabel("Termin i miejsce")
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)
            ) {
                InfoPill(dateLabel)
                InfoPill(match.matchTime)
            }
            Spacer(Modifier.height(10.dp))
            Text(
                match.location,
                color = AwpColors.OnPitch,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                "Mapa",
                color = AwpColors.MundialGold,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
            weatherLine?.let {
                Spacer(Modifier.height(8.dp))
                Text(
                    "Pogoda na dzień meczu",
                    color = AwpColors.MundialGold,
                    style = MaterialTheme.typography.labelSmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    it,
                    style = MaterialTheme.typography.bodySmall,
                    color = AwpColors.OnPitchMuted,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        if (isCancelled) {
            Text(
                match.cancellationReason?.let { "Powód: $it" } ?: "Odwołany",
                color = AwpColors.MundialRed
            )
        }
        if (isArchive) {
            Text("Rozegrany", color = AwpColors.MundialGold)
        }

        if (match.feePln != null) {
            PitchPanel {
                PitchLabel("Składka")
                Spacer(Modifier.height(6.dp))
                Text(
                    if (perPersonFee != null) "Na osobę" else "Wynajem boiska",
                    color = AwpColors.OnPitchMuted,
                    style = MaterialTheme.typography.labelSmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    formatPln(perPersonFee ?: match.feePln),
                    color = AwpColors.OnPitch,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    if (perPersonFee != null) {
                        "Wynajem ${formatPln(match.feePln)} ÷ $signed ${personWord(signed)}"
                    } else {
                        "Składka na osobę pojawi się po pierwszych zapisach."
                    },
                    color = AwpColors.OnPitchMuted,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        if (!match.gatePin.isNullOrBlank() && signupKind == "confirmed") {
            PitchPanel {
                PitchLabel("Wejście na boisko")
                Spacer(Modifier.height(6.dp))
                Text(
                    "PIN do bramy",
                    color = AwpColors.OnPitchMuted,
                    style = MaterialTheme.typography.labelSmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    match.gatePin,
                    color = AwpColors.OnPitch,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    "Wpisz ten kod na bramie, aby wejść na boisko.",
                    color = AwpColors.OnPitchMuted,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        PitchPanel {
            PitchLabel("Skład")
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    "$signed/${maxSlots ?: "?"} zapisanych",
                    color = AwpColors.OnPitch,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    when {
                        isFull -> "Pełny skład"
                        freeSlots != null -> "$freeSlots ${placeWord(freeSlots)}"
                        else -> ""
                    },
                    color = if (isFull) AwpColors.MundialRed else AwpColors.OnPitchMuted,
                    style = MaterialTheme.typography.labelMedium
                )
            }
            Spacer(Modifier.height(8.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(99.dp))
                    .background(Color.White.copy(alpha = 0.16f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(fillPercent)
                        .height(8.dp)
                        .clip(RoundedCornerShape(99.dp))
                        .background(progressColor)
                )
            }
            tentativeLine?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = Color(0xFFFFF3C4), style = MaterialTheme.typography.bodySmall)
            }
        }

        if (onOpenRoster != null || onCopyInvite != null || (isAdmin && onManage != null)) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                if (onOpenRoster != null) {
                    SmallPitchAction("Skład", onOpenRoster, Modifier.weight(1f))
                }
                if (!isArchive && onCopyInvite != null) {
                    SmallPitchAction("Zaproszenie", onCopyInvite, Modifier.weight(1f))
                }
                if (isAdmin && onManage != null) {
                    SmallPitchAction("Zarządzaj", onManage, Modifier.weight(1f), gold = true)
                }
            }
        }

        if (playersEntry != null && compact) {
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
        PitchLabel("Zapis na mecz")
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
                        PitchPanel {
                            Text(
                                "Jesteś zapisany na ten mecz",
                                color = AwpColors.OnPitch,
                                fontWeight = FontWeight.SemiBold,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        LinkTextButton("Wypisz całkowicie", onUnsubscribe)
                    }
                    "tentative" -> {
                        PitchPanel {
                            Text(
                                "Status: jeszcze nie wiem (bez miejsca w składzie)",
                                color = AwpColors.OnPitch,
                                fontWeight = FontWeight.SemiBold,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        if (!isFull) {
                            AwpPrimaryButton("Potwierdzam — wpadam na mecz", onClick = onConfirmSignup)
                        } else {
                            Text("Skład jest pełny — nie możesz teraz potwierdzić udziału.", color = AwpColors.OnPitchMuted)
                        }
                        LinkTextButton("Wypisz całkowicie", onUnsubscribe)
                    }
                    "declined" -> {
                        PitchPanel {
                            Text(
                                "Nie bierzesz udziału w tym terminie (bez miejsca w składzie)",
                                color = AwpColors.OnPitch,
                                fontWeight = FontWeight.SemiBold,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        if (!isFull) {
                            AwpPrimaryButton("Zmieniam zdanie — wpadam na mecz", onClick = onConfirmSignup)
                        } else {
                            Text("Skład jest pełny — nie możesz teraz dołączyć do składu.", color = AwpColors.OnPitchMuted)
                        }
                        LinkTextButton("Wypisz całkowicie", onUnsubscribe)
                    }
                    else -> {
                        if (!isFull) {
                            AwpPrimaryButton("Zapisz się na mecz", onClick = onConfirmSignup)
                        } else {
                            Text("Skład pełny — możesz oznaczyć wstępne zainteresowanie.", color = AwpColors.OnPitchMuted)
                        }
                        AwpSecondaryButton("Jeszcze nie wiem", onClick = onTentative)
                        AwpSecondaryButton("Nie biorę udziału", onClick = onDeclined)
                    }
                }
            }
        }

        if (signupKind == "confirmed" && onTransport != null) {
            Spacer(Modifier.height(8.dp))
            PitchLabel("Transport")
            AwpGoldButton("Transport na mecz", onClick = onTransport)
        }

        Spacer(Modifier.height(8.dp))
        PitchLabel("Składy")
        if (lineup != null) {
            AwpGoldButton("Zobacz składy na mecz", onClick = onOpenLineups ?: {})
            Spacer(Modifier.height(8.dp))
            LineupPitchDiagram(lineup)
        } else {
            PitchPanel {
                Text(
                    "Składy na mecz",
                    color = AwpColors.OnPitch,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    "Przycisk będzie aktywny, gdy administrator udostępni składy.",
                    color = AwpColors.OnPitchMuted,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

@Composable
private fun CompactMatchSignupCard(
    match: MatchDto,
    signupKind: String?,
    playersEntry: PlayersDataEntryDto?,
    weatherLine: String?,
    showArchiveBadge: Boolean,
    needsStats: Boolean,
    onConfirmSignup: () -> Unit,
    onTentative: () -> Unit,
    onDeclined: () -> Unit,
    onUnsubscribe: () -> Unit,
    onTransport: (() -> Unit)?,
    onAddStats: (() -> Unit)?,
    onOpenRoster: (() -> Unit)?,
    onCopyInvite: (() -> Unit)?,
    onManage: (() -> Unit)?,
    isAdmin: Boolean
) {
    val signed = match.signedUp ?: 0
    val maxSlots = match.maxSlots
    val isFull = maxSlots != null && signed >= maxSlots
    val isArchive = showArchiveBadge || match.played == 1
    val isCancelled = match.cancelled == 1
    val fillPercent = if ((maxSlots ?: 0) > 0) (signed.toFloat() / maxSlots!!.toFloat()).coerceIn(0f, 1f) else 0f
    val progressColor = when {
        isFull -> AwpColors.MundialRed
        fillPercent >= 0.8f -> AwpColors.MundialGold
        else -> Color(0xFFDDFCE7)
    }

    PitchCard(gold = isCancelled) {
        PitchLabel(
            when {
                isCancelled -> "Mecz odwołany"
                isArchive -> "Archiwum"
                else -> "Termin"
            }
        )
        Spacer(Modifier.height(6.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            DateBadge(match.matchDate)
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    match.matchTime,
                    style = MaterialTheme.typography.titleLarge,
                    color = AwpColors.OnPitch,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    match.location,
                    color = AwpColors.OnPitchMuted,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text("Mapa", color = AwpColors.MundialGold, style = MaterialTheme.typography.bodySmall)
            }
        }
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
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(99.dp))
                .background(Color.White.copy(alpha = 0.16f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(fillPercent)
                    .height(8.dp)
                    .clip(RoundedCornerShape(99.dp))
                    .background(progressColor)
            )
        }
        if (match.feePln != null) {
            Text("Wynajem: ${formatPln(match.feePln)}", color = AwpColors.OnPitchMuted)
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

        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
            if (onOpenRoster != null) {
                SmallPitchAction("Skład", onOpenRoster, Modifier.weight(1f))
            }
            if (!isArchive && onCopyInvite != null) {
                SmallPitchAction("Zaproszenie", onCopyInvite, Modifier.weight(1f))
            }
            if (isAdmin && onManage != null) {
                SmallPitchAction("Zarządzaj", onManage, Modifier.weight(1f), gold = true)
            }
        }

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
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("Potwierdzam") }
                    }
                    androidx.compose.material3.OutlinedButton(
                        onClick = onUnsubscribe,
                        border = androidx.compose.foundation.BorderStroke(1.dp, AwpColors.OnPitch.copy(0.4f)),
                        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                            contentColor = AwpColors.OnPitch
                        ),
                        shape = RoundedCornerShape(12.dp)
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
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("Zmieniam zdanie") }
                    }
                    androidx.compose.material3.OutlinedButton(
                        onClick = onUnsubscribe,
                        border = androidx.compose.foundation.BorderStroke(1.dp, AwpColors.OnPitch.copy(0.4f)),
                        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                            contentColor = AwpColors.OnPitch
                        ),
                        shape = RoundedCornerShape(12.dp)
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
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("Zapisz") }
                    }
                    androidx.compose.material3.OutlinedButton(
                        onClick = onTentative,
                        border = androidx.compose.foundation.BorderStroke(1.dp, AwpColors.OnPitch.copy(0.4f)),
                        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                            contentColor = AwpColors.OnPitch
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) { Text("Może") }
                    androidx.compose.material3.OutlinedButton(
                        onClick = onDeclined,
                        border = androidx.compose.foundation.BorderStroke(1.dp, AwpColors.OnPitch.copy(0.4f)),
                        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                            contentColor = AwpColors.OnPitch
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) { Text("Nie") }
                }
                if (isFull) {
                    Text("Skład pełny — możesz tylko zaznaczyć „Może” / „Nie”.", color = AwpColors.OnPitchMuted)
                }
            }
        }
    }
}

@Composable
private fun InfoPill(text: String) {
    Text(
        text,
        color = AwpColors.TextOnLight,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(AwpColors.EmeraldSoft)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    )
}

@Composable
private fun LineupPitchDiagram(lineup: LineupSelected) {
    PitchPanel {
        PitchLabel("Boisko (${lineup.home.size + lineup.away.size} pól: A ${lineup.home.size} · B ${lineup.away.size})")
        Spacer(Modifier.height(4.dp))
        Text(
            "B — góra, A — dół. Dotknij sekcji Składy, aby zobaczyć pełny widok.",
            color = AwpColors.OnPitchMuted,
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(10.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(3f / 4f)
                .clip(RoundedCornerShape(18.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color(0xFF14532D),
                            Color(0xFF166534),
                            Color(0xFF15803D),
                            Color(0xFF166534),
                            Color(0xFF14532D)
                        )
                    )
                )
                .border(2.dp, Color.White.copy(alpha = 0.4f), RoundedCornerShape(18.dp))
        ) {
            PitchMarkings()
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp)
            ) {
                TeamHalfDiagram("Drużyna B", "away", lineup.away, Modifier.weight(1f))
                TeamHalfDiagram("Drużyna A", "home", lineup.home, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun PitchMarkings() {
    Canvas(modifier = Modifier.fillMaxSize()) {
        val line = Color.White.copy(alpha = 0.5f)
        val stroke = Stroke(width = 2.dp.toPx())
        drawRect(
            color = line,
            topLeft = Offset(size.width * 0.04f, size.height * 0.04f),
            size = Size(size.width * 0.92f, size.height * 0.92f),
            style = stroke
        )
        drawLine(
            color = line,
            start = Offset(size.width * 0.04f, size.height * 0.5f),
            end = Offset(size.width * 0.96f, size.height * 0.5f),
            strokeWidth = 2.dp.toPx()
        )
        drawCircle(
            color = line.copy(alpha = 0.8f),
            radius = size.width * 0.12f,
            center = Offset(size.width * 0.5f, size.height * 0.5f),
            style = Stroke(width = 1.5.dp.toPx())
        )
        drawCircle(
            color = line.copy(alpha = 0.9f),
            radius = 2.dp.toPx(),
            center = Offset(size.width * 0.5f, size.height * 0.5f)
        )
        drawRect(
            color = line.copy(alpha = 0.85f),
            topLeft = Offset(size.width * 0.24f, size.height * 0.04f),
            size = Size(size.width * 0.52f, size.height * 0.18f),
            style = Stroke(width = 1.5.dp.toPx())
        )
        drawRect(
            color = line.copy(alpha = 0.85f),
            topLeft = Offset(size.width * 0.24f, size.height * 0.78f),
            size = Size(size.width * 0.52f, size.height * 0.18f),
            style = Stroke(width = 1.5.dp.toPx())
        )
        drawRect(
            color = line,
            topLeft = Offset(size.width * 0.39f, size.height * 0.01f),
            size = Size(size.width * 0.22f, size.height * 0.035f),
            style = Stroke(width = 1.5.dp.toPx())
        )
        drawRect(
            color = line,
            topLeft = Offset(size.width * 0.39f, size.height * 0.955f),
            size = Size(size.width * 0.22f, size.height * 0.035f),
            style = Stroke(width = 1.5.dp.toPx())
        )
    }
}

@Composable
private fun TeamHalfDiagram(
    label: String,
    team: String,
    slots: List<LineupSlot?>,
    modifier: Modifier = Modifier
) {
    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        Text(
            label,
            color = Color.White,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .align(if (team == "away") Alignment.TopStart else Alignment.BottomStart)
                .clip(RoundedCornerShape(8.dp))
                .background(Color.Black.copy(alpha = 0.25f))
                .padding(horizontal = 8.dp, vertical = 3.dp)
        )
        val positions = lineupSlotPositions(team, slots.size)
        slots.forEachIndexed { index, slot ->
            val pos = positions.getOrElse(index) { 0.5f to 0.5f }
            PlayerToken(
                slot = slot,
                index = index,
                team = team,
                modifier = Modifier.offset(
                    x = maxWidth * pos.first - 27.dp,
                    y = maxHeight * pos.second - 24.dp
                )
            )
        }
    }
}

@Composable
private fun PlayerToken(slot: LineupSlot?, index: Int, team: String, modifier: Modifier = Modifier) {
    val isAway = team == "away"
    val name = slot?.displayName
        ?: listOfNotNull(slot?.firstName, slot?.lastName).joinToString(" ").ifBlank {
            slot?.zawodnik ?: "Wolne"
        }
    val initials = if (slot == null) {
        "${index + 1}"
    } else {
        name.split(" ")
            .filter { it.isNotBlank() }
            .take(2)
            .joinToString("") { it.first().uppercase() }
            .ifBlank { "?" }
    }
    val shirt = if (isAway) Color(0xFF1D4ED8) else Color(0xFF047857)
    Column(
        modifier = modifier.width(54.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(width = 34.dp, height = 28.dp)
                .clip(RoundedCornerShape(9.dp))
                .background(if (slot == null) Color.Black.copy(alpha = 0.28f) else shirt)
                .border(
                    1.dp,
                    Color.White.copy(alpha = if (slot == null) 0.55f else 0.9f),
                    RoundedCornerShape(9.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                initials,
                color = Color.White,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Black,
                maxLines = 1
            )
        }
        Text(
            if (slot == null) "Wolne" else shortPlayerName(name),
            color = Color.White,
            style = MaterialTheme.typography.labelSmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(5.dp))
                .background(Color.Black.copy(alpha = 0.55f))
                .padding(horizontal = 2.dp, vertical = 1.dp)
        )
    }
}

private fun lineupSlotPositions(team: String, count: Int): List<Pair<Float, Float>> {
    val away7 = listOf(
        0.50f to 0.84f,
        0.10f to 0.58f,
        0.50f to 0.58f,
        0.90f to 0.58f,
        0.20f to 0.34f,
        0.80f to 0.34f,
        0.50f to 0.06f
    )
    val away8 = listOf(
        0.50f to 0.88f,
        0.08f to 0.68f,
        0.50f to 0.68f,
        0.92f to 0.68f,
        0.50f to 0.50f,
        0.18f to 0.32f,
        0.82f to 0.32f,
        0.50f to 0.04f
    )
    val home7 = listOf(
        0.50f to 0.16f,
        0.10f to 0.42f,
        0.50f to 0.42f,
        0.90f to 0.42f,
        0.20f to 0.66f,
        0.80f to 0.66f,
        0.50f to 0.94f
    )
    val home8 = listOf(
        0.50f to 0.12f,
        0.08f to 0.32f,
        0.50f to 0.32f,
        0.92f to 0.32f,
        0.50f to 0.50f,
        0.18f to 0.68f,
        0.82f to 0.68f,
        0.50f to 0.96f
    )
    val base = when {
        team == "away" && count >= 8 -> away8
        team == "away" -> away7
        count >= 8 -> home8
        else -> home7
    }
    return base.take(count.coerceIn(0, 8))
}

private fun formatMatchDate(matchDate: String): String {
    val parts = matchDate.split("-")
    if (parts.size != 3) return matchDate
    return "${parts[2]}.${parts[1]}.${parts[0]}"
}

private fun formatMatchWeekday(matchDate: String): String {
    return try {
        val locale = java.util.Locale("pl", "PL")
        val date = java.text.SimpleDateFormat("yyyy-MM-dd", locale).parse(matchDate)
        if (date == null) "" else java.text.SimpleDateFormat("EEEE", locale).format(date)
    } catch (_: Exception) {
        ""
    }
}

private fun formatPln(value: Double): String = "%.2f zł".format(java.util.Locale("pl", "PL"), value)

private fun personWord(count: Int): String = when {
    count == 1 -> "osoba"
    count in 2..4 -> "osoby"
    else -> "osób"
}

private fun placeWord(count: Int): String = when {
    count == 1 -> "miejsce"
    count in 2..4 -> "miejsca"
    else -> "miejsc"
}

private fun shortPlayerName(name: String): String {
    val parts = name.split(" ").filter { it.isNotBlank() }
    return when {
        parts.size >= 2 -> "${parts.first()} ${parts[1].first()}."
        parts.isNotEmpty() -> parts.first()
        else -> "Zawodnik"
    }
}

@Composable
private fun DateBadge(matchDate: String) {
    val shortDate = matchDate.drop(5).replace("-", ".").ifBlank { matchDate }
    val year = matchDate.take(4)
    Column(
        modifier = Modifier
            .size(width = 72.dp, height = 62.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.22f), Color.White.copy(alpha = 0.08f))))
            .padding(8.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text(shortDate, color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
        Text(year, color = Color.White.copy(alpha = 0.78f), style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun SmallPitchAction(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    gold: Boolean = false
) {
    val bg = if (gold) AwpColors.MundialGold.copy(alpha = 0.22f) else Color.White.copy(alpha = 0.12f)
    Text(
        text = text,
        color = if (gold) AwpColors.MundialGold else AwpColors.OnPitch,
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.SemiBold,
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 8.dp)
    )
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
                        entry.players.joinToString { it.displayName },
                    color = AwpColors.OnPitch,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            if (entry.tentativePlayers.isNotEmpty()) {
                Text(
                    "Jeszcze nie wiedzą (${entry.tentativePlayers.size}): " +
                        entry.tentativePlayers.joinToString { it.displayName },
                    color = AwpColors.OnPitchMuted,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            if (entry.declinedPlayers.isNotEmpty()) {
                Text(
                    "Nie biorą (${entry.declinedPlayers.size}): " +
                        entry.declinedPlayers.joinToString { it.displayName },
                    color = AwpColors.OnPitchMuted,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}
