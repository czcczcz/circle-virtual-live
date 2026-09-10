export const rhythmConfig = Object.freeze({
  perfect: 0.05,
  great: 0.1,
  good: 0.16,
  countdownBeats: 4,
  points: { Perfect: 1000, Great: 750, Good: 400, Miss: 0 },
});

// Shares the application's BeatClock. No timer advances targets: all deadlines
// are derived from audio time, including misses after a dropped render frame.
export class RhythmJudge {
  constructor(clock, config = rhythmConfig) {
    this.clock = clock;
    this.config = config;
    this.state = "idle";
  }
  start(time, duration = Infinity, every = 1) {
    this.every = [1, 2, 4].includes(every) ? every : 1;
    this.first =
      Math.ceil(
        (this.clock.sample(time).beats + this.config.countdownBeats) /
          this.every,
      ) * this.every;
    this.last = Number.isFinite(duration)
      ? Math.floor(this.clock.sample(duration).beats / this.every) * this.every
      : Infinity;
    this.cursor = this.first;
    this.judged = new Set();
    this.counts = { Perfect: 0, Great: 0, Good: 0, Miss: 0 };
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.total = 0;
    this.feedback = "";
    this.bpm = this.clock.bpm;
    this.offset = this.clock.offset;
    this.state = "countdown";
    this.startTime = time;
  }
  targetTime(index) {
    return this.offset + (index * 60) / this.bpm;
  }
  get accuracy() {
    return this.total ? (this.score / (this.total * 1000)) * 100 : 100;
  }
  get active() {
    return this.state === "countdown" || this.state === "playing";
  }
  record(grade, time, index) {
    if (index !== undefined) this.judged.add(index);
    this.counts[grade]++;
    this.total++;
    this.score += this.config.points[grade];
    this.combo = grade === "Miss" ? 0 : this.combo + 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.feedback = grade;
    this.feedbackTime = time;
    return grade;
  }
  update(time) {
    if (!this.active) return;
    if (time >= this.targetTime(this.first) - this.config.good)
      this.state = "playing";
    while (
      this.cursor <= this.last &&
      this.targetTime(this.cursor) < time - this.config.good
    ) {
      if (!this.judged.has(this.cursor)) this.record("Miss", time, this.cursor);
      this.cursor += this.every;
    }
  }
  hit(time) {
    if (!this.active) return null;
    this.update(time);
    if (this.state !== "playing") return null;
    const index =
      Math.round(((time - this.offset) * this.bpm) / 60 / this.every) *
      this.every;
    if (index < this.first || index > this.last || this.judged.has(index))
      return null;
    const delta = Math.abs(time - this.targetTime(index));
    const grade =
      delta <= this.config.perfect + 1e-9
        ? "Perfect"
        : delta <= this.config.great + 1e-9
          ? "Great"
          : delta <= this.config.good + 1e-9
            ? "Good"
            : "Miss";
    // Stray clicks lower accuracy but cannot consume a distant upcoming target.
    return this.record(grade, time, grade === "Miss" ? undefined : index);
  }
  finish(time, flush = true) {
    if (!this.active) return null;
    // On seek/configuration changes, keep the last valid score. Catching up at
    // the new playhead would wrongly count every skipped beat as a miss.
    if (flush) this.update(time);
    if (flush)
      while (this.cursor <= this.last && this.targetTime(this.cursor) <= time) {
        if (!this.judged.has(this.cursor))
          this.record("Miss", time, this.cursor);
        this.cursor += this.every;
      }
    this.state = "result";
    return {
      score: this.score,
      accuracy: this.accuracy,
      maxCombo: this.maxCombo,
      ...this.counts,
    };
  }
  cancel() {
    this.state = "idle";
  }
}
