const assert = require("node:assert/strict");
const http = require("node:http");
const { randomBytes, createHash } = require("node:crypto");
const { PGlite } = require("@electric-sql/pglite");
const { createPostgresApi } = require("../server/postgres-api.cjs");
const { schema } = require("../server/postgres-schema.cjs");

(async () => {
  // Embedded PostgreSQL executes the production SQL. Network/TLS/Neon pooling
  // and multi-process locking still require a deployed integration check.
  const pg = new PGlite();
  const wrap = (client) => ({
    query: (sql, values) =>
      sql === schema ? client.exec(sql) : client.query(sql, values),
  });
  const db = {
    ...wrap(pg),
    transaction: (task) => pg.transaction((tx) => task(wrap(tx))),
  };
  const env = {
    VERCEL: "1",
    VERCEL_PROJECT_PRODUCTION_URL: "tresnya.example",
    TRESNYA_PUSH_SUBJECT: "mailto:test@example.com",
  };
  const passwords = {
    alih: randomBytes(24).toString("base64url"),
    nana: randomBytes(24).toString("base64url"),
  };
  let failCode = 0;
  const deliveries = [];
  const pushTransport = async (sub, payload) => {
    if (failCode) throw { statusCode: failCode };
    deliveries.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
  };
  let api = createPostgresApi({ db, env, pushTransport });
  const server = http.createServer((req, res) => api.handle(req, res));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/`;
  async function call(route, data, cookie, origin = "https://tresnya.example") {
    return fetch(base + route, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        Origin: origin,
        ...(data === undefined ? {} : { "Content-Type": "application/json" }),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }
  const count = async (table) =>
    (await db.query(`SELECT count(*)::int AS n FROM tresnya.${table}`)).rows[0]
      .n;
  const readyStatus = () =>
    db.query("UPDATE tresnya.statuses SET created=$1", [Date.now() - 10000]);
  try {
    assert.equal(
      (await call("auth/me")).status,
      503,
      "missing bootstrap config is actionable",
    );
    assert.equal(
      (await db.query("SELECT to_regclass('tresnya.accounts') AS name")).rows[0]
        .name,
      null,
      "bootstrap failure rolls back schema",
    );
    env.TRESNYA_ALIH_INITIAL_PASSWORD = passwords.alih;
    env.TRESNYA_NANA_INITIAL_PASSWORD = passwords.nana;
    assert.equal((await call("auth/me")).status, 401);
    const keys = await api.initialize();
    assert.equal(await count("accounts"), 2);
    const rows = await db.query("SELECT * FROM tresnya.accounts");
    for (const row of rows.rows) {
      assert.notEqual(row.password_hash, passwords[row.username]);
      assert.equal(row.password_hash.length, 128);
    }
    assert.equal(
      (await call("auth/login", { username: "alih", password: "wrong" }))
        .status,
      401,
    );
    const cookies = [];
    for (const username of ["alih", "nana"]) {
      const r = await call("auth/login", {
        username,
        password: passwords[username],
      });
      assert.equal(r.status, 200);
      assert.match(
        r.headers.get("set-cookie"),
        /HttpOnly; SameSite=Strict.*; Secure/,
      );
      cookies.push(r.headers.get("set-cookie").split(";")[0]);
    }
    const [alih, nana] = cookies;
    assert.equal(
      (await call("index?route=auth/me", undefined, alih)).status,
      200,
      "Vercel rewrite routes",
    );
    assert.equal((await call("activity/state")).status, 401);
    assert.equal(
      (await call("activity/location", {}, alih, "https://evil.example"))
        .status,
      403,
    );
    assert.equal(
      (await call("activity/location", { latitude: 91 }, alih)).status,
      400,
    );
    const point = {
      latitude: -6.917464,
      longitude: 107.619123,
      accuracy: 12,
      label: "Bandung",
      captured: Date.now(),
    };
    assert.equal(
      (await call("activity/location", { ...point, captured: 0 }, alih)).status,
      400,
    );
    for (let i = 0; i < 31; i++)
      assert.equal(
        (await call("activity/location", { ...point, username: "nana" }, alih))
          .status,
        201,
      );
    let state = await (await call("activity/state", undefined, nana)).json();
    assert.equal(state.partner.length, 30);
    assert.equal(state.mine.length, 0);
    assert.equal(state.partner[0].latitude, point.latitude);
    assert.equal((await call("activity/location/clear", {}, nana)).status, 200);
    assert.equal(await count("checkins"), 30);
    const subscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test-nana",
      keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) },
    };
    assert.equal(
      (
        await call(
          "activity/push/subscribe",
          {
            subscription: {
              ...subscription,
              endpoint: "https://127.0.0.1/private",
            },
          },
          nana,
        )
      ).status,
      400,
    );
    assert.equal(
      (await call("activity/push/subscribe", { subscription }, nana)).status,
      200,
    );
    assert.equal(
      (
        await call(
          "activity/push/subscribe",
          {
            subscription: {
              ...subscription,
              endpoint: "https://fcm.googleapis.com/fcm/send/test-alih",
            },
          },
          alih,
        )
      ).status,
      200,
    );
    const status = {
      id: "test-status-000000001",
      text: "Sudah sampai dengan aman",
    };
    assert.equal((await call("activity/status", status, alih)).status, 201);
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].endpoint, subscription.endpoint);
    assert.ok(!JSON.stringify(deliveries[0].payload).includes(status.text));
    assert.equal((await call("activity/status", status, alih)).status, 200);
    assert.equal(deliveries.length, 1);
    assert.equal((await call("activity/status", status, nana)).status, 409);
    assert.equal(
      (
        await call(
          "activity/status",
          { ...status, id: "test-status-000000002" },
          alih,
        )
      ).status,
      429,
    );
    // A fresh serverless instance preserves credentials, session and VAPID keys.
    delete env.TRESNYA_ALIH_INITIAL_PASSWORD;
    delete env.TRESNYA_NANA_INITIAL_PASSWORD;
    api = createPostgresApi({ db, env, pushTransport });
    assert.deepEqual(await api.initialize(), keys);
    state = await (await call("activity/state", undefined, nana)).json();
    assert.equal(state.statuses[0].text, status.text);
    await readyStatus();
    failCode = 503;
    assert.equal(
      (
        await call(
          "activity/status",
          { ...status, id: "test-status-000000003" },
          alih,
        )
      ).status,
      201,
    );
    assert.equal(
      (await db.query("SELECT attempts FROM tresnya.push_queue")).rows[0]
        .attempts,
      1,
    );
    failCode = 0;
    await db.query("UPDATE tresnya.push_queue SET next_try=0");
    await Promise.all([api.flushPush(), api.flushPush()]);
    assert.equal(
      deliveries.length,
      2,
      "simultaneous flushes do not duplicate a claim",
    );
    assert.equal(await count("push_queue"), 0);
    await readyStatus();
    failCode = 410;
    await call(
      "activity/status",
      { ...status, id: "test-status-000000004" },
      alih,
    );
    assert.equal(await count("push_devices"), 1);
    failCode = 503;
    await call("activity/push/subscribe", { subscription }, nana);
    await readyStatus();
    await call(
      "activity/status",
      { ...status, id: "test-status-000000005" },
      alih,
    );
    assert.equal(await count("push_queue"), 1);
    await call(
      "activity/push/unsubscribe",
      { endpoint: subscription.endpoint },
      alih,
    );
    assert.equal(
      await count("push_queue"),
      1,
      "one account cannot revoke the other device",
    );
    await call("auth/logout", {}, nana);
    assert.equal(
      await count("push_queue"),
      0,
      "logout cancels queued notifications",
    );
    assert.equal(await count("push_devices"), 1);
    assert.equal((await call("auth/me", undefined, nana)).status, 401);
    await call("activity/location/clear", {}, alih);
    assert.equal(await count("checkins"), 0);
    const token = alih.split("=")[1];
    const hash = createHash("sha256").update(token).digest("hex");
    assert.equal(
      (await db.query("SELECT token_hash FROM tresnya.sessions")).rows[0]
        .token_hash,
      hash,
    );
    await db.query("UPDATE tresnya.sessions SET expires=0");
    assert.equal((await call("auth/me", undefined, alih)).status, 401);
    failCode = 0;
    await api.flushPush();
    assert.equal(
      await count("push_devices"),
      0,
      "expired sessions revoke notifications",
    );
    for (let i = 0; i < 10; i++)
      assert.equal(
        (await call("auth/login", { username: "alih", password: "wrong" }))
          .status,
        401,
      );
    api = createPostgresApi({ db, env, pushTransport });
    assert.equal(
      (await call("auth/login", { username: "alih", password: passwords.alih }))
        .status,
      429,
      "rate limits survive cold starts",
    );
    assert.equal((await call("jobs/push")).status, 401);
    console.log(
      "PASS: PostgreSQL bootstrap/rollback, hashed credentials, secure sessions, rewrite routing, origin checks, location sharing/pruning/ownership, cold-start persistence, recipient-only push, idempotency, retry/lease claiming, expired subscriptions, logout, rate limiting. Push mocked; Neon network and Vercel hosting not tested.",
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pg.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
