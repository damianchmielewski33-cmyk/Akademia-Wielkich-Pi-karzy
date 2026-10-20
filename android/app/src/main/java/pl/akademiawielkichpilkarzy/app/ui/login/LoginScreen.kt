package pl.akademiawielkichpilkarzy.app.ui.login

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.AwpApp
import pl.akademiawielkichpilkarzy.app.BuildConfig
import pl.akademiawielkichpilkarzy.app.R
import pl.akademiawielkichpilkarzy.app.biometrics.BiometricHelper
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.ForgotPasswordResetRequest
import pl.akademiawielkichpilkarzy.app.data.api.ForgotPasswordSendCodeRequest
import pl.akademiawielkichpilkarzy.app.data.api.ForgotPinRequest
import pl.akademiawielkichpilkarzy.app.data.api.LoginRequest
import pl.akademiawielkichpilkarzy.app.data.api.RegisterRequest
import pl.akademiawielkichpilkarzy.app.data.api.RegisterVerifyRequest
import pl.akademiawielkichpilkarzy.app.data.api.VenueCardDto
import pl.akademiawielkichpilkarzy.app.data.auth.BiometricCredentialsStore
import pl.akademiawielkichpilkarzy.app.push.PushRegistrar
import pl.akademiawielkichpilkarzy.app.ui.common.AwpTextField
import pl.akademiawielkichpilkarzy.app.ui.haptics.AwpHaptic
import pl.akademiawielkichpilkarzy.app.ui.haptics.awpVibrate
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpTheme
import retrofit2.HttpException

