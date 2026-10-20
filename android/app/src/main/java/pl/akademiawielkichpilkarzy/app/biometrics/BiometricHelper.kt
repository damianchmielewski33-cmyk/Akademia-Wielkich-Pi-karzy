package pl.akademiawielkichpilkarzy.app.biometrics

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

object BiometricHelper {
    private const val ALLOWED = Authenticators.BIOMETRIC_STRONG or Authenticators.BIOMETRIC_WEAK

    fun canUseBiometrics(context: Context): Boolean {
        val manager = BiometricManager.from(context)
        return when (manager.canAuthenticate(ALLOWED)) {
            BiometricManager.BIOMETRIC_SUCCESS -> true
            else -> false
        }
    }

    fun statusLabel(context: Context): String {
        return when (BiometricManager.from(context).canAuthenticate(ALLOWED)) {
            BiometricManager.BIOMETRIC_SUCCESS -> "Dostępna"
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ->
                "Brak odcisku / twarzy w ustawieniach telefonu"
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE,
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE ->
                "Telefon nie obsługuje biometrii"
            else -> "Niedostępna"
        }
    }

    fun authenticate(
        activity: FragmentActivity,
        title: String = "Logowanie biometrią",
        subtitle: String = "Potwierdź tożsamość, aby wejść do Akademii",
        negativeButton: String = "Anuluj",
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
        onCancel: () -> Unit = {}
    ) {
        if (!canUseBiometrics(activity)) {
            onError(statusLabel(activity))
            return
        }
        val executor = ContextCompat.getMainExecutor(activity)
        val prompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    onSuccess()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    if (errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                        errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                        errorCode == BiometricPrompt.ERROR_CANCELED
                    ) {
                        onCancel()
                    } else {
                        onError(errString.toString())
                    }
                }

                override fun onAuthenticationFailed() {
                    // Pozostaw prompt otwarty — użytkownik może spróbować ponownie.
                }
            }
        )
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setNegativeButtonText(negativeButton)
            .setAllowedAuthenticators(ALLOWED)
            .build()
        prompt.authenticate(info)
    }
}
