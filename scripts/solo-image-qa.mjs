import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("http://localhost:5173");
  await page.waitForFunction(
    () => document.querySelector("[data-slot]")?.disabled === false,
  );
  await page.locator("#start").click();
  await page.waitForFunction(() => __LIVE__.audio.time > 0.3);
  const image = await page.evaluate(async () => {
    const a = __LIVE__,
      c = document.createElement("canvas");
    c.width = 256;
    c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ff71b8";
    ctx.fillRect(30, 180, 196, 332);
    ctx.beginPath();
    ctx.arc(128, 100, 96, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(80, 65, 20, 30);
    ctx.fillRect(160, 65, 20, 30);
    const source = {
      id: "qa-image",
      name: "纸片人验证",
      type: "image",
      src: c.toDataURL(),
    };
    await a.characters.replace("kasumi", source);
    await a.characters.replace("arisa", source);
    const images = a.characters.characters.filter((c) => c.isImage);
    window.testImage = source;
    let material;
    images[0].root.traverse((o) => {
      if (o.isMesh) material = o.material;
    });
    return {
      images: images.length,
      all: a.characters.characters.length,
      refs: a.assets.cache.get(source.src).refs,
      transparent: material.transparent,
      billboard: true,
    };
  });
  assert.equal(image.images, 2);
  assert.equal(image.all, 5);
  assert.equal(image.refs, 2);
  assert.ok(image.transparent);
  await page.locator("#camera").selectOption("firstperson");
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press("Space");
  await page.waitForTimeout(120);
  const manual = await page.evaluate(() => ({
    visible: __LIVE__.solo.glow.rig.visible,
    swings: __LIVE__.solo.glow.swings,
    playing: __LIVE__.audio.running,
    angle: __LIVE__.solo.glow.rig.rotation.x,
  }));
  console.log({ manual });
  assert.ok(manual.visible && manual.swings === 1 && manual.playing);
  await page.screenshot({ path: "reports/solo-image-live.png" });
  await page.locator("#settings-toggle").click();
  await page.locator("#auto-call").selectOption("2");
  await page.locator("#close-settings").click();
  await page.waitForTimeout(700);
  const auto = await page.evaluate(() => {
    const a = __LIVE__;
    a.solo.glow.manualStart = -Infinity;
    const beat = a.beat.sample(a.audio.time);
    a.solo.glow.update(
      beat,
      a.audio.bands,
      true,
      true,
      performance.now() / 1000,
    );
    return {
      interval: a.solo.glow.autoEvery,
      beat: beat.beats,
      angle: a.solo.glow.rig.rotation.x,
    };
  });
  assert.equal(auto.interval, 2);
  await page.locator("#camera").selectOption("wide");
  await page.waitForTimeout(100);
  assert.equal(
    await page.evaluate(() => __LIVE__.solo.glow.rig.visible),
    false,
  );
  await page.evaluate(async () => {
    await __LIVE__.characters.replace("kasumi", null);
    await __LIVE__.characters.replace("arisa", null);
  });
  assert.equal(
    await page.evaluate(() => __LIVE__.assets.cache.has(testImage.src)),
    false,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  const result = {
    image,
    manual,
    auto,
    released: true,
    mobileOverflow: false,
    errors,
  };
  console.log(result);
  await fs.writeFile(
    "reports/solo-image-qa.json",
    JSON.stringify(result, null, 2),
  );
} finally {
  await browser.close();
}
