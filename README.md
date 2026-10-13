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

The implemented account, location, and notification flows target mobile/desktop web. Native Android/iOS authentication and native push are not configured. The server binds to loopback by default. Remote phones need the same HTTPS deployment; see setup below.

```sh
npm run typecheck
npm run build
```

The build exports the web application into `dist/`.

For Vercel web hosting, the root `vercel.json` sets the build command to `npm run build` and the output directory to `dist`. Set the Vercel project Root Directory to the folder containing `package.json` and `vercel.json`, then deploy the commit containing those files. This publishes the web interface only: the current SQLite-backed Node server is not deployed as Vercel Functions. Login and shared activity require the planned PostgreSQL/API migration or a separately hosted compatible backend; adding `DATABASE_URL` alone does not perform that migration.

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

Accounts, sessions, location check-ins, status updates, and notification subscriptions persist in SQLite. Location is captured only when its owner chooses **Ambil lokasi saya**, and shared only after **Bagikan titik ini ke pasangan**. GPS accuracy is shown rather than claiming a precise venue. This is check-in history, not background/live tracking. Removing your locations deletes your server-side check-in history; the partner screen refreshes within 10 seconds. Status updates are a separate real flow from the demo **Cerita kita** posts.

Other activities (stories/photos, games, pets, battery, arrivals, surprises) remain fictional fixtures or in-memory state. Background tracking, geofences, photo uploads, payments, device locking, password recovery, and native push are not implemented.

## Phone notifications and Google Maps setup

Google Maps pin links work without an API key. For an interactive map inside the app, enable the **Maps Embed API** in Google Cloud and set `TRESNYA_GOOGLE_MAPS_EMBED_KEY`. Restrict this browser-visible key to Maps Embed API and your website's HTTP referrers. Never use a server secret as this key. Without it, the app displays shared coordinates and an **Open in Google Maps** button.

For two phones, deploy the Node 24 server behind an HTTPS reverse proxy using a persistent data directory. Set these environment variables in the hosting service (or PowerShell before starting the server):

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

Dependency audit: npm still reports 35 advisories in the Expo/React Native dependency tree after compatible fixes (12 moderate, 23 high). The UI is not a production deployment. Major SDK changes and forced dependency replacements were not applied.

`node scripts/activity-check.cjs` uses an isolated database and mocked push transport to verify two-account sharing, validation, persistence, deletion, idempotency, private recipient-only notifications, retries, expired subscriptions, logout and endpoint validation. `node scripts/activity-browser-check.cjs` starts an isolated server on port 4186 and checks desktop/mobile GPS consent, Maps links, partner status synchronization, reloads, location removal, denied permission, configuration messaging and PWA assets. No real phone or push-provider delivery is claimed by these checks.
