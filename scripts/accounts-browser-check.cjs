const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const saved = fs.readFileSync(".local/access-credentials.txt", "utf8");
  const credentials = [
    ...saved.matchAll(/Username: (\w+)\nPassword: ([^\n]+)/g),
  ].map((m) => ({ username: m[1], password: m[2] }));
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const credential of credentials) {
      const context = await browser.newContext({
        viewport:
          credential.username === "alih"
            ? { width: 1440, height: 1000 }
            : { width: 390, height: 844 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("http://localhost:4173");
      await page
        .getByRole("button", { name: "Masuk ke TresNya", exact: true })
        .waitFor();
      if (credential.username === "alih")
        await page.screenshot({ path: "artifacts/tresnya-login.png" });
      await page
        .getByRole("textbox", { name: "Nama pengguna", exact: true })
        .fill(credential.username);
      await page.getByLabel("Kata sandi", { exact: true }).fill("incorrect");
      await page
        .getByRole("button", { name: "Masuk ke TresNya", exact: true })
        .click();
      await page
        .getByText("Nama pengguna atau kata sandi salah.", { exact: true })
        .waitFor();
      await page
        .getByLabel("Kata sandi", { exact: true })
        .fill(credential.password);
      await page
        .getByRole("button", { name: "Masuk ke TresNya", exact: true })
        .click();
      await page.getByText("hari bersama.", { exact: true }).waitFor();
      assert.ok(
        (await page.locator("body").innerText()).includes(
          credential.username === "alih" ? "Alih" : "Nana",
        ),
      );
      await page.reload();
      await page.getByText("hari bersama.", { exact: true }).waitFor();
      await page.screenshot({
        path: `artifacts/tresnya-${credential.username}.png`,
      });
      await page
        .getByRole("button", { name: "Cerita kita", exact: true })
        .click();
      await page.getByRole("button", { name: "Dariku", exact: true }).click();
      const text = await page.locator("body").innerText();
      assert.ok(
        text.includes(
          credential.username === "alih"
            ? "Satu kopi, playlist favorit"
            : "Langit Bandung sore ini",
        ),
      );
      assert.ok(
        !text.includes(
          credential.username === "alih"
            ? "Langit Bandung sore ini"
            : "Satu kopi, playlist favorit",
        ),
      );
      await page
        .getByRole("button", {
          name: "Buka profil dan pengaturan",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Keluar dari TresNya", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Masuk ke TresNya", exact: true })
        .waitFor();
      await page.reload();
      await page
        .getByRole("button", { name: "Masuk ke TresNya", exact: true })
        .waitFor();
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log(
      "PASS: both accounts, password rejection, session restoration, profile-specific stories, logout, desktop/mobile rendering, no runtime errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
