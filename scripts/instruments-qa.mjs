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
  await page.goto("http://localhost:5173");
  await page.waitForFunction(
    () => window.__LIVE__?.characters.characters.length === 5,
  );
  await page.locator("#start").click();
  await page.waitForFunction(() => window.__LIVE__.audio.running);
  await page.waitForFunction(() => window.__LIVE__.audio.time > 0.3);
  const result = await page.evaluate(async () => {
    const a = __LIVE__,
      characters = a.characters.characters,
      roots = characters.map((c) => c.root),
      geometries = characters.map((c) => {
        let g;
        c.root.traverse((o) => {
          if (o.isMesh) g = o.geometry;
        });
        return g;
      }),
      materials = characters.map((c) => {
        let m;
        c.root.traverse((o) => {
          if (o.isMesh) m = o.material;
        });
        return m;
      }),
      before = characters[0].motion.scale.y;
    a.setInstrumentsVisible(false);
    await new Promise((r) => setTimeout(r, 200));
    const hidden = [...a.instruments.groups.values()].every((g) => !g.visible);
    const body = characters.every((c) => {
      let visible = true;
      c.root.traverse((o) => {
        if (o.isMesh && !o.visible) visible = false;
      });
      return visible;
    });
    const motion = characters[0].motion.scale.y !== before;
    const time = a.audio.time;
    a.setInstrumentsVisible(true);
    await new Promise((r) => setTimeout(r, 200));
    return {
      hidden,
      body,
      motion,
      shown: [...a.instruments.groups.values()].every((g) => g.visible),
      playing: a.audio.time > time,
      roots: characters.every((c, i) => c.root === roots[i]),
      materials: characters.every((c, i) => {
        let m;
        c.root.traverse((o) => {
          if (o.isMesh) m = o.material;
        });
        return m === materials[i];
      }),
    };
  });
  await page.locator("#camera").selectOption("firstperson");
  await page.screenshot({ path: "reports/instruments-show.png" });
  await page.evaluate(() => __LIVE__.setInstrumentsVisible(false));
  await page.screenshot({ path: "reports/instruments-hide.png" });
  await page.reload();
  await page.waitForFunction(
    () => window.__LIVE__?.characters.characters.length === 5,
  );
  result.persisted =
    (await page.locator("#instruments").inputValue()) === "hide";
  result.errors = errors;
  console.log(result);
  assert.ok(
    Object.entries(result)
      .filter(([k]) => k !== "errors")
      .every(([, v]) => v),
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "reports/instruments-qa.json",
    JSON.stringify(result, null, 2),
  );
} finally {
  await browser.close();
}
