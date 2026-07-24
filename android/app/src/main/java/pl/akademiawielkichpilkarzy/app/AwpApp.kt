package pl.akademiawielkichpilkarzy.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.auth.BiometricCredentialsStore
import pl.akademiawielkichpilkarzy.app.data.auth.SessionStore

class AwpApp : Application() {
    lateinit var sessionStore: SessionStore
        private set
    lateinit var biometricStore: BiometricCredentialsStore
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this
        sessionStore = SessionStore(this)
        biometricStore = BiometricCredentialsStore(this)
        ApiClient.init(sessionStore)
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_MATCHES,
            getString(R.string.channel_matches_name),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = getString(R.string.channel_matches_desc)
            enableVibration(true)
            setShowBadge(true)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        }
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(channel)
    }

    companion object {
        const val CHANNEL_MATCHES = "matches"
        lateinit var instance: AwpApp
            private set
    }
}
