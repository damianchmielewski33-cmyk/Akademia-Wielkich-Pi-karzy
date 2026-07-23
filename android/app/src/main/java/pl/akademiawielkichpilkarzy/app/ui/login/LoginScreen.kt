package pl.akademiawielkichpilkarzy.app.ui.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.AwpApp
import pl.akademiawielkichpilkarzy.app.biometrics.BiometricHelper
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.LoginRequest
import pl.akademiawielkichpilkarzy.app.data.auth.BiometricCredentialsStore
import pl.akademiawielkichpilkarzy.app.push.PushRegistrar
import pl.akademiawielkichpilkarzy.app.ui.common.AwpGoldButton
import pl.akademiawielkichpilkarzy.app.ui.common.AwpPrimaryButton
import pl.akademiawielkichpilkarzy.app.ui.common.LinkTextButton
import pl.akademiawielkichpilkarzy.app.ui.common.MundialHeroBanner
import pl.akademiawielkichpilkarzy.app.ui.common.MurawaBackground
import pl.akademiawielkichpilkarzy.app.ui.common.PitchCard
import pl.akademiawielkichpilkarzy.app.ui.common.PitchLabel
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors
import retrofit2.HttpException

@Composable
fun LoginScreen(
    onLoggedIn: () -> Unit,
    onOpenWeb: (title: String, path: String) -> Unit = { _, _ -> }
) {
    val context = LocalContext.current
    val activity = context as? FragmentActivity
    val biometricStore = AwpApp.instance.biometricStore

    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var rememberMe by remember { mutableStateOf(true) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var loginBanner by remember { mutableStateOf<String?>(null) }
    var biometricsAvailable by remember { mutableStateOf(false) }
    var biometricEnabled by remember { mutableStateOf(false) }
    var offerEnableBiometric by remember { mutableStateOf<BiometricCredentialsStore.Credentials?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        biometricsAvailable = BiometricHelper.canUseBiometrics(context)
        biometricEnabled = biometricStore.isEnabled()
        try {
            val cfg = ApiClient.api.mobileConfig()
            loginBanner = cfg.settings?.loginBanner?.takeIf { it.isNotBlank() }
        } catch (_: Exception) {
        }
        // Auto-prompt biometrii przy starcie, jeśli włączona.
        if (biometricsAvailable && biometricEnabled && activity != null) {
            BiometricHelper.authenticate(
                activity = activity,
                onSuccess = {
                    scope.launch { loginWithBiometrics(biometricStore, onLoggedIn) { error = it } }
                },
                onError = { /* zostaw formularz PIN */ },
                onCancel = {}
            )
        }
    }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = AwpColors.MundialGold,
        unfocusedBorderColor = Color.White.copy(alpha = 0.35f),
        focusedLabelColor = AwpColors.MundialGold,
        unfocusedLabelColor = AwpColors.OnPitchMuted,
        cursorColor = AwpColors.MundialGold,
        focusedTextColor = AwpColors.OnPitch,
        unfocusedTextColor = AwpColors.OnPitch
    )

    fun performPinLogin() {
        scope.launch {
            loading = true
            error = null
            try {
                val res = ApiClient.api.login(
                    LoginRequest(
                        firstName = firstName.trim(),
                        lastName = lastName.trim(),
                        pin = pin.trim(),
                        rememberMe = rememberMe
                    )
                )
                val token = res.token
                val user = res.user
                if (token.isNullOrBlank() || user == null) {
                    error = res.error ?: "Logowanie nie powiodło się"
                } else {
                    AwpApp.instance.sessionStore.saveSession(
                        token = token,
                        userId = user.id,
                        firstName = user.firstName,
                        lastName = user.lastName,
                        zawodnik = user.zawodnik,
                        isAdmin = user.isAdmin == 1
                    )
                    PushRegistrar.registerCurrentToken()
                    val creds = BiometricCredentialsStore.Credentials(
                        firstName = firstName.trim(),
                        lastName = lastName.trim(),
                        pin = pin.trim(),
                        rememberMe = rememberMe
                    )
                    if (biometricsAvailable && !biometricStore.isEnabled()) {
                        offerEnableBiometric = creds
                    } else {
                        if (biometricStore.isEnabled()) {
                            // Odśwież zapisane dane (np. nowy PIN).
                            biometricStore.enable(creds)
                        }
                        onLoggedIn()
                    }
                }
            } catch (e: HttpException) {
                error = try {
                    e.response()?.errorBody()?.string()?.let { raw ->
                        Regex("\"error\"\\s*:\\s*\"([^\"]+)\"").find(raw)?.groupValues?.getOrNull(1)
                    } ?: "Błąd logowania (${e.code()})"
                } catch (_: Exception) {
                    "Błąd logowania (${e.code()})"
                }
            } catch (e: Exception) {
                error = e.message ?: "Brak połączenia z serwerem"
            } finally {
                loading = false
            }
        }
    }

    offerEnableBiometric?.let { creds ->
        AlertDialog(
            onDismissRequest = {
                offerEnableBiometric = null
                onLoggedIn()
            },
            title = { Text("Logowanie biometrią") },
            text = {
                Text(
                    "Ten telefon obsługuje odcisk palca lub rozpoznawanie twarzy. " +
                        "Włączyć szybkie logowanie bez wpisywania PIN-u?"
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        biometricStore.enable(creds)
                        offerEnableBiometric = null
                        onLoggedIn()
                    }
                ) { Text("Włącz") }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        offerEnableBiometric = null
                        onLoggedIn()
                    }
                ) { Text("Nie teraz") }
            }
        )
    }

    MurawaBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.Center
        ) {
            MundialHeroBanner(
                title = "Akademia Wielkich Piłkarzy",
                subtitle = "Zaloguj się PIN-em lub biometrią"
            )
            if (!loginBanner.isNullOrBlank()) {
                Spacer(Modifier.height(10.dp))
                Text(loginBanner!!, color = AwpColors.MundialGold, style = MaterialTheme.typography.bodyMedium)
            }
            Spacer(Modifier.height(16.dp))
            PitchCard {
                PitchLabel("Logowanie")
                Spacer(Modifier.height(12.dp))

                if (biometricsAvailable && biometricEnabled && activity != null) {
                    AwpGoldButton(
                        text = "Zaloguj odciskiem / twarzą",
                        onClick = {
                            error = null
                            BiometricHelper.authenticate(
                                activity = activity,
                                onSuccess = {
                                    scope.launch {
                                        loading = true
                                        try {
                                            loginWithBiometrics(biometricStore, onLoggedIn) { error = it }
                                        } finally {
                                            loading = false
                                        }
                                    }
                                },
                                onError = { error = it },
                                onCancel = {}
                            )
                        }
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "albo PIN",
                        color = AwpColors.OnPitchMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                    Spacer(Modifier.height(8.dp))
                }

                OutlinedTextField(
                    value = firstName,
                    onValueChange = { firstName = it },
                    label = { Text("Imię") },
                    singleLine = true,
                    colors = fieldColors,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = lastName,
                    onValueChange = { lastName = it },
                    label = { Text("Nazwisko") },
                    singleLine = true,
                    colors = fieldColors,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = pin,
                    onValueChange = { if (it.length <= 6 && it.all(Char::isDigit)) pin = it },
                    label = { Text("PIN (4–6 cyfr)") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    colors = fieldColors,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = rememberMe,
                        onCheckedChange = { rememberMe = it },
                        colors = CheckboxDefaults.colors(
                            checkedColor = AwpColors.MundialTeal,
                            uncheckedColor = AwpColors.OnPitchMuted,
                            checkmarkColor = Color.White
                        )
                    )
                    Text("Nie wylogowuj mnie", color = AwpColors.OnPitch)
                }

                if (error != null) {
                    Text(
                        text = error!!,
                        color = AwpColors.MundialRed,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }

                Spacer(Modifier.height(14.dp))
                AwpPrimaryButton(
                    text = "Zaloguj PIN-em",
                    loading = loading,
                    enabled = firstName.isNotBlank() && lastName.isNotBlank() && pin.length in 4..6,
                    onClick = { performPinLogin() }
                )
                LinkTextButton("Załóż konto") { onOpenWeb("Rejestracja", "/register") }
                LinkTextButton("Zapomniałem PIN-u") { onOpenWeb("Logowanie / PIN", "/login") }
            }
        }
    }
}

