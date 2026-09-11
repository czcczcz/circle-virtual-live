import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("http://localhost:4173");
  await page.waitForFunction(
    () => document.querySelector("[data-slot]")?.disabled === false,
  );
  await page.locator("#band-toggle").click();
  await page.locator(".character-import summary").click();
  await page.locator("#character-file").setInputFiles("3D_model/kasumi.glb");
  await page.waitForFunction(
    () => !document.querySelector("#optimize-character").disabled,
  );
  const pending = page.waitForEvent("download", { timeout: 90000 });
  await page.locator("#optimize-character").click();
  const download = await pending;
  await download.saveAs("reports/ugc-production-optimized.glb");
  await page
    .locator("#character-file")
    .setInputFiles("reports/ugc-production-optimized.glb");
  await page.waitForFunction(
    () => !document.querySelector("#preview-character").disabled,
  );
  await page.locator("#preview-character").click();
  await page.waitForFunction(
    () => !document.querySelector("#apply-character").disabled,
  );
  const analysis = await page.locator("#character-analysis").textContent();
  assert.ok(analysis.includes("1024"));
  await page.screenshot({ path: "reports/ugc-production-preview.png" });
  await page.locator("#apply-character").click();
  await page.waitForFunction(() =>
    document.querySelector('[data-slot="kasumi"]').value.startsWith("import-"),
  );
  assert.equal(await page.locator("[data-slot]").count(), 5);
  assert.equal(await page.evaluate(() => Boolean(window.__LIVE__)), false);
  assert.deepEqual(errors, []);
  console.log({ analysis, production: true, errors });
  await fs.writeFile(
    "reports/ugc-production-qa.json",
    JSON.stringify({ analysis, production: true, errors }, null, 2),
  );
} finally {
  await browser.close();
}
