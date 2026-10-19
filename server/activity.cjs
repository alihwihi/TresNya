const webPush = require("web-push");
const fs = require("node:fs");
const path = require("node:path");
const { createLiveLocation } = require("./live-location.cjs");

function validSubscription(s) {
  try {
    const u = new URL(s.endpoint);
    const host = u.hostname;
    return (
      u.protocol === "https:" &&
      !u.port &&
      !u.username &&
      !u.password &&
      (host === "fcm.googleapis.com" ||
        host === "updates.push.services.mozilla.com" ||
        host === "web.push.apple.com" ||
        host.endsWith(".notify.windows.com")) &&
      s.endpoint.length < 2048 &&
      /^[A-Za-z0-9_-]{87}$/.test(s.keys.p256dh) &&
      /^[A-Za-z0-9_-]{22}$/.test(s.keys.auth)
    );
  } catch {
    return false;
  }
}

function createActivity({
  db,
  directory,
  send,
  body,
  transport = webPush.sendNotification,
}) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS live_locations(username TEXT PRIMARY KEY,session_hash TEXT NOT NULL,share_id TEXT NOT NULL,started INTEGER NOT NULL,expires INTEGER NOT NULL,sequence INTEGER NOT NULL,photo TEXT,latitude REAL,longitude REAL,accuracy REAL,captured INTEGER,updated INTEGER);
    CREATE TABLE IF NOT EXISTS checkins(id INTEGER PRIMARY KEY, username TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, accuracy REAL NOT NULL, label TEXT NOT NULL, captured INTEGER NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS statuses(id TEXT PRIMARY KEY, username TEXT NOT NULL, text TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS push_devices(endpoint TEXT PRIMARY KEY, username TEXT NOT NULL, session_hash TEXT NOT NULL, subscription TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS push_queue(id INTEGER PRIMARY KEY, status_id TEXT NOT NULL, endpoint TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_try INTEGER NOT NULL);
  `);
  if (
    !db
      .prepare("PRAGMA table_info(live_locations)")
      .all()
      .some((c) => c.name === "lease_ms")
  )
    db.exec(
      "ALTER TABLE live_locations ADD COLUMN lease_ms INTEGER NOT NULL DEFAULT 45000",
    );
  const live = createLiveLocation({
    async query(sql, values = []) {
      const args = [];
      const stmt = db.prepare(
        sql.replace(/\$(\d+)/g, (_, n) => {
          args.push(values[Number(n) - 1]);
          return "?";
        }),
      );
      return /^(SELECT|.*RETURNING)/s.test(sql)
        ? { rows: stmt.all(...args) }
        : (stmt.run(...args), { rows: [] });
    },
  });
  const keyFile = path.join(directory, "web-push-keys.json");
  if (!fs.existsSync(keyFile))
    fs.writeFileSync(keyFile, JSON.stringify(webPush.generateVAPIDKeys()), {
      mode: 0o600,
    });
  const keys = JSON.parse(fs.readFileSync(keyFile, "utf8"));
  const subject = process.env.TRESNYA_PUSH_SUBJECT;
  const enabled = !!subject;
  if (enabled)
    webPush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
  let running = false,
    closed = false;
  async function flush() {
    if (!enabled || running || closed) return;
    running = true;
    try {
      db.prepare(
        "DELETE FROM push_devices WHERE session_hash NOT IN (SELECT token_hash FROM sessions WHERE expires>?)",
      ).run(Date.now());
      db.exec(
        "DELETE FROM push_queue WHERE endpoint NOT IN (SELECT endpoint FROM push_devices)",
      );
      db.prepare(
        "DELETE FROM push_queue WHERE status_id IN (SELECT id FROM statuses WHERE created<?)",
      ).run(Date.now() - 3600000);
      const jobs = db
        .prepare(
          `SELECT q.*, d.subscription, s.username, s.created FROM push_queue q JOIN push_devices d ON d.endpoint=q.endpoint JOIN statuses s ON s.id=q.status_id WHERE q.next_try<=? LIMIT 20`,
        )
        .all(Date.now());
      for (const job of jobs) {
        if (closed) break;
        // A logout/unsubscribe can happen while a preceding delivery is awaiting the provider.
        if (!db.prepare("SELECT id FROM push_queue WHERE id=?").get(job.id))
          continue;
        try {
          // Keep private status text and coordinates off the lock screen.
          await transport(
            JSON.parse(job.subscription),
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
              timeout: 10000,
            },
          );
          if (!closed)
            db.prepare("DELETE FROM push_queue WHERE id=?").run(job.id);
        } catch (error) {
          if (closed) break;
          if ([404, 410].includes(error.statusCode)) {
            db.prepare("DELETE FROM push_devices WHERE endpoint=?").run(
              job.endpoint,
            );
            db.prepare("DELETE FROM push_queue WHERE endpoint=?").run(
              job.endpoint,
            );
          } else if (job.attempts >= 5 || Date.now() - job.created > 3600000) {
            db.prepare("DELETE FROM push_queue WHERE id=?").run(job.id);
          } else {
            db.prepare(
              "UPDATE push_queue SET attempts=attempts+1,next_try=? WHERE id=?",
            ).run(
              Date.now() + Math.min(600000, 15000 * 2 ** job.attempts),
              job.id,
            );
          }
        }
      }
    } finally {
      running = false;
    }
  }
  const timer = setInterval(() => {
    void flush();
  }, 15000);
  timer.unref();
  function revoke(sessionHash) {
    db.prepare("DELETE FROM live_locations WHERE session_hash=?").run(
      sessionHash,
    );
    db.prepare(
      "DELETE FROM push_queue WHERE endpoint IN (SELECT endpoint FROM push_devices WHERE session_hash=?)",
    ).run(sessionHash);
    db.prepare("DELETE FROM push_devices WHERE session_hash=?").run(
      sessionHash,
    );
  }
  async function handle(req, res, pathname, user, sessionHash) {
    if (!pathname.startsWith("/api/activity/")) return false;
    if (!user) {
      send(res, 401, { error: "Silakan masuk." });
      return true;
    }
    const partner = user.username === "alih" ? "nana" : "alih";
    if (pathname === "/api/activity/live/state" && req.method === "GET") {
      send(res, 200, await live.state(user.username));
      return true;
    }
    if (pathname === "/api/activity/state" && req.method === "GET") {
      const locations = (username) =>
        db
          .prepare(
            "SELECT * FROM checkins WHERE username=? ORDER BY id DESC LIMIT 30",
          )
          .all(username);
      send(res, 200, {
        mine: locations(user.username),
        partner: locations(partner),
        statuses: db
          .prepare(
            "SELECT * FROM statuses ORDER BY created DESC, rowid DESC LIMIT 50",
          )
          .all(),
        pushEnabled: enabled,
        publicKey: enabled ? keys.publicKey : null,
        mapsKey: process.env.TRESNYA_GOOGLE_MAPS_EMBED_KEY || null,
      });
      return true;
    }
    if (req.method !== "POST") {
      send(res, 405, { error: "Metode tidak tersedia." });
      return true;
    }
    let input;
    try {
      input = await body(req);
      if (!input || typeof input !== "object") throw new Error();
    } catch {
      send(res, 400, { error: "Permintaan tidak valid." });
      return true;
    }
    if (pathname.startsWith("/api/activity/live/")) {
      const result = await live.handle(
        pathname.split("/").pop(),
        input,
        user.username,
        sessionHash,
      );
      send(res, result.status, result.data);
      return true;
    }
    if (pathname === "/api/activity/location") {
      const { latitude, longitude, accuracy, captured } = input;
      if (
        ![latitude, longitude, accuracy, captured].every(Number.isFinite) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180 ||
        accuracy < 0 ||
        accuracy > 100000 ||
        captured < Date.now() - 300000 ||
        captured > Date.now() + 60000 ||
        typeof input.label !== "string" ||
        input.label.length > 100
      ) {
        send(res, 400, {
          error:
            "Koordinat tidak valid atau sudah terlalu lama. Ambil lokasi lagi.",
        });
        return true;
      }
      db.prepare(
        "INSERT INTO checkins(username,latitude,longitude,accuracy,label,captured,created) VALUES(?,?,?,?,?,?,?)",
      ).run(
        user.username,
        latitude,
        longitude,
        accuracy,
        input.label.trim(),
        captured,
        Date.now(),
      );
      db.prepare(
        "DELETE FROM checkins WHERE username=? AND id NOT IN (SELECT id FROM checkins WHERE username=? ORDER BY id DESC LIMIT 30)",
      ).run(user.username, user.username);
      send(res, 201, { ok: true });
      return true;
    }
    if (pathname === "/api/activity/location/clear") {
      db.prepare("DELETE FROM live_locations WHERE username=?").run(
        user.username,
      );
      db.prepare("DELETE FROM checkins WHERE username=?").run(user.username);
      send(res, 200, { ok: true });
      return true;
    }
    if (pathname === "/api/activity/status") {
      if (
        typeof input.text !== "string" ||
        !input.text.trim() ||
        input.text.length > 500 ||
        typeof input.id !== "string" ||
        !/^[a-zA-Z0-9-]{16,80}$/.test(input.id)
      ) {
        send(res, 400, { error: "Isi status maksimal 500 karakter." });
        return true;
      }
      const existing = db
        .prepare("SELECT username,text FROM statuses WHERE id=?")
        .get(input.id);
      if (existing) {
        send(
          res,
          existing.username === user.username &&
            existing.text === input.text.trim()
            ? 200
            : 409,
          {
            ok:
              existing.username === user.username &&
              existing.text === input.text.trim(),
          },
        );
        return true;
      }
      const recent = db
        .prepare(
          "SELECT created FROM statuses WHERE username=? ORDER BY created DESC LIMIT 1",
        )
        .get(user.username);
      if (recent && Date.now() - recent.created < 5000) {
        send(res, 429, {
          error: "Tunggu beberapa detik sebelum mengirim status lagi.",
        });
        return true;
      }
      db.exec("BEGIN");
      try {
        db.prepare("INSERT INTO statuses VALUES(?,?,?,?)").run(
          input.id,
          user.username,
          input.text.trim(),
          Date.now(),
        );
        db.prepare(
          `INSERT INTO push_queue(status_id,endpoint,next_try) SELECT ?,endpoint,? FROM push_devices WHERE username=? AND session_hash IN (SELECT token_hash FROM sessions WHERE expires>?)`,
        ).run(input.id, Date.now(), partner, Date.now());
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      send(res, 201, { ok: true });
      void flush();
      return true;
    }
    if (pathname === "/api/activity/push/subscribe") {
      if (!enabled) {
        send(res, 503, {
          error: "Notifikasi ponsel belum dikonfigurasi di server.",
        });
        return true;
      }
      if (!validSubscription(input.subscription)) {
        send(res, 400, { error: "Langganan notifikasi tidak valid." });
        return true;
      }
      // An endpoint can belong to only one signed-in account at a time.
      const previous = db
        .prepare(
          "SELECT username,session_hash FROM push_devices WHERE endpoint=?",
        )
        .get(input.subscription.endpoint);
      if (
        previous &&
        (previous.username !== user.username ||
          previous.session_hash !== sessionHash)
      )
        db.prepare("DELETE FROM push_queue WHERE endpoint=?").run(
          input.subscription.endpoint,
        );
      db.prepare("INSERT OR REPLACE INTO push_devices VALUES(?,?,?,?)").run(
        input.subscription.endpoint,
        user.username,
        sessionHash,
        JSON.stringify(input.subscription),
      );
      send(res, 200, { ok: true });
      return true;
    }
    if (pathname === "/api/activity/push/unsubscribe") {
      db.prepare(
        "DELETE FROM push_queue WHERE endpoint IN (SELECT endpoint FROM push_devices WHERE endpoint=? AND username=?)",
      ).run(input.endpoint || "", user.username);
      db.prepare(
        "DELETE FROM push_devices WHERE endpoint=? AND username=?",
      ).run(input.endpoint || "", user.username);
      send(res, 200, { ok: true });
      return true;
    }
    send(res, 404, { error: "Endpoint tidak tersedia." });
    return true;
  }
  return {
    handle,
    revoke,
    flush,
    close() {
      closed = true;
      clearInterval(timer);
    },
  };
}
module.exports = { createActivity, validSubscription };
