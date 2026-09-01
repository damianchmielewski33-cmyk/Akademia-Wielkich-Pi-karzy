package pl.akademiawielkichpilkarzy.app.ui.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.R
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

private val SplashEaseOut = CubicBezierEasing(0.16f, 1f, 0.3f, 1f)
private val KenBurnsEase = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)

/**
 * Ekran startowy Androida — logo w ramce, bez etykiet wersji.
 * Trwa, dopóki rodzic nie schowa composable (pierwszy ekran gotowy).
 */
@Composable
fun StartupSplashScreen(
    onFirstFrame: () -> Unit = {}
) {
    val bgScale = remember { Animatable(1.06f) }
    val panelAlpha = remember { Animatable(0f) }
    val panelScale = remember { Animatable(0.94f) }
    val logoAlpha = remember { Animatable(0f) }
    val logoScale = remember { Animatable(0.88f) }
    val textAlpha = remember { Animatable(0f) }
    val textY = remember { Animatable(12f) }

    LaunchedEffect(Unit) {
        withFrameNanos { }
        withFrameNanos { }
        onFirstFrame()

        launch {
            bgScale.animateTo(1f, tween(durationMillis = 2400, easing = KenBurnsEase))
        }
        launch {
            panelAlpha.animateTo(1f, tween(durationMillis = 520, easing = FastOutSlowInEasing))
            panelScale.animateTo(1f, tween(durationMillis = 640, easing = SplashEaseOut))
        }
        launch {
            logoAlpha.animateTo(1f, tween(durationMillis = 560, easing = FastOutSlowInEasing, delayMillis = 80))
            logoScale.animateTo(1f, tween(durationMillis = 680, easing = SplashEaseOut, delayMillis = 80))
        }
        launch {
            textAlpha.animateTo(1f, tween(durationMillis = 520, easing = FastOutSlowInEasing, delayMillis = 180))
            textY.animateTo(0f, tween(durationMillis = 520, easing = SplashEaseOut, delayMillis = 180))
        }
    }

    val accent = AwpColors.MpTeal
    val baseColor = Color(0xFF061820)
    val scrimBrush =
        Brush.verticalGradient(
            listOf(
                Color(0xCC061820),
                Color(0x99081820),
                Color(0xE6041018)
            )
        )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(baseColor)
    ) {
        Image(
            painter = painterResource(R.drawable.splash_stadium_bg),
            contentDescription = null,
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer {
                    scaleX = bgScale.value
                    scaleY = bgScale.value
                },
            contentScale = ContentScale.Crop,
            alignment = Alignment.Center
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(scrimBrush)
        )

        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = 32.dp)
                .graphicsLayer {
                    alpha = panelAlpha.value
                    scaleX = panelScale.value
                    scaleY = panelScale.value
                },
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(152.dp)
                    .clip(RoundedCornerShape(28.dp))
                    .background(Color.White.copy(alpha = 0.1f))
                    .border(1.dp, Color.White.copy(alpha = 0.18f), RoundedCornerShape(28.dp))
                    .padding(18.dp)
            ) {
                Image(
                    painter = painterResource(R.drawable.splash_crest),
                    contentDescription = null,
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            alpha = logoAlpha.value
                            scaleX = logoScale.value
                            scaleY = logoScale.value
                        },
                    contentScale = ContentScale.Fit
                )
            }

            Spacer(modifier = Modifier.height(22.dp))

            Text(
                text = "Akademia Wielkich Piłkarzy",
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontSize = 22.sp,
                textAlign = TextAlign.Center,
                lineHeight = 28.sp,
                modifier = Modifier.graphicsLayer {
                    alpha = textAlpha.value
                    translationY = textY.value
                }
            )

            Text(
                text = "Przygotowujemy boiska…",
                color = Color.White.copy(alpha = 0.74f),
                fontSize = 14.sp,
                letterSpacing = 0.2.sp,
                modifier = Modifier
                    .padding(top = 8.dp)
                    .graphicsLayer {
                        alpha = textAlpha.value
                        translationY = textY.value
                    }
            )

            Spacer(modifier = Modifier.height(26.dp))

            SplashLoadingDots(
                accent = accent,
                alpha = textAlpha.value
            )
        }
    }
}

@Composable
private fun SplashLoadingDots(accent: Color, alpha: Float) {
    val transition = rememberInfiniteTransition(label = "splash-dots")
    val dot1 = transition.animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(720, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dot1"
    )
    val dot2 = transition.animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(720, easing = FastOutSlowInEasing, delayMillis = 120),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dot2"
    )
    val dot3 = transition.animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(720, easing = FastOutSlowInEasing, delayMillis = 240),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dot3"
    )

    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.graphicsLayer { this.alpha = alpha }
    ) {
        listOf(dot1.value, dot2.value, dot3.value).forEach { scale ->
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                    }
                    .clip(CircleShape)
                    .background(accent)
            )
        }
    }
}
