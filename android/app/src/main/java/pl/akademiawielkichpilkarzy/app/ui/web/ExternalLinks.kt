package pl.akademiawielkichpilkarzy.app.ui.web

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent

/** Czy URL należy do tej samej witryny co WebView aplikacji (nie GymBrat / HotPay itd.). */
fun isAwpSiteUrl(uri: Uri, siteBase: String): Boolean {
    val siteHost =
        runCatching { Uri.parse(siteBase.trim()).host?.lowercase() }.getOrNull() ?: return false
    val host = uri.host?.lowercase() ?: return false
    return host == siteHost || host.endsWith(".$siteHost")
}

private fun Context.findActivity(): Activity? {
    var current: Context? = this
    while (current is ContextWrapper) {
        if (current is Activity) return current
        current = current.baseContext
    }
    return null
}

/** tel/mailto/intent oraz obce https — Custom Tabs lub systemowy handler. */
fun openExternalUri(ctx: Context, uri: Uri): Boolean {
    val activity = ctx.findActivity()
    val launchCtx = activity ?: ctx

    fun viewIntent(): Intent =
        Intent(Intent.ACTION_VIEW, uri).apply {
            if (activity == null) addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

    return try {
        if (uri.scheme.equals("http", true) || uri.scheme.equals("https", true)) {
            val tabs =
                CustomTabsIntent.Builder()
                    .setShowTitle(true)
                    .build()
            if (activity == null) {
                tabs.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            tabs.launchUrl(launchCtx, uri)
        } else {
            launchCtx.startActivity(viewIntent())
        }
        true
    } catch (_: Exception) {
        try {
            launchCtx.startActivity(viewIntent())
            true
        } catch (_: Exception) {
            false
        }
    }
}
