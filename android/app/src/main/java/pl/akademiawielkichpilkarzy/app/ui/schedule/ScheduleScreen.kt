package pl.akademiawielkichpilkarzy.app.ui.schedule

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.SignupRequest
import pl.akademiawielkichpilkarzy.app.data.api.TerminarzResponse
import pl.akademiawielkichpilkarzy.app.ui.common.EmptyHint
import pl.akademiawielkichpilkarzy.app.ui.common.ErrorBlock
import pl.akademiawielkichpilkarzy.app.ui.common.LoadingBlock
import pl.akademiawielkichpilkarzy.app.ui.common.MatchSignupCard
import pl.akademiawielkichpilkarzy.app.ui.common.MurawaBackground
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenHeader

@Composable
fun ScheduleScreen(onOpenTransport: (matchId: Int) -> Unit = {}) {
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

    MurawaBackground {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                ScreenHeader(
                    title = "Terminarz",
                    subtitle = "Nadchodzące i archiwum"
                )
            }

            when {
                loading -> item { LoadingBlock() }
                error != null -> item { ErrorBlock(error!!) { reload() } }
                else -> {
                    val upcoming = data?.upcoming.orEmpty()
                    val archive = data?.playedConfirmed.orEmpty()

                    if (upcoming.isNotEmpty()) {
                        item { PitchLabel("Nadchodzące") }
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
                                },
                                onTransport = { onOpenTransport(match.id) }
                            )
                        }
                    } else {
                        item { EmptyHint("Brak nadchodzących meczów.") }
                    }

                    if (archive.isNotEmpty()) {
                        item { PitchLabel("Archiwum") }
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
