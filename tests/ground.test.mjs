import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { groundMotion } from "../src/characters/GroundContact.js";
import { beatMotion } from "../src/characters/BeatMotion.js";
test("Real support contacts stay on floor through stronger squash and sway", () => {
  const supports = new Float32Array([-0.7, 0, 0.3, 0.7, 0, 0.3, 0, 0.2, -0.2]),
    motion = new T.Group();
  for (let beat = 0; beat < 8; beat += 0.013) {
    const m = beatMotion(beat, 1.6, 1);
    motion.scale.set(m.x, m.y, m.z);
    motion.rotation.set(0, m.twist, m.sway);
    groundMotion(motion, supports);
    motion.updateMatrix();
    const p = new T.Vector3();
    let min = Infinity;
    for (let i = 0; i < supports.length; i += 3) {
      p.fromArray(supports, i).applyMatrix4(motion.matrix);
      min = Math.min(min, p.y);
    }
    assert.ok(Math.abs(min) < 1e-8);
    assert.ok(m.y >= 0.8 && m.y <= 1.12);
  }
});
