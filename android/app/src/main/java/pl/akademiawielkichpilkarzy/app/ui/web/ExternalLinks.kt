package pl.akademiawielkichpilkarzy.app.ui.web

import android.content.ActivityNotFoundException
import android.content.Context
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

/** Siostrzane serwisy — otwierane poza WebView, żeby nie gubić sesji AWP. */
fun isSisterSiteUrl(uri: Uri): Boolean {
    val host = uri.host?.lowercase() ?: return false
    return host == "gym-brat.vercel.app" || host.endsWith(".gym-brat.vercel.app")
}

/** tel/mailto/intent oraz obce https — Custom Tabs lub systemowy handler. */
fun openExternalUri(ctx: Context, uri: Uri): Boolean {
    return try {
        if (uri.scheme.equals("http", true) || uri.scheme.equals("https", true)) {
            CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
                .launchUrl(ctx, uri)
        } else {
            ctx.startActivity(Intent(Intent.ACTION_VIEW, uri))
        }
        true
    } catch (_: ActivityNotFoundException) {
        try {
            ctx.startActivity(Intent(Intent.ACTION_VIEW, uri))
            true
        } catch (_: ActivityNotFoundException) {
            false
        }
    }
}
