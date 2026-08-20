package pl.akademiawielkichpilkarzy.app.ui.splash

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
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
import kotlin.math.abs
import kotlin.math.cos
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
 * Ekran startowy Androida: spadające piłki + piłkarz żonglujący piłką.
 * [marketplaceEnabled] = V2 (jasny teal) vs V1 (murawa).
 * Po [minVisibleMs] wywołuje [onFinished] — MainActivity trzyma splash dłużej,
 * aż pierwszy ekran będzie gotowy (animacja zastępuje loadery, nie dodaje kolejki).
 */
@Composable
fun StartupSplashScreen(
    onFinished: () -> Unit,
    marketplaceEnabled: Boolean = false,
    minVisibleMs: Long = 1400L
) {
    LaunchedEffect(Unit) {
        delay(minVisibleMs)
        onFinished()
    }

    val bgBrush =
        if (marketplaceEnabled) {
            Brush.verticalGradient(
                listOf(
                    Color(0xFFF4F5F7),
                    Color(0xFFFFFFFF),
                    Color(0xFFE6FAF7)
                )
            )
        } else {
            Brush.verticalGradient(
                listOf(AwpColors.MurawaDark, AwpColors.PitchDeep, Color(0xFF082018))
            )
        }
    val titleColor = if (marketplaceEnabled) AwpColors.TextOnLight else Color.White
    val mutedColor = if (marketplaceEnabled) AwpColors.Zinc500 else AwpColors.OnPitchMuted
    val kickerColor = if (marketplaceEnabled) AwpColors.MpTealDark else AwpColors.MundialGold

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgBrush)
    ) {
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
                color = titleColor,
                fontWeight = FontWeight.Black,
                fontSize = 20.sp,
                textAlign = TextAlign.Center
            )
            Text(
                text = if (marketplaceEnabled) "Przygotowujemy boiska…" else "Rozgrzewka…",
                color = mutedColor,
                fontSize = 14.sp,
                modifier = Modifier.padding(top = 4.dp)
            )
            Spacer(modifier = Modifier.height(28.dp))
            JugglingPlayerAnimation(
                marketplaceEnabled = marketplaceEnabled,
                modifier = Modifier
                    .width(200.dp)
                    .height(220.dp)
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

/** Stylizowany piłkarz żonglujący piłką (keepy-uppy). */
@Composable
fun JugglingPlayerAnimation(
    modifier: Modifier = Modifier,
    marketplaceEnabled: Boolean = false
) {
    val transition = rememberInfiniteTransition(label = "juggle")
    val t by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 900, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "juggle-t"
    )

    val jersey = remember(marketplaceEnabled) {
        if (marketplaceEnabled) AwpColors.MpTeal else Color(0xFF00A651)
    }
    val shorts = remember(marketplaceEnabled) {
        if (marketplaceEnabled) Color(0xFF171717) else Color(0xFF1A2D5A)
    }
    val skin = remember { Color(0xFFF2C4A0) }
    val outline = remember(marketplaceEnabled) {
        if (marketplaceEnabled) Color(0x33000000) else Color(0xE6FFFFFF)
    }
    val shadowAlpha = if (marketplaceEnabled) 0.12f else 0.22f

    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val cx = w * 0.5f

        // Faza żonglerki: 0→0.5 w górę, 0.5→1 w dół; naprzemienne nogi
        val phase = t
        val ballLift = abs(sin(phase * PI.toFloat()))
        val kickSide = if (phase < 0.5f) -1f else 1f
        val kickBend = sin(phase * PI.toFloat() * 2f).coerceAtLeast(0f)

        val headR = w * 0.09f
        val headY = h * 0.18f
        val torsoTop = headY + headR + h * 0.02f
        val torsoBottom = h * 0.52f
        val hipY = torsoBottom
        val footY = h * 0.88f

        // Cień pod stopami
        drawOval(
            color = Color.Black.copy(alpha = shadowAlpha),
            topLeft = Offset(cx - w * 0.22f, h * 0.92f),
            size = Size(w * 0.44f, h * 0.05f)
        )

        // Tułów
        val torsoPath = Path().apply {
            moveTo(cx - w * 0.11f, torsoTop)
            lineTo(cx + w * 0.11f, torsoTop)
            lineTo(cx + w * 0.13f, torsoBottom)
            lineTo(cx - w * 0.13f, torsoBottom)
            close()
        }
        drawPath(torsoPath, color = jersey)
        drawPath(torsoPath, color = outline, style = Stroke(width = 2.5f))

        // Głowa
        drawCircle(color = skin, radius = headR, center = Offset(cx, headY))
        drawCircle(
            color = outline,
            radius = headR,
            center = Offset(cx, headY),
            style = Stroke(width = 2.5f)
        )
        // Włosy
        drawArc(
            color = Color(0xFF2A1A12),
            startAngle = 200f,
            sweepAngle = 140f,
            useCenter = true,
            topLeft = Offset(cx - headR, headY - headR),
            size = Size(headR * 2f, headR * 2f)
        )

        // Ręce (lekki balans)
        val armSwing = sin(phase * PI.toFloat() * 2f) * w * 0.04f
        drawLine(
            color = skin,
            start = Offset(cx - w * 0.11f, torsoTop + h * 0.06f),
            end = Offset(cx - w * 0.28f, torsoTop + h * 0.22f + armSwing),
            strokeWidth = w * 0.045f,
            cap = StrokeCap.Round
        )
        drawLine(
            color = skin,
            start = Offset(cx + w * 0.11f, torsoTop + h * 0.06f),
            end = Offset(cx + w * 0.28f, torsoTop + h * 0.22f - armSwing),
            strokeWidth = w * 0.045f,
            cap = StrokeCap.Round
        )

        // Spodenki
        drawRect(
            color = shorts,
            topLeft = Offset(cx - w * 0.13f, hipY - h * 0.02f),
            size = Size(w * 0.26f, h * 0.1f)
        )

        // Nogi
        fun drawLeg(side: Float, kicking: Boolean) {
            val hipX = cx + side * w * 0.07f
            val kneeBend = if (kicking) kickBend * h * 0.08f else 0f
            val footLift = if (kicking) kickBend * h * 0.12f else 0f
            val knee = Offset(hipX + side * w * 0.02f, hipY + h * 0.18f - kneeBend)
            val foot = Offset(hipX + side * w * 0.04f, footY - footLift)
            drawLine(
                color = skin,
                start = Offset(hipX, hipY + h * 0.04f),
                end = knee,
                strokeWidth = w * 0.055f,
                cap = StrokeCap.Round
            )
            drawLine(
                color = skin,
                start = knee,
                end = foot,
                strokeWidth = w * 0.05f,
                cap = StrokeCap.Round
            )
            // But
            drawOval(
                color = Color(0xFFE8E8E8),
                topLeft = Offset(foot.x - w * 0.06f, foot.y - h * 0.015f),
                size = Size(w * 0.12f, h * 0.035f)
            )
        }
        drawLeg(-1f, kicking = kickSide < 0f)
        drawLeg(1f, kicking = kickSide > 0f)

        // Piłka żonglowana
        val ballR = w * 0.085f
        val ballBaseY = hipY - h * 0.02f
        val ballY = ballBaseY - ballLift * h * 0.38f
        val ballX = cx + kickSide * w * 0.02f * (1f - ballLift)
        val ballCenter = Offset(ballX, ballY)

        rotate(degrees = phase * 360f, pivot = ballCenter) {
            drawCircle(color = Color.White, radius = ballR, center = ballCenter)
            drawCircle(
                color = Color.Black.copy(alpha = 0.85f),
                radius = ballR,
                center = ballCenter,
                style = Stroke(width = 2f)
            )
            // Panele
            for (i in 0 until 5) {
                val a = i * (2f * PI.toFloat() / 5f)
                val p = Offset(
                    ballCenter.x + cos(a) * ballR * 0.45f,
                    ballCenter.y + sin(a) * ballR * 0.45f
                )
                drawCircle(color = Color(0xFF1A1A1A), radius = ballR * 0.18f, center = p)
            }
        }
    }
}
