import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const b = await chromium.launch({ channel: "chrome", headless: true });
try {
  const p = await b.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://localhost:5173");
  await p.waitForFunction(() => __LIVE__?.characters.characters.length === 5);
  assert.equal(await p.locator("#play svg").count(), 1);
  assert.equal(await p.locator("#start svg").count(), 1);
  assert.equal(
    await p.locator("#play").evaluate((el) => getComputedStyle(el).userSelect),
    "none",
  );
  assert.equal(
    await p.locator(".help").evaluate((el) => getComputedStyle(el).userSelect),
    "text",
  );
  await p.locator("#settings-toggle").click();
  await p.locator("#intro-mode").selectOption("on");
  await p.locator("#close-settings").click();
  await p.locator("#start").click();
  await p.waitForTimeout(900);
  assert.equal(await p.evaluate(() => __LIVE__.audio.media.paused), true);
  assert.equal(await p.evaluate(() => __LIVE__.audio.time), 0);
  await p.waitForFunction(
    () => __LIVE__.audio.time > 0.2,
    {},
    { timeout: 10000 },
  );
  assert.equal(await p.evaluate(() => __LIVE__.intro.active), false);
  await p.locator("#camera").selectOption("firstperson");
  await p.evaluate(() => (__LIVE__.audio.immersiveMode = "medium"));
  await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => __LIVE__.audio.routing.mix), true);
  await p.evaluate(() => (__LIVE__.audio.immersiveMode = "off"));
  await p.waitForTimeout(300);
  const gains = await p.evaluate(() => ({
    normal: __LIVE__.audio.routing.normal.gain.value,
    fx: __LIVE__.audio.routing.fx.gain.value,
    input: __LIVE__.audio.routing.input.gain.value,
  }));
  assert.deepEqual(gains, { normal: 1, fx: 0, input: 1 });
  await p.locator("#restart").click();
  await p.waitForFunction(() => __LIVE__.intro.active);
  await p.screenshot({ path: "reports/intro-mobile.png" });
  await p.locator("#cancel-intro").click();
  await p.waitForTimeout(3800);
  assert.equal(await p.evaluate(() => __LIVE__.audio.time), 0);
  assert.equal(await p.evaluate(() => __LIVE__.audio.media.paused), true);
  assert.equal(await p.evaluate(() => __LIVE__.director.free.enabled), true);
  await p.screenshot({ path: "reports/mobile-svg-controls.png" });
  assert.deepEqual(errors, []);
  console.log({ mobile: true, intro: true, gains, errors });
} finally {
  await b.close();
}
