package pl.akademiawielkichpilkarzy.app.ui.schedule

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import pl.akademiawielkichpilkarzy.app.data.api.SignupRequest
import pl.akademiawielkichpilkarzy.app.data.api.TerminarzResponse
import pl.akademiawielkichpilkarzy.app.ui.common.MatchSignupCard

@Composable
fun ScheduleScreen() {
    var data by remember { mutableStateOf<TerminarzResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch {
            loading = true
            error = null
            try {
                data = ApiClient.api.terminarz()
            } catch (e: Exception) {
                error = e.message ?: "Błąd pobierania terminarza"
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Terminarz", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))

        when {
            loading -> CircularProgressIndicator()
            error != null -> {
                Text(error!!, color = MaterialTheme.colorScheme.error)
                OutlinedButton(onClick = { reload() }) { Text("Odśwież") }
            }
            else -> {
                val upcoming = data?.upcoming.orEmpty()
                val archive = data?.playedConfirmed.orEmpty()
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (upcoming.isNotEmpty()) {
                        item {
                            Text("Nadchodzące", fontWeight = FontWeight.SemiBold)
                        }
                        items(upcoming, key = { "u-${it.id}" }) { match ->
                            MatchSignupCard(
                                match = match,
                                signupKind = data?.userSignupKind?.get(match.id.toString()),
                                compact = true,
                                onCommitment = { commitment ->
                                    scope.launch {
                                        try {
                                            ApiClient.api.signup(match.id, SignupRequest(commitment))
                                            reload()
                                        } catch (_: Exception) {
                                        }
                                    }
                                },
                                onUnsubscribe = {
                                    scope.launch {
                                        try {
                                            ApiClient.api.unsubscribe(match.id)
                                            reload()
                                        } catch (_: Exception) {
                                        }
                                    }
                                }
                            )
                        }
                    } else {
                        item { Text("Brak nadchodzących meczów.") }
                    }

                    if (archive.isNotEmpty()) {
                        item {
                            Spacer(Modifier.height(8.dp))
                            Text("Archiwum", fontWeight = FontWeight.SemiBold)
                        }
                        items(archive, key = { "a-${it.id}" }) { match ->
                            MatchSignupCard(
                                match = match,
                                signupKind = data?.userSignupKind?.get(match.id.toString()),
                                showArchiveBadge = true,
                                compact = true,
                                onCommitment = {},
                                onUnsubscribe = {}
                            )
                        }
                    }
                }
            }
        }
    }
}
