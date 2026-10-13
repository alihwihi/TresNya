const fs = require("node:fs");
module.exports = async function login(page, username = "alih") {
  const saved = fs.readFileSync(".local/access-credentials.txt", "utf8");
  const match = [
    ...saved.matchAll(/Username: (\w+)\nPassword: ([^\n]+)/g),
  ].find((m) => m[1] === username);
  if (!match)
    throw new Error(
      "Test account credentials are unavailable. Start the server first.",
    );
  await page
    .getByRole("textbox", { name: "Nama pengguna", exact: true })
    .fill(username);
  await page.getByLabel("Kata sandi", { exact: true }).fill(match[2]);
  await page
    .getByRole("button", { name: "Masuk ke TresNya", exact: true })
    .click();
  await page.getByText("hari bersama.", { exact: true }).waitFor();
};
