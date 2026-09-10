export class AudioManager extends EventTarget {
  constructor() {
    super();
    this.media = new Audio();
    this.media.preload = "metadata";
    this.media.crossOrigin = "anonymous";
    this.media.volume = 0.7;
    this.anchor = 0;
    this.anchorContext = 0;
    this.bands = { bass: 0, mid: 0, treble: 0, energy: 0 };
    this.generation = 0;
    this.playToken = 0;
    for (const event of [
      "playing",
      "pause",
      "seeked",
      "waiting",
      "ended",
      "ratechange",
    ])
      this.media.addEventListener(event, () => {
        if (["pause", "waiting", "ended"].includes(event)) this.running = false;
        if (event === "playing") this.running = true;
        this.sync();
        this.dispatchEvent(new Event(event));
      });
    this.media.addEventListener("error", () =>
      this.dispatchEvent(new Event("error")),
    );
    this.running = false;
  }
  init() {
    if (this.context) return;
    this.context = new AudioContext();
    this.source = this.context.createMediaElementSource(this.media);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;
    this.source.connect(this.analyser);
    this.analyser.connect(this.context.destination);
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    this.sync();
  }
  sync() {
    this.anchor = this.media.currentTime || 0;
    this.anchorContext = this.context?.currentTime || 0;
  }
  get time() {
    if (!this.running || this.media.paused || !this.context)
      return this.media.currentTime || 0;
    let predicted =
      this.anchor +
      (this.context.currentTime - this.anchorContext) * this.media.playbackRate;
    if (Math.abs(predicted - this.media.currentTime) > 0.075) {
      this.sync();
      predicted = this.anchor;
    }
    return predicted;
  }
  async play() {
    const token = ++this.playToken,
      generation = this.generation;
    this.init();
    await this.context.resume();
    if (token !== this.playToken || generation !== this.generation) return;
    await this.media.play();
    if (token !== this.playToken || generation !== this.generation) return;
    this.sync();
  }
  pause() {
    this.playToken++;
    this.media.pause();
    this.running = false;
    this.sync();
  }
  load(song) {
    this.playToken++;
    this.generation++;
    this.media.pause();
    this.running = false;
    this.media.src = song.file;
    this.media.load();
    this.resetAnalysis();
    this.sync();
  }
  resetAnalysis() {
    this.bands = { bass: 0, mid: 0, treble: 0, energy: 0 };
    this.data?.fill(0);
    if (this.analyser) {
      this.source.disconnect();
      this.analyser.disconnect();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;
      this.source.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    }
  }
  seek(time) {
    this.media.currentTime = Math.max(
      0,
      Math.min(time, this.media.duration || 0),
    );
    this.sync();
  }
  analyze() {
    if (!this.analyser || !this.running) {
      for (const k in this.bands) this.bands[k] *= 0.92;
      return this.bands;
    }
    this.analyser.getByteFrequencyData(this.data);
    const hz = this.context.sampleRate / this.analyser.fftSize;
    const avg = (a, b) => {
      let sum = 0,
        count = 0;
      for (
        let i = Math.max(1, Math.floor(a / hz));
        i < Math.min(this.data.length, Math.ceil(b / hz));
        i++
      ) {
        sum += this.data[i] / 255;
        count++;
      }
      return sum / Math.max(1, count);
    };
    this.bands = {
      bass: avg(35, 220),
      mid: avg(220, 2200),
      treble: avg(2200, 10000),
      energy: avg(35, 6000),
    };
    return this.bands;
  }
  async align(bpm) {
    const generation = this.generation;
    const response = await fetch(this.media.src);
    if (!response.ok) throw Error("Audio unavailable");
    const decoded = await this.context.decodeAudioData(
      await response.arrayBuffer(),
    );
    if (generation !== this.generation)
      throw Error("Song changed during alignment");
    const samples = decoded.getChannelData(0),
      rate = decoded.sampleRate,
      step = Math.floor(rate * 0.01),
      count = Math.min(Math.floor(samples.length / step), 9000);
    const onsets = [];
    let previous = 0;
    for (let i = 0; i < count; i++) {
      let energy = 0;
      for (let j = 0; j < step; j++) energy += samples[i * step + j] ** 2;
      energy = Math.sqrt(energy / step);
      onsets.push(Math.max(0, energy - previous));
      previous = energy;
    }
    const interval = 60 / bpm;
    let best = 0,
      score = -1;
    const scores = [];
    for (let offset = 0; offset < interval; offset += 0.01) {
      let s = 0,
        n = 0;
      for (let t = offset; t < count * 0.01; t += interval) {
        const k = Math.round(t / 0.01);
        s += Math.max(onsets[k - 1] || 0, onsets[k] || 0, onsets[k + 1] || 0);
        n++;
      }
      s /= Math.max(1, n);
      scores.push(s);
      if (s > score) {
        score = s;
        best = offset;
      }
    }
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    return {
      offset: best,
      confidence: Math.min(
        1,
        Math.max(0, (score / Math.max(mean, 0.00001) - 1) / 2),
      ),
    };
  }
  dispose() {
    this.playToken++;
    this.media.pause();
    this.media.removeAttribute("src");
    this.media.load();
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.context?.close();
  }
}
