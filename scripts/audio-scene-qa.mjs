import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5173");
  await page.waitForFunction(
    () => document.querySelector("[data-slot]")?.disabled === false,
  );
  const audio = await page.evaluate(async () => {
    const { ImmersiveAudio } = await import("/src/audio/ImmersiveAudio.js");
    const c = new OfflineAudioContext(2, 48000, 48000),
      routing = new ImmersiveAudio(c),
      buffer = c.createBuffer(2, 48000, 48000);
    for (let ch = 0; ch < 2; ch++)
      for (let i = 0; i < 48000; i++)
        buffer.getChannelData(ch)[i] =
          Math.sin((i * 2 * Math.PI * 440) / 48000) * 0.2;
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(routing.input);
    source.start();
    routing.update("medium", true, 0.65, 5);
    const suspended = c.suspend(0.4),
      rendering = c.startRendering();
    await suspended;
    routing.update("off", true);
    await c.resume();
    const out = await rendering;
    let error = 0,
      l = 0,
      r = 0,
      peak = 0;
    for (let i = 4800; i < 16000; i++) {
      l += out.getChannelData(0)[i] ** 2;
      r += out.getChannelData(1)[i] ** 2;
      peak = Math.max(
        peak,
        Math.abs(out.getChannelData(0)[i]),
        Math.abs(out.getChannelData(1)[i]),
      );
    }
    for (let i = 30000; i < 45000; i++)
      for (let ch = 0; ch < 2; ch++)
        error = Math.max(
          error,
          Math.abs(out.getChannelData(ch)[i] - buffer.getChannelData(ch)[i]),
        );
    routing.dispose();
    return {
      bypassError: error,
      leftRMS: Math.sqrt(l / 11200),
      rightRMS: Math.sqrt(r / 11200),
      peak,
    };
  });
  assert.ok(audio.bypassError < 1e-6);
  assert.ok(audio.rightRMS > audio.leftRMS);
  assert.ok(audio.peak < 0.4);
  const scene = await page.evaluate(async () => {
    const { App } = await import("/src/core/App.js"),
      { circleScene } = await import("/src/scenes/circle/scene.js");
    __LIVE__.dispose();
    const def = {
      ...circleScene,
      id: "test-adapter",
      name: "接口测试",
      stageHeight: 1.2,
      performerSlots: [
        {
          ...circleScene.performerSlots[0],
          id: "center-slot",
          modelId: "kasumi",
          position: [1, 0, 0],
        },
      ],
      introSequence: null,
      player: { ...circleScene.player, eyeHeight: 1.8, spawn: [2, 1.8, 6] },
      audioEnvironment: { source: [1, 2, 0] },
      create(context) {
        return {
          ...circleScene.create(context),
          dispose() {
            window.extensionDisposed = true;
          },
        };
      },
      cameraAnchors: {
        wide: { label: "测试全景", p: [0, 5, 15], t: [1, 2, 0] },
      },
    };
    const a = (window.__LIVE__ = new App(def));
    await new Promise((resolve) => {
      const tick = () =>
        document.querySelector("[data-slot]")?.disabled === false
          ? resolve()
          : setTimeout(tick, 20);
      tick();
    });
    a.director.setMode("firstperson");
    a.director.update(a.beat.sample(0), { energy: 0 }, 0.016, false);
    const result = {
      slots: a.members.length,
      height: a.characters.characters[0].root.position.y,
      source: a.characters.characters[0].source.id,
      selected: document.querySelector("[data-slot]").value,
      eye: a.camera.position.y,
      camera: a.director.shots.wide.label,
      audio: a.audio.environment.source,
      intro: a.intro.definition,
      storage: a.bandKey,
    };
    a.dispose();
    return {
      ...result,
      engineDisposed: a.disposed,
      extensionDisposed: window.extensionDisposed,
    };
  });
  assert.equal(scene.slots, 1);
  assert.equal(scene.height, 1.2);
  assert.equal(scene.source, "kasumi");
  assert.equal(scene.selected, "kasumi");
  assert.equal(scene.eye, 1.8);
  assert.equal(scene.intro, null);
  assert.ok(scene.engineDisposed && scene.extensionDisposed);
  assert.deepEqual(errors, []);
  const result = { audio, scene, errors };
  console.log(result);
  await fs.writeFile(
    "reports/audio-scene-qa.json",
    JSON.stringify(result, null, 2),
  );
} finally {
  await browser.close();
}
