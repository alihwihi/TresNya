const { DatabaseSync } = require("node:sqlite");
const {
  randomBytes,
  scrypt,
  createHash,
  timingSafeEqual,
} = require("node:crypto");
const { promisify } = require("node:util");
const fs = require("node:fs");
const path = require("node:path");
const { createActivity } = require("./activity.cjs");
const derive = promisify(scrypt);
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const profiles = [
  { username: "alih", name: "Alih", gender: "male", partner: "Nana" },
  { username: "nana", name: "Nana", gender: "female", partner: "Alih" },
];
const ttl = 7 * 24 * 3600;

async function createAuth(directory, options = {}) {
  fs.mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(path.join(directory, "tresnya.sqlite"));
  db.exec(
    `PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS accounts(username TEXT PRIMARY KEY, salt TEXT NOT NULL, password_hash TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, username TEXT NOT NULL, expires INTEGER NOT NULL);`,
  );
  const created = [];
  for (const p of profiles) {
    if (
      db
        .prepare("SELECT username FROM accounts WHERE username=?")
        .get(p.username)
    )
      continue;
    const password = randomBytes(18).toString("base64url");
    const salt = randomBytes(16).toString("hex");
    const hash = await derive(password, salt, 64);
    db.prepare("INSERT INTO accounts VALUES(?,?,?)").run(
      p.username,
      salt,
      hash.toString("hex"),
    );
    created.push(
      `${p.name} (${p.gender})\nUsername: ${p.username}\nPassword: ${password}\n`,
    );
  }
  if (created.length)
    fs.appendFileSync(
      path.join(directory, "access-credentials.txt"),
      "TresNya — initial local account credentials. Keep private; do not commit or share publicly.\n\n" +
        created.join("\n"),
      { mode: 0o600 },
    );
  const attempts = new Map();
  const allowedOrigins = new Set([
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    ...(process.env.TRESNYA_ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ]);
  function cookie(token, age = ttl) {
    return `tresnya_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${process.env.TRESNYA_SECURE_COOKIE === "1" ? "; Secure" : ""}`;
  }
  function tokenFrom(req) {
    return (
      /(?:^|;\s*)tresnya_session=([A-Za-z0-9_-]+)/.exec(
        req.headers.cookie || "",
      )?.[1] || ""
    );
  }
  function userFrom(req) {
    const record = db
      .prepare("SELECT username FROM sessions WHERE token_hash=? AND expires>?")
      .get(hashToken(tokenFrom(req)), Date.now());
    return record ? profiles.find((p) => p.username === record.username) : null;
  }
  function send(res, code, data) {
    res.writeHead(code, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(data));
  }
  async function body(req) {
    let input = "";
    for await (const chunk of req) {
      input += chunk;
      if (Buffer.byteLength(input) > 8192) throw new Error("body-too-large");
    }
    return JSON.parse(input);
  }
  const activity = createActivity({
    db,
    directory,
    send,
    body,
    transport: options.pushTransport,
  });
  async function handle(req, res, pathname) {
    if (!pathname.startsWith("/api/")) return false;
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      send(res, 403, { error: "Origin tidak diizinkan." });
      return true;
    }
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
      return true;
    }
    if (
      req.method === "POST" &&
      !req.headers["content-type"]?.startsWith("application/json")
    ) {
      send(res, 415, { error: "Gunakan JSON." });
      return true;
    }
    if (pathname === "/api/auth/me" && req.method === "GET") {
      const user = userFrom(req);
      send(
        res,
        user ? 200 : 401,
        user ? { user } : { error: "Silakan masuk." },
      );
      return true;
    }
    if (pathname === "/api/auth/login" && req.method === "POST") {
      const ip = req.socket.remoteAddress;
      const now = Date.now();
      for (const [key, value] of attempts)
        if (value.until <= now) attempts.delete(key);
      const entry = attempts.get(ip) || { count: 0, until: now + 15 * 60000 };
      if (entry.count >= 10) {
        res.setHeader("Retry-After", Math.ceil((entry.until - now) / 1000));
        send(res, 429, {
          error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
        });
        return true;
      }
      entry.count++;
      attempts.set(ip, entry);
      let input;
      try {
        input = await body(req);
      } catch {
        send(res, 400, { error: "Permintaan tidak valid." });
        return true;
      }
      const username =
        typeof input.username === "string"
          ? input.username.trim().toLowerCase()
          : "";
      const password = typeof input.password === "string" ? input.password : "";
      if (password.length > 256) {
        send(res, 400, { error: "Kata sandi terlalu panjang." });
        return true;
      }
      const row = db
        .prepare("SELECT * FROM accounts WHERE username=?")
        .get(username);
      const candidate = await derive(
        password,
        row?.salt || "invalid-account-salt",
        64,
      );
      if (
        !row ||
        !timingSafeEqual(candidate, Buffer.from(row.password_hash, "hex"))
      ) {
        send(res, 401, { error: "Nama pengguna atau kata sandi salah." });
        return true;
      }
      attempts.delete(ip);
      db.prepare("DELETE FROM sessions WHERE expires<=? OR token_hash=?").run(
        now,
        hashToken(tokenFrom(req)),
      );
      const token = randomBytes(32).toString("base64url");
      db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
        hashToken(token),
        username,
        now + ttl * 1000,
      );
      res.setHeader("Set-Cookie", cookie(token));
      send(res, 200, { user: profiles.find((p) => p.username === username) });
      return true;
    }
    if (pathname === "/api/auth/logout" && req.method === "POST") {
      activity.revoke(hashToken(tokenFrom(req)));
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
        hashToken(tokenFrom(req)),
      );
      res.setHeader("Set-Cookie", cookie("", 0));
      send(res, 200, { ok: true });
      return true;
    }
    if (
      await activity.handle(
        req,
        res,
        pathname,
        userFrom(req),
        hashToken(tokenFrom(req)),
      )
    )
      return true;
    send(res, 404, { error: "Endpoint tidak tersedia." });
    return true;
  }
  return {
    handle,
    flushPush: activity.flush,
    close: () => {
      activity.close();
      db.close();
    },
  };
}
module.exports = { createAuth };
