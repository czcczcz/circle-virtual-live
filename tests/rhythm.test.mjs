import { test } from "node:test";
import assert from "node:assert/strict";
import { BeatClock } from "../src/audio/BeatClock.js";
import { RhythmJudge } from "../src/interaction/RhythmJudge.js";
test("Rhythm judge uses song offset and exact windows; targets cannot score twice", () => {
  const clock = new BeatClock(120, 0.42),
    j = new RhythmJudge(clock);
  j.start(0.42, 100);
  assert.equal(j.first, 4);
  const t = j.targetTime(j.first);
  assert.equal(t, 2.42);
  assert.equal(j.hit(t - 0.2), null);
  assert.equal(j.hit(t + 0.05), "Perfect");
  assert.equal(j.hit(t + 0.06), null);
  assert.equal(j.hit(t + 0.5 + 0.1), "Great");
  assert.equal(j.hit(t + 1 + 0.16), "Good");
  assert.equal(j.score, 2150);
  assert.equal(j.combo, 3);
  j.update(t + 1.5 + 0.161);
  assert.equal(j.counts.Miss, 1);
  assert.equal(j.combo, 0);
  assert.equal(j.maxCombo, 3);
  assert.equal(j.accuracy, 53.75);
});
test("Dropped frames count every expired target; finish never includes future targets", () => {
  const j = new RhythmJudge(new BeatClock(180, 0.12));
  j.start(0, 3);
  j.update(2.8);
  const expected = Math.max(
    0,
    Math.floor((2.8 - 0.16 - 0.12) * 3) - j.first + 1,
  );
  assert.equal(j.counts.Miss, expected);
  const result = j.finish(3);
  assert.equal(result.Miss, j.last - j.first + 1);
  assert.equal(j.active, false);
  assert.equal(j.hit(3), null);
});
test("Long playback stays on the shared clock and a new song discards old score", () => {
  const clock = new BeatClock(185, 0.21),
    j = new RhythmJudge(clock);
  j.start(18000, 18100, 2);
  const time = j.targetTime(j.first);
  assert.ok(Math.abs(clock.sample(time).beats - j.first) < 1e-8);
  assert.equal(j.hit(time), "Perfect");
  j.cancel();
  clock.configure(90, 0.8);
  j.start(10, 20);
  assert.equal(j.total, 0);
  assert.equal(j.score, 0);
  assert.equal(j.bpm, 90);
  assert.equal(j.offset, 0.8);
});
test("Seeking out of a challenge preserves score without penalizing skipped audio", () => {
  const j = new RhythmJudge(new BeatClock(120));
  j.start(0, 300);
  j.hit(j.targetTime(j.first));
  const result = j.finish(200, false);
  assert.equal(result.score, 1000);
  assert.equal(result.Miss, 0);
});
