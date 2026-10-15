# Publish TresNya with Vercel and Neon

The web page and its backend must both be deployed. A page that loads but says "Server belum terhubung" can be missing its API. This version supplies the Vercel Function and PostgreSQL storage; environment variables alone will not repair a deployment containing only the older code.

## 1. Copy your Neon connection string

1. Open the Neon Console and select the **TresNya** project.
2. Click **Connect**.
3. Choose the **production** branch, database **neondb** (or your chosen database), and its database-owner role.
4. Enable **Connection pooling**.
5. Copy only the connection string starting with `postgresql://`. Do not copy a `psql` command, surrounding quotes, or `DATABASE_URL=`. Keep all URL query parameters supplied by Neon, including SSL settings.

The string includes a database password. Paste it into Vercel, not into chat, GitHub files, or client-side Expo configuration.

Reference: [Neon connection pooling](https://neon.com/docs/connect/connection-pooling).

## 2. Add Vercel environment variables

Open **Vercel → your TresNya project → Settings → Environment Variables → Add Environment Variable**. Add these names exactly. Select **Production** for each and save it. Enter values without surrounding quotes.

| Name                            | Value                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                  | The pooled connection string copied from Neon's **production** branch                            |
| `TRESNYA_ALIH_INITIAL_PASSWORD` | A unique password you choose for `alih`, 8–256 characters                                        |
| `TRESNYA_NANA_INITIAL_PASSWORD` | A different password you choose for `nana`, 8–256 characters                                     |
| `TRESNYA_ALLOWED_ORIGINS`       | `https://tresnya.vercel.app` (use your actual production domain if different; no trailing slash) |

Save both account passwords in your password manager. These are app login passwords, separate from the Neon database password. The API stores salted password hashes. Initial-password variables create missing accounts only: editing them later does **not** reset an existing password. There is currently no password-reset flow. After successful setup, these two bootstrap variables can be removed from future deployments; retain your own saved copies.

These are server variables: do not prefix them with `EXPO_PUBLIC_`. Do not give Preview deployments your production connection string. If setting up Preview later, use a separate Neon development/test branch and configure that environment separately. A branch cloned after production setup also copies its accounts and data; the initial-password variables do not overwrite those copied accounts.

For browser phone notifications, also add:

| Name                   | Value                                                             |
| ---------------------- | ----------------------------------------------------------------- |
| `TRESNYA_PUSH_SUBJECT` | `mailto:YOUR_REAL_EMAIL_ADDRESS` with your actual contact address |

VAPID keys are generated once and stored privately in PostgreSQL. Firebase credentials are not required for this browser Web Push flow. Native APK notifications and native login are separate work and are not implemented by this deployment.

Optional embedded Google Map: add `TRESNYA_GOOGLE_MAPS_EMBED_KEY` containing a Maps Embed API key restricted to your website's HTTP referrers and that API. Google Maps pin links already work without this key.

Reference: [Vercel environment variables](https://vercel.com/docs/environment-variables).

## 3. Deploy the updated code

1. Commit and push these updated project files to the GitHub branch Vercel uses for **Production**. Include `api/`, the new `server/postgres-*.cjs` files, `vercel.json`, `package.json`, `package-lock.json`, and the updated `src/` files. Keep `.local/`, `.env*`, and `node_modules/` out of Git.
2. The project Root Directory must contain `package.json` and `vercel.json`. The committed config runs `npm ci --include=dev`, then `npm run build`, and serves `dist/` plus the API function.
3. Open **Vercel → Deployments** and wait for the deployment of that new commit to show **Ready**.
4. If you saved the environment variables after that deployment started, use its **… → Redeploy** action. Redeploy the deployment containing the new backend code; redeploying an old commit will keep the missing-API issue.

Changing environment variables affects new deployments; it does not update an already running deployment.

## 4. Verify the connection and sign in

1. Open `https://tresnya.vercel.app/api/auth/me` in a private/incognito window.
2. On the first request, the API creates its tables in the `tresnya` schema and initializes both accounts. You do not need to paste schema SQL into Neon manually. The chosen database role needs permission to create that schema/tables.
3. With no login cookie, the expected response is **HTTP 401** with `{"error":"Silakan masuk."}`. This means the API and database are responding successfully and you need to sign in.
4. Open the home page and log in as `alih` with the Alih password you saved. On your partner's phone, open the same HTTPS URL and log in as `nana` with the Nana password.
5. Submit a status in **Lokasi & kabar** and check the other phone. Reload to confirm it was saved.

| Result                                            | What to check                                                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `404 NOT_FOUND` or an HTML page at `/api/auth/me` | The deployed commit includes `api/index.js` and `vercel.json`; the project Root Directory is correct                                                          |
| `DATABASE_URL belum diatur`                       | The variable exists for **Production** and a new deployment was created after saving                                                                          |
| `Akun belum disiapkan`                            | Both initial-password variables exist and each is 8–256 characters                                                                                            |
| `Database belum terhubung`                        | The URL is complete, matches the correct Neon branch/role/database, and the role can create tables; inspect Vercel function logs for the error code           |
| `Origin tidak diizinkan` when signing in          | `TRESNYA_ALLOWED_ORIGINS` matches the exact website origin, then redeploy                                                                                     |
| Wrong password                                    | Use the initial app password used when the account was first created, not the Neon password; changing a bootstrap variable does not reset an existing account |

Neon starts with separate online data. This setup does not upload existing local SQLite locations, statuses, accounts or notification subscriptions. Keep `.local/` if you want to retain those local records.

## 5. Enable and check phone notifications

With `TRESNYA_PUSH_SUBJECT` configured, sign in on each phone and choose **Lokasi & kabar → Aktifkan notifikasi ponsel**, then allow the browser prompt. On iPhone/iPad, install the site on the Home Screen and launch it from there before enabling notifications.

A status update triggers its first delivery attempt using Vercel's `waitUntil`. Retries are stored in PostgreSQL and processed while the app polls for activity or on later status updates. No always-running background timer or recurring job is deployed. To retry even while both apps are closed, configure a scheduler to call `GET /api/jobs/push` with `Authorization: Bearer <CRON_SECRET>` and add a matching strong `CRON_SECRET` server environment variable. A 1–5 minute schedule is appropriate; verify the scheduler's plan limits before configuring it. Without a scheduler, a failed delivery may remain queued until the next app request and expires after one hour.

Logging out revokes that session's subscriptions. Sessions expire after seven days; sign in and enable/rebind notifications again. Test with two real phones: sending to a mocked push service locally does not verify device delivery.
