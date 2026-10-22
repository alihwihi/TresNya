const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const { createAuth } = require("../server/auth.cjs");
const { createPostgresApi } = require("../server/postgres-api.cjs");
const { schema } = require("../server/postgres-schema.cjs");
const { PGlite } = require("@electric-sql/pglite");
const { DatabaseSync } = require("node:sqlite");
(async () => {
  for (const backend of ["sqlite", "postgres"]) {
    let api, sql, close, dir;
    const password = randomBytes(18).toString("hex");
    let credentials;
    if (backend === "sqlite") {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), "tresnya-live-"));
      api = await createAuth(dir);
      const db = new DatabaseSync(path.join(dir, "tresnya.sqlite"));
      sql = async (s) => db.exec(s);
      close = async () => {
        db.close();
        api.close();
      };
      credentials = [
        ...fs
          .readFileSync(path.join(dir, "access-credentials.txt"), "utf8")
          .matchAll(/Username: (\w+)\r?\nPassword: ([^\r\n]+)/g),
      ].map((m) => ({ username: m[1], password: m[2] }));
    } else {
      const pg = new PGlite();
      const wrap = (c) => ({
        query: (s, v) => (s === schema ? c.exec(s) : c.query(s, v)),
      });
      const db = {
        ...wrap(pg),
        transaction: (f) => pg.transaction((t) => f(wrap(t))),
      };
      api = createPostgresApi({
        db,
        env: {
          TRESNYA_ALIH_INITIAL_PASSWORD: password,
          TRESNYA_NANA_INITIAL_PASSWORD: password,
        },
      });
      sql = (s) => pg.exec(s);
      close = () => pg.close();
      credentials = ["alih", "nana"].map((username) => ({
        username,
        password,
      }));
    }
    const prefix = backend === "postgres" ? "tresnya." : "";
    const server = http.createServer((req, res) => {
      void api.handle(req, res, new URL(req.url, "http://localhost").pathname);
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const base = `http://127.0.0.1:${server.address().port}/api/`;
    const call = (route, data, cookie) =>
      fetch(base + route, {
        method: data ? "POST" : "GET",
        headers: {
          Origin: "http://localhost:4173",
          ...(data ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
      });
    try {
      const login = async (c) => {
        const r = await call("auth/login", c);
        assert.equal(r.status, 200);
        return r.headers.get("set-cookie").split(";")[0];
      };
      const [alih, nana] = await Promise.all(credentials.map(login));
      const state = async (cookie) =>
        (await call("activity/live/state", undefined, cookie)).json();
      const id = "live-test-session-00001",
        photo = "data:image/jpeg;base64,/9j/AA==";
      const start = (shareId = id, cookie = alih) =>
        call("activity/live/start", { shareId, photo }, cookie);
      const point = {
        shareId: id,
        sequence: 1,
        latitude: -6.917,
        longitude: 107.619,
        accuracy: 8,
        captured: Date.now(),
      };
      assert.equal((await call("activity/live/state")).status, 401);
      assert.equal(
        (
          await call(
            "activity/live/start",
            { shareId: id, photo: "https://private.example" },
            alih,
          )
        ).status,
        400,
      );
      assert.equal((await start()).status, 201);
      assert.equal((await state(nana)).partner.latitude, null);
      assert.equal(
        (await call("activity/live/update", point, nana)).status,
        409,
        "partner cannot update owner session",
      );
      assert.equal(
        (await call("activity/live/update", { ...point, latitude: 91 }, alih))
          .status,
        400,
      );
      assert.equal(
        (
          await call(
            "activity/live/update",
            { ...point, captured: Date.now() - 31000 },
            alih,
          )
        ).status,
        400,
      );
      assert.equal(
        (await call("activity/live/update", point, alih)).status,
        200,
      );
      let remote = (await state(nana)).partner;
      assert.equal(remote.latitude, point.latitude);
      assert.equal(remote.photo, photo);
      assert.equal(remote.shareId, undefined);
      assert.equal(remote.session_hash, undefined);
      const replacementPhoto = "data:image/jpeg;base64,/9j/BBBB";
      assert.equal(
        (
          await call(
            "activity/live/photo",
            { shareId: id, photo: replacementPhoto },
            nana,
          )
        ).status,
        409,
        "partner cannot edit owner photo",
      );
      assert.equal(
        (
          await call(
            "activity/live/photo",
            { shareId: id, photo: "https://example.com/photo.jpg" },
            alih,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await call(
            "activity/live/photo",
            { shareId: id, photo: replacementPhoto },
            alih,
          )
        ).status,
        200,
      );
      const changedPhoto = (await state(nana)).partner;
      assert.equal(changedPhoto.photo, replacementPhoto);
      assert.equal(
        changedPhoto.expires,
        remote.expires,
        "photo change cannot renew GPS lease",
      );
      assert.equal(
        changedPhoto.endsAt,
        remote.endsAt,
        "photo change cannot extend duration",
      );
      assert.equal(
        changedPhoto.captured,
        remote.captured,
        "photo change does not fake fresh GPS",
      );
      assert.equal(
        (await call("activity/live/photo", { shareId: id, photo: null }, alih))
          .status,
        200,
      );
      assert.equal(
        (await state(nana)).partner.photo,
        null,
        "reset uses default avatar",
      );
      assert.equal(
        (
          await call(
            "activity/live/update",
            { ...point, sequence: 2, latitude: -6.918, captured: Date.now() },
            alih,
          )
        ).status,
        200,
      );
      assert.equal((await state(nana)).partner.latitude, -6.918);
      assert.equal(
        (await call("activity/live/update", point, alih)).status,
        409,
        "out-of-order update rejected",
      );
      await call("activity/live/stop", { shareId: id }, nana);
      assert.ok(
        (await state(nana)).partner,
        "partner cannot stop owner session",
      );
      await call("activity/live/stop", { shareId: id }, alih);
      assert.equal((await state(nana)).partner, null);
      assert.equal(
        (
          await call(
            "activity/live/photo",
            { shareId: id, photo: replacementPhoto },
            alih,
          )
        ).status,
        409,
        "late photo update cannot restart sharing",
      );
      assert.equal(
        (await call("activity/live/update", { ...point, sequence: 3 }, alih))
          .status,
        409,
        "late update cannot resurrect stopped share",
      );
      const second = await login(credentials[0]);
      await start();
      await start("live-test-session-00002", second);
      await call("activity/live/stop", { shareId: id }, alih);
      assert.ok(
        (await state(nana)).partner,
        "old device cannot stop replacement",
      );
      assert.equal(
        (await call("activity/live/update", { ...point, sequence: 4 }, alih))
          .status,
        409,
      );
      await call("auth/logout", {}, second);
      assert.equal(
        (await state(nana)).partner,
        null,
        "logout revokes live sharing",
      );
      await start();
      await sql(`UPDATE ${prefix}live_locations SET expires=0`);
      assert.equal((await state(nana)).partner, null, "stale leases vanish");
      await start();
      await sql(`UPDATE ${prefix}live_locations SET started=0`);
      assert.equal(
        (
          await call(
            "activity/live/update",
            { ...point, captured: Date.now() },
            alih,
          )
        ).status,
        409,
        "one-hour limit enforced",
      );
      await start();
      await call("activity/location/clear", {}, alih);
      assert.equal((await state(nana)).partner, null, "clear revokes live");
      assert.equal(
        (await (await call("activity/state", undefined, alih)).json()).mine
          .length,
        0,
        "movement does not fill check-in history",
      );
      for (const hours of [1, 3, 8]) {
        const response = await call(
          "activity/live/start",
          { shareId: id, durationHours: hours },
          alih,
        );
        assert.equal(response.status, 201);
        const lease = await response.json();
        assert.equal(lease.endsAt - lease.serverNow, hours * 3600000);
        assert.equal((await state(nana)).partner.endsAt, lease.endsAt);
        // Keep a fresh lease just before the selected deadline; updates must not extend it.
        const deadline = Date.now() + 15000;
        await sql(
          `UPDATE ${prefix}live_locations SET started=${deadline - hours * 3600000}`,
        );
        const updated = await call(
          "activity/live/update",
          { ...point, captured: Date.now(), durationHours: 8 },
          alih,
        );
        assert.equal(
          updated.status,
          200,
          `${hours}-hour session remains active until its deadline`,
        );
        const renewed = await updated.json();
        assert.equal(renewed.endsAt, deadline);
        assert.equal(
          renewed.expires,
          deadline,
          "lease cannot extend selected duration",
        );
        await sql(
          `UPDATE ${prefix}live_locations SET started=${Date.now() - hours * 3600000 - 1}`,
        );
        assert.equal(
          (
            await call(
              "activity/live/update",
              { ...point, captured: Date.now(), sequence: 2 },
              alih,
            )
          ).status,
          409,
        );
        assert.equal(
          (await state(nana)).partner,
          null,
          "expired duration is hidden",
        );
      }
      await start();
      for (const durationHours of [0, 2, 9, -1, 1.5, "3", null]) {
        assert.equal(
          (
            await call(
              "activity/live/start",
              { shareId: id, durationHours },
              alih,
            )
          ).status,
          400,
        );
      }
      assert.ok(
        (await state(nana)).partner,
        "invalid duration cannot replace an active share",
      );
      // Native tokens are issued without cookies and are not accepted as browser sessions.
      assert.equal(
        (await call("auth/native-login", credentials[0])).status,
        403,
      );
      const nativeCall = (route, data, token) =>
        fetch(base + route, {
          method: data ? "POST" : "GET",
          headers: {
            ...(data ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: data ? JSON.stringify(data) : undefined,
        });
      const nativeLogin = await nativeCall("auth/native-login", credentials[0]);
      assert.equal(nativeLogin.status, 200);
      assert.equal(nativeLogin.headers.get("set-cookie"), null);
      const native = await nativeLogin.json();
      assert.match(native.token, /^tn_[A-Za-z0-9_-]{43}$/);
      assert.equal(
        (await nativeCall("auth/me", undefined, native.token)).status,
        200,
      );
      assert.equal(
        (await call("auth/me", undefined, `tresnya_session=${native.token}`))
          .status,
        401,
      );
      assert.equal(
        (await nativeCall("auth/me", undefined, alih.split("=")[1])).status,
        401,
      );
      const nativeId = "native-test-session-0001";
      let response = await nativeCall(
        "activity/live/start",
        { shareId: nativeId, mode: "background" },
        native.token,
      );
      assert.equal(response.status, 201);
      let lease = await response.json();
      assert.equal(lease.expires - lease.serverNow, 120000);
      assert.equal(lease.endsAt - lease.serverNow, 3600000);
      response = await nativeCall(
        "activity/live/update",
        { ...point, shareId: nativeId, captured: Date.now() },
        native.token,
      );
      assert.equal(response.status, 200);
      lease = await response.json();
      assert.equal(lease.expires - lease.serverNow, 120000);
      assert.equal((await state(nana)).partner.latitude, point.latitude);
      assert.equal(
        (
          await nativeCall(
            "activity/live/stop",
            { shareId: nativeId },
            native.token,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await nativeCall(
            "activity/live/update",
            { ...point, shareId: nativeId, captured: Date.now(), sequence: 2 },
            native.token,
          )
        ).status,
        409,
      );
      await nativeCall(
        "activity/live/start",
        { shareId: nativeId, mode: "background" },
        native.token,
      );
      await nativeCall("auth/logout", {}, native.token);
      assert.equal(
        (await nativeCall("auth/me", undefined, native.token)).status,
        401,
      );
      assert.equal((await state(nana)).partner, null);
      await start();
      await sql(`UPDATE ${prefix}sessions SET expires=0 WHERE username='alih'`);
      assert.equal(
        (await state(nana)).partner,
        null,
        "expired auth hides live",
      );
      console.log(
        `PASS ${backend}: permissions, photo validation/sharing, moving coordinates, stale/order checks, stop races, device replacement, logout, lease expiry, duration, clear, no check-in history writes.`,
      );
    } finally {
      await new Promise((r) => server.close(r));
      await close();
      if (
        dir &&
        path.dirname(dir) === os.tmpdir() &&
        path.basename(dir).startsWith("tresnya-live-")
      )
        fs.rmSync(dir, { recursive: true, force: true });
    }
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
