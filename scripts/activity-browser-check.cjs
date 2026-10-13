const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tresnya-browser-"));
  const base = "http://localhost:4186";
  const server = spawn(process.execPath, ["server/main.cjs"], {
    env: {
      ...process.env,
      PORT: "4186",
      TRESNYA_DATA_DIR: directory,
      TRESNYA_ALLOWED_ORIGINS: base,
      TRESNYA_PUSH_SUBJECT: "",
    },
    stdio: "ignore",
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
        .readFileSync(path.join(directory, "access-credentials.txt"), "utf8")
        .matchAll(/Username: (\w+)\nPassword: ([^\n]+)/g),
    ].map((m) => ({ username: m[1], password: m[2] }));
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const errors = [];
    const pages = [];
    for (const [i, credential] of credentials.entries()) {
      const context = await browser.newContext({
        viewport: i
          ? { width: 390, height: 844 }
          : { width: 1440, height: 1000 },
        geolocation: {
          latitude: -6.917464,
          longitude: 107.619123,
          accuracy: 12,
        },
        permissions: ["geolocation"],
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + "/?screen=location");
      await page
        .getByLabel("Nama pengguna", { exact: true })
        .fill(credential.username);
      await page
        .getByLabel("Kata sandi", { exact: true })
        .fill(credential.password);
      await page
        .getByRole("button", { name: "Masuk ke TresNya", exact: true })
        .click();
      await page.getByText("Dekat, meski berjarak.", { exact: true }).waitFor();
      pages.push(page);
    }
    const [alih, nana] = pages;
    await alih
      .getByLabel("Nama tempat (opsional)", { exact: true })
      .fill("Kedai Bandung");
    await alih
      .getByRole("button", { name: "Ambil lokasi saya", exact: true })
      .click();
    await alih.getByText("Titik siap dibagikan:", { exact: false }).waitFor();
    let partnerState = await nana.evaluate(async () =>
      (await fetch("/api/activity/state")).json(),
    );
    assert.equal(
      partnerState.partner.length,
      0,
      "GPS capture must not share before confirmation",
    );
    await alih
      .getByRole("button", {
        name: "Bagikan titik ini ke pasangan",
        exact: true,
      })
      .click();
    await alih
      .getByText("Lokasimu sudah dibagikan.", { exact: true })
      .waitFor();
    await nana
      .getByText("Kedai Bandung", { exact: true })
      .waitFor({ timeout: 20000 });
    const [map] = await Promise.all([
      nana.waitForEvent("popup"),
      nana
        .getByRole("button", { name: "Buka titik di Google Maps", exact: true })
        .click(),
    ]);
    assert.ok(map.url().includes("google.com/maps"));
    assert.ok(decodeURIComponent(map.url()).includes("-6.917464,107.619123"));
    await map.close();
    await alih
      .getByLabel("Status kamu", { exact: true })
      .fill("Sudah sampai di kedai.");
    await alih
      .getByRole("button", { name: "Kirim status ke pasangan", exact: true })
      .click();
    await nana
      .getByText("Sudah sampai di kedai.", { exact: true })
      .waitFor({ timeout: 20000 });
    await nana.reload();
    await nana.getByText("Sudah sampai di kedai.", { exact: true }).waitFor();
    await nana
      .getByRole("button", { name: "Aktifkan notifikasi ponsel", exact: true })
      .click();
    await nana
      .getByText("Notifikasi ponsel belum dikonfigurasi di server.", {
        exact: true,
      })
      .waitFor();
    fs.mkdirSync("artifacts", { recursive: true });
    for (const page of pages)
      await page.evaluate(() =>
        document.querySelectorAll("*").forEach((element) => {
          element.scrollTop = 0;
        }),
      );
    await nana.screenshot({
      path: "artifacts/live-location-mobile.png",
      fullPage: true,
    });
    await alih.screenshot({
      path: "artifacts/live-location-desktop.png",
      fullPage: true,
    });
    assert.equal(
      await nana.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "No mobile horizontal overflow",
    );
    await alih
      .getByRole("button", {
        name: "Hapus lokasi saya dari pasangan",
        exact: true,
      })
      .click();
    await nana
      .getByText("Belum ada lokasi dibagikan", { exact: true })
      .waitFor({ timeout: 20000 });
    await nana.context().clearPermissions();
    await nana.context().grantPermissions([], { origin: base });
    await nana.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (_ok, fail) =>
        fail({ code: 1 });
    });
    await nana
      .getByRole("button", { name: "Ambil lokasi saya", exact: true })
      .click();
    await nana.getByText("Izin lokasi ditolak.", { exact: false }).waitFor();
    // Exercise permission/subscription UI without contacting a real push provider.
    const pushCalls = [];
    await nana.route("**/api/activity/state", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        json: {
          ...(await response.json()),
          pushEnabled: true,
          publicKey: require("web-push").generateVAPIDKeys().publicKey,
        },
      });
    });
    await nana.route("**/api/activity/push/*", async (route) => {
      pushCalls.push({
        url: route.request().url(),
        data: route.request().postDataJSON(),
      });
      await route.fulfill({ json: { ok: true } });
    });
    await nana.addInitScript(() => {
      let subscription = null;
      window.testPermission = "denied";
      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: {
          permission: "default",
          requestPermission: async () => window.testPermission,
        },
      });
      const manager = {
        getSubscription: async () => subscription,
        subscribe: async () => {
          subscription = {
            endpoint: "https://fcm.googleapis.com/fcm/send/browser-test",
            toJSON() {
              return {
                endpoint: this.endpoint,
                keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) },
              };
            },
            unsubscribe: async () => {
              subscription = null;
              return true;
            },
          };
          return subscription;
        },
      };
      const registration = { pushManager: manager };
      Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: {
          getRegistration: async () => registration,
          register: async () => registration,
          ready: Promise.resolve(registration),
        },
      });
    });
    await nana.reload();
    await nana
      .getByRole("button", { name: "Aktifkan notifikasi ponsel", exact: true })
      .click();
    await nana
      .getByText("Izin notifikasi belum diberikan.", { exact: false })
      .waitFor();
    assert.equal(pushCalls.length, 0);
    await nana.evaluate(() => {
      window.testPermission = "granted";
    });
    await nana
      .getByRole("button", { name: "Aktifkan notifikasi ponsel", exact: true })
      .click();
    await nana
      .getByRole("button", { name: "Matikan notifikasi ponsel", exact: true })
      .waitFor();
    assert.ok(pushCalls[0].url.endsWith("/subscribe"));
    await nana
      .getByRole("button", { name: "Matikan notifikasi ponsel", exact: true })
      .click();
    await nana
      .getByRole("button", { name: "Aktifkan notifikasi ponsel", exact: true })
      .waitFor();
    assert.ok(pushCalls[1].url.endsWith("/unsubscribe"));
    assert.deepEqual(errors, []);
    const manifest = await (await fetch(base + "/manifest.webmanifest")).json();
    assert.equal(manifest.display, "standalone");
    assert.ok((await (await fetch(base)).text()).includes('rel="manifest"'));
    assert.ok(
      (await (await fetch(base + "/sw.js")).text()).includes(
        "notificationclick",
      ),
    );
    console.log(
      "PASS: desktop/mobile two-account UI, explicit GPS sharing, accurate Maps URL, live status sync, reload persistence, GPS denial, location removal, push permission denial/enable/disable (browser push APIs mocked), PWA assets, no overflow/runtime errors.",
    );
  } finally {
    await browser?.close();
    server.kill();
    await new Promise((resolve) =>
      server.exitCode !== null ? resolve() : server.once("exit", resolve),
    );
    if (
      path.dirname(directory) === os.tmpdir() &&
      path.basename(directory).startsWith("tresnya-browser-")
    )
      fs.rmSync(directory, { recursive: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
