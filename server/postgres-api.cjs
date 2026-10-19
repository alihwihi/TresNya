const { tokenFrom } = require("./session-token.cjs");
const {
  randomBytes,
  scrypt,
  createHash,
  timingSafeEqual,
  randomUUID,
} = require("node:crypto");
const { promisify } = require("node:util");
const webPush = require("web-push");
const { validSubscription } = require("./activity.cjs");
const { schema } = require("./postgres-schema.cjs");
const { createLiveLocation } = require("./live-location.cjs");
const derive = promisify(scrypt);
const digest = (text) => createHash("sha256").update(text).digest("hex");
const profiles = [
  { username: "alih", name: "Alih", gender: "male", partner: "Nana" },
  { username: "nana", name: "Nana", gender: "female", partner: "Alih" },
];
const ttl = 7 * 24 * 3600;
class SetupError extends Error {}
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(data));
}
async function body(req) {
  try {
    let input = req.body;
    if (input === undefined) {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 65536) throw new Error();
      }
      input = JSON.parse(raw);
    } else if (typeof input === "string" || Buffer.isBuffer(input))
      input = JSON.parse(input.toString());
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Buffer.byteLength(JSON.stringify(input)) > 65536
    )
      throw new Error();
    return input;
  } catch {
    throw new ApiError(400, "Permintaan tidak valid.");
  }
}
function createPostgresApi({
  db,
  env = process.env,
  pushTransport = webPush.sendNotification,
  defer,
}) {
  let initialization;
  const live = createLiveLocation(db, "tresnya.");
  async function initialize() {
    if (!initialization)
      initialization = db
        .transaction(async (tx) => {
          // Serialize first-use schema/account creation across serverless instances.
          await tx.query("SELECT pg_advisory_xact_lock(78201413)");
          await tx.query(schema);
          for (const profile of profiles) {
            const exists = await tx.query(
              "SELECT username FROM tresnya.accounts WHERE username=$1",
              [profile.username],
            );
            if (exists.rows.length) continue;
            const password =
              env[`TRESNYA_${profile.username.toUpperCase()}_INITIAL_PASSWORD`];
            if (!password || password.length < 8 || password.length > 256)
              throw new SetupError(
                "Akun belum disiapkan. Pemilik aplikasi perlu mengatur TRESNYA_ALIH_INITIAL_PASSWORD dan TRESNYA_NANA_INITIAL_PASSWORD (8–256 karakter) di Vercel, lalu deploy ulang.",
              );
            const salt = randomBytes(16).toString("hex");
            const hash = (await derive(password, salt, 64)).toString("hex");
            await tx.query(
              "INSERT INTO tresnya.accounts VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
              [profile.username, salt, hash],
            );
          }
          await tx.query(
            "INSERT INTO tresnya.app_settings VALUES($1,$2) ON CONFLICT DO NOTHING",
            ["vapid", JSON.stringify(webPush.generateVAPIDKeys())],
          );
          return (
            await tx.query(
              "SELECT value FROM tresnya.app_settings WHERE key=$1",
              ["vapid"],
            )
          ).rows[0].value;
        })
        .catch((error) => {
          initialization = null;
          throw error;
        });
    return initialization;
  }

  function cookie(token, age = ttl) {
    return `tresnya_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${env.VERCEL || env.TRESNYA_SECURE_COOKIE === "1" ? "; Secure" : ""}`;
  }
  function origins() {
    return new Set([
      ...(!env.VERCEL
        ? [
            "http://localhost:4173",
            "http://localhost:4174",
            "http://localhost:8081",
            "http://127.0.0.1:4173",
          ]
        : []),
      ...(env.TRESNYA_ALLOWED_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      ...[env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
        .filter(Boolean)
        .map((host) => `https://${host}`),
    ]);
  }
  async function currentUser(sessionHash) {
    const session = (
      await db.query(
        "SELECT username FROM tresnya.sessions WHERE token_hash=$1 AND expires>$2",
        [sessionHash, Date.now()],
      )
    ).rows[0];
    return session
      ? profiles.find((p) => p.username === session.username)
      : null;
  }
  async function flushPush() {
    if (!env.TRESNYA_PUSH_SUBJECT) return;
    const keys = await initialize();
    const now = Date.now(),
      lease = randomUUID();
    const jobs = await db.transaction(async (tx) => {
      await tx.query("DELETE FROM tresnya.sessions WHERE expires<=$1", [now]);
      await tx.query(
        "DELETE FROM tresnya.push_queue WHERE status_id IN (SELECT id FROM tresnya.statuses WHERE created<$1)",
        [now - 3600000],
      );
      return (
        await tx.query(
          `WITH claimed AS (
        SELECT id FROM tresnya.push_queue WHERE next_try<=$1 AND lease_until<=$1 ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 10
      ), updated AS (
        UPDATE tresnya.push_queue q SET lease_until=$2,lease_token=$3 FROM claimed WHERE q.id=claimed.id RETURNING q.*
      ) SELECT q.*,d.subscription,s.username,s.created FROM updated q JOIN tresnya.push_devices d ON d.endpoint=q.endpoint JOIN tresnya.statuses s ON s.id=q.status_id`,
          [now, now + 60000, lease],
        )
      ).rows;
    });
    await Promise.all(
      jobs.map(async (job) => {
        // Re-check after claiming so logout/unsubscribe can cancel jobs before delivery.
        if (
          !(
            await db.query(
              "SELECT id FROM tresnya.push_queue WHERE id=$1 AND lease_token=$2",
              [job.id, lease],
            )
          ).rows.length
        )
          return;
        try {
          await pushTransport(
            job.subscription,
            JSON.stringify({
              title: "Kabar baru di TresNya",
              body: `${job.username === "alih" ? "Alih" : "Nana"} memperbarui status. Buka ruang kalian untuk membacanya.`,
              id: job.status_id,
            }),
            {
              TTL: Math.max(
                1,
                Math.ceil((job.created + 3600000 - Date.now()) / 1000),
              ),
              timeout: 8000,
              vapidDetails: {
                subject: env.TRESNYA_PUSH_SUBJECT,
                publicKey: keys.publicKey,
                privateKey: keys.privateKey,
              },
            },
          );
          await db.query(
            "DELETE FROM tresnya.push_queue WHERE id=$1 AND lease_token=$2",
            [job.id, lease],
          );
        } catch (error) {
          if ([404, 410].includes(error.statusCode))
            await db.query(
              "DELETE FROM tresnya.push_devices WHERE endpoint=$1 AND subscription=$2::jsonb",
              [job.endpoint, JSON.stringify(job.subscription)],
            );
          else if (job.attempts >= 5)
            await db.query(
              "DELETE FROM tresnya.push_queue WHERE id=$1 AND lease_token=$2",
              [job.id, lease],
            );
          else
            await db.query(
              "UPDATE tresnya.push_queue SET attempts=attempts+1,next_try=$1,lease_until=0,lease_token=NULL WHERE id=$2 AND lease_token=$3",
              [
                Date.now() + Math.min(600000, 15000 * 2 ** job.attempts),
                job.id,
                lease,
              ],
            );
        }
      }),
    );
  }
  function schedulePush() {
    const pending = flushPush().catch(() =>
      console.error("Push queue processing failed; jobs remain queued."),
    );
    if (defer) defer(pending);
    return pending;
  }
  async function handle(req, res) {
    try {
      const url = new URL(req.url, "http://localhost");
      const route = req.query?.route || url.searchParams.get("route");
      const pathname =
        typeof route === "string" ? `/api/${route}` : url.pathname;
      const origin = req.headers.origin;
      if (origin && !origins().has(origin))
        throw new ApiError(403, "Origin tidak diizinkan.");
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Vary", "Origin");
      }
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Methods": "GET, POST",
          "Access-Control-Allow-Headers": "Content-Type",
        });
        res.end();
        return;
      }
      if (!["GET", "POST"].includes(req.method))
        throw new ApiError(405, "Metode tidak tersedia.");
      if (
        req.method === "POST" &&
        !req.headers["content-type"]?.startsWith("application/json")
      )
        throw new ApiError(415, "Gunakan JSON.");
      if (pathname === "/api/jobs/push") {
        if (
          !env.CRON_SECRET ||
          req.headers.authorization !== `Bearer ${env.CRON_SECRET}`
        )
          throw new ApiError(401, "Tidak diizinkan.");
        await flushPush();
        send(res, 200, { ok: true });
        return;
      }
      const keys = await initialize();
      const sessionHash = digest(tokenFrom(req));
      if (
        ["/api/auth/login", "/api/auth/native-login"].includes(pathname) &&
        req.method === "POST"
      ) {
        const native = pathname === "/api/auth/native-login";
        if (native && req.headers.origin) {
          send(res, 403, { error: "Gunakan login web untuk browser." });
          return;
        }
        const input = await body(req);
        const username =
          typeof input.username === "string"
            ? input.username.trim().toLowerCase()
            : "";
        const password =
          typeof input.password === "string" ? input.password : "";
        if (password.length > 256 || username.length > 100)
          throw new ApiError(400, "Permintaan tidak valid.");
        // Count per account in the database; this survives cold starts and cannot be bypassed with spoofed IPs.
        const key = digest(
            `login:${profiles.some((p) => p.username === username) ? username : "unknown"}`,
          ),
          now = Date.now();
        const attempt = (
          await db.query(
            `INSERT INTO tresnya.login_attempts VALUES($1,1,$2)
          ON CONFLICT(key) DO UPDATE SET count=CASE WHEN tresnya.login_attempts.expires<=$3 THEN 1 ELSE tresnya.login_attempts.count+1 END,
          expires=CASE WHEN tresnya.login_attempts.expires<=$3 THEN $2 ELSE tresnya.login_attempts.expires END RETURNING count,expires`,
            [key, now + 900000, now],
          )
        ).rows[0];
        if (attempt.count > 10) {
          res.setHeader(
            "Retry-After",
            Math.ceil((attempt.expires - now) / 1000),
          );
          throw new ApiError(
            429,
            "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
          );
        }
        const row = (
          await db.query("SELECT * FROM tresnya.accounts WHERE username=$1", [
            username,
          ])
        ).rows[0];
        const candidate = await derive(
          password,
          row?.salt || "invalid-account-salt",
          64,
        );
        if (
          !row ||
          !timingSafeEqual(candidate, Buffer.from(row.password_hash, "hex"))
        )
          throw new ApiError(401, "Nama pengguna atau kata sandi salah.");
        const token =
          (native ? "tn_" : "") + randomBytes(32).toString("base64url");
        await db.transaction(async (tx) => {
          await tx.query("DELETE FROM tresnya.login_attempts WHERE key=$1", [
            key,
          ]);
          await tx.query(
            "DELETE FROM tresnya.sessions WHERE token_hash=$1 OR expires<=$2",
            [sessionHash, now],
          );
          await tx.query("INSERT INTO tresnya.sessions VALUES($1,$2,$3)", [
            digest(token),
            username,
            now + ttl * 1000,
          ]);
        });
        if (!native) res.setHeader("Set-Cookie", cookie(token));
        send(res, 200, {
          user: profiles.find((p) => p.username === username),
          ...(native ? { token, expires: now + ttl * 1000 } : {}),
        });
        return;
      }
      if (pathname === "/api/auth/logout" && req.method === "POST") {
        await db.query("DELETE FROM tresnya.sessions WHERE token_hash=$1", [
          sessionHash,
        ]);
        res.setHeader("Set-Cookie", cookie("", 0));
        send(res, 200, { ok: true });
        return;
      }
      const user = await currentUser(sessionHash);
      if (!user) throw new ApiError(401, "Silakan masuk.");
      if (pathname === "/api/auth/me" && req.method === "GET") {
        send(res, 200, { user });
        return;
      }
      const partner = user.username === "alih" ? "nana" : "alih";
      if (pathname === "/api/activity/live/state" && req.method === "GET") {
        send(res, 200, await live.state(user.username));
        return;
      }
      if (pathname === "/api/activity/state" && req.method === "GET") {
        const [mine, other, statuses] = await Promise.all([
          db.query(
            "SELECT * FROM tresnya.checkins WHERE username=$1 ORDER BY id DESC LIMIT 30",
            [user.username],
          ),
          db.query(
            "SELECT * FROM tresnya.checkins WHERE username=$1 ORDER BY id DESC LIMIT 30",
            [partner],
          ),
          db.query(
            "SELECT * FROM tresnya.statuses ORDER BY created DESC,id DESC LIMIT 50",
          ),
        ]);
        if (defer) schedulePush();
        send(res, 200, {
          mine: mine.rows,
          partner: other.rows,
          statuses: statuses.rows,
          pushEnabled: !!env.TRESNYA_PUSH_SUBJECT,
          publicKey: env.TRESNYA_PUSH_SUBJECT ? keys.publicKey : null,
          mapsKey: env.TRESNYA_GOOGLE_MAPS_EMBED_KEY || null,
        });
        return;
      }
      if (req.method !== "POST")
        throw new ApiError(404, "Endpoint tidak tersedia.");
      const input = await body(req);
      if (pathname.startsWith("/api/activity/live/")) {
        const result = await live.handle(
          pathname.split("/").pop(),
          input,
          user.username,
          sessionHash,
        );
        send(res, result.status, result.data);
        return;
      }
      if (pathname === "/api/activity/location") {
        const { latitude, longitude, accuracy, captured, label } = input;
        if (
          ![latitude, longitude, accuracy, captured].every(Number.isFinite) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180 ||
          accuracy < 0 ||
          accuracy > 100000 ||
          captured < Date.now() - 300000 ||
          captured > Date.now() + 60000 ||
          typeof label !== "string" ||
          label.length > 100
        )
          throw new ApiError(
            400,
            "Koordinat tidak valid atau sudah terlalu lama. Ambil lokasi lagi.",
          );
        await db.transaction(async (tx) => {
          await tx.query(
            "SELECT username FROM tresnya.accounts WHERE username=$1 FOR UPDATE",
            [user.username],
          );
          await tx.query(
            "INSERT INTO tresnya.checkins(username,latitude,longitude,accuracy,label,captured,created) VALUES($1,$2,$3,$4,$5,$6,$7)",
            [
              user.username,
              latitude,
              longitude,
              accuracy,
              label.trim(),
              captured,
              Date.now(),
            ],
          );
          await tx.query(
            "DELETE FROM tresnya.checkins WHERE username=$1 AND id NOT IN (SELECT id FROM tresnya.checkins WHERE username=$1 ORDER BY id DESC LIMIT 30)",
            [user.username],
          );
        });
        send(res, 201, { ok: true });
        return;
      }
      if (pathname === "/api/activity/location/clear") {
        await db.query("DELETE FROM tresnya.live_locations WHERE username=$1", [
          user.username,
        ]);
        await db.query("DELETE FROM tresnya.checkins WHERE username=$1", [
          user.username,
        ]);
        send(res, 200, { ok: true });
        return;
      }
      if (pathname === "/api/activity/status") {
        if (
          typeof input.text !== "string" ||
          !input.text.trim() ||
          input.text.length > 500 ||
          typeof input.id !== "string" ||
          !/^[a-zA-Z0-9-]{16,80}$/.test(input.id)
        )
          throw new ApiError(400, "Isi status maksimal 500 karakter.");
        const code = await db.transaction(async (tx) => {
          await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
            `status:${input.id}`,
          ]);
          await tx.query(
            "SELECT username FROM tresnya.accounts WHERE username=$1 FOR UPDATE",
            [user.username],
          );
          const exists = (
            await tx.query("SELECT * FROM tresnya.statuses WHERE id=$1", [
              input.id,
            ])
          ).rows[0];
          if (exists) {
            if (
              exists.username !== user.username ||
              exists.text !== input.text.trim()
            )
              throw new ApiError(409, "ID status sudah digunakan.");
            return 200;
          }
          const recent = (
            await tx.query(
              "SELECT created FROM tresnya.statuses WHERE username=$1 ORDER BY created DESC LIMIT 1",
              [user.username],
            )
          ).rows[0];
          if (recent && Date.now() - recent.created < 5000)
            throw new ApiError(
              429,
              "Tunggu beberapa detik sebelum mengirim status lagi.",
            );
          await tx.query("INSERT INTO tresnya.statuses VALUES($1,$2,$3,$4)", [
            input.id,
            user.username,
            input.text.trim(),
            Date.now(),
          ]);
          await tx.query(
            `INSERT INTO tresnya.push_queue(status_id,endpoint,next_try) SELECT $1,d.endpoint,$2 FROM tresnya.push_devices d JOIN tresnya.sessions s ON s.token_hash=d.session_hash WHERE d.username=$3 AND s.expires>$2 ON CONFLICT DO NOTHING`,
            [input.id, Date.now(), partner],
          );
          return 201;
        });
        if (defer) schedulePush();
        else await flushPush();
        send(res, code, { ok: true });
        return;
      }
      if (pathname === "/api/activity/push/subscribe") {
        if (!env.TRESNYA_PUSH_SUBJECT)
          throw new ApiError(
            503,
            "Notifikasi ponsel belum dikonfigurasi di server.",
          );
        if (!validSubscription(input.subscription))
          throw new ApiError(400, "Langganan notifikasi tidak valid.");
        await db.transaction(async (tx) => {
          // Lock the endpoint even before it has a row, so simultaneous account switches cannot cross-deliver.
          await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
            input.subscription.endpoint,
          ]);
          const prev = (
            await tx.query(
              "SELECT * FROM tresnya.push_devices WHERE endpoint=$1",
              [input.subscription.endpoint],
            )
          ).rows[0];
          if (
            prev &&
            (prev.username !== user.username ||
              prev.session_hash !== sessionHash)
          )
            await tx.query("DELETE FROM tresnya.push_queue WHERE endpoint=$1", [
              input.subscription.endpoint,
            ]);
          await tx.query(
            `INSERT INTO tresnya.push_devices VALUES($1,$2,$3,$4) ON CONFLICT(endpoint) DO UPDATE SET username=EXCLUDED.username,session_hash=EXCLUDED.session_hash,subscription=EXCLUDED.subscription`,
            [
              input.subscription.endpoint,
              user.username,
              sessionHash,
              JSON.stringify(input.subscription),
            ],
          );
        });
        send(res, 200, { ok: true });
        return;
      }
      if (pathname === "/api/activity/push/unsubscribe") {
        if (typeof input.endpoint !== "string")
          throw new ApiError(400, "Langganan tidak valid.");
        await db.query(
          "DELETE FROM tresnya.push_devices WHERE endpoint=$1 AND username=$2",
          [input.endpoint, user.username],
        );
        send(res, 200, { ok: true });
        return;
      }
      throw new ApiError(404, "Endpoint tidak tersedia.");
    } catch (error) {
      if (error instanceof ApiError) {
        send(res, error.status, { error: error.message });
        return;
      }
      if (error instanceof SetupError) {
        send(res, 503, { error: error.message });
        return;
      }
      // Do not expose SQL, connection strings, tokens or passwords in responses/logs.
      console.error(
        "PostgreSQL API failed:",
        /^[A-Z0-9]{5}$/.test(error.code || "")
          ? error.code
          : "connection-or-query",
      );
      send(res, 503, {
        error:
          "Database belum terhubung. Pemilik aplikasi perlu memeriksa DATABASE_URL dan log fungsi di Vercel.",
      });
    }
  }
  return { handle, initialize, flushPush };
}
module.exports = { createPostgresApi, send };
