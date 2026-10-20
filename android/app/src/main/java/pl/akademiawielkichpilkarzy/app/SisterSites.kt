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

    fun gymBratCrossLink(path: String = "/"): String {
        val base = GYMBRAT_URL.trimEnd('/')
        val normalized = if (path.startsWith("/")) path else "/$path"
        val withPath = if (normalized == "/") "$base/" else "$base$normalized"
        return Uri.parse(withPath)
            .buildUpon()
            .appendQueryParameter("from", "awp")
            .build()
            .toString()
    }
}
