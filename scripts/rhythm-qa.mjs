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
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5173");
  await page.waitForFunction(
    () => document.querySelector("[data-slot]")?.disabled === false,
  );
  await page.evaluate(() => {
    const a = __LIVE__,
      n = 16000 * 11,
      b = new ArrayBuffer(44 + n * 2),
      v = new DataView(b),
      str = (o, s) =>
        [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, "RIFF");
    v.setUint32(4, 36 + n * 2, true);
    str(8, "WAVE");
    str(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true);
    v.setUint32(28, 32000, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    str(36, "data");
    v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++)
      v.setInt16(
        44 + i * 2,
        Math.sin((i * 2 * Math.PI * 220) / 16000) * 800,
        true,
      );
    const file = URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
    a.songLibrary.songs.splice(
      0,
      2,
      { id: "test-a", title: "节奏测试 A", file, bpm: 120, offset: 0.1 },
      { id: "test-b", title: "节奏测试 B", file, bpm: 180, offset: 0.23 },
    );
    a.ui.refreshSongs(a.songLibrary.songs);
    a.song(0);
  });
  await page.locator("#start").click();
  await page.waitForFunction(() => __LIVE__.audio.time > 0.1);
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.type("popipa");
  assert.equal(await page.evaluate(() => __LIVE__.solo.judge.active), false);
  await page.locator("#camera").selectOption("firstperson");
  await page.locator("#settings-toggle").click();
  await page.locator("#bpm").focus();
  await page.keyboard.type("popipa");
  assert.equal(await page.evaluate(() => __LIVE__.solo.judge.active), false);
  await page.locator("#close-settings").click();
  await page.evaluate(() => document.activeElement.blur());
  await page.evaluate(() => {
    window.before = {
      context: __LIVE__.audio.context,
      generation: __LIVE__.audio.generation,
      time: __LIVE__.audio.time,
      scene: __LIVE__.scene,
    };
    __LIVE__.solo.glow.autoEvery = 1;
  });
  await page.keyboard.type("popipa");
  await page.waitForFunction(() => __LIVE__.solo.judge.state === "countdown");
  assert.ok(
    (await page.locator("#rhythm-grade").textContent()).includes("准备"),
  );
  await page.screenshot({ path: "reports/rhythm-countdown.png" });
  const unchanged = await page.evaluate(
    () =>
      before.context === __LIVE__.audio.context &&
      before.generation === __LIVE__.audio.generation &&
      before.scene === __LIVE__.scene &&
      __LIVE__.audio.time >= before.time,
  );
  assert.ok(unchanged);
  await page.waitForFunction(() => __LIVE__.solo.judge.state === "playing");
  assert.equal(await page.evaluate(() => __LIVE__.solo.judge.score), 0);
  // Aim a real keyboard press at the next absolute beat; input still uses AudioManager.time.
  await page.evaluate(async () => {
    const a = __LIVE__,
      target = a.solo.judge.targetTime(
        Math.ceil(a.beat.sample(a.audio.time).beats),
      );
    await new Promise((resolve) => {
      const frame = () =>
        a.audio.time >= target - 0.01
          ? resolve()
          : requestAnimationFrame(frame);
      frame();
    });
  });
  await page.keyboard.press("Space");
  await page.waitForTimeout(60);
  const scored = await page.evaluate(() => ({
    score: __LIVE__.solo.judge.score,
    swings: __LIVE__.solo.glow.swings,
    playing: __LIVE__.audio.running,
  }));
  assert.ok(scored.score > 0 && scored.playing);
  await page.screenshot({ path: "reports/rhythm-score.png" });
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => __LIVE__.solo.judge.active), false);
  assert.equal(await page.evaluate(() => __LIVE__.audio.running), true);
  await page.locator("#playback-mode").selectOption("sequential");
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.type("popipa");
  await page.waitForFunction(() => __LIVE__.solo.judge.active);
  await page.waitForFunction(
    () => __LIVE__.playlist.currentId === "test-b" && __LIVE__.audio.running,
    {},
    { timeout: 20000 },
  );
  const ended = await page.evaluate(() => ({
    active: __LIVE__.solo.judge.active,
    result: document.querySelector("#rhythm-grade").textContent,
    detail: document.querySelector("#rhythm-detail").textContent,
    mode: __LIVE__.director.mode,
    bpm: __LIVE__.beat.bpm,
    offset: __LIVE__.beat.offset,
    sameContext: before.context === __LIVE__.audio.context,
    sameScene: before.scene === __LIVE__.scene,
  }));
  assert.equal(ended.active, false);
  assert.equal(ended.result, "本曲应援完成");
  assert.equal(ended.mode, "firstperson");
  assert.equal(ended.bpm, 180);
  assert.equal(ended.offset, 0.23);
  assert.ok(ended.sameContext && ended.sameScene);
  await page.evaluate(() => __LIVE__.ui.hideAll(true));
  assert.equal(await page.locator("#rhythm-feedback").isVisible(), false);
  await page.keyboard.press("Escape");
  assert.equal(
    await page.evaluate(() => document.body.classList.contains("ui-hidden")),
    false,
  );
  assert.deepEqual(errors, []);
  const result = {
    unchanged,
    scored,
    ended,
    ignoredOutsideSoloAndInputs: true,
    autoNeverScores: true,
    errors,
  };
  console.log(result);
  await fs.writeFile("reports/rhythm-qa.json", JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