@Composable
fun LoginScreen(
    onLoggedIn: () -> Unit,
    onBrowsePitches: (() -> Unit)? = null,
    onInitialContentReady: (() -> Unit)? = null
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
    var siteName by remember { mutableStateOf("Akademia Wielkich Piłkarzy") }
    var siteDescription by remember { mutableStateOf("Terminarz, składy i społeczność akademii") }
    var emailAuthEnabled by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var legacyPin by remember { mutableStateOf(false) }
    var biometricsAvailable by remember { mutableStateOf(false) }
    var biometricEnabled by remember { mutableStateOf(false) }
    var authMode by remember { mutableStateOf("login") }
    var venues by remember { mutableStateOf<List<VenueCardDto>>(emptyList()) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        onInitialContentReady?.invoke()
        biometricsAvailable = BiometricHelper.canUseBiometrics(context)
        biometricEnabled = biometricStore.isEnabled()
        try {
            val cfg = ApiClient.api.mobileConfig()
            loginBanner = cfg.settings?.loginBanner?.takeIf { it.isNotBlank() }
            siteName = cfg.settings?.siteName?.takeIf { it.isNotBlank() }
                ?: cfg.appSettings?.siteName?.takeIf { it.isNotBlank() }
                ?: siteName
            siteDescription = cfg.settings?.siteDescription?.takeIf { it.isNotBlank() }
                ?: cfg.appSettings?.siteDescription?.takeIf { it.isNotBlank() }
                ?: siteDescription
            emailAuthEnabled = cfg.appSettings?.emailPasswordAuthEnabled == true
        } catch (_: Exception) {
        }
        try {
            venues = ApiClient.api.venues().venues.take(8)
        } catch (_: Exception) {
        }
        // Auto-prompt biometrii przy starcie, jeśli włączona.
        if (biometricsAvailable && biometricEnabled && activity != null && !emailAuthEnabled) {
            BiometricHelper.authenticate(
                activity = activity,
                onSuccess = {
                    scope.launch { loginWithBiometrics(context, biometricStore, onLoggedIn) { error = it } }
                },
                onError = { /* zostaw formularz PIN */ },
                onCancel = {}
            )
        }
    }

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
                    PushRegistrar.enablePush()
                    val creds = BiometricCredentialsStore.Credentials(
                        firstName = firstName.trim(),
                        lastName = lastName.trim(),
                        pin = pin.trim(),
                        rememberMe = rememberMe
                    )
                    if (biometricStore.isEnabled() && !emailAuthEnabled) {
                        // Odśwież zapisane dane (np. nowy PIN), bez pokazywania biometrii po zalogowaniu.
                        biometricStore.enable(creds)
                    }
                    context.awpVibrate(AwpHaptic.Success)
                    onLoggedIn()
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

    fun performEmailLogin() {
        scope.launch {
            loading = true
            error = null
            try {
                val res = ApiClient.api.login(
                    LoginRequest(
                        email = email.trim(),
                        password = password,
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
                    PushRegistrar.enablePush()
                    context.awpVibrate(AwpHaptic.Success)
                    onLoggedIn()
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

    AwpTheme(darkTheme = false) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(AwpColors.PageLight)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .navigationBarsPadding()
                    .verticalScroll(rememberScrollState())
            ) {
            MarketplaceLoginHero(
                siteName = siteName,
                subtitle = siteDescription
            )
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .offset(y = (-28).dp)
                    .padding(horizontal = 16.dp)
                    .padding(bottom = 8.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                if (!loginBanner.isNullOrBlank()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(18.dp))
                            .background(Color.White)
                            .border(1.dp, Color(0xFFE4E4E7), RoundedCornerShape(18.dp))
                            .padding(16.dp)
                    ) {
                        Text(
                            "Komunikat",
                            style = MaterialTheme.typography.labelSmall,
                            color = AwpColors.MpTealDark
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(loginBanner!!, color = AwpColors.TextOnLight, style = MaterialTheme.typography.bodyMedium)
                    }
                }
                when (authMode) {
                    "register" -> RegisterPanel(
                        emailAuthEnabled = emailAuthEnabled,
                        onBack = { authMode = "login" },
                        onSuccess = { authMode = "login" },
                        onLoggedIn = onLoggedIn
                    )
                    "forgot" -> ForgotPinPanel(
                        onBack = { authMode = "login" },
                        onSuccess = { authMode = "login" }
                    )
                    "forgot-password" -> ForgotPasswordPanel(
                        initialEmail = email,
                        onBack = { authMode = "login" },
                        onSuccess = { authMode = "login" }
                    )
                    else -> MarketplaceAuthCard(
                        title = "Logowanie",
                        subtitle = if (emailAuthEnabled && !legacyPin) {
                            "Wejście akademii — e-mail i hasło."
                        } else {
                            "Rezerwacja boiska bez PIN-u albo wejście akademii."
                        }
                    ) {
                        if (onBrowsePitches != null) {
                            MarketplacePrimaryButton(
                                text = "Rezerwuj boisko bez PIN-u",
                                loading = false,
                                enabled = true
                            ) { onBrowsePitches() }
                            Text(
                                if (emailAuthEnabled && !legacyPin) "albo akademia — e-mail i hasło" else "albo akademia — imię, nazwisko i PIN",
                                color = AwpColors.Zinc500,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            )
                        }
                        if (biometricsAvailable && biometricEnabled && activity != null && (!emailAuthEnabled || legacyPin)) {
                            MarketplacePrimaryButton("Zaloguj odciskiem / twarzą") {
                                error = null
                                BiometricHelper.authenticate(
                                    activity = activity,
                                    onSuccess = {
                                        scope.launch {
                                            loading = true
                                            try {
                                                loginWithBiometrics(context, biometricStore, onLoggedIn) { error = it }
                                            } finally {
                                                loading = false
                                            }
                                        }
                                    },
                                    onError = { error = it },
                                    onCancel = {}
                                )
                            }
                            Text(
                                "albo PIN",
                                color = AwpColors.Zinc500,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            )
                        }

                        if (emailAuthEnabled && !legacyPin) {
                            AwpTextField("E-mail", email, { email = it }, keyboardType = KeyboardType.Email, light = true)
                            AwpTextField(
                                "Hasło",
                                password,
                                { password = it },
                                visualTransformation = PasswordVisualTransformation(),
                                light = true
                            )
                        } else {
                        AwpTextField("Imię", firstName, { firstName = it }, light = true)
                        AwpTextField("Nazwisko", lastName, { lastName = it }, light = true)
                        AwpTextField(
                            label = "PIN (4–6 cyfr)",
                            value = pin,
                            onValueChange = { if (it.length <= 6 && it.all(Char::isDigit)) pin = it },
                            keyboardType = KeyboardType.NumberPassword,
                            visualTransformation = PasswordVisualTransformation(),
                            light = true
                        )
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = rememberMe,
                                onCheckedChange = { rememberMe = it },
                                colors = CheckboxDefaults.colors(
                                    checkedColor = AwpColors.MpTeal,
                                    uncheckedColor = AwpColors.Zinc400,
                                    checkmarkColor = Color.White
                                )
                            )
                            Text("Nie wylogowuj mnie", color = AwpColors.TextOnLight)
                        }

                        if (error != null) {
                            Text(
                                text = error!!,
                                color = AwpColors.MundialRed,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }

                        MarketplacePrimaryButton(
                            text = if (emailAuthEnabled && !legacyPin) "Zaloguj się" else "Zaloguj PIN-em",
                            loading = loading,
                            enabled = if (emailAuthEnabled && !legacyPin) {
                                email.isNotBlank() && password.isNotBlank()
                            } else {
                                firstName.isNotBlank() && lastName.isNotBlank() && pin.length in 4..6
                            }
                        ) {
                            if (emailAuthEnabled && !legacyPin) performEmailLogin() else performPinLogin()
                        }
                        if (emailAuthEnabled) {
                            MarketplaceLink(if (legacyPin) "Logowanie e-mailem i hasłem" else "Nie mam e-maila i hasła — logowanie PIN-em") {
                                legacyPin = !legacyPin
                            }
                        }
                        MarketplaceLink("Załóż konto akademii") { authMode = "register" }
                        if (emailAuthEnabled && !legacyPin) {
                            MarketplaceLink("Zapomniałem hasła") { authMode = "forgot-password" }
                        }
                        if (!emailAuthEnabled || legacyPin) {
                            MarketplaceLink("Zapomniałem PIN-u") { authMode = "forgot" }
                        }
                    }
                }
            }
            MarketplaceVenueStrip(venues = venues)
            Spacer(Modifier.height(24.dp))
        }
        }
    }
}

@Composable
private fun RegisterPanel(
    emailAuthEnabled: Boolean,
    onBack: () -> Unit,
    onSuccess: () -> Unit,
    onLoggedIn: () -> Unit
) {
    var first by remember { mutableStateOf("") }
    var last by remember { mutableStateOf("") }
    var alias by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var pinConfirm by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordConfirm by remember { mutableStateOf("") }
    var pendingEmail by remember { mutableStateOf<String?>(null) }
    var code by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    if (pendingEmail != null) {
        MarketplaceAuthCard(title = "Kod z e-maila", subtitle = "Wpisz kod wysłany na $pendingEmail.") {
            AwpTextField(
                "Kod uwierzytelniający",
                code,
                { if (it.length <= 8 && it.all(Char::isDigit)) code = it },
                keyboardType = KeyboardType.Number,
                light = true
            )
            message?.let { Text(it, color = AwpColors.MundialRed) }
            MarketplacePrimaryButton("Potwierdź kod", loading = busy, enabled = !busy && code.length >= 4) {
                scope.launch {
                    busy = true
                    message = null
                    try {
                        val res = ApiClient.api.registerVerify(
                            RegisterVerifyRequest(email = pendingEmail!!, code = code.trim())
                        )
                        if (res.error != null) {
                            message = res.error
                        } else {
                            val token = res.token
                            val user = res.user
                            if (!token.isNullOrBlank() && user != null) {
                                AwpApp.instance.sessionStore.saveSession(
                                    token = token,
                                    userId = user.id,
                                    firstName = user.firstName,
                                    lastName = user.lastName,
                                    zawodnik = user.zawodnik,
                                    isAdmin = user.isAdmin == 1
                                )
                                PushRegistrar.enablePush()
                                context.awpVibrate(AwpHaptic.Success)
                                onLoggedIn()
                            } else {
                                message = "Konto potwierdzone — zaloguj się"
                                onSuccess()
                            }
                        }
                    } catch (e: Exception) {
                        message = e.message ?: "Nie udało się potwierdzić kodu"
                    } finally {
                        busy = false
                    }
                }
            }
            MarketplaceLink("Wróć do logowania", onBack)
        }
        return
    }

    MarketplaceAuthCard(
        title = "Rejestracja",
        subtitle = if (emailAuthEnabled) {
            "Utwórz konto e-mailem i hasłem. Kod z wiadomości wpiszesz w następnym kroku."
        } else {
            "Utwórz konto zawodnika bez otwierania strony WWW."
        }
    ) {
        AwpTextField("Imię", first, { first = it }, light = true)
        AwpTextField("Nazwisko", last, { last = it }, light = true)
        AwpTextField("Pseudonim piłkarza", alias, { alias = it }, light = true)
        if (emailAuthEnabled) {
            AwpTextField("E-mail", email, { email = it }, keyboardType = KeyboardType.Email, light = true)
            AwpTextField("Hasło", password, { password = it }, visualTransformation = PasswordVisualTransformation(), light = true)
            AwpTextField("Powtórz hasło", passwordConfirm, { passwordConfirm = it }, visualTransformation = PasswordVisualTransformation(), light = true)
        } else {
            AwpTextField("PIN", pin, { if (it.length <= 6 && it.all(Char::isDigit)) pin = it }, keyboardType = KeyboardType.NumberPassword, visualTransformation = PasswordVisualTransformation(), light = true)
            AwpTextField("Powtórz PIN", pinConfirm, { if (it.length <= 6 && it.all(Char::isDigit)) pinConfirm = it }, keyboardType = KeyboardType.NumberPassword, visualTransformation = PasswordVisualTransformation(), light = true)
        }
        message?.let { Text(it, color = if (it.startsWith("Konto") || it.startsWith("Kod")) AwpColors.MpTealDark else AwpColors.MundialRed) }
        val canSubmit = if (emailAuthEnabled) {
            first.isNotBlank() && last.isNotBlank() && alias.isNotBlank() && email.isNotBlank() && password.length >= 8 && password == passwordConfirm
        } else {
            first.isNotBlank() && last.isNotBlank() && alias.isNotBlank() && pin.length in 4..6 && pin == pinConfirm
        }
        MarketplacePrimaryButton("Utwórz konto", loading = busy, enabled = !busy && canSubmit) {
            scope.launch {
                busy = true
                message = null
                try {
                    val res = if (emailAuthEnabled) {
                        ApiClient.api.register(
                            RegisterRequest(
                                firstName = first,
                                lastName = last,
                                zawodnik = alias,
                                email = email.trim(),
                                password = password,
                                passwordConfirm = passwordConfirm
                            )
                        )
                    } else {
                        ApiClient.api.register(RegisterRequest(first, last, alias, pin, pinConfirm))
                    }
                    if (res.error != null) {
                        message = res.error
                    } else if (res.needsVerification == true) {
                        pendingEmail = res.email ?: email.trim()
                        message = "Kod został wysłany na e-mail."
                    } else {
                        message = "Konto utworzone — zaloguj się PIN-em"
                        onSuccess()
                    }
                } catch (e: Exception) {
                    message = e.message ?: "Nie udało się utworzyć konta"
                } finally {
                    busy = false
                }
            }
        }
        MarketplaceLink("Wróć do logowania", onBack)
    }
}

@Composable
private fun ForgotPasswordPanel(
    initialEmail: String,
    onBack: () -> Unit,
    onSuccess: () -> Unit
) {
    var email by remember { mutableStateOf(initialEmail) }
    var code by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordConfirm by remember { mutableStateOf("") }
    var codeSent by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    MarketplaceAuthCard(
        title = "Reset hasła",
        subtitle = "Wyślij kod na e-mail, potem ustaw nowe hasło."
    ) {
        AwpTextField("E-mail", email, { email = it }, keyboardType = KeyboardType.Email, light = true)
        AwpTextField(
            "Kod z e-maila",
            code,
            { if (it.length <= 8 && it.all(Char::isDigit)) code = it },
            keyboardType = KeyboardType.Number,
            light = true
        )
        AwpTextField(
            "Nowe hasło (min. 8 znaków)",
            password,
            { password = it },
            visualTransformation = PasswordVisualTransformation(),
            light = true
        )
        AwpTextField(
            "Powtórz hasło",
            passwordConfirm,
            { passwordConfirm = it },
            visualTransformation = PasswordVisualTransformation(),
            light = true
        )
        message?.let {
            Text(
                it,
                color = if (it.startsWith("Jeśli") || it.startsWith("Hasło")) AwpColors.MpTealDark else AwpColors.MundialRed
            )
        }
        MarketplacePrimaryButton(
            text = if (codeSent) "Wyślij kod ponownie" else "Wyślij kod",
            loading = busy,
            enabled = !busy && email.isNotBlank()
        ) {
            scope.launch {
                busy = true
                message = null
                try {
                    ApiClient.api.forgotPasswordSendCode(ForgotPasswordSendCodeRequest(email.trim()))
                    codeSent = true
                    message = "Jeśli konto istnieje, wysłaliśmy kod na e-mail."
                } catch (e: HttpException) {
                    message = e.response()?.errorBody()?.string()?.let { raw ->
                        Regex("\"error\"\\s*:\\s*\"([^\"]+)\"").find(raw)?.groupValues?.getOrNull(1)
                    } ?: "Nie udało się wysłać kodu"
                } catch (e: Exception) {
                    message = e.message ?: "Nie udało się wysłać kodu"
                } finally {
                    busy = false
                }
            }
        }
        MarketplacePrimaryButton(
            text = "Ustaw nowe hasło",
            loading = busy,
            enabled = !busy && email.isNotBlank() && code.length >= 4 && password.length >= 8 && password == passwordConfirm
        ) {
            scope.launch {
                busy = true
                message = null
                try {
                    ApiClient.api.forgotPasswordReset(
                        ForgotPasswordResetRequest(
                            email = email.trim(),
                            code = code.trim(),
                            password = password,
                            passwordConfirm = passwordConfirm
                        )
                    )
                    message = "Hasło zmienione — zaloguj się nowym hasłem"
                    onSuccess()
                } catch (e: HttpException) {
                    message = e.response()?.errorBody()?.string()?.let { raw ->
                        Regex("\"error\"\\s*:\\s*\"([^\"]+)\"").find(raw)?.groupValues?.getOrNull(1)
                    } ?: "Nie udało się zmienić hasła"
                } catch (e: Exception) {
                    message = e.message ?: "Nie udało się zmienić hasła"
                } finally {
                    busy = false
                }
            }
        }
        MarketplaceLink("Wróć do logowania", onBack)
    }
}

@Composable
private fun ForgotPinPanel(onBack: () -> Unit, onSuccess: () -> Unit) {
    var first by remember { mutableStateOf("") }
    var last by remember { mutableStateOf("") }
    var alias by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var pinConfirm by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    MarketplaceAuthCard(title = "Nowy PIN", subtitle = "Zgłoszenie trafi do zatwierdzenia przez administratora.") {
        AwpTextField("Imię", first, { first = it }, light = true)
        AwpTextField("Nazwisko", last, { last = it }, light = true)
        AwpTextField("Pseudonim piłkarza", alias, { alias = it }, light = true)
        AwpTextField("Nowy PIN", pin, { if (it.length <= 6 && it.all(Char::isDigit)) pin = it }, keyboardType = KeyboardType.NumberPassword, visualTransformation = PasswordVisualTransformation(), light = true)
        AwpTextField("Powtórz PIN", pinConfirm, { if (it.length <= 6 && it.all(Char::isDigit)) pinConfirm = it }, keyboardType = KeyboardType.NumberPassword, visualTransformation = PasswordVisualTransformation(), light = true)
        message?.let { Text(it, color = if (it.startsWith("Zgłoszenie")) AwpColors.MpTealDark else AwpColors.MundialRed) }
        MarketplacePrimaryButton("Wyślij prośbę", loading = busy, enabled = !busy && first.isNotBlank() && last.isNotBlank() && alias.isNotBlank() && pin.length in 4..6 && pin == pinConfirm) {
            scope.launch {
                busy = true
                message = null
                try {
                    val res = ApiClient.api.forgotPin(ForgotPinRequest(first, last, alias, pin, pinConfirm))
                    if (res.error != null) {
                        message = res.error
                    } else {
                        message = "Zgłoszenie wysłane — poczekaj na akceptację admina"
                        onSuccess()
                    }
                } catch (e: Exception) {
                    message = e.message ?: "Nie udało się wysłać prośby"
                } finally {
                    busy = false
                }
            }
        }
        MarketplaceLink("Wróć do logowania", onBack)
    }
}

@Composable
private fun MarketplaceLoginHero(siteName: String, subtitle: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(280.dp)
    ) {
        Image(
            painter = painterResource(id = R.drawable.stadium_hero),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color(0x33081018),
                            Color(0x99081018),
                            Color(0xE6081018)
                        )
                    )
                )
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 20.dp)
                .padding(bottom = 44.dp)
        ) {
            Text(
                "REZERWACJA BOISK",
                style = MaterialTheme.typography.labelSmall,
                color = Color.White.copy(alpha = 0.8f),
                fontWeight = FontWeight.Black
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Zarezerwuj boisko",
                style = MaterialTheme.typography.displayLarge,
                color = Color.White
            )
            Spacer(Modifier.height(6.dp))
            Text(
                subtitle.ifBlank { siteName },
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.85f)
            )
        }
    }
}

