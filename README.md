# TresNya

A couple app for **Alih (male)** and **Nana (female)**, based on `ruang-berdua-kita-PRD.md`. The responsive Expo/React Native interface has real web authentication, shared GPS check-ins, saved partner statuses, and Web Push notification support. Other couple activities still use in-memory demo data.

## Run

```sh
npm.cmd install
npm.cmd run build
npm.cmd run server
```

Open http://localhost:4173. Node.js 24 is required for the built-in SQLite backend.

Two accounts are registered automatically on the first server start: `alih` and `nana`. Their generated initial passwords are in **`.local/access-credentials.txt`**. Open that file locally in VS Code; it is excluded from Git. Passwords are not embedded in the app or printed in server output. Later starts preserve the same accounts and credentials.

SQLite stores salted scrypt password hashes and hashed session tokens in `.local/tresnya.sqlite`. Cookies are HttpOnly and SameSite=Strict, sessions last seven days, logout revokes the session, and failed logins are rate-limited. There is no public registration endpoint. Keep the `.local/` folder private and backed up if you want to retain accounts.

For live UI development, keep `npm.cmd run server` running in one terminal, and run `npm.cmd run web` in another. Open http://localhost:8081. The Expo web UI connects to the same local auth server.

Web account/location/push flows remain available. Android now has native login, a native map, and opt-in background location; APK signing, map-key setup, and real-phone verification are described in [ANDROID_SETUP.md](ANDROID_SETUP.md). Native status push and iOS background sharing are not configured. The server binds to loopback by default. Remote phones need the same HTTPS deployment; see setup below.

```sh
npm run typecheck
npm run build
```

The build exports the web application into `dist/`.

For Vercel hosting, follow [VERCEL_SETUP.md](VERCEL_SETUP.md). The root `vercel.json` builds `dist/` and routes authentication/activity requests to `api/index.js`, backed by Neon PostgreSQL. Set the Root Directory to the folder containing `package.json` and `vercel.json`. Publish this backend code along with the UI and configure the required server environment variables. Local `npm run server` continues to use SQLite; it does not use `DATABASE_URL` or copy local data into Neon.

Run `npm run preview` to serve the production build at http://localhost:4173.

## Included flows

- **Beranda:** live relationship duration, milestone badge, editable meeting countdown, partner summary, daily challenge, pet summary, recent stories.
- **Lokasi & kabar:** explicit GPS capture and confirmation, shared coordinates/accuracy/capture time, Google Maps pin links, optional embedded Google Maps, last 30 shared check-ins, removal of your shared location history, saved statuses, and device notification controls. Open screens refresh every 10 seconds and on window focus.
- **Cerita kita:** text and local photo posts, mood picker, filters, reversible reactions, and replies.
- **Main berdua:** a three-question quiz, heart tapping, daily challenge, and shared affection score. Quiz and challenge rewards are granted once per session.
- **Kejut layar:** effect and message selection, heart-rain preview with reduced-motion support, visual vibration/sound previews, and session history.
- **Pet berdua:** species, name, birthday and zodiac, care actions, experience and levels, inventory, coin shop, trick training, and care history.
- **Pengaturan:** profile and avatar, real status-notification controls and location-management link, demo battery/arrival/surprise preferences, privacy preview, and three accent themes.
- **Accounts:** real sign-in for the two pre-registered profiles, session restoration after reload/restart, and logout in settings. Each profile sees its own name, gender-appropriate avatar, partner, and story filter. Names belong to the fixed account profiles.

## Demo feature boundary

Accounts, sessions, location check-ins, status updates, and notification subscriptions persist in SQLite locally or PostgreSQL on Vercel. For manual check-ins, location is captured with **Ambil lokasi saya**, then shared with **Bagikan titik ini ke pasangan**. GPS accuracy is shown rather than claiming a precise venue. These check-ins are separate from opt-in foreground live sharing, described below. Removing your locations deletes your server-side check-in history and revokes live sharing; the check-in list refreshes within 10 seconds. Status updates are a separate real flow from the demo **Cerita kita** posts.

Other activities (stories/photos, games, pets, battery, arrivals, surprises) remain fictional fixtures or in-memory state. Geofences, story-photo uploads, payments, device locking, password recovery, and native status push are not implemented. Android background location is implemented separately from the web foreground flow; see [ANDROID_SETUP.md](ANDROID_SETUP.md).

