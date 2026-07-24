package pl.akademiawielkichpilkarzy.app.ui.web

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import android.net.Uri
import android.view.ViewGroup
import android.webkit.CookieManager
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import pl.akademiawielkichpilkarzy.app.BuildConfig
import pl.akademiawielkichpilkarzy.app.data.api.ApiClient
import pl.akademiawielkichpilkarzy.app.data.api.AppBridgeRequest
import pl.akademiawielkichpilkarzy.app.ui.theme.AwpColors

private fun normalizeSiteBase(): String {
    val raw = BuildConfig.API_BASE_URL.trim()
    return if (raw.endsWith("/")) raw.dropLast(1) else raw
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
    onNavigatedToLogin: (() -> Unit)? = null
) {
    val siteBase = remember { normalizeSiteBase() }
    var loading by remember { mutableStateOf(true) }
    var progress by remember { mutableFloatStateOf(0f) }
    var error by remember { mutableStateOf<String?>(null) }
    var startUrl by remember { mutableStateOf<String?>(null) }
    var webView by remember { mutableStateOf<WebView?>(null) }
    var fileCallback by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }

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
        } catch (e: Exception) {
            error = e.message ?: "Brak połączenia z serwerem"
        } finally {
            loading = false
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
                    CircularProgressIndicator(color = AwpColors.MundialGold)
                }
            }

            else -> {
                if (progress > 0f && progress < 1f) {
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier.fillMaxWidth(),
                        color = AwpColors.MundialGold,
                        trackColor = AwpColors.MundialNavy
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
                            setBackgroundColor(AndroidColor.TRANSPARENT)
                            // Znacznik w UA - strona rozpoznaje po nim WebView aplikacji i chowa np. banery pobierania apki.
                            settings.userAgentString = "${settings.userAgentString} AWPAndroidApp/${BuildConfig.VERSION_NAME}"
                            CookieManager.getInstance().setAcceptCookie(true)
                            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

                            webViewClient = object : WebViewClient() {
                                override fun shouldOverrideUrlLoading(
                                    view: WebView,
                                    request: WebResourceRequest
                                ): Boolean {
                                    val uri = request.url
                                    val host = uri.host
                                    val siteHost = Uri.parse(siteBase).host
                                    if (host != null && siteHost != null &&
                                        host.equals(siteHost, ignoreCase = true)
                                    ) {
                                        return false
                                    }
                                    return try {
                                        ctx.startActivity(Intent(Intent.ACTION_VIEW, uri))
                                        true
                                    } catch (_: ActivityNotFoundException) {
                                        false
                                    }
                                }

                                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                                    progress = 0.05f
                                }

                                override fun onPageFinished(view: WebView?, url: String?) {
                                    progress = 1f
                                    CookieManager.getInstance().flush()
                                    val u = url.orEmpty()
                                    if (onNavigatedToLogin != null &&
                                        (u.contains("/login") || u.endsWith("/login")) &&
                                        !u.contains("register")
                                    ) {
                                        onNavigatedToLogin()
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
                            loadUrl(startUrl!!)
                            webView = this
                        }
                    },
                    modifier = Modifier.fillMaxSize(),
                    update = { view ->
                        webView = view
                        val target = startUrl
                        if (target != null) {
                            val current = view.url.orEmpty()
                            // Przeładuj tylko gdy zmienił się docelowy mostek / ścieżka startowa.
                            if (!current.contains(path) && current != target) {
                                view.loadUrl(target)
                            }
                        }
                    }
                )
            }
        }
    }
}
