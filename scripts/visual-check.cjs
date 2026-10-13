const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs");
(async () => {
  fs.mkdirSync("artifacts", { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.PREVIEW_URL || "http://localhost:4173");
  await require("./login-helper.cjs")(page);
  await page.getByText("hari bersama.", { exact: true }).waitFor();
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  console.log(
    JSON.stringify({ desktop: await page.locator("body").innerText(), errors }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  console.log(
    JSON.stringify({
      viewport: 390,
      documentWidth: await page.evaluate(
        () => document.documentElement.scrollWidth,
      ),
      errors,
    }),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
