import { test } from "node:test";
import assert from "node:assert/strict";
import { BeatClock } from "../src/audio/BeatClock.js";
import { beatMotion } from "../src/characters/BeatMotion.js";
test("BPM grid preserves phase across hours and arbitrary seek", () => {
  const clock = new BeatClock(130, 0.12);
  for (const index of [0, 1, 16, 400, 39000]) {
    const state = clock.sample(0.12 + ((index + 0.3) * 60) / 130);
    assert.ok(Math.abs(state.beats - (index + 0.3)) < 1e-9);
    assert.equal(state.index, index);
    assert.equal(state.bar, Math.floor(index / 4));
  }
  assert.equal(clock.sample(0).index, -1);
});
test("Squash is bounded, volume preserving and settles before next anticipation", () => {
  for (let b = 0; b < 12; b += 0.001) {
    const m = beatMotion(b, 1, 1);
    assert.ok(m.y > 0.87 && m.y < 1.08);
    assert.equal(m.lift, 0);
    assert.ok(Math.abs(m.x * m.y * m.z - 1) < 1e-10);
  }
  assert.equal(beatMotion(0.8).y, 1);
  assert.equal(beatMotion(0.8).lift, 0);
  assert.ok(beatMotion(0).y < 1);
  assert.ok(beatMotion(0.2).y > 1);
});
test("Beat delay produces distinct member motion", () => {
  assert.notEqual(
    beatMotion(0.2, 1).y,
    beatMotion(0.2 - (0.04 * 130) / 60, 0.72).y,
  );
});
