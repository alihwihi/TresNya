const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tresnya-live-browser-")),
    base = "http://localhost:4188";
  const server = spawn(process.execPath, ["server/main.cjs"], {
    env: {
      ...process.env,
      PORT: "4188",
      TRESNYA_DATA_DIR: dir,
      TRESNYA_ALLOWED_ORIGINS: base,
      TRESNYA_SECURE_COOKIE: "0",
      TRESNYA_PUSH_SUBJECT: "",
    },
    stdio: "ignore",
    windowsHide: true,
  });
  let browser;
  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(base + "/api/auth/me")).status === 401) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    const credentials = [
      ...fs
        .readFileSync(path.join(dir, "access-credentials.txt"), "utf8")
        .matchAll(/Username: (\w+)\r?\nPassword: ([^\r\n]+)/g),
    ].map((m) => ({ username: m[1], password: m[2] }));
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const pages = [],
      errors = [];
    for (const [i, c] of credentials.entries()) {
      const context = await browser.newContext({
        viewport: i
          ? { width: 390, height: 844 }
          : { width: 1440, height: 1000 },
      });
      await context.addInitScript(() => {
        let coords = {
            latitude: -6.917464,
            longitude: 107.619123,
            accuracy: 12,
          },
          next = 0;
        const watches = new Map();
        window.__cleared = 0;
        window.__deny = false;
        const fix = () => ({ coords, timestamp: Date.now() });
        Object.defineProperty(navigator, "geolocation", {
          value: {
            watchPosition(ok, fail) {
              if (window.__deny) {
                setTimeout(() => fail({ code: 1 }), 0);
                return ++next;
              }
              watches.set(++next, ok);
              setTimeout(() => ok(fix()), 0);
              return next;
            },
            clearWatch(id) {
              watches.delete(id);
              window.__cleared++;
            },
            getCurrentPosition(ok, fail) {
              if (window.__deny) fail({ code: 1 });
              else ok(fix());
            },
          },
        });
        window.__moveLocation = (latitude, longitude) => {
          coords = { ...coords, latitude, longitude };
          watches.forEach((ok) => ok(fix()));
        };
        if (!localStorage.getItem("tresnya:personalization:v1:alih")) {
          const c = document.createElement("canvas");
          c.width = c.height = 20;
          const ctx = c.getContext("2d");
          ctx.fillStyle = "#4b739e";
          ctx.fillRect(0, 0, 20, 20);
          localStorage.setItem(
            "tresnya:personalization:v1:alih",
            JSON.stringify({ profilePhoto: c.toDataURL() }),
          );
        }
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + "/?screen=location");
      await page.getByLabel("Nama pengguna", { exact: true }).fill(c.username);
      await page.getByLabel("Kata sandi", { exact: true }).fill(c.password);
      await page
        .getByRole("button", { name: "Masuk ke TresNya", exact: true })
        .click();
      await page.getByText("Lokasi live kalian", { exact: true }).waitFor();
      pages.push(page);
    }
    const [alih, nana] = pages;
    const marker = (p) =>
      p.locator('.tresnya-live-marker[data-username="alih"]');
    await alih
      .getByRole("button", { name: "Mulai berbagi lokasi live", exact: true })
      .click();
    await marker(nana).waitFor({ timeout: 15000 });
    assert.match(
      await marker(nana).locator("img").getAttribute("src"),
      /^data:image\/jpeg;base64,/,
    );
    assert.equal(await marker(nana).getAttribute("data-latitude"), "-6.917464");
    await alih.evaluate(() => window.__moveLocation(-6.9181, 107.6199));
    await nana.waitForFunction(
      () =>
        document.querySelector('.tresnya-live-marker[data-username="alih"]')
          ?.dataset.latitude === "-6.9181",
      undefined,
      { timeout: 15000 },
    );
    const state = await nana.evaluate(async () =>
      (await fetch("/api/activity/live/state")).json(),
    );
    assert.equal(state.partner.longitude, 107.6199);
    await nana
      .getByRole("button", { name: "Mulai berbagi lokasi live", exact: true })
      .click();
    await nana.locator('.tresnya-live-marker[data-username="nana"]').waitFor();
    await nana.screenshot({
      path: ".local/live-location-mobile.png",
      fullPage: true,
    });
    await alih.screenshot({ path: ".local/live-location-desktop.png" });
    await alih
      .getByRole("button", { name: "Hentikan berbagi live", exact: true })
      .click();
    await marker(nana).waitFor({ state: "detached", timeout: 15000 });
    assert.ok(await alih.evaluate(() => window.__cleared > 0));
    await alih.evaluate(() => window.__moveLocation(-6.919, 107.62));
    assert.equal(
      (
        await nana.evaluate(async () =>
          (await fetch("/api/activity/live/state")).json(),
        )
      ).partner,
      null,
    );
    await nana
      .getByRole("button", { name: "Hentikan berbagi live", exact: true })
      .click();
    await alih.evaluate(() => (window.__deny = true));
    await alih
      .getByRole("button", { name: "Mulai berbagi lokasi live", exact: true })
      .click();
    await alih
      .getByText("Izin lokasi ditolak atau dicabut. Berbagi live dihentikan.", {
        exact: true,
      })
      .waitFor();
    await alih.evaluate(() => (window.__deny = false));
    await alih
      .getByRole("button", { name: "Mulai berbagi lokasi live", exact: true })
      .click();
    await marker(alih).waitFor();
    await alih.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await alih
      .getByText(
        "Berbagi berhenti karena halaman tidak aktif. Mulai lagi saat siap.",
        { exact: true },
      )
      .waitFor();
    await marker(nana).waitFor({ state: "detached", timeout: 15000 });
    await alih.reload();
    await alih
      .getByRole("button", { name: "Mulai berbagi lokasi live", exact: true })
      .waitFor();
    assert.equal(
      (
        await nana.evaluate(async () =>
          (await fetch("/api/activity/live/state")).json(),
        )
      ).partner,
      null,
      "reload does not restart tracking",
    );
    assert.equal(
      await nana.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: two-account simulated GPS movement updates real map markers and avatar; both positions, stop/late callbacks, permission denial, hidden-page stop, reload opt-in, mobile layout. Real device/background GPS not tested.",
    );
  } finally {
    if (browser) await browser.close();
    const ended = new Promise((r) => server.once("exit", r));
    server.kill();
    await ended;
    if (
      path.dirname(dir) === os.tmpdir() &&
      path.basename(dir).startsWith("tresnya-live-browser-")
    )
      fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
