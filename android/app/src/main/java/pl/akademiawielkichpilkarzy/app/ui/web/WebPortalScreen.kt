package pl.akademiawielkichpilkarzy.app.ui.web

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.os.Handler
import android.os.Looper
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import java.util.concurrent.atomic.AtomicBoolean
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import pl.akademiawielkichpilkarzy.app.BuildConfig
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.AppBridgeRequest
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors
import pl.akademiawielkichpilkarzy.app.update.AppUpdateRequests
import retrofit2.HttpException

private fun normalizeSiteBase(): String {
    val raw = BuildConfig.API_BASE_URL.trim()
    return if (raw.endsWith("/")) raw.dropLast(1) else raw
}

private class AwpAndroidJsBridge(private val appContext: Context) {
    @JavascriptInterface
    fun getVersionName(): String = BuildConfig.VERSION_NAME

    @JavascriptInterface
    fun getVersionCode(): Int = BuildConfig.VERSION_CODE

    @JavascriptInterface
    fun checkUpdate() {
        AppUpdateRequests.requestInstall()
    }

    @JavascriptInterface
    fun openExternalUrl(url: String) {
        val raw = url.trim()
        if (raw.isEmpty()) return
        val uri = runCatching { Uri.parse(raw) }.getOrNull() ?: return
        val scheme = uri.scheme?.lowercase().orEmpty()
        if (scheme != "http" && scheme != "https") return
        Handler(Looper.getMainLooper()).post {
            openExternalUri(appContext, uri)
        }
    }

