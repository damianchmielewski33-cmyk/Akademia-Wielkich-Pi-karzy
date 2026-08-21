package pl.akademiawielkichpilkarzy.app.ui.haptics

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

enum class AwpHaptic {
    Light,
    Success,
    Cheer,
    Goal
}

fun Context.awpVibrate(kind: AwpHaptic = AwpHaptic.Light) {
    val vibrator = resolveVibrator(this) ?: return
    val pattern = when (kind) {
        AwpHaptic.Light -> longArrayOf(0L, 18L)
        AwpHaptic.Success -> longArrayOf(0L, 28L, 40L, 28L)
        AwpHaptic.Cheer -> longArrayOf(0L, 35L, 45L, 35L, 45L, 50L)
        AwpHaptic.Goal -> longArrayOf(0L, 55L, 70L, 55L, 70L, 90L)
    }
    try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (pattern.size == 2) {
                vibrator.vibrate(
                    VibrationEffect.createOneShot(pattern[1], VibrationEffect.DEFAULT_AMPLITUDE)
                )
            } else {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
            }
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(pattern, -1)
        }
    } catch (_: Exception) {
        /* ignore */
    }
}

private fun resolveVibrator(context: Context): Vibrator? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        context.getSystemService(VibratorManager::class.java)?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Vibrator::class.java)
            ?: context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
}
