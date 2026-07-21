# Aplikacja Android — bez Android Studio

Budowanie odbywa się na **GitHub Actions** (w chmurze). Ty tylko klikasz przycisk.

## Jednorazowo: wgraj kod na GitHub

Wypchnij branch z folderem `android/` i plikiem `.github/workflows/android-apk.yml` na GitHub (tak jak stronę).

## Jak zbudować APK (ok. 5–10 min)

1. Wejdź na: https://github.com/damianchmielewski33-cmyk/Akademia-Wielkich-Pi-karzy  
2. Zakładka **Actions**  
3. Po lewej: **Build Android APK**  
4. **Run workflow**  
5. W polu **api_base_url** wpisz adres swojej strony na Vercel, np.  
   `https://twoja-akademia.vercel.app/`  
   (musi być `https://` i `/` na końcu)  
6. Kliknij zielony **Run workflow**  
7. Poczekaj, aż job będzie zielony (Success)

## Gdzie jest plik do pobrania

Po udanym buildzie:

- **Releases** na GitHubie → plik `akademia-wp.apk`  
  bezpośrednio:  
  https://github.com/damianchmielewski33-cmyk/Akademia-Wielkich-Pi-karzy/releases/latest/download/akademia-wp.apk  
- Na stronie akademii: **`/pobierz`** (menu „Aplikacja”)

## Instalacja na telefonie

1. Otwórz `/pobierz` na telefonie (albo link z Releases)  
2. Pobierz APK → otwórz → zainstaluj  
3. Zaloguj się PIN-em jak na stronie

## Opcjonalnie (żeby nie wpisywać URL za każdym razem)

W GitHub: **Settings → Secrets and variables → Actions → New repository secret**

- Nazwa: `ANDROID_API_BASE_URL`  
- Wartość: `https://twoja-domena.pl/`

Albo wpisz raz w pliku `android/gradle.properties` linię `API_BASE_URL=...`

## Push (powiadomienia)

To osobny temat (Firebase). Appka działa bez pushy; powiadomienia włączysz później według sekcji w starszej części README / planu.

## Vercel

Push na Vercel **aktualizuje stronę i API**, ale **nie buduje APK**. APK buduje tylko GitHub Actions powyżej.
