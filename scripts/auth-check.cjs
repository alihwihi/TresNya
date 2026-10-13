const { createAuth } = require("../server/auth.cjs");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
(async () => {
  const directory = fs.mkdtempSync(path.resolve(".local/auth-test-"));
  let auth = await createAuth(directory);
  const saved = fs.readFileSync(
    path.join(directory, "access-credentials.txt"),
    "utf8",
  );
  const credentials = [
    ...saved.matchAll(/Username: (\w+)\nPassword: ([^\n]+)/g),
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
  const base = `http://127.0.0.1:${server.address().port}/api/auth/`;
  async function call(route, data, cookie, origin = "http://localhost:4173") {
    return fetch(base + route, {
      method: data ? "POST" : "GET",
      headers: {
        Origin: origin,
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  try {
    assert.equal((await call("me")).status, 401);
    assert.equal(
      (await call("login", { username: "alih", password: "wrong" })).status,
      401,
    );
    assert.equal(
      (await call("register", { username: "third", password: "anything" }))
        .status,
      404,
    );
    assert.equal(
      (await call("login", credentials[0], null, "https://untrusted.example"))
        .status,
      403,
    );
    for (const credential of credentials) {
      const response = await call("login", credential);
      assert.equal(response.status, 200);
      const profile = (await response.json()).user;
      assert.equal(
        profile.name,
        credential.username === "alih" ? "Alih" : "Nana",
      );
      assert.equal(
        profile.gender,
        credential.username === "alih" ? "male" : "female",
      );
      const setCookie = response.headers.get("set-cookie");
      assert.ok(
        setCookie.includes("HttpOnly") && setCookie.includes("SameSite=Strict"),
      );
      const cookie = setCookie.split(";")[0];
      assert.equal((await call("me", null, cookie)).status, 200);
      auth.close();
      auth = await createAuth(directory);
      assert.equal(
        fs.readFileSync(path.join(directory, "access-credentials.txt"), "utf8"),
        saved,
      );
      assert.equal((await call("me", null, cookie)).status, 200);
      assert.equal((await call("logout", {}, cookie)).status, 200);
      assert.equal((await call("me", null, cookie)).status, 401);
    }
    for (let i = 0; i < 10; i++)
      assert.equal(
        (await call("login", { username: "alih", password: "wrong" })).status,
        401,
      );
    assert.equal(
      (await call("login", { username: "alih", password: "wrong" })).status,
      429,
    );
    const db = new DatabaseSync(path.join(directory, "tresnya.sqlite"));
    const rows = db.prepare("SELECT * FROM accounts").all();
    assert.equal(rows.length, 2);
    for (const row of rows)
      assert.ok(
        row.password_hash.length === 128 &&
          row.password_hash !==
            credentials.find((c) => c.username === row.username).password,
      );
    db.close();
    console.log(
      "PASS: exactly two accounts, hashed passwords, incorrect credentials, origin rejection, HttpOnly cookies, persisted sessions, logout revocation, no registration endpoint, rate limiting.",
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    auth.close();
    if (directory.startsWith(path.resolve(".local") + path.sep))
      fs.rmSync(directory, { recursive: true });
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
