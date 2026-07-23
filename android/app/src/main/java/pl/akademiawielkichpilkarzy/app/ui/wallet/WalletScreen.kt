package pl.akademiawielkichpilkarzy.app.ui.wallet

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.DepositRequest
import pl.akademiawielkichpilkarzy.app.data.api.WalletResponse
import pl.akademiawielkichpilkarzy.app.ui.common.AwpListRow
import pl.akademiawielkichpilkarzy.app.ui.common.AwpMetricGrid
import pl.akademiawielkichpilkarzy.app.ui.common.AwpPrimaryButton
import pl.akademiawielkichpilkarzy.app.ui.common.AwpStatusMessage
import pl.akademiawielkichpilkarzy.app.ui.common.AwpTextField
import pl.akademiawielkichpilkarzy.app.ui.common.EmptyHint
import pl.akademiawielkichpilkarzy.app.ui.common.ErrorBlock
import pl.akademiawielkichpilkarzy.app.ui.common.LoadingBlock
import pl.akademiawielkichpilkarzy.app.ui.common.PitchCard
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenScaffold

@Composable
fun WalletScreen() {
    var wallet by remember { mutableStateOf<WalletResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

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
                val pending = wallet?.pending.orEmpty()
                val txs = wallet?.transactions.orEmpty()
                PitchCard(gold = true) {
                    PitchLabel("Saldo")
                    Spacer(Modifier.height(8.dp))
                    AwpMetricGrid(
                        listOf(
                            "Dostępne" to "%.2f zł".format(wallet?.balancePln ?: 0.0),
                            "Oczekujące" to pending.size.toString()
                        )
                    )
                }

                PitchCard {
                    PitchLabel("Zgłoś wpłatę")
                    Spacer(Modifier.height(8.dp))
                    AwpTextField(
                        label = "Kwota (PLN)",
                        value = amount,
                        onValueChange = { amount = it.filter { ch -> ch.isDigit() || ch == '.' || ch == ',' } },
                        keyboardType = KeyboardType.Decimal
                    )
                    Spacer(Modifier.height(8.dp))
                    AwpTextField(
                        label = "Notatka (opcjonalnie)",
                        value = note,
                        onValueChange = { note = it }
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
                }

                if (message != null) {
                    AwpStatusMessage(
                        message = message!!,
                        isError = message!!.startsWith("Podaj") || message!!.startsWith("Nie")
                    )
                }

                PitchCard {
                    PitchLabel("Oczekujące wpłaty")
                    Spacer(Modifier.height(8.dp))
                    if (pending.isEmpty()) {
                        EmptyHint("Brak oczekujących wpłat.")
                    } else {
                        pending.forEach { d ->
                            AwpListRow(
                                title = "%.2f zł".format(d.amountPln),
                                label = d.status,
                                subtitle = d.note ?: d.createdAt,
                                trailing = d.createdAt?.take(10),
                                gold = true
                            )
                            Spacer(Modifier.height(6.dp))
                        }
                    }
                }

                PitchCard {
                    PitchLabel("Historia")
                    Spacer(Modifier.height(8.dp))
                    if (txs.isEmpty()) {
                        EmptyHint("Brak historii portfela.")
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            txs.take(20).forEach { tx ->
                                AwpListRow(
                                    title = tx.kind,
                                    subtitle = tx.note ?: tx.createdAt,
                                    trailing = "%.2f zł".format(tx.amountPln),
                                    gold = tx.amountPln > 0
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
