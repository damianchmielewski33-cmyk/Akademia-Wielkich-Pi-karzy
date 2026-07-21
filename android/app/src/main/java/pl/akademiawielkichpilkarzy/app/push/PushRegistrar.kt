package pl.akademiawielkichpilkarzy.app.push

/**
 * Stub bez Firebase — push wróci po podpięciu prawdziwego google-services.json.
 * Na razie no-op, żeby APK dało się zainstalować na telefonach OEM.
 */
object PushRegistrar {
    fun hasNotificationPermission(): Boolean = false

    suspend fun registerCurrentToken() {
        // no-op
    }

    suspend fun enablePush() {
        // no-op
    }

    suspend fun unregisterAndRevokeConsent() {
        // no-op
    }
}
