import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [],
  assets = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("response", (response) => {
  if (response.status() >= 400)
    errors.push(`${response.status()} ${response.url()}`);
  if (response.url().endsWith(".glb"))
    assets.push({ url: response.url(), status: response.status() });
});
try {
  await page.goto("http://localhost:4173/");
  await page.waitForFunction(
    () => document.querySelector("#load-count")?.textContent === "5 / 5",
    {},
    { timeout: 90000 },
  );
  await page.locator("#start").click();
  await page.waitForFunction(
    () => document.querySelector("#play").getAttribute("aria-label") === "暂停",
  );
  await page.waitForFunction(
    () => document.querySelector("#elapsed").textContent !== "00:00",
  );
  await page.screenshot({ path: "reports/production.png" });
  const result = {
    errors,
    assets,
    elapsed: await page.locator("#elapsed").textContent(),
    debugExposed: await page.evaluate(() => Boolean(window.__LIVE__)),
  };
  await fs.writeFile(
    "reports/production-qa.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
  if (errors.length || assets.length !== 5 || result.debugExposed)
    process.exitCode = 1;
} finally {
  await browser.close();
}
