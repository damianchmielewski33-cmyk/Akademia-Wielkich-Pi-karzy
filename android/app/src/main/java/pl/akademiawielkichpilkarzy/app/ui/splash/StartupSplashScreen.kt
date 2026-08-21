package pl.akademiawielkichpilkarzy.app.ui.splash

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import pl.akademiawielkichpilkarzy.app.R
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors
import kotlin.math.PI
import kotlin.math.sin

private data class FallingBallSpec(
    val xFraction: Float,
    val sizeDp: Dp,
    val durationMs: Int,
    val delayMs: Int,
    val driftDp: Float,
    val spinDeg: Float,
    val opacity: Float
)

private val FALLING_BALLS = listOf(
    FallingBallSpec(0.08f, 46.dp, 4200, 0, 18f, 360f, 0.95f),
    FallingBallSpec(0.22f, 34.dp, 5100, 400, -14f, -300f, 0.88f),
    FallingBallSpec(0.38f, 52.dp, 4600, 900, 22f, 280f, 0.94f),
    FallingBallSpec(0.55f, 40.dp, 5400, 200, -20f, -340f, 0.9f),
    FallingBallSpec(0.68f, 58.dp, 4800, 700, 12f, 320f, 0.96f),
    FallingBallSpec(0.82f, 36.dp, 5000, 1100, -16f, -260f, 0.86f),
    FallingBallSpec(0.14f, 30.dp, 5600, 1500, 10f, 220f, 0.8f),
    FallingBallSpec(0.90f, 44.dp, 4400, 500, -24f, 300f, 0.92f)
)

/**
 * Ekran startowy Androida: stadion + fotograficzny piłkarz + spadające piłki.
 *
 * [onFirstFrame] — po pierwszej narysowanej klatce (zwolnij systemowy SplashScreen).
 * [onFinished] — po [minVisibleMs] od tej klatki (nie od startu procesu).
 */
@Composable
fun StartupSplashScreen(
    onFinished: () -> Unit,
    onFirstFrame: () -> Unit = {},
    marketplaceEnabled: Boolean = false,
    minVisibleMs: Long = 2200L
) {
    LaunchedEffect(Unit) {
        // Dwie klatki: layout + pierwsze narysowanie obrazów.
        withFrameNanos { }
        withFrameNanos { }
        onFirstFrame()
        delay(minVisibleMs)
        onFinished()
    }

    val kickerColor = if (marketplaceEnabled) AwpColors.MpTeal else AwpColors.MundialGold
    val scrimBrush =
        if (marketplaceEnabled) {
            Brush.verticalGradient(
                listOf(
                    Color(0x80061C20),
                    Color(0x5208181C),
                    Color(0xC7041016)
                )
            )
        } else {
            Brush.verticalGradient(
                listOf(
                    Color(0x8C040C0A),
                    Color(0x59061410),
                    Color(0xB8040A12)
                )
            )
        }

    Box(
        modifier = Modifier
            .fillMaxSize()
            // Natychmiastowy kolor — zanim JPEG się zdekoduje.
            .background(Color(0xFF061410))
    ) {
        Image(
            painter = painterResource(R.drawable.splash_stadium_bg),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(scrimBrush)
        )

        FallingSoccerBallsLayer(dimmed = false)

        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = if (marketplaceEnabled) "WERSJA V2" else "AKADEMIA",
                color = kickerColor,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp,
                letterSpacing = 2.sp
            )
            Spacer(modifier = Modifier.height(10.dp))
            Image(
                painter = painterResource(R.drawable.app_logo),
                contentDescription = null,
                modifier = Modifier
                    .size(72.dp)
                    .alpha(0.95f),
                contentScale = ContentScale.Fit
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Akademia Wielkich Piłkarzy",
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontSize = 20.sp,
                textAlign = TextAlign.Center
            )
            Text(
                text = if (marketplaceEnabled) "Przygotowujemy boiska…" else "Rozgrzewka…",
                color = Color.White.copy(alpha = 0.85f),
                fontSize = 14.sp,
                modifier = Modifier.padding(top = 4.dp)
            )
            Spacer(modifier = Modifier.height(20.dp))
            PhotographicJuggler(
                modifier = Modifier
                    .width(176.dp)
                    .height(232.dp)
            )
        }
    }
}

@Composable
private fun FallingSoccerBallsLayer(dimmed: Boolean = false) {
    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        FALLING_BALLS.forEachIndexed { index, spec ->
            FallingBallItem(
                index = index,
                spec = spec,
                screenWidth = maxWidth,
                screenHeight = maxHeight,
                opacityScale = if (dimmed) 0.45f else 1f
            )
        }
    }
}

@Composable
private fun FallingBallItem(
    index: Int,
    spec: FallingBallSpec,
    screenWidth: Dp,
    screenHeight: Dp,
    opacityScale: Float = 1f
) {
    val transition = rememberInfiniteTransition(label = "fall-$index")
    val progress by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = spec.durationMs,
                delayMillis = spec.delayMs,
                easing = LinearEasing
            ),
            repeatMode = RepeatMode.Restart
        ),
        label = "fall-p-$index"
    )
    val spin by transition.animateFloat(
        initialValue = 0f,
        targetValue = spec.spinDeg,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = spec.durationMs,
                delayMillis = spec.delayMs,
                easing = LinearEasing
            ),
            repeatMode = RepeatMode.Restart
        ),
        label = "fall-s-$index"
    )

    val drift = sin(progress * PI.toFloat() * 2f) * spec.driftDp
    val x = screenWidth * spec.xFraction - spec.sizeDp / 2 + drift.dp
    val y = -spec.sizeDp + screenHeight * progress + spec.sizeDp * progress

    Image(
        painter = painterResource(R.drawable.trionda_ball),
        contentDescription = null,
        modifier = Modifier
            .offset(x = x, y = y)
            .size(spec.sizeDp)
            .rotate(spin)
            .alpha(spec.opacity * opacityScale),
        contentScale = ContentScale.Fit
    )
}

/** Niemal fotograficzny piłkarz żonglujący — wariant D + lekki float. */
@Composable
fun PhotographicJuggler(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "juggle-photo")
    val floatY by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2400, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "juggle-float"
    )
    val offsetY = (-10f + floatY * 10f).dp

    Image(
        painter = painterResource(R.drawable.splash_juggle_player),
        contentDescription = null,
        modifier = modifier.offset(y = offsetY),
        contentScale = ContentScale.Fit
    )
}
