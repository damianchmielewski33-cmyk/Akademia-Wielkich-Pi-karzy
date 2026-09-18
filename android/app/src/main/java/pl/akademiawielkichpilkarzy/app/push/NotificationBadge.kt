package pl.akademiawielkichpilkarzy.app.push

import android.content.Context
import androidx.core.app.NotificationManagerCompat
import me.leolin.shortcutbadger.ShortcutBadger

/**
 * Licznik na ikonie aplikacji (ekran główny / szuflada).
 * Samsung / Xiaomi / Huawei: ShortcutBadger + liczba z [NotificationCompat.setNumber].
 * Stock Android: kropka z nieodczytanych powiadomień w kacie (cyfra zależy od launchera).
 */
object NotificationBadge {
    private const val PREFS = "awp_notification_badge"
    private const val KEY_UNREAD = "unread"

    fun increment(context: Context): Int {
        val next = unread(context) + 1
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putInt(KEY_UNREAD, next)
            .apply()
        applyLauncher(context, next)
        return next
    }

    fun unread(context: Context): Int {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt(KEY_UNREAD, 0)
    }

    /** Po otwarciu aplikacji — jak Messenger: ikona bez cyferki. */
    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putInt(KEY_UNREAD, 0)
            .apply()
        runCatching { NotificationManagerCompat.from(context).cancelAll() }
        applyLauncher(context, 0)
    }

    private fun applyLauncher(context: Context, count: Int) {
        runCatching {
            if (count <= 0) {
                ShortcutBadger.removeCount(context)
            } else {
                ShortcutBadger.applyCount(context, count)
            }
        }
    }
}
