import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  GlowStickController,
  swingCurve,
} from "../src/interaction/GlowStickController.js";
import {
  instrumentTargets,
  showInstruments,
} from "../src/characters/InstrumentVisibility.js";
test("Instrument visibility restores authored state without touching generic body meshes", () => {
  const root = new T.Group(),
    body = new T.Mesh(),
    guitar = new T.Mesh(),
    strap = new T.Mesh();
  body.name = "mesh";
  guitar.name = "Guitar_Main";
  strap.name = "Guitar_Strap";
  strap.visible = false;
  root.add(body, guitar, strap);
  const targets = instrumentTargets(root, ["Guitar_Main", "Guitar_Strap"]);
  showInstruments(targets, false);
  assert.equal(body.visible, true);
  assert.equal(guitar.visible, false);
  showInstruments(targets, true);
  assert.equal(guitar.visible, true);
  assert.equal(strap.visible, false);
  assert.equal(root.children.length, 3);
});
test("Glow stick poses depend on absolute phase, independently of frame sampling", () => {
  const glow = new GlowStickController(new T.PerspectiveCamera());
  const beat = { beats: 5.25, bpm: 180 },
    bands = { energy: 0.3 };
  glow.autoEvery = 2;
  glow.update(beat, bands, true, true, 20);
  const pose = glow.rig.rotation.toArray();
  for (let i = 0; i < 144; i++)
    glow.update({ beats: i / 100, bpm: 180 }, bands, true, true, 19 + i / 144);
  glow.update(beat, bands, true, true, 20);
  assert.deepEqual(glow.rig.rotation.toArray(), pose);
  glow.update(beat, bands, false, true, 21);
  assert.equal(glow.rig.rotation.x, -0.22);
  assert.ok(swingCurve(0.12) < 0);
  assert.equal(swingCurve(0.36), 1);
  assert.ok(swingCurve(0.78) < 0);
  assert.equal(swingCurve(1), 0);
  glow.dispose();
});
