# TresNya Android setup

The Android implementation is in this project. A signed APK and real-phone verification are still pending. EAS CLI was not signed in on this computer during implementation, and a Google Maps Android key has not been supplied.

## What is implemented

- Native login uses a revocable seven-day bearer session, encrypted in Expo SecureStore. The server stores only its hash. Browser cookie login remains available.
- Native requests use `https://tresnya.vercel.app`; `EXPO_PUBLIC_API_URL` can select a different HTTPS server when building. Never put `DATABASE_URL`, account passwords, or signing secrets in `EXPO_PUBLIC_*` variables.
- Explicit background-location consent, foreground then background permission, Android notification permission, an ongoing foreground-service notification, and a Stop button on **Lokasi & kabar**.
- GPS updates target 15 seconds; Android can delay them. Only a fresh fix is uploaded, never a stored movement trail. Viewer polling runs every three seconds while open.
- Native Google Maps markers use the shared profile-photo thumbnail, move with updates, and show accuracy circles. Quotes and your full profile photo persist on this device; they are not synchronized to other devices. Change your photo before starting a new sharing session to update the shared thumbnail.
- Native check-ins work separately from live sharing. Native safe areas keep controls clear of system bars.
- Development APK, standalone preview APK, and production AAB profiles are in `eas.json`.

The visible location-service notification does not require Firebase. Remote Android notifications for partner status updates are a separate feature and are not implemented here; the existing browser push flow remains available.

## 1. Deploy the backend changes first

Commit and push the reviewed code, including `server/session-token.cjs`, the updated auth/location handlers and schema, and `package-lock.json`. Let Vercel finish deploying that commit. The existing Neon `DATABASE_URL` and account configuration stay on Vercel; no database reset is required. The new `lease_ms` column is added automatically.

Open `https://tresnya.vercel.app/api/auth/me` while signed out. HTTP 401 with a JSON login message confirms that an API is reachable. It does not by itself prove that the new native-login route is deployed: check the deployment commit, then test login in the APK. See [VERCEL_SETUP.md](VERCEL_SETUP.md).

## 2. Sign in to your Expo account and link the project

