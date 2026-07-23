package pl.akademiawielkichpilkarzy.app.ui.wallet

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.DepositRequest
import pl.akademiawielkichpilkarzy.app.data.api.WalletResponse
import pl.akademiawielkichpilkarzy.app.ui.common.AwpPrimaryButton
import pl.akademiawielkichpilkarzy.app.ui.common.ErrorBlock
import pl.akademiawielkichpilkarzy.app.ui.common.LoadingBlock
import pl.akademiawielkichpilkarzy.app.ui.common.PitchCard
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.common.PitchPanel
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenScaffold
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors
import androidx.compose.material3.MaterialTheme

@Composable
fun WalletScreen() {
    var wallet by remember { mutableStateOf<WalletResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = AwpColors.MundialGold,
        unfocusedBorderColor = Color.White.copy(alpha = 0.35f),
        focusedLabelColor = AwpColors.MundialGold,
        unfocusedLabelColor = AwpColors.OnPitchMuted,
        cursorColor = AwpColors.MundialGold,
        focusedTextColor = AwpColors.OnPitch,
        unfocusedTextColor = AwpColors.OnPitch
    )

    fun reload() {
        scope.launch {
            loading = true
            error = null
            try {
                wallet = ApiClient.api.wallet()
            } catch (e: Exception) {
                error = e.message ?: "Nie udało się pobrać portfela"
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    ScreenScaffold(title = "Portfel", subtitle = "Saldo i wpłaty BLIK") {
        when {
            loading -> LoadingBlock()
            error != null -> ErrorBlock(error!!) { reload() }
            else -> {
                PitchCard(gold = true) {
                    PitchLabel("Saldo")
                    Text(
                        "%.2f zł".format(wallet?.balancePln ?: 0.0),
                        style = MaterialTheme.typography.displayMedium,
                        color = AwpColors.MundialGold,
                        fontWeight = FontWeight.Bold
                    )
                }

                PitchCard {
                    PitchLabel("Zgłoś wpłatę")
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = amount,
                        onValueChange = { amount = it.filter { ch -> ch.isDigit() || ch == '.' || ch == ',' } },
                        label = { Text("Kwota (PLN)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        colors = fieldColors,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = note,
                        onValueChange = { note = it },
                        label = { Text("Notatka (opcjonalnie)") },
                        colors = fieldColors,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(10.dp))
                    AwpPrimaryButton("Wyślij zgłoszenie") {
                        scope.launch {
                            message = null
                            val value = amount.replace(',', '.').toDoubleOrNull()
                            if (value == null || value <= 0) {
                                message = "Podaj prawidłową kwotę"
                                return@launch
                            }
                            try {
                                val res = ApiClient.api.declareDeposit(
                                    DepositRequest(amountPln = value, note = note.ifBlank { null })
                                )
                                message = if (res.error != null) res.error else "Zgłoszono wpłatę — czeka na admina"
                                amount = ""
                                note = ""
                                reload()
                            } catch (e: Exception) {
                                message = e.message
                            }
                        }
                    }
                    if (message != null) {
                        Text(message!!, color = AwpColors.OnPitchMuted)
                    }
                }

                val pending = wallet?.pending.orEmpty()
                if (pending.isNotEmpty()) {
                    PitchCard {
                        PitchLabel("Oczekujące wpłaty")
                        Spacer(Modifier.height(8.dp))
                        pending.forEach { d ->
                            PitchPanel {
                                Text("%.2f zł · ${d.status}".format(d.amountPln), color = AwpColors.OnPitch)
                                if (!d.note.isNullOrBlank()) {
                                    Text(d.note, color = AwpColors.OnPitchMuted)
                                }
                            }
                            Spacer(Modifier.height(6.dp))
                        }
                    }
                }

                val txs = wallet?.transactions.orEmpty()
                if (txs.isNotEmpty()) {
                    PitchCard {
                        PitchLabel("Historia")
                        Spacer(Modifier.height(8.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            txs.take(20).forEach { tx ->
                                PitchPanel {
                                    Text(
                                        "${tx.kind}: %.2f zł".format(tx.amountPln),
                                        color = AwpColors.OnPitch
                                    )
                                    if (!tx.createdAt.isNullOrBlank()) {
                                        Text(
                                            tx.createdAt,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = AwpColors.OnPitchMuted
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