Your selected profile photo now also appears in the sidebar couple badge. Click either sidebar quote with its pencil icon, or use the separate pencil buttons under **Pengaturan → Kata-kata untuk ruang kita**, to open that quote's own editor. Save and **Gunakan kutipan awal** affect only the selected quote; closing cancels its edits. Profile photos (PNG/JPEG/WebP/GIF, up to about 2 MB) and these quotes persist per account in this browser's local storage. They are not uploaded or synchronized to the partner's phone, and clearing browser data removes them. Android stores these changes per account on the device; profile photos are resized before saving. Clearing app data removes them.

## Phone notifications and Google Maps setup

For foreground live location, see the live-location section below. That map uses OpenStreetMap and requires no API key; Google Maps links remain available.

Google Maps pin links work without an API key. For an interactive map inside the app, enable the **Maps Embed API** in Google Cloud and set `TRESNYA_GOOGLE_MAPS_EMBED_KEY`. Restrict this browser-visible key to Maps Embed API and your website's HTTP referrers. Never use a server secret as this key. Without it, the app displays shared coordinates and an **Open in Google Maps** button.

For Vercel and Neon, use [VERCEL_SETUP.md](VERCEL_SETUP.md). Alternatively, deploy the standalone Node 24 server behind an HTTPS reverse proxy using a persistent data directory. For that standalone SQLite deployment, set these environment variables in the hosting service (or PowerShell before starting the server):

```powershell
$env:TRESNYA_ALLOWED_ORIGINS = 'https://your-real-domain.example'
$env:TRESNYA_SECURE_COOKIE = '1'
$env:TRESNYA_PUSH_SUBJECT = 'mailto:your-real-contact@example.com'
# Optional embedded map:
$env:TRESNYA_GOOGLE_MAPS_EMBED_KEY = 'your-restricted-maps-embed-key'
# Set only if the hosting proxy/container requires listening on all interfaces:
$env:TRESNYA_HOST = '0.0.0.0'
# Optional: PORT (default 4173), TRESNYA_DATA_DIR (default .local)
npm.cmd run build
npm.cmd run server
```

Replace example values with your own domain and contact. Environment files are not automatically loaded. Do not set Secure cookies for plain HTTP local development. The generated private VAPID key is in `.local/web-push-keys.json`; keep the entire data directory private and persistent across deployments. Missing `TRESNYA_PUSH_SUBJECT` disables subscription registration and the UI explains that setup is pending. No hosting or credentials have been configured by this change.

On each phone, sign into its owner's account, open **Lokasi & kabar**, and select **Aktifkan notifikasi ponsel**. Allow notifications. On iPhone/iPad (iOS/iPadOS 16.4+), first use Safari → Share → Add to Home Screen and launch from that icon. Android Chrome can enable Web Push in the browser or installed app. Push depends on browser/OS permission and delivery conditions; it is not guaranteed instant. The service worker shows a generic partner-update alert without private status text or GPS on the lock screen. Tapping opens Lokasi & kabar. This PWA does not cache private content or support offline use.

A new status is saved and queued transactionally for subscribed partner devices, never the author's devices. Failed push attempts retry with backoff, up to six attempts or one hour; 404/410 subscriptions are removed. Status submissions use an idempotency key and a five-second per-account rate limit. Logging out revokes the current session's notification subscriptions. Sessions expire after seven days, after which the owner must log in again and re-enable/rebind notifications. **Matikan notifikasi ponsel** removes the current device subscription. Other devices are unaffected.