@Composable
private fun MarketplaceVenueStrip(venues: List<VenueCardDto>) {
    val cards = venues.ifEmpty { fallbackVenueCards() }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .offset(y = (-12).dp)
    ) {
        Column(modifier = Modifier.padding(horizontal = 20.dp)) {
            Text(
                "OBIEKTY",
                style = MaterialTheme.typography.labelSmall,
                color = AwpColors.MpTealDark,
                fontWeight = FontWeight.Bold
            )
            Text(
                "Wybierz boisko i zarezerwuj",
                style = MaterialTheme.typography.headlineMedium,
                color = AwpColors.TextOnLight
            )
        }
        Spacer(Modifier.height(12.dp))
        Row(
            modifier = Modifier
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            cards.forEach { venue ->
                MarketplaceVenueThumb(venue)
            }
        }
        Spacer(Modifier.height(8.dp))
    }
}

private fun fallbackVenueCards(): List<VenueCardDto> = listOf(
    VenueCardDto(name = "Boiska halowe", city = "Hala", address = "Kryte obiekty na każdą pogodę"),
    VenueCardDto(name = "Boiska otwarte", city = "Orlik", address = "Orliki i nawierzchnie zewnętrzne"),
    VenueCardDto(name = "Sztuczna trawa", city = "Trawa", address = "Piłka nożna na tartanie i orliku")
)