private suspend fun loginWithBiometrics(
    biometricStore: BiometricCredentialsStore,
    onLoggedIn: () -> Unit,
    onError: (String) -> Unit
) {
    val creds = biometricStore.getCredentials()
    if (creds == null) {
        biometricStore.disable()
        onError("Brak zapisanych danych biometrii — zaloguj się PIN-em")
        return
    }
    try {
        val res = ApiClient.api.login(
            LoginRequest(
                firstName = creds.firstName,
                lastName = creds.lastName,
                pin = creds.pin,
                rememberMe = creds.rememberMe
            )
        )
        val token = res.token
        val user = res.user
        if (token.isNullOrBlank() || user == null) {
            onError(res.error ?: "Logowanie biometrią nie powiodło się")
            return
        }
        AwpApp.instance.sessionStore.saveSession(
            token = token,
            userId = user.id,
            firstName = user.firstName,
            lastName = user.lastName,
            zawodnik = user.zawodnik,
            isAdmin = user.isAdmin == 1
        )
        PushRegistrar.registerCurrentToken()
        onLoggedIn()
    } catch (e: HttpException) {
        val msg = try {
            e.response()?.errorBody()?.string()?.let { raw ->
                Regex("\"error\"\\s*:\\s*\"([^\"]+)\"").find(raw)?.groupValues?.getOrNull(1)
            } ?: "Błąd logowania (${e.code()})"
        } catch (_: Exception) {
            "Błąd logowania (${e.code()})"
        }
        if (e.code() == 401) {
            biometricStore.disable()
            onError("$msg — włącz biometrię ponownie po zalogowaniu PIN-em")
        } else {
            onError(msg)
        }
    } catch (e: Exception) {
        onError(e.message ?: "Brak połączenia z serwerem")
    }
}
