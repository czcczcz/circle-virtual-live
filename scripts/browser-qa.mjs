import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
await fs.mkdir("reports", { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [],
  warnings = [],
  requests = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error")
    errors.push(m.text() + " " + JSON.stringify(m.location()));
  if (m.type() === "warning") warnings.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) requests.push({ url: r.url(), status: r.status() });
});
try {
  await page.goto("http://localhost:5173/");
  await page.waitForFunction(
    () => window.__LIVE__?.characters.characters.length === 5,
    {},
    { timeout: 90000 },
  );
  await page.screenshot({ path: "reports/desktop-ready.png" });
  await page.locator("#start").click();
  await page.waitForFunction(() => window.__LIVE__.audio.running);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: "reports/desktop-live.png" });
  const live = await page.evaluate(() => {
    const app = window.__LIVE__;
    return {
      loaded: app.assets.loaded,
      failed: app.assets.failed,
      time: app.audio.time,
      mediaTime: app.audio.media.currentTime,
      beat: app.beat.sample(app.audio.time),
      fps: app.fps,
      render: app.renderer.info.render,
      memory: app.renderer.info.memory,
      members: app.characters.characters.map((c) => ({
        id: c.member.id,
        scale: c.motion.scale.toArray(),
        position: c.root.position.toArray(),
      })),
      audioState: app.audio.context.state,
    };
  });
  await page.locator("#play").click();
  await page.waitForFunction(() => !window.__LIVE__.audio.running);
  const paused = await page.evaluate(() => window.__LIVE__.audio.time);
  await page.waitForTimeout(450);
  const pauseDrift = await page.evaluate(
    (t) => window.__LIVE__.audio.time - t,
    paused,
  );
  await page.locator("#camera").selectOption("vocal");
  await page.waitForTimeout(2600);
  await page.screenshot({ path: "reports/vocal.png" });
  await page.locator("#camera").selectOption("manual");
  const manual = await page.evaluate(
    () => window.__LIVE__.director.controls.enabled,
  );
  await page.locator("#settings-toggle").click();
  await page.locator("#preset").selectOption("low");
  const low = await page.evaluate(() => ({
    dpr: window.__LIVE__.renderer.getPixelRatio(),
    crowd: window.__LIVE__.audience.sticks.count,
    shadows: window.__LIVE__.renderer.shadowMap.enabled,
  }));
  await page.locator("#align").click();
  await page.waitForFunction(
    () => !document.querySelector("#align").disabled,
    {},
    { timeout: 90000 },
  );
  const alignment = await page.locator("#align-status").textContent();
  await page.locator("#close-settings").click();
  await page.locator("#song").selectOption("1");
  await page.locator("#play").click();
  await page.waitForFunction(() => window.__LIVE__.audio.running);
  await page.waitForTimeout(500);
  await page.locator("#seek").fill("500");
  await page.waitForTimeout(300);
  const seek = await page.evaluate(() => ({
    time: window.__LIVE__.audio.time,
    duration: window.__LIVE__.audio.media.duration,
    beat: window.__LIVE__.beat.sample(window.__LIVE__.audio.time),
  }));
  await page.locator("#restart").click();
  await page.waitForTimeout(200);
  const restarted = await page.evaluate(() => window.__LIVE__.audio.time);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#camera").selectOption("wide");
  await page.waitForTimeout(2600);
  await page.screenshot({ path: "reports/mobile.png" });
  const mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  const result = {
    errors,
    warnings,
    failedRequests: requests,
    live,
    pauseDrift,
    manual,
    low,
    alignment,
    seek,
    restarted,
    mobileOverflow,
  };
  await fs.writeFile(
    "reports/browser-qa.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
  if (
    errors.length ||
    requests.length ||
    pauseDrift !== 0 ||
    !manual ||
    mobileOverflow
  )
    process.exitCode = 1;
} finally {
  await browser.close();
}
