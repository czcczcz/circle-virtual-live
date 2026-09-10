import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const report = {};
try {
  await page.goto("http://localhost:5173/");
  await page.waitForFunction(
    () =>
      window.__LIVE__?.characters.characters.length === 5 &&
      !document.querySelector("#reset-band").disabled,
    {},
    { timeout: 90000 },
  );
  await page.screenshot({ path: "reports/revision-ready.png" });
  report.ground = await page.evaluate(() => {
    const a = window.__LIVE__;
    a.renderer.setAnimationLoop(null);
    let error = 0;
    const ranges = {};
    for (const beat of [0, 0.07, 0.23, 0.4, 0.73, 1.1, 1.3]) {
      a.characters.update(
        a.beat.sample((beat * 60) / 130),
        { energy: 1 },
        true,
        0.016,
      );
      for (const c of a.characters.characters) {
        c.root.updateMatrixWorld(true);
        let min = Infinity;
        c.root.traverse((mesh) => {
          if (!mesh.isMesh) return;
          const p = mesh.geometry.attributes.position,
            e = mesh.matrixWorld.elements;
          for (let i = 0; i < p.count; i++)
            min = Math.min(
              min,
              e[1] * p.getX(i) + e[5] * p.getY(i) + e[9] * p.getZ(i) + e[13],
            );
        });
        error = Math.max(error, Math.abs(min - (0.6 + c.member.position[1])));
        ranges[c.member.id] ??= { min: 2, max: 0 };
        ranges[c.member.id].min = Math.min(
          ranges[c.member.id].min,
          c.motion.scale.y,
        );
        ranges[c.member.id].max = Math.max(
          ranges[c.member.id].max,
          c.motion.scale.y,
        );
      }
    }
    a.renderer.setAnimationLoop((t) => a.frame(t));
    return { maxError: error, ranges };
  });
  await page.locator("#start").click();
  await page.waitForFunction(() => window.__LIVE__.audio.running);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "reports/revision-live.png" });
  await page.locator("#band-toggle").click();
  await page.locator('[data-slot="otae"]').selectOption("kasumi");
  await page.waitForFunction(
    () => !document.querySelector('[data-slot="otae"]').disabled,
  );
  report.shared = await page.evaluate(() => {
    const a = window.__LIVE__,
      left = a.characters.characters.find((c) => c.member.id === "otae"),
      center = a.characters.characters.find((c) => c.member.id === "kasumi");
    let g1, g2;
    left.root.traverse((o) => {
      if (o.isMesh) g1 = o.geometry;
    });
    center.root.traverse((o) => {
      if (o.isMesh) g2 = o.geometry;
    });
    return {
      sameGeometry: g1 === g2,
      refs: a.assets.cache.get(center.source.model).refs,
    };
  });
  await page.locator('[data-slot="rimi"]').selectOption("");
  await page.waitForFunction(
    () => window.__LIVE__.characters.characters.length === 4,
  );
  await page.waitForTimeout(100);
  report.empty = await page.evaluate(() => ({
    count: window.__LIVE__.characters.characters.length,
    instrumentVisible: window.__LIVE__.instruments.groups.get("rimi").visible,
  }));
  await page.screenshot({ path: "reports/revision-band.png" });
  await page.reload();
  await page.waitForFunction(
    () => !document.querySelector("#reset-band").disabled,
    {},
    { timeout: 90000 },
  );
  report.restore = await page.evaluate(() => ({
    count: window.__LIVE__.characters.characters.length,
    model: window.__LIVE__.characters.characters.find(
      (c) => c.member.id === "otae",
    )?.source.id,
  }));
  await page.locator("#band-toggle").click();
  await page.locator("#reset-band").click();
  await page.waitForFunction(
    () => !document.querySelector("#reset-band").disabled,
  );
  await page.locator("#close-settings").click();
  await page.locator("#camera").selectOption("firstperson");
  const firstBefore = await page.evaluate(() =>
    window.__LIVE__.camera.position.toArray(),
  );
  await page.keyboard.down("w");
  await page.waitForTimeout(400);
  await page.keyboard.up("w");
  report.firstPerson = await page.evaluate(
    (before) => ({
      before,
      after: window.__LIVE__.camera.position.toArray(),
      mode: window.__LIVE__.director.mode,
    }),
    firstBefore,
  );
  await page.screenshot({ path: "reports/revision-firstperson.png" });
  await page.locator("#camera").selectOption("free");
  const freeBefore = await page.evaluate(
    () => window.__LIVE__.camera.position.y,
  );
  await page.keyboard.down("e");
  await page.waitForTimeout(300);
  await page.keyboard.up("e");
  report.free = await page.evaluate(
    (before) => ({ before, after: window.__LIVE__.camera.position.y }),
    freeBefore,
  );
  await page.locator("#immersive").click();
  report.hidden = await page.evaluate(() => ({
    hidden: document.body.classList.contains("ui-hidden"),
    visibleOverlays: [...document.querySelector("#app").children].filter(
      (e) => e.id !== "viewport" && getComputedStyle(e).display !== "none",
    ).length,
  }));
  await page.screenshot({ path: "reports/revision-hidden.png" });
  await page.keyboard.press("Escape");
  report.restoredUI = await page.evaluate(
    () => !document.body.classList.contains("ui-hidden"),
  );
  await page.locator("#library-toggle").click();
  await page.locator("#song-file").setInputFiles("music/popipa.mp3");
  await page.locator("#song-title").fill("测试歌曲 <b>不会执行</b>");
  await page.locator("#song-artist").fill("本地上传测试");
  await page.locator("#song-bpm").fill("123");
  await page.locator("#song-offset").fill(".2");
  await page.locator("#save-song").click();
  await page.waitForFunction(
    () => window.__LIVE__.songLibrary.songs.length === 3,
  );
  report.upload = await page.evaluate(() => {
    const song = window.__LIVE__.songLibrary.songs.at(-1);
    return {
      title: song.title,
      bpm: song.bpm,
      offset: song.offset,
      blob: song.file.startsWith("blob:"),
      custom: song.custom,
    };
  });
  await page.screenshot({ path: "reports/revision-songs.png" });
  await page.locator("[data-song-play]").last().click();
  await page.locator("#close-settings").click();
  await page.locator("#play").click();
  await page.waitForFunction(() => window.__LIVE__.audio.running);
  await page.waitForTimeout(250);
  report.localPlayback = await page.evaluate(
    () => window.__LIVE__.audio.time > 0,
  );
  await page.reload();
  await page.waitForFunction(
    () => window.__LIVE__?.songLibrary.songs.length === 3,
  );
  report.songPersisted = await page.evaluate(
    () => window.__LIVE__.songLibrary.songs.at(-1).bpm === 123,
  );
  await page.locator("#library-toggle").click();
  await page.locator("[data-song-edit]").last().click();
  await page.locator("#song-title").fill("已编辑的歌曲");
  await page.locator("#song-bpm").fill("140");
  await page.locator("#save-song").click();
  await page.waitForFunction(
    () => window.__LIVE__.songLibrary.songs.at(-1).bpm === 140,
  );
  report.edited = true;
  await page.locator("[data-song-remove]").click();
  await page.waitForFunction(
    () => window.__LIVE__.songLibrary.songs.length === 2,
  );
  report.deleted = true;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#close-settings").click();
  await page.locator("#camera").selectOption("wide");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "reports/revision-mobile.png" });
  report.mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  report.errors = errors;
  await fs.writeFile(
    "reports/revision-qa.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (
    errors.length ||
    report.ground.maxError > 1e-5 ||
    !report.shared.sameGeometry ||
    report.empty.instrumentVisible ||
    !report.hidden.hidden ||
    report.hidden.visibleOverlays ||
    !report.songPersisted ||
    !report.localPlayback ||
    report.mobileOverflow ||
    report.firstPerson.after[2] >= report.firstPerson.before[2] ||
    report.free.after <= report.free.before
  )
    process.exitCode = 1;
} finally {
  await browser.close();
}
