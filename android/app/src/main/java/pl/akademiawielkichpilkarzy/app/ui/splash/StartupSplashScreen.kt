package pl.akademiawielkichpilkarzy.app.ui.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import pl.akademiawielkichpilkarzy.app.R
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

private val SplashEaseOut = CubicBezierEasing(0.16f, 1f, 0.3f, 1f)
private val KenBurnsEase = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)

/**
 * Ekran startowy Androida. Trwa, dopóki rodzic nie schowa composable
 * (pierwszy prawdziwy ekran gotowy) — bez sztucznego minimalnego czasu.
 *
 * [onFirstFrame] — po pierwszej narysowanej klatce (zwolnij systemowy SplashScreen).
 */
@Composable
fun StartupSplashScreen(
    onFirstFrame: () -> Unit = {},
    marketplaceEnabled: Boolean = false
) {
    val bgScale = remember { Animatable(1.08f) }
    val kickerAlpha = remember { Animatable(0f) }
    val kickerY = remember { Animatable(14f) }
    val crestAlpha = remember { Animatable(0f) }
    val crestScale = remember { Animatable(0.86f) }
    val titleAlpha = remember { Animatable(0f) }
    val titleY = remember { Animatable(16f) }
    val subtitleAlpha = remember { Animatable(0f) }
    val progress = remember { Animatable(0.12f) }

    LaunchedEffect(Unit) {
        withFrameNanos { }
        withFrameNanos { }
        onFirstFrame()

        launch {
            bgScale.animateTo(1f, tween(durationMillis = 2200, easing = KenBurnsEase))
        }
        launch {
            kickerAlpha.animateTo(1f, tween(durationMillis = 480, easing = FastOutSlowInEasing))
        }
        launch {
            kickerY.animateTo(0f, tween(durationMillis = 480, easing = SplashEaseOut))
        }
        launch {
            delay(60)
            launch {
                crestAlpha.animateTo(1f, tween(durationMillis = 520, easing = FastOutSlowInEasing))
            }
            crestScale.animateTo(1f, tween(durationMillis = 640, easing = SplashEaseOut))
        }
        launch {
            delay(140)
            titleAlpha.animateTo(1f, tween(durationMillis = 520, easing = FastOutSlowInEasing))
        }
        launch {
            delay(140)
            titleY.animateTo(0f, tween(durationMillis = 520, easing = SplashEaseOut))
        }
        launch {
            delay(220)
            subtitleAlpha.animateTo(1f, tween(durationMillis = 480, easing = FastOutSlowInEasing))
        }
        while (true) {
            progress.animateTo(0.82f, tween(durationMillis = 900, easing = FastOutSlowInEasing))
            progress.animateTo(0.18f, tween(durationMillis = 900, easing = FastOutSlowInEasing))
        }
    }

    val accent = if (marketplaceEnabled) AwpColors.MpTeal else AwpColors.MundialGold
    val scrimBrush =
        if (marketplaceEnabled) {
            Brush.verticalGradient(
                listOf(
                    Color(0x99061C20),
                    Color(0x6608181C),
                    Color(0xE6041016)
                )
            )
        } else {
            Brush.verticalGradient(
                listOf(
                    Color(0xA6040C0A),
                    Color(0x66061410),
                    Color(0xE0040A12)
                )
            )
        }
    val glowBrush = Brush.radialGradient(
        colors = listOf(accent.copy(alpha = 0.28f), Color.Transparent)
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF061410))
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
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(scrimBrush)
        )

        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = if (marketplaceEnabled) "WERSJA V2" else "AKADEMIA",
                color = accent,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp,
                letterSpacing = 3.sp,
                modifier = Modifier.graphicsLayer {
                    alpha = kickerAlpha.value
                    translationY = kickerY.value
                }
            )
            Spacer(modifier = Modifier.height(18.dp))
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size(128.dp)
            ) {
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .graphicsLayer { alpha = crestAlpha.value * 0.9f }
                        .background(glowBrush)
                )
                Image(
                    painter = painterResource(R.drawable.app_logo),
                    contentDescription = null,
                    modifier = Modifier
                        .size(88.dp)
                        .graphicsLayer {
                            alpha = crestAlpha.value
                            scaleX = crestScale.value
                            scaleY = crestScale.value
                        },
                    contentScale = ContentScale.Fit
                )
            }
            Spacer(modifier = Modifier.height(18.dp))
            Text(
                text = "Akademia Wielkich Piłkarzy",
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontSize = 22.sp,
                textAlign = TextAlign.Center,
                lineHeight = 28.sp,
                modifier = Modifier.graphicsLayer {
                    alpha = titleAlpha.value
                    translationY = titleY.value
                }
            )
            Text(
                text = if (marketplaceEnabled) "Przygotowujemy boiska" else "Rozgrzewka",
                color = Color.White.copy(alpha = 0.72f),
                fontSize = 14.sp,
                letterSpacing = 0.3.sp,
                modifier = Modifier
                    .padding(top = 8.dp)
                    .graphicsLayer { alpha = subtitleAlpha.value }
            )
            Spacer(modifier = Modifier.height(28.dp))
            Box(
                modifier = Modifier
                    .width(136.dp)
                    .height(2.dp)
                    .clip(RoundedCornerShape(99.dp))
                    .background(Color.White.copy(alpha = 0.16f))
                    .graphicsLayer { alpha = subtitleAlpha.value }
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress.value.coerceIn(0f, 1f))
                        .height(2.dp)
                        .clip(RoundedCornerShape(99.dp))
                        .background(accent)
                )
            }
        }
    }
}
