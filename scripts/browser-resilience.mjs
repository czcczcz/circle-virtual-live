import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const result = {};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.route("**/3D_model_optimized/arisa.glb", (route) =>
    route.fulfill({
      status: 404,
      body: "Intentional failure for resilience test",
    }),
  );
  await page.goto("http://localhost:5173/");
  await page.waitForFunction(
    () =>
      window.__LIVE__?.assets.loaded === 4 &&
      window.__LIVE__.assets.failed.length === 1,
    {},
    { timeout: 90000 },
  );
  result.failure = await page.evaluate(() => ({
    loaded: window.__LIVE__.assets.loaded,
    failed: window.__LIVE__.assets.failed,
    renderFrames: window.__LIVE__.renderer.info.render.frame,
  }));
  await page.locator("#start").click();
  await page.waitForFunction(() => window.__LIVE__.audio.running);
  await page.locator("#play").click();
  result.director = await page.evaluate(() => {
    const app = window.__LIVE__;
    app.director.setMode("auto");
    const history = [],
      bands = { energy: 0.7, bass: 0.6 };
    for (let beat = 0; beat < 160; beat += 0.05) {
      app.director.update(
        app.beat.sample((beat * 60) / 130),
        bands,
        (0.05 * 60) / 130,
        true,
      );
      if (history.at(-1) !== app.director.shot) history.push(app.director.shot);
      if (!app.camera.position.toArray().every(Number.isFinite))
        throw Error("Non-finite camera");
    }
    return history;
  });
  result.motion = await page.evaluate(() => {
    const app = window.__LIVE__,
      c = app.characters.characters[0],
      values = [];
    for (let t = 0; t < 60 / 130; t += 0.005) {
      app.characters.update(app.beat.sample(t), { energy: 0.7 }, true, 0.005);
      values.push(c.motion.scale.y);
    }
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      footRoot: c.root.position.y,
    };
  });
  result.dispose = await page.evaluate(() => {
    const app = window.__LIVE__;
    app.dispose();
    return { disposed: app.disposed, render: app.renderer.info.memory };
  });
  await page.close();
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  await mobile.goto("http://localhost:5173/");
  await mobile.waitForFunction(
    () => window.__LIVE__?.assets.loaded === 5,
    {},
    { timeout: 90000 },
  );
  result.mobileDefault = await mobile.evaluate(() => ({
    preset: window.__LIVE__.preset,
    dpr: window.__LIVE__.renderer.getPixelRatio(),
    audience: window.__LIVE__.audience.sticks.count,
  }));
  await mobile.screenshot({ path: "reports/mobile-default.png" });
  await fs.writeFile(
    "reports/resilience.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
  if (
    result.failure.loaded !== 4 ||
    result.director.length < 5 ||
    result.mobileDefault.dpr > 1 ||
    result.motion.min > 0.96 ||
    result.motion.max < 1.02
  )
    process.exitCode = 1;
} finally {
  await browser.close();
}