@Composable
private fun MarketplaceVenueThumb(venue: VenueCardDto) {
    val photo = absoluteMediaUrl(venue.photoUrl)
    Column(
        modifier = Modifier
            .width(220.dp)
            .shadow(10.dp, RoundedCornerShape(20.dp), clip = false)
            .clip(RoundedCornerShape(20.dp))
            .background(Color.White)
            .border(1.dp, Color(0xFFE4E4E7), RoundedCornerShape(20.dp))
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(132.dp)
                .background(Color(0xFF0B1C18))
        ) {
            if (photo != null) {
                AsyncImage(
                    model = photo,
                    contentDescription = venue.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                Image(
                    painter = painterResource(id = R.drawable.stadium_hero),
                    contentDescription = venue.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }
            Text(
                venue.city,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(10.dp)
                    .clip(RoundedCornerShape(50))
                    .background(Color.White.copy(alpha = 0.95f))
                    .padding(horizontal = 10.dp, vertical = 4.dp),
                style = MaterialTheme.typography.labelSmall,
                color = AwpColors.TextOnLight,
                fontWeight = FontWeight.Black
            )
        }
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                venue.name,
                style = MaterialTheme.typography.titleMedium,
                color = AwpColors.TextOnLight,
                maxLines = 2
            )
            Text(
                venue.address,
                style = MaterialTheme.typography.bodySmall,
                color = AwpColors.Zinc500,
                maxLines = 1
            )
            val price = venue.minPricePln
            Text(
                if (price != null) "od ${price.toInt()} zł / godz." else "Cennik wkrótce",
                style = MaterialTheme.typography.titleMedium,
                color = AwpColors.MpTealDark,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun MarketplaceAuthCard(
    title: String,
    subtitle: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(18.dp, RoundedCornerShape(28.dp), clip = false)
            .clip(RoundedCornerShape(28.dp))
            .background(Color.White)
            .border(1.dp, Color(0xFFE4E4E7), RoundedCornerShape(28.dp))
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            title.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = AwpColors.MpTealDark,
            fontWeight = FontWeight.Bold
        )
        Text(subtitle, style = MaterialTheme.typography.bodySmall, color = AwpColors.Zinc500)
        content()
    }
}

@Composable
private fun MarketplacePrimaryButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier.fillMaxWidth().height(52.dp),
        shape = RoundedCornerShape(50),
        colors = ButtonDefaults.buttonColors(
            containerColor = AwpColors.MpTeal,
            contentColor = Color.White,
            disabledContainerColor = AwpColors.MpTeal.copy(alpha = 0.4f)
        )
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text(text, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun MarketplaceLink(text: String, onClick: () -> Unit) {
    TextButton(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Text(text, color = AwpColors.MpTealDark, fontWeight = FontWeight.SemiBold)
    }
}

private fun absoluteMediaUrl(raw: String?): String? {
    val value = raw?.trim().orEmpty()
    if (value.isEmpty()) return null
    if (value.startsWith("http://") || value.startsWith("https://")) return value
    val base = BuildConfig.API_BASE_URL.trim().trimEnd('/')
    return base + if (value.startsWith("/")) value else "/$value"
}

private suspend fun loginWithBiometrics(
    context: android.content.Context,
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
        PushRegistrar.enablePush()
        context.awpVibrate(AwpHaptic.Success)
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
