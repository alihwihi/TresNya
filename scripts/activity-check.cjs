const { createAuth } = require("../server/auth.cjs");
const { validSubscription } = require("../server/activity.cjs");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");

(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tresnya-activity-"));
  process.env.TRESNYA_PUSH_SUBJECT = "mailto:test@example.com";
  const deliveries = [];
  let failCode = 0;
  const pushTransport = async (sub, payload) => {
    if (failCode) throw { statusCode: failCode };
    deliveries.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
  };
  let auth = await createAuth(directory, { pushTransport });
  const credentials = [
    ...fs
      .readFileSync(path.join(directory, "access-credentials.txt"), "utf8")
      .matchAll(/Username: (\w+)\nPassword: ([^\n]+)/g),
  ].map((m) => ({ username: m[1], password: m[2] }));
  const server = http.createServer((req, res) =>
    auth
      .handle(req, res, new URL(req.url, "http://localhost").pathname)
      .catch(() => {
        res.writeHead(500);
        res.end();
      }),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/`;
  async function call(route, data, cookie, origin = "http://localhost:4173") {
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
  let db;
  try {
    const cookies = [];
    for (const c of credentials) {
      const r = await call("auth/login", c);
      assert.equal(r.status, 200);
      cookies.push(r.headers.get("set-cookie").split(";")[0]);
    }
    const [alih, nana] = cookies;
    assert.equal((await call("activity/state")).status, 401);
    assert.equal(
      (await call("activity/location", {}, nana, "https://evil.example"))
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
    assert.equal(
      (await call("activity/location", { ...point, username: "nana" }, alih))
        .status,
      201,
    );
    let state = await (await call("activity/state", undefined, nana)).json();
    assert.equal(state.partner[0].latitude, point.latitude);
    assert.equal(state.mine.length, 0);
    assert.equal((await call("activity/location/clear", {}, nana)).status, 200);
    assert.equal(
      (await (await call("activity/state", undefined, nana)).json()).partner
        .length,
      1,
    );
    const subscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test-nana",
      keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) },
    };
    assert.equal(
      validSubscription({
        ...subscription,
        endpoint: "https://127.0.0.1/private",
      }),
      false,
    );
    assert.equal(
      validSubscription({
        ...subscription,
        endpoint: "https://fcm.googleapis.com.evil.example/push",
      }),
      false,
    );
    assert.equal(
      (await call("activity/push/subscribe", { subscription }, nana)).status,
      200,
    );
    const ownSub = {
      ...subscription,
      endpoint: "https://fcm.googleapis.com/fcm/send/test-alih",
    };
    assert.equal(
      (await call("activity/push/subscribe", { subscription: ownSub }, alih))
        .status,
      200,
    );
    const status = {
      id: "test-status-000000001",
      text: "Sudah sampai dengan aman",
    };
    assert.equal(
      (await call("activity/status", { text: "" }, alih)).status,
      400,
    );
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
    auth.close();
    auth = await createAuth(directory, { pushTransport });
    state = await (await call("activity/state", undefined, nana)).json();
    assert.equal(state.statuses[0].text, status.text);
    assert.equal(state.partner.length, 1);
    db = new DatabaseSync(path.join(directory, "tresnya.sqlite"));
    const makeReady = () =>
      db.prepare("UPDATE statuses SET created=?").run(Date.now() - 10000);
    makeReady();
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
      db.prepare("SELECT attempts FROM push_queue").get().attempts,
      1,
    );
    failCode = 0;
    db.exec("UPDATE push_queue SET next_try=0");
    await auth.flushPush();
    assert.equal(deliveries.length, 2);
    makeReady();
    failCode = 410;
    await call(
      "activity/status",
      { ...status, id: "test-status-000000004" },
      alih,
    );
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS n FROM push_devices WHERE username=?")
        .get("nana").n,
      0,
    );
    failCode = 0;
    await call("activity/push/subscribe", { subscription }, nana);
    await call(
      "activity/push/unsubscribe",
      { endpoint: subscription.endpoint },
      alih,
    );
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS n FROM push_devices WHERE username=?")
        .get("nana").n,
      1,
    );
    await call("auth/logout", {}, nana);
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS n FROM push_devices WHERE username=?")
        .get("nana").n,
      0,
    );
    await call("activity/location/clear", {}, alih);
    assert.equal(
      (await (await call("activity/state", undefined, alih)).json()).mine
        .length,
      0,
    );
    console.log(
      "PASS: authenticated two-account sync, GPS validation, ownership, persistence, location deletion, recipient-only push, idempotency, private payload, retry, expired subscription cleanup, logout revocation, SSRF rejection. Push delivery mocked; no external notifications sent.",
    );
  } finally {
    db?.close();
    await new Promise((resolve) => server.close(resolve));
    auth.close();
    if (
      path.dirname(directory) === os.tmpdir() &&
      path.basename(directory).startsWith("tresnya-activity-")
    )
      fs.rmSync(directory, { recursive: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
