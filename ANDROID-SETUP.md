# Cascade Android app setup

Cascade uses one shared set of HTML, CSS, and JavaScript files for GitHub Pages and the Capacitor Android app. The Android app receives a local copy of those files when it is built.

## Requirements

- Node.js 22 or newer
- Android Studio 2025.2.1 or newer
- Android SDK Platform API 24 or newer (API 36 is the current stable target)
- A USB cable and Android phone with Developer options and USB debugging enabled, or an Android emulator

## First-time setup on Windows

Open PowerShell in the folder where you want the project:

```powershell
git clone https://github.com/InverseDev/cascade.git
cd cascade
npm install
npm run build:mobile
npx cap add android
npm run android:sync
npx cap open android
```

Android Studio opens the generated native project. Wait for Gradle sync to finish, connect your phone with USB debugging enabled, select it in the device selector, and press Run.

If Android Studio asks for an SDK, open **Tools → SDK Manager** and install an Android SDK Platform (API 36 is a good choice) and the Android SDK Build-Tools.

## Build an APK locally

After the first-time setup:

```powershell
npm run android:sync
```

Then in Android Studio choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

The debug APK is created at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

You can copy that APK to your Android phone and install it. Android may ask you to allow installation from that file manager/browser.

## Connect the Android project to GitHub

The generated `android/` folder contains the native Android project. Commit it once after the first successful local setup, along with the generated lockfile:

```powershell
git add android package-lock.json
git commit -m "Add generated Capacitor Android project"
git push origin main
```

Do not commit `www/`, `node_modules/`, or Android build output; these are ignored by `.gitignore`.

## Automatic Android builds after GitHub pushes

The workflow at `.github/workflows/android.yml` builds a debug APK on every push to `main`.

To download it:
1. Open the repository on GitHub.
2. Open **Actions**.
3. Select the latest **Build Cascade Android APK** run.
4. Download the `cascade-android-debug` artifact.
5. Extract the ZIP and install `app-debug.apk` on your phone.

GitHub Pages continues deploying the website from the same root-level files. The Android workflow copies those same files into `www/` before syncing and building the app.

## How updates work

- Push website code to GitHub: GitHub Pages deploys the website.
- The same push triggers a fresh Android APK build.
- Install the newly built APK to update the installed Android app.

An already-installed APK does **not** silently update just because GitHub receives a push. Automatic delivery of app updates can be added later through Google Play or a dedicated update mechanism.

## Important

- The Capacitor app bundles the website locally; it does not simply open the GitHub Pages URL.
- Supabase and the public Cloudflare Worker endpoint can be shared by both versions.
- Never place Supabase service-role keys, Gemini API keys, or device secrets in the frontend.
- Native notification scheduling and background monitoring are separate enhancements. The current setup packages the existing website; it does not automatically turn browser reminders into reliable Android background alarms.
