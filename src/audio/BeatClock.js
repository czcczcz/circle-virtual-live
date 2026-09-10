export class BeatClock {
  constructor(bpm = 130, offset = 0) {
    this.configure(bpm, offset);
  }
  configure(bpm, offset = 0) {
    this.bpm = Math.max(30, Math.min(300, Number(bpm) || 130));
    this.offset = Number(offset) || 0;
  }
  sample(time) {
    const beats = ((time - this.offset) * this.bpm) / 60;
    const index = Math.floor(beats);
    return {
      time,
      beats,
      index,
      phase: beats - index,
      bar: Math.floor(index / 4),
      phrase: Math.floor(index / 16),
      bpm: this.bpm,
    };
  }
}
