import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { IntroSequence } from "../src/core/IntroSequence.js";
import { PlaylistManager } from "../src/audio/PlaylistManager.js";
import { inspectFile } from "../src/characters/inspectFile.js";
import fs from "node:fs/promises";
test("Intro owns visual time only; cancellation restores camera and never starts audio", async () => {
  const elements = new Map();
  const camera = new T.PerspectiveCamera();
  camera.position.set(1, 2, 3);
  const app = {
    camera,
    renderer: { toneMappingExposure: 1.18 },
    audio: {
      time: 0,
      generation: 7,
      init() {},
      context: { resume: () => Promise.resolve() },
    },
    ui: {
      $: (id) => {
        if (!elements.has(id)) elements.set(id, {});
        return elements.get(id);
      },
      playing() {},
    },
  };
  const intro = new IntroSequence(app);
  intro.enabled = true;
  const pending = intro.beforePlay();
  intro.update(intro.start + 1000);
  assert.equal(app.audio.time, 0);
  assert.ok(app.renderer.toneMappingExposure < 1.18);
  intro.cancel();
  assert.equal(await pending, false);
  assert.deepEqual(camera.position.toArray(), [1, 2, 3]);
  assert.equal(app.renderer.toneMappingExposure, 1.18);
  const next = intro.beforePlay();
  intro.update(intro.start + 4000);
  assert.equal(await next, true);
  assert.equal(intro.beforePlay(), true);
});
test("Pause during a pending intro gate wins over later successful completion", async () => {
  let resolve,
    plays = 0;
  const audio = new EventTarget();
  audio.media = { ended: false };
  audio.play = async () => plays++;
  audio.pause = () => {};
  const manager = new PlaylistManager({
    audio,
    songs: [],
    activate() {},
    beforePlay: () => new Promise((r) => (resolve = r)),
  });
  const pending = manager.play();
  manager.pause();
  resolve(true);
  await pending;
  assert.equal(plays, 0);
  assert.equal(manager.wantsPlayback, false);
});
test("Uploaded GLB inspection counts geometry and rejects invalid headers", async () => {
  const bytes = await fs.readFile("3D_model_optimized/kasumi.glb");
  const file = new File([bytes], "kasumi.glb");
  const info = await inspectFile(file);
  assert.equal(info.type, "glb");
  assert.equal(info.meshes, 1);
  assert.ok(info.triangles > 99000);
  await assert.rejects(inspectFile(new File(["broken"], "broken.glb")));
});
