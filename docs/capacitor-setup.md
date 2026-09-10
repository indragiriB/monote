# Capacitor Integration — monote (Android)

## 1. Install
```bash
npm install
npx cap init monote com.yourorg.monote --web-dir=dist
npm install @capacitor/android
npx cap add android
```

`capacitor.config.ts` (or `.json`) at project root:
```ts
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.yourorg.monote',
  appName: 'monote',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https', // required for Supabase auth cookies/storage to behave
  },
}

export default config
```

## 2. Build & sync
Every time you change web code:
```bash
npm run build      # vite build -> dist/
npx cap sync android
```

## 3. Open in Android Studio
```bash
npx cap open android
```
Run on an emulator or a device from there. `MainActivity` and the Gradle
project now live under `android/app/`.

## 4. Environment variables in the native build
Vite env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are baked into
`dist/` at build time — set them in `.env` (or your CI secrets) **before**
`npm run build`, not in the Android project.

## 5. Deep link for the widget's "Create Note" button
The widget (see `docs/android-widget.md`) launches the app with an intent
that opens `https://<androidScheme-host>/?action=create` (or a custom
scheme). `App.jsx` already reads `?action=create` from the URL on load and
opens a fresh note. Register the intent filter in
`android/app/src/main/AndroidManifest.xml` on `MainActivity`:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="monote" android:host="create" />
</intent-filter>
```

Then the widget's PendingIntent can target `monote://create` directly, or
you can route it through `MainActivity` with an extra and forward it into
the WebView's URL — whichever is simpler depends on which widget approach
you pick in `android-widget.md`.

## 6. Permissions
Offline-first sync needs network state awareness. Add to the manifest:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## 7. App icon / splash (optional, cosmetic)
Use `@capacitor/assets` to generate a B&W icon set from a single source
image, matching the app's monochrome theme:
```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --android
```