    /**
     * Wzorzec wibracji CSV jak Vibration API: "40" albo "28,40,28" (vibrate/pause/vibrate…).
     * Na Androidzie pierwszy timing w Waveform to opóźnienie — doklejamy 0 na początku.
     */
    @JavascriptInterface
    fun vibrate(patternCsv: String) {
        val webPattern = patternCsv
            .split(',')
            .mapNotNull { it.trim().toLongOrNull() }
            .filter { it >= 0L }
        if (webPattern.isEmpty()) return

        val timings =
            if (webPattern.size == 1 || webPattern.first() != 0L) {
                longArrayOf(0L) + webPattern.toLongArray()
            } else {
                webPattern.toLongArray()
            }

        val vibrator = resolveVibrator(appContext) ?: return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (timings.size == 2 && timings[0] == 0L) {
                    vibrator.vibrate(
                        VibrationEffect.createOneShot(
                            timings[1].coerceAtLeast(1L),
                            VibrationEffect.DEFAULT_AMPLITUDE
                        )
                    )
                } else {
                    vibrator.vibrate(VibrationEffect.createWaveform(timings, -1))
                }
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(timings, -1)
            }
        } catch (_: Exception) {
            /* urządzenie bez wibracji / ograniczenia systemu */
        }
    }

    private fun resolveVibrator(context: Context): Vibrator? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(VibratorManager::class.java)
            manager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Vibrator::class.java)
                ?: context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebPortalScreen(
    title: String,
    path: String,
    requireAuth: Boolean = true,
    showTopBar: Boolean = true,
    onBack: (() -> Unit)? = null,
    onNavigatedToLogin: (() -> Unit)? = null,
    onInitialContentReady: (() -> Unit)? = null
) {
    val siteBase = remember { normalizeSiteBase() }
    var loading by remember { mutableStateOf(true) }
    var progress by remember { mutableFloatStateOf(0f) }
    var error by remember { mutableStateOf<String?>(null) }
    var startUrl by remember { mutableStateOf<String?>(null) }
    var loadedStartUrl by remember { mutableStateOf<String?>(null) }
    var webView by remember { mutableStateOf<WebView?>(null) }
    var fileCallback by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }
    var firstPageFinished by remember { mutableStateOf(false) }
    val readyNotified = remember { AtomicBoolean(false) }
    val onReadyLatest = rememberUpdatedState(onInitialContentReady)
    val onLoginLatest = rememberUpdatedState(onNavigatedToLogin)

    fun markInitialReady() {
        if (readyNotified.compareAndSet(false, true)) {
            onReadyLatest.value?.invoke()
        }
    }

    LaunchedEffect(error, startUrl) {
        if (error != null && startUrl == null) {
            markInitialReady()
        }
    }

    val filePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        fileCallback?.onReceiveValue(uris)
        fileCallback = null
    }

    LaunchedEffect(path, requireAuth) {
        loading = true
        error = null
        startUrl = null
        loadedStartUrl = null
        try {
            if (requireAuth) {
                val bridge = ApiClient.api.appBridge(AppBridgeRequest(next = path))
                val bridgePath = bridge.path
                if (bridgePath.isNullOrBlank()) {
                    error = bridge.error ?: "Nie udało się otworzyć strony"
                } else {
                    startUrl = if (bridgePath.startsWith("http")) {
                        bridgePath
                    } else {
                        siteBase + bridgePath
                    }
                }
            } else {
                startUrl = siteBase + path
            }
        } catch (e: HttpException) {
            if (e.code() == 401) {
                // Interceptor czyści JWT; MainActivity wraca na login przez tokenFlow.
                error = "Sesja wygasła — zaloguj się ponownie"
                onLoginLatest.value?.invoke()
            } else {
                error = e.message ?: "Błąd serwera (${e.code()})"
            }
        } catch (e: Exception) {
            error = e.message ?: "Brak połączenia z serwerem"
        } finally {
            loading = false
        }
    }

    // Deep link / zmiana path: ładuj nowy startUrl, ale nie wracaj z HotPay mid-flow przy rekompozycji.
    LaunchedEffect(startUrl, webView) {
        val target = startUrl ?: return@LaunchedEffect
        val wv = webView ?: return@LaunchedEffect
        if (loadedStartUrl != target) {
            loadedStartUrl = target
            wv.loadUrl(target)
        }
    }

    BackHandler(enabled = webView?.canGoBack() == true || onBack != null) {
        val wv = webView
        when {
            wv != null && wv.canGoBack() -> wv.goBack()
            onBack != null -> onBack()
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            webView?.apply {
                stopLoading()
                destroy()
            }
            webView = null
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AwpColors.MurawaDark)
    ) {
        if (showTopBar) {
            TopAppBar(
                title = { Text(title, color = Color.White) },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Wróć",
                                tint = AwpColors.MundialGold
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = AwpColors.MundialNavy,
                    titleContentColor = Color.White,
                    navigationIconContentColor = AwpColors.MundialGold
                )
            )
        }

        when {
            error != null && startUrl == null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(error!!, color = MaterialTheme.colorScheme.error)
                        if (onBack != null) {
                            TextButton(onClick = onBack) { Text("Wróć") }
                        }
                    }
                }
            }

            startUrl == null || loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = AwpColors.MpTeal)
                }
            }

            else -> {
                if (firstPageFinished && progress > 0f && progress < 1f) {
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier.fillMaxWidth(),
                        color = AwpColors.MpTeal,
                        trackColor = Color(0xFFE4E4E7)
                    )
                }
                AndroidView(
                    factory = { ctx ->
                        WebView(ctx).apply {
                            layoutParams = ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                            settings.javaScriptEnabled = true
                            settings.domStorageEnabled = true
                            settings.databaseEnabled = true
                            settings.loadWithOverviewMode = true
                            settings.useWideViewPort = true
                            settings.builtInZoomControls = false
                            settings.displayZoomControls = false
                            settings.textZoom = 100
                            settings.allowFileAccess = true
                            settings.allowContentAccess = true
                            settings.cacheMode = WebSettings.LOAD_DEFAULT
                            settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                            settings.mediaPlaybackRequiresUserGesture = false
                            overScrollMode = WebView.OVER_SCROLL_NEVER
                            isVerticalScrollBarEnabled = false
                            isHorizontalScrollBarEnabled = false
                            setBackgroundColor(AndroidColor.parseColor("#061410"))
                            // Znacznik w UA - strona rozpoznaje WebView i czyta wersję APK.
                            settings.userAgentString =
                                "${settings.userAgentString} AWPAndroidApp/${BuildConfig.VERSION_NAME} AWPAndroidCode/${BuildConfig.VERSION_CODE}"
                            addJavascriptInterface(AwpAndroidJsBridge(ctx.applicationContext), "AwpAndroid")
                            CookieManager.getInstance().setAcceptCookie(true)
                            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

                            webViewClient = object : WebViewClient() {
                                override fun shouldOverrideUrlLoading(
                                    view: WebView,
                                    request: WebResourceRequest
                                ): Boolean {
                                    val uri = request.url
                                    val scheme = uri.scheme?.lowercase().orEmpty()
                                    if (scheme == "http" || scheme == "https") {
                                        if (isSisterSiteUrl(uri)) {
                                            view.loadUrl(gymBratEmbedUrl(siteBase, uri))
                                            return true
                                        }
                                        return false
                                    }
                                    return openExternalUri(ctx, uri)
                                }

                                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                                    progress = 0.05f
                                }

                                override fun onPageCommitVisible(view: WebView?, url: String?) {
                                    markInitialReady()
                                }

                                override fun onPageFinished(view: WebView?, url: String?) {
                                    progress = 1f
                                    firstPageFinished = true
                                    CookieManager.getInstance().flush()
                                    markInitialReady()
                                    val u = url.orEmpty()
                                    val loginCb = onLoginLatest.value
                                    val onAwpSite = runCatching { isAwpSiteUrl(Uri.parse(u), siteBase) }.getOrDefault(false)
                                    if (loginCb != null &&
                                        onAwpSite &&
                                        (u.contains("/login") || u.endsWith("/login")) &&
                                        !u.contains("register")
                                    ) {
                                        loginCb()
                                    }
                                }
                            }
                            webChromeClient = object : WebChromeClient() {
                                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                                    progress = newProgress / 100f
                                }

                                override fun onShowFileChooser(
                                    webView: WebView?,
                                    filePathCallback: ValueCallback<Array<Uri>>?,
                                    fileChooserParams: FileChooserParams?
                                ): Boolean {
                                    fileCallback?.onReceiveValue(null)
                                    fileCallback = filePathCallback
                                    val intent = fileChooserParams?.createIntent()
                                        ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                                            addCategory(Intent.CATEGORY_OPENABLE)
                                            type = "*/*"
                                        }
                                    return try {
                                        filePicker.launch(intent)
                                        true
                                    } catch (_: Exception) {
                                        fileCallback = null
                                        false
                                    }
                                }
                            }
                            // startUrl ładuje LaunchedEffect — nie tu, żeby nie zabić sesji HotPay przy rekompozycji.
                            webView = this
                        }
                    },
                    modifier = Modifier.fillMaxSize(),
                    update = { view ->
                        webView = view
                    }
                )
            }
        }
    }
}
