package pl.akademiawielkichpilkarzy.app.ui.schedule

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
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
import pl.akademiawielkichpilkarzy.app.ui.common.ScreenHeader
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

@Composable
fun ScheduleScreen(
    onOpenTransport: (matchId: Int) -> Unit = {},
    onOpenStatsForMatch: (matchId: Int) -> Unit = {}
) {
    var data by remember { mutableStateOf<TerminarzResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var tab by remember { mutableStateOf(0) } // 0 upcoming, 1 archive
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
                    subtitle = "Zapisy i archiwum jak na stronie"
                )
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = tab == 0,
                        onClick = { tab = 0 },
                        label = { Text("Do rozegrania") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = AwpColors.MundialTeal,
                            selectedLabelColor = Color.White,
                            containerColor = Color.White.copy(alpha = 0.12f),
                            labelColor = AwpColors.OnPitch
                        )
                    )
                    FilterChip(
                        selected = tab == 1,
                        onClick = { tab = 1 },
                        label = { Text("Archiwum") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = AwpColors.MundialTeal,
                            selectedLabelColor = Color.White,
                            containerColor = Color.White.copy(alpha = 0.12f),
                            labelColor = AwpColors.OnPitch
                        )
                    )
                }
            }

            when {
                loading -> item { LoadingBlock() }
                error != null -> item { ErrorBlock(error!!) { reload() } }
                else -> {
                    val upcoming = data?.upcoming.orEmpty()
                    val archive = data?.playedConfirmed.orEmpty()
                    val missingStats = data?.playedMissingStatsMatchIds.orEmpty().toSet()

                    if (tab == 0) {
                        if (upcoming.isEmpty()) {
                            item { EmptyHint("Brak nadchodzących meczów.") }
                        } else {
                            items(upcoming, key = { "u-${it.id}" }) { match ->
                                MatchSignupCard(
                                    match = match,
                                    signupKind = data?.userSignupKind?.get(match.id.toString()),
                                    playersEntry = data?.playersData?.get(match.id.toString()),
                                    compact = true,
                                    onConfirmSignup = {
                                        scope.launch {
                                            try {
                                                ApiClient.api.signup(match.id, SignupRequest("confirmed"))
                                                reload()
                                                onOpenTransport(match.id)
                                            } catch (_: Exception) {
                                            }
                                        }
                                    },
                                    onTentative = {
                                        scope.launch {
                                            try {
                                                ApiClient.api.signup(match.id, SignupRequest("tentative"))
                                                reload()
                                            } catch (_: Exception) {
                                            }
                                        }
                                    },
                                    onDeclined = {
                                        scope.launch {
                                            try {
                                                ApiClient.api.signup(match.id, SignupRequest("declined"))
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
                        }
                    } else {
                        if (archive.isEmpty()) {
                            item { EmptyHint("Brak meczów w archiwum.") }
                        } else {
                            items(archive, key = { "a-${it.id}" }) { match ->
                                MatchSignupCard(
                                    match = match,
                                    signupKind = data?.userSignupKind?.get(match.id.toString()),
                                    playersEntry = data?.playersData?.get(match.id.toString()),
                                    showArchiveBadge = true,
                                    needsStats = match.id in missingStats,
                                    compact = true,
                                    onAddStats = { onOpenStatsForMatch(match.id) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
