import java.net.URI

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.gms.google-services")
}

fun readLocalProperty(key: String): String? {
    val localFile = rootProject.file("local.properties")
    if (!localFile.exists()) return null
    return localFile.readLines()
        .map { it.trim() }
        .firstOrNull { it.startsWith("$key=") && !it.startsWith("#") }
        ?.substringAfter("=", "")
        ?.trim()
        ?.takeIf { it.isNotEmpty() }
}

fun hostFromUrl(raw: String): String {
    return runCatching { URI(raw).host }
        .getOrNull()
        ?.takeIf { it.isNotBlank() }
        ?: "localhost"
}

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = mutableMapOf<String, String>()
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.readLines()
        .map { it.trim() }
        .filter { it.isNotEmpty() && !it.startsWith("#") && it.contains("=") }
        .forEach { line ->
            val idx = line.indexOf('=')
            keystoreProperties[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
        }
}

android {
    namespace = "pl.akademiawielkichpilkarzy.app"
    compileSdk = 36

    defaultConfig {
        // Nowe ID — czysta instalacja obok starych prób
        applicationId = "pl.akademiawielkichpilkarzy.player"
        minSdk = 26
        // targetSdk musi być aktualny — inaczej Android 14+ pokazuje ostrzeżenie
        // „aplikacja jest na starszą wersję Androida…” przy instalacji APK.
        targetSdk = 36
        versionCode = 35
        versionName = "1.10.12"

        ndk {
            abiFilters += listOf("armeabi-v7a", "arm64-v8a")
        }

        val apiBase = readLocalProperty("api.base.url")
            ?: (project.findProperty("API_BASE_URL") as String?)
            ?: "http://10.0.2.2:3000/"
        buildConfigField("String", "API_BASE_URL", "\"$apiBase\"")
        manifestPlaceholders["appLinkHost"] = hostFromUrl(apiBase)
    }

    signingConfigs {
        create("release") {
            val storePath = keystoreProperties["storeFile"]
            if (storePath != null) {
                storeFile = rootProject.file(storePath)
                storePassword = keystoreProperties["storePassword"]
                keyAlias = keystoreProperties["keyAlias"]
                keyPassword = keystoreProperties["keyPassword"]
                val type = keystoreProperties["storeType"]
                if (!type.isNullOrBlank()) {
                    storeType = type
                }
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = false
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }

    lint {
        // Sideload poza Play — nie blokuj release przez reguły sklepu Google.
        disable += "ExpiredTargetSdkVersion"
        disable += "SplashScreenIconSize"
        disable += "CustomSplashScreen"
        checkReleaseBuilds = true
        abortOnError = true
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.12.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("androidx.navigation:navigation-compose:2.9.3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.datastore:datastore-preferences:1.1.7")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.security:security-crypto:1.0.0")
    implementation("androidx.fragment:fragment-ktx:1.8.8")
    implementation("androidx.browser:browser:1.9.0")

    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.2")
    implementation("io.coil-kt:coil-compose:2.7.0")

    implementation(platform("com.google.firebase:firebase-bom:33.16.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")
    implementation("me.leolin:ShortcutBadger:1.1.22@aar")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