Open a terminal in this folder and run:

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest whoami
npx.cmd eas-cli@latest init
```

Use your existing account. Select or create your TresNya EAS project. Do not paste your password into chat.

Because this repository uses a dynamic `app.config.js`, EAS may ask you to add the returned project ID manually. Add it inside the existing `expo` object in `app.json`, preserving the other fields:

```json
"extra": {
  "eas": {
    "projectId": "THE-PROJECT-UUID-RETURNED-BY-EAS"
  }
}
```

The project UUID is not a password. `app.config.js` preserves this setting. Keep the existing `eas.json` profiles.

## 3. Prepare Android signing and your Google Maps key

The configured Android package is **`com.alihnana.tresnya`**. Use this exact value for Google Maps restrictions. If you want another package name, change it in `app.config.js` before creating signing credentials or distributing your first APK.

```powershell
npx.cmd eas-cli@latest credentials --platform android
```

Select the preview build profile and let EAS create/manage an Android keystore if one does not exist. Record the signing certificate's **SHA-1 fingerprint**. Keep the keystore private. The same signing identity must be used when updating an installed APK. [Expo signing guide](https://docs.expo.dev/app-signing/app-credentials/)

In [Google Cloud Console](https://console.cloud.google.com/):

1. Select or create a project and enable billing for Google Maps Platform.
2. Enable **Maps SDK for Android** in the API Library.
3. Open **APIs & Services → Credentials**, then create an API key.
4. Edit the key. Under application restrictions, choose **Android apps**.
5. Add package `com.alihnana.tresnya` and the EAS signing certificate's SHA-1.
6. Restrict the key to **Maps SDK for Android** and save.

This is a separate key from a Maps Embed key for the website. Native map keys are embedded in the APK, so package/certificate/API restrictions are essential. If you later distribute through Play App Signing, also authorize the Play signing certificate. [Google's Android key setup](https://developers.google.com/maps/documentation/android-sdk/get-api-key)

## 4. Add the key to EAS

In the Expo dashboard, open your TresNya project and its Environment Variables settings. Create:

| Name                          | Value                            | Environments                                    | Visibility |
| ----------------------------- | -------------------------------- | ----------------------------------------------- | ---------- |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Your restricted Android Maps key | development and preview; production when needed | Sensitive  |

Choose Sensitive so EAS CLI can resolve the app configuration. Do not commit the key to `app.json` or `app.config.js`. The Android cloud build fails with a clear setup message if the key is missing. [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)

The public HTTPS backend URL is already set in each build profile. It is not a secret. Do not place the Neon connection string in Expo.

## 5. Build an APK

For an APK that works without a laptop or Metro server:

```powershell
npx.cmd eas-cli@latest build --platform android --profile preview
```

Use EAS-managed credentials when prompted. When the build finishes, open its installation link on each Android phone, download the APK, and allow installation from that browser if Android requests it. Sign in with each person's existing server account. Installing this APK does not create new account passwords.

For ongoing development instead:

```powershell
npx.cmd eas-cli@latest build --platform android --profile development
npm.cmd run android:dev
```

The development client needs Metro; the preview APK does not. Expo Go is not the test target. The production profile creates an AAB for Google Play rather than a directly installable APK. [Expo APK guide](https://docs.expo.dev/build-reference/apk/)

## 6. Test on two physical phones

1. Log in as Alih on one phone and Nana on the other. Set each profile photo.
2. Open **Lokasi & kabar**, tap **Mulai berbagi lokasi live**, and read the consent dialog.
3. Grant foreground location, then **Allow all the time / Izinkan sepanjang waktu** in Android settings, and notifications. Return to TresNya; if Android interrupted startup, tap Start again.
4. Verify the ongoing notification appears. Keep the partner's map open and walk far enough to distinguish movement from normal GPS drift. Check the photo marker and accuracy circle.
5. Press Home on the sharing phone, then lock its screen for 10–15 minutes. Confirm timestamps continue advancing on the partner's phone. Repeat with battery saver enabled and on both phone brands.
6. Switch between Wi-Fi and mobile data. Brief interruptions should recover with a fresh GPS fix. After two minutes without an accepted update, the session expires and requires explicitly starting again.
7. Tap Stop, then separately test logout and revoking location permission. GPS must stop and the partner's marker must disappear after the next refresh, or within two minutes if the stop request cannot reach the server.
8. Test removing the app from Recents and Force Stop. Tracking must not be promised in either case: vendor behavior varies, and Force Stop ends it. Reopen and explicitly start a new session if it ended.
9. Test account session expiry, another device starting a replacement share, and each selectable sharing duration (1, 3, or 8 hours). Check the selected duration in the consent dialog and Android notification. Expired/replaced sessions must not upload again automatically.

The server enforces the selected duration (1, 3, or 8 hours) and hides native points after at most two minutes without a successful fresh update (web remains 45 seconds). Positions older than 15 seconds are labeled as the last received position. Android task callbacks stop the service on expiry; if Android suspends callbacks, server expiry still prevents stale data being presented indefinitely. GPS accuracy is an estimate, not proof of an exact building. [Expo background-location limits](https://docs.expo.dev/versions/latest/sdk/location/)

To release duration choices, deploy the backend first, then build and install the updated APK. The database migration adds a duration column with a one-hour default, preserving existing sessions and older app behavior. The installed APK does not receive this UI change from a GitHub push alone.

## Verification and limits

Automated checks cover web login/location regression, SQLite and embedded PostgreSQL native-token auth, revocation, lease enforcement, ordering, and stop races. A mocked native-runtime test covers offline stop, stale fixes, permission/session loss, account switches, expiry, and replacement sessions. Android JavaScript/Hermes export and native prebuild validate packaging/configuration but do not produce or validate a signed APK.

```powershell
npm.cmd run typecheck
node scripts/native-location-check.cjs
node scripts/live-location-check.cjs
node scripts/auth-check.cjs
node scripts/activity-check.cjs
node scripts/postgres-check.cjs
npm.cmd run build
node scripts/live-location-browser-check.cjs
npx.cmd expo export --platform android --output-dir .local/android-export
```

Generated `android/`, local test data, exports, environment files, and private credentials are excluded from Git/EAS uploads. EAS regenerates the native project from app configuration. For a local Android Studio build after changing plugins or the map key, regenerate with `npx.cmd expo prebuild --platform android --no-install`; Java/Android SDK setup is required for `npm.cmd run android`. iOS background sharing and remote native status push are outside this implementation.
