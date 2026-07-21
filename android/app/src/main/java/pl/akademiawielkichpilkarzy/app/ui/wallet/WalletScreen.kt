package pl.akademiawielkichpilkarzy.app.ui.wallet

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.modifier.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.DepositRequest
import pl.akademiawielkichpilkarzy.app.data.api.WalletResponse

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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("Portfel", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))

        when {
            loading -> CircularProgressIndicator()
            error != null -> {
                Text(error!!, color = MaterialTheme.colorScheme.error)
                OutlinedButton(onClick = { reload() }) { Text("Odśwież") }
            }
            else -> {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier = Modifier.padding(16.dp)) {
                        Text("Saldo", style = MaterialTheme.typography.labelLarge)
                        Text(
                            "%.2f zł".format(wallet?.balancePln ?: 0.0),
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                Spacer(Modifier.height(16.dp))
                Text("Zgłoś wpłatę", fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it.filter { ch -> ch.isDigit() || ch == '.' || ch == ',' } },
                    label = { Text("Kwota (PLN)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("Notatka (opcjonalnie)") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = {
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
                    },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Wyślij zgłoszenie") }

                if (message != null) {
                    Text(message!!, modifier = Modifier.padding(top = 8.dp))
                }

                val pending = wallet?.pending.orEmpty()
                if (pending.isNotEmpty()) {
                    Spacer(Modifier.height(20.dp))
                    Text("Oczekujące wpłaty", fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    pending.forEach { d ->
                        Card(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                            Column(Modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text("%.2f zł · ${d.status}".format(d.amountPln))
                                if (!d.note.isNullOrBlank()) Text(d.note)
                            }
                        }
                    }
                }

                val txs = wallet?.transactions.orEmpty()
                if (txs.isNotEmpty()) {
                    Spacer(Modifier.height(20.dp))
                    Text("Historia", fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    txs.take(20).forEach { tx ->
                        Card(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("${tx.kind}: %.2f zł".format(tx.amountPln))
                                if (!tx.createdAt.isNullOrBlank()) {
                                    Text(tx.createdAt, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