References: [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), [Maps Embed API](https://developers.google.com/maps/documentation/embed/embedding-map), [Apple Web Push requirements](https://webkit.org/blog/13878/), [web-push library](https://github.com/web-push-libs/web-push).

## Files

- `App.tsx`: screen composition, demo state, navigation, forms, and dialogs.
- `src/ui.tsx`: shared controls, colors, and typography.
- `src/art.tsx`: icons, avatars, pet, hero illustration, and map.
- `src/model.ts`: typed fixtures and date helpers.
- `src/HeartRain.tsx`: motion-aware surprise effect.
- `src/AuthGate.tsx`: login screen and session handling.
- `server/auth.cjs`: account creation, password verification, cookies, and sessions.
- `server/main.cjs`: authenticated APIs and static web hosting (loopback by default).
- `server/activity.cjs`: shared check-ins/statuses, push subscriptions and persistent delivery queue.
- `src/Activity.tsx`: GPS capture, map links/embed, partner status screen and Web Push controls.
- `public/`: service worker, install manifest and app icons.
- `.local/access-credentials.txt`: private initial credentials, excluded from Git.
- `artifacts/`: desktop/mobile screenshots and browser check report.
- `scripts/`: browser verification scripts; set `PLAYWRIGHT_MODULE` to your installed Playwright module if running outside this Codex workspace.

## Verification scope

TypeScript and production web export are checked locally. Browser checks cover desktop and mobile web. Android/iOS source is shared, but native device builds have not been run on this Windows host.

`node scripts/auth-check.cjs` checks account creation, hashes, failed logins, origin rejection, session persistence/revocation, and rate limiting using an isolated temporary database. With the built app served on port 4173, `node scripts/accounts-browser-check.cjs` checks both real accounts in desktop/mobile browsers without printing passwords.

Dependency audit: npm still reports 38 advisories in the dependency tree (15 moderate, 23 high). The UI is not a production deployment. Major SDK changes and forced dependency replacements were not applied.

`node scripts/activity-check.cjs` uses an isolated database and mocked push transport to verify two-account sharing, validation, persistence, deletion, idempotency, private recipient-only notifications, retries, expired subscriptions, logout and endpoint validation. `node scripts/activity-browser-check.cjs` starts an isolated server on port 4186 and checks desktop/mobile GPS consent, Maps links, partner status synchronization, reloads, location removal, denied permission, configuration messaging and PWA assets. No real phone or push-provider delivery is claimed by these checks.

`node scripts/postgres-check.cjs` executes the serverless API SQL against isolated embedded PostgreSQL (PGlite), including bootstrap rollback, session persistence across API instances, rate limits, check-in ownership, status idempotency, push retries and logout revocation. It mocks push delivery and does not verify Neon network/TLS, the `pg` connection pool, distributed locking across real serverless instances, or deployed Vercel routing. The deployment verification steps in VERCEL_SETUP.md are still required.

## Foreground live location

Open **Lokasi & kabar → Mulai berbagi lokasi live** and grant location permission. This explicitly shares changing coordinates and a small snapshot of your profile photo with the signed-in partner. The full local photo and quotes remain on this browser; the live thumbnail is the exception. With no chosen photo the marker uses your initial. Change your photo before starting a share to use it as the marker. Both accounts can share simultaneously. The Leaflet map uses OpenStreetMap tiles with attribution, accuracy circles, moving avatar markers, an optional follow mode, and Google Maps links. No extra API key is required for the live map.

The client watches GPS and sends at most one update every three seconds, with a fresh stationary fix requested every 15 seconds. Viewers poll the lightweight live endpoint every three seconds; latency also depends on GPS/network conditions. Elapsed time is based on the actual GPS fix; fixes older than 15 seconds are labeled as last-known positions.

Choose 1, 3, or 8 hours before starting a live share (default: 1 hour). Sharing stops on Stop, logout, hiding/closing the web page, loss of the server lease, or when the selected duration ends. The server stores and enforces that duration; GPS updates cannot extend it. Returning to the page or reloading never starts tracking automatically. Keep the browser foreground and phone unlocked; use the Android APK described below for opt-in background/locked-screen sharing. Browser/OS permission is required on HTTPS or localhost.

Live map markers use the same profile photo as the app, or its illustrated avatar when no custom photo is set. Editing the photo during sharing updates both partners' maps without restarting the session or extending its deadline. Photo updates are authenticated and scoped to the active sharing session; they never refresh the GPS lease. The profile itself remains stored on the device; its small map thumbnail is shared only during an active location session.

SQLite and PostgreSQL store only the latest live position and a thumbnail in a session-scoped lease, separate from saved check-in history. Stop removes the row; late updates cannot recreate it. A share expires 45 seconds after the last accepted update, and viewers hide expired points even when polling fails. Expired rows are cleaned on the next live-state request. A new share on another device replaces the old one for that account. Logout or deleting shared locations also revokes live sharing. No push notifications are sent on each movement update.

The map fetches visible tiles from OpenStreetMap, so an internet connection is still needed locally. Follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and retain attribution; use an appropriate tile service before expanding to substantial traffic. This app does not prefetch tiles or implement an offline tile cache.

Verification: `node scripts/live-location-check.cjs` exercises both storage backends using isolated SQLite and embedded PostgreSQL. After `npm run build`, `node scripts/live-location-browser-check.cjs` checks two accounts, simulated movement and avatar markers, stop, denied permission, hidden-page stop, reload, and mobile layout. These tests do not verify real phone GPS, background tracking or a live Neon/Vercel deployment. References: [watchPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition), [Leaflet](https://leafletjs.com/reference).

## Android APK and background location

Follow [ANDROID_SETUP.md](ANDROID_SETUP.md) for native login, Expo/EAS linking, Google Maps Android key restrictions, APK build profiles, and the two-phone test checklist. Background sharing is explicit, time-limited, and visible through an Android foreground-service notification. Web sharing still stops when hidden. Native OS delivery, Google Maps credentials, signed APK installation, and deployed Neon/Vercel access require real-device verification.
