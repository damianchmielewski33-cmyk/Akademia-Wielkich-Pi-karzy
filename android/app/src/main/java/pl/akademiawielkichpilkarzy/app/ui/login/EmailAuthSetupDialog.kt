package pl.akademiawielkichpilkarzy.app.ui.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.EmailAuthCompleteRequest
import pl.akademiawielkichpilkarzy.app.data.api.EmailAuthSendCodeRequest
import pl.akademiawielkichpilkarzy.app.ui.common.AwpTextField
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors
import retrofit2.HttpException

@Composable
fun EmailAuthSetupHost() {
    var visible by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordConfirm by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            val me = ApiClient.api.me().user
            if (me != null && me.needsEmailAuthSetup == 1 && me.needsPinSetup != 1) {
                visible = true
                if (!me.email.isNullOrBlank()) email = me.email
            }
        } catch (_: Exception) {
        }
    }

    if (!visible) return

    AlertDialog(
        onDismissRequest = {},
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false),
        title = { Text("Uzupełnij dane konta") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                Text(
                    "Przy kolejnym logowaniu obowiązuje e-mail, hasło i kod z wiadomości. Okno zniknie dopiero po uzupełnieniu wszystkich pól.",
                    color = AwpColors.Zinc500
                )
                AwpTextField("Adres e-mail", email, { email = it }, keyboardType = KeyboardType.Email, light = true)
                AwpTextField(
                    "Hasło (min. 8 znaków)",
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
                AwpTextField(
                    "Kod z e-maila",
                    code,
                    { if (it.length <= 8 && it.all(Char::isDigit)) code = it },
                    keyboardType = KeyboardType.Number,
                    light = true
                )
                message?.let { Text(it, color = if (it.startsWith("Kod")) AwpColors.MpTealDark else AwpColors.MundialRed) }
            }
        },
        confirmButton = {
            Column(
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                TextButton(
                    onClick = {
                        scope.launch {
                            busy = true
                            message = null
                            try {
                                ApiClient.api.sendEmailAuthCode(EmailAuthSendCodeRequest(email.trim()))
                                message = "Kod został wysłany na e-mail."
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
                    },
                    enabled = !busy && email.isNotBlank()
                ) { Text("Wyślij kod na e-mail") }
                Button(
                    onClick = {
                        scope.launch {
                            busy = true
                            message = null
                            try {
                                ApiClient.api.completeEmailAuth(
                                    EmailAuthCompleteRequest(
                                        email = email.trim(),
                                        password = password,
                                        passwordConfirm = passwordConfirm,
                                        code = code.trim()
                                    )
                                )
                                visible = false
                            } catch (e: HttpException) {
                                message = e.response()?.errorBody()?.string()?.let { raw ->
                                    Regex("\"error\"\\s*:\\s*\"([^\"]+)\"").find(raw)?.groupValues?.getOrNull(1)
                                } ?: "Nie udało się zapisać"
                            } catch (e: Exception) {
                                message = e.message ?: "Nie udało się zapisać"
                            } finally {
                                busy = false
                            }
                        }
                    },
                    enabled = !busy && email.isNotBlank() && password.length >= 8 && password == passwordConfirm && code.length >= 4
                ) { Text(if (busy) "Zapisywanie…" else "Zapisz i wejdź") }
            }
        }
    )
}
