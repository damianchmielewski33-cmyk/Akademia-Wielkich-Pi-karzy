package pl.akademiawielkichpilkarzy.app

import android.net.Uri

/** Wspólna konfiguracja przejść między AWP a GymBrat (packages/sister-sites). */
object SisterSites {
    const val GYMBRAT_URL = "https://gym-brat.vercel.app"

    /** Pełnoekranowy iframe GymBrat w shellu AWP. */
    const val GYMBRAT_EMBED_PATH = "/gymbrat"

    /** Zdjęcie siłowni na kafelku GymBrat — nie boisko. */
    const val GYMBRAT_GYM_PHOTO =
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=80"

    /**
     * Link do GymBrat z `from=awp`.
     * Gdy jest JWT sesji AWP, dokleja `awp_token` (SSO — top-level WebView nie ma parent postMessage).
     */
    fun gymBratCrossLink(path: String = "/", awpToken: String? = null): String {
        val base = GYMBRAT_URL.trimEnd('/')
        val normalized = if (path.startsWith("/")) path else "/$path"
        val withPath = if (normalized == "/") "$base/" else "$base$normalized"
        val builder =
            Uri.parse(withPath)
                .buildUpon()
                .appendQueryParameter("from", "awp")
        val token = awpToken?.trim().orEmpty()
        if (token.isNotEmpty()) {
            builder.appendQueryParameter("awp_token", token)
        }
        return builder.build().toString()
    }
}
