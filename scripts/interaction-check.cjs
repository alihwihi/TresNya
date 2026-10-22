const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  fs.mkdirSync("artifacts", { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    checks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const button = (name) => page.getByRole("button", { name, exact: true });
  const visible = async (text) =>
    assert.equal(
      await page.getByText(text, { exact: true }).first().isVisible(),
      true,
      text,
    );
  const close = () => button("Tutup dialog").click();
  const pass = (title) => {
    checks.push(title);
    console.log("PASS: " + title);
  };
  try {
    await page.goto(process.env.PREVIEW_URL || "http://localhost:4173");
    await require("./login-helper.cjs")(page);
    await page.getByText("hari bersama.", { exact: true }).waitFor();
    await button("Cerita kita").click();
    await button("Tulis cerita").click();
    await page
      .getByRole("textbox", { name: "Cerita kecilmu" })
      .fill("Hari ini aku bersyukur bisa berbagi cerita denganmu.");
    await button("Suasana hati 😊").click();
    const chooser = page.waitForEvent("filechooser");
    await button("Tambah foto").click();
    await (await chooser).setFiles("artifacts/desktop.png");
    await button("Bagikan cerita").click();
    await visible("Hari ini aku bersyukur bisa berbagi cerita denganmu.");
    assert.equal(
      await page.getByRole("img", { name: "Foto cerita" }).count(),
      1,
    );
    await button("Beri reaksi sayang").first().click();
    await button("Balas").first().click();
    await page
      .getByRole("textbox", { name: "Balasan kecilmu" })
      .pressSequentially("Aku juga sayang kamu.", { delay: 25 });
    await button("Tambahkan balasan").click();
    await visible("Aku juga sayang kamu.");
    await button("Dariku").click();
    await visible("Hari ini aku bersyukur bisa berbagi cerita denganmu.");
    pass("Text and photo story, mood, reaction, typed reply, filter");

    await button("Main berdua").click();
    await button("Main kuis pasangan").click();
    for (const [i, answer] of [
      "Jalan pagi & cari kopi enak",
      "Dikabari sudah sampai rumah",
      "Mie ayam langganan",
    ].entries()) {
      await button(answer).click();
      await button(
        i === 2 ? "Lihat hasil kita" : "Pertanyaan berikutnya",
      ).click();
    }
    await visible("3 dari 3 jawaban cocok!");
    await button("Simpan senyum ini ♡")
      .count()
      .then(async (n) => {
        if (n) await button("Simpan senyum ini ♡").click();
        else await button("Simpan senyum ini").click();
      });
    await button("Tulis untuk pasangan").click();
    await page
      .getByRole("textbox", { name: "Aku bersyukur karena…" })
      .fill(
        "1. Kamu mendengarkan. 2. Kamu selalu ada. 3. Kita saling mendukung.",
      );
    await button("Selesaikan & bagikan sebagai cerita").click();
    assert.equal(await button("Tantangan selesai").isDisabled(), true);
    for (let i = 0; i < 10; i++) await button("Kirim satu hati").click();
    await visible("10 hati di ruang demo ini");
    await visible("1.315");
    pass(
      "Quiz scoring, single daily challenge reward, 10-heart affection reward",
    );
    await page.screenshot({ path: "artifacts/games-desktop.png" });

    await button("Pet berdua").click();
    await button("Beri makan (3)").click();
    await button("Beri makan (2)").waitFor();
    await button("Latih trik +10 ◉").click();
    await button("20 ◉").click();
    await button("Beri makan (3)").waitFor();
    await visible("◉ 170 koin bersama");
    await button("Profil pet").click();
    await button("Rubah").click();
    await page.getByRole("textbox", { name: "Nama si kecil" }).fill("Milo");
    await page
      .getByRole("textbox", { name: "Tanggal lahir (YYYY-MM-DD)" })
      .fill("2026-09-28");
    await visible("Zodiak: Libra");
    await button("Simpan profil pet").click();
    await visible("Rumah kecil Milo.");
    pass(
      "Pet care, inventory consumption, shop purchase, coins, species, name and zodiac",
    );
    await page.screenshot({ path: "artifacts/pet-desktop.png" });

    await button("Lokasi & kabar").click();
    await button("Tambah").click();
    await page.getByRole("textbox", { name: "Nama tempat" }).fill("Taman kita");
    await button("Simpan tempat").click();
    await button("Pilih Taman kita").click();
    await visible("Nana · Taman kita");
    await button("Detail baterai").click();
    await visible("Sedang mengisi daya");
    await close();
    pass("Add and select a sample favorite place, battery details");
    await page.screenshot({ path: "artifacts/location-desktop.png" });

    await button("Kejut layar").click();
    await page
      .getByRole("textbox", { name: "Pesan kecilmu" })
      .fill("Peluk jauh untuk kamu.");
    await button("Pratinjau kejutan").click();
    await visible("PRATINJAU KEJUTAN");
    await button("Simpan di hati ♡").click();
    await visible("Peluk jauh untuk kamu.");
    pass("Heart-rain surprise preview and session history");

    await button("Pengaturan").click();
    await button("Tema Sage").click();
    await button("Tema Sage").getByText("Sage", { exact: true }).waitFor();
    assert.equal(
      await button("Tema Sage").evaluate(
        (el) => getComputedStyle(el).borderTopColor,
      ),
      "rgb(117, 136, 108)",
    );
    await page.getByRole("switch", { name: "Mode privat" }).click();
    await visible(
      "Mode privat dipilih. Penguncian perangkat belum aktif pada UI demo.",
    );
    await button("5 menit").click();
    await button("20%").click();
    await visible("Peringatan saat baterai di bawah 20%.");
    await button("Edit profil").click();
    await page
      .getByRole("textbox", { name: "Tanggal jadian (YYYY-MM-DD)" })
      .fill("2026-02-30");
    await button("Simpan cerita kita").click();
    await visible(
      "Lengkapi nama dan tanggal jadian yang valid, tidak di masa depan.",
    );
    await page
      .getByRole("textbox", { name: "Tanggal jadian (YYYY-MM-DD)" })
      .fill("2025-09-20");
    await button("Simpan cerita kita").click();
    await visible("Alih & Nana");
    pass(
      "Theme change, privacy and notification controls, profile update and date validation",
    );
    await page.screenshot({ path: "artifacts/settings-desktop.png" });

    await button("Beranda").click();
    await button("Rencana ketemu kita").click();
    const meeting = new Date(Date.now() + 20 * 86400000)
      .toISOString()
      .slice(0, 10);
    await page
      .getByRole("textbox", { name: "Tanggal ketemu (YYYY-MM-DD)" })
      .fill(meeting);
    await button("Simpan rencana").click();
    await button("Buka notifikasi").click();
    await button("Tandai semua dibaca").click();
    pass("Edit meeting date and mark notifications as read");

    await page.setViewportSize({ width: 390, height: 844 });
    for (const [name, file] of [
      ["Lokasi & kabar", "location"],
      ["Cerita kita", "stories"],
      ["Main berdua", "games"],
      ["Pet berdua", "pet"],
      ["Kejutan", "surprises"],
      ["Beranda", "home"],
    ]) {
      await button(name).click();
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        390,
        "Mobile overflow: " + name,
      );
      await page.screenshot({ path: `artifacts/${file}-mobile.png` });
    }
    await button("Buka profil dan pengaturan").click();
    await page.screenshot({ path: "artifacts/settings-mobile.png" });
    await button("Edit profil").click();
    await page.screenshot({ path: "artifacts/modal-mobile.png" });
    await close();
    pass(
      "All mobile navigation destinations, settings, dialog layout and overflow checks",
    );
    assert.deepEqual(errors, []);
    pass("No browser runtime errors");
    fs.writeFileSync(
      "artifacts/interaction-results.json",
      JSON.stringify({ checks, errors, passed: true }, null, 2),
    );
  } catch (error) {
    await page.screenshot({ path: "artifacts/failure.png" });
    console.error(error);
    fs.writeFileSync(
      "artifacts/interaction-results.json",
      JSON.stringify(
        { checks, errors, failure: error.message, passed: false },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
