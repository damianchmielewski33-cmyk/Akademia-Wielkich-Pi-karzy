package pl.akademiawielkichpilkarzy.app.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.MatchDto
import pl.akademiawielkichpilkarzy.app.data.api.SignupRequest
import pl.akademiawielkichpilkarzy.app.data.api.TerminarzResponse

@Composable
fun HomeScreen() {
    var data by remember { mutableStateOf<TerminarzResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch {
            loading = true
            error = null
            try {
                data = ApiClient.api.terminarz()
            } catch (e: Exception) {
                error = e.message ?: "Nie udało się pobrać danych"
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
        Text(
            "Kolejny mecz",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(12.dp))

        when {
            loading -> CircularProgressIndicator()
            error != null -> {
                Text(error!!, color = MaterialTheme.colorScheme.error)
                OutlinedButton(onClick = { reload() }) { Text("Spróbuj ponownie") }
            }
            else -> {
                val next = data?.upcoming?.firstOrNull()
                if (next == null) {
                    Text("Brak nadchodzących meczów w terminarzu.")
                } else {
                    val kind = data?.userSignupKind?.get(next.id.toString())
                    NextMatchCard(
                        match = next,
                        signupKind = kind,
                        onSignup = {
                            scope.launch {
                                actionError = null
                                try {
                                    val res = ApiClient.api.signup(next.id, SignupRequest("confirmed"))
                                    if (res.error != null) actionError = res.error
                                    reload()
                                } catch (e: Exception) {
                                    actionError = e.message
                                }
                            }
                        },
                        onUnsubscribe = {
                            scope.launch {
                                actionError = null
                                try {
                                    val res = ApiClient.api.unsubscribe(next.id)
                                    if (res.error != null) actionError = res.error
                                    reload()
                                } catch (e: Exception) {
                                    actionError = e.message
                                }
                            }
                        }
                    )
                    if (actionError != null) {
                        Text(
                            actionError!!,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun NextMatchCard(
    match: MatchDto,
    signupKind: String?,
    onSignup: () -> Unit,
    onUnsubscribe: () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("${match.matchDate} · ${match.matchTime}", fontWeight = FontWeight.SemiBold)
            Text(match.location)
            Text("Zapisani: ${match.signedUp ?: 0}/${match.maxSlots ?: "?"}")
            if (match.feePln != null) {
                Text("Wynajem: ${"%.2f".format(match.feePln)} zł")
            }
            if (!match.gatePin.isNullOrBlank()) {
                Text("PIN bramki: ${match.gatePin}")
            }
            val status = when (signupKind) {
                "confirmed" -> "Jesteś zapisany"
                "tentative" -> "Jeszcze nie wiesz"
                "declined" -> "Nie bierzesz udziału"
                else -> "Nie zapisany"
            }
            Text(status, color = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(8.dp))
            if (signupKind == "confirmed" || signupKind == "tentative") {
                OutlinedButton(onClick = onUnsubscribe, modifier = Modifier.fillMaxWidth()) {
                    Text("Wypisz się")
                }
            } else {
                Button(onClick = onSignup, modifier = Modifier.fillMaxWidth()) {
                    Text("Zapisz się")
                }
            }
        }
    }
}
