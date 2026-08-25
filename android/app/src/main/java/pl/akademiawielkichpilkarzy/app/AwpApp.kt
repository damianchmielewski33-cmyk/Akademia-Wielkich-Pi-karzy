package pl.akademiawielkichpilkarzy.app

import android.app.Activity
import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import pl.akademiawielkichpilkarzy.app.data.AppConfigStore
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.auth.BiometricCredentialsStore
import pl.akademiawielkichpilkarzy.app.data.auth.SessionStore

class AwpApp : Application() {
    lateinit var sessionStore: SessionStore
        private set
    lateinit var biometricStore: BiometricCredentialsStore
        private set
    lateinit var appConfigStore: AppConfigStore
        private set

    @Volatile
    var startedActivities: Int = 0
        private set

    val isInForeground: Boolean
        get() = startedActivities > 0

    override fun onCreate() {
        super.onCreate()
        instance = this
        sessionStore = SessionStore(this)
        biometricStore = BiometricCredentialsStore(this)
        appConfigStore = AppConfigStore(this)
        ApiClient.init(sessionStore)
        createNotificationChannels()
        registerActivityLifecycleCallbacks(
            object : ActivityLifecycleCallbacks {
                override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
                override fun onActivityStarted(activity: Activity) {
                    startedActivities++
                }
                override fun onActivityResumed(activity: Activity) {}
                override fun onActivityPaused(activity: Activity) {}
                override fun onActivityStopped(activity: Activity) {
                    startedActivities = (startedActivities - 1).coerceAtLeast(0)
                }
                override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
                override fun onActivityDestroyed(activity: Activity) {}
            }
        )
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
