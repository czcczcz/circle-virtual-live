export function ramp(param, value, context) {
  const t = context.currentTime;
  if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
  else {
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
  }
  param.linearRampToValueAtTime(value, t + 0.08);
}
// One media source, two complementary output gains. Off is unity dry and zero
// effect, including the reverb tail. Analysis remains upstream of both paths.
export class ImmersiveAudio {
  constructor(context, environment = {}) {
    this.context = context;
    this.environment = environment;
    this.input = context.createGain();
    this.normal = context.createGain();
    this.fx = context.createGain();
    this.pan = context.createStereoPanner();
    this.direct = context.createGain();
    this.wet = context.createGain();
    this.reverb = context.createConvolver();
    const length = Math.floor(context.sampleRate * (environment.decay || 0.55));
    const impulse = context.createBuffer(2, length, context.sampleRate);
    let seed = 1729;
    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        seed = (seed * 16807) % 2147483647;
        data[i] = ((seed / 2147483647) * 2 - 1) * Math.pow(1 - i / length, 3);
      }
    }
    this.reverb.buffer = impulse;
    this.input.connect(this.normal).connect(context.destination);
    this.input.connect(this.pan);
    this.pan.connect(this.direct).connect(this.fx);
    this.pan.connect(this.reverb).connect(this.wet).connect(this.fx);
    this.fx.connect(context.destination);
    this.fx.gain.value = 0;
    this.normal.gain.value = 1;
    this.wet.gain.value = 0.07;
    this.direct.gain.value = 0.93;
    this.mode = "off";
    this.mix = false;
  }
  update(mode, active, pan = 0, distance = 5) {
    const enabled = active && mode !== "off";
    if (enabled !== this.mix) {
      ramp(this.normal.gain, enabled ? 0 : 1, this.context);
      ramp(this.fx.gain, enabled ? 1 : 0, this.context);
      if (!enabled) ramp(this.input.gain, 1, this.context);
      this.mix = enabled;
    }
    if (mode !== this.mode) {
      const wet = mode === "medium" ? 0.13 : 0.06;
      ramp(this.wet.gain, wet, this.context);
      ramp(this.direct.gain, 1 - wet, this.context);
      this.mode = mode;
    }
    if (enabled) {
      this.pan.pan.setTargetAtTime(
        Math.max(-0.65, Math.min(0.65, pan)),
        this.context.currentTime,
        0.04,
      );
      // Correlated stereo channels can add when panned. Reserve modest headroom.
      this.input.gain.setTargetAtTime(
        Math.max(
          0.8,
          Math.min(
            1,
            1 - (distance - (this.environment.referenceDistance || 5)) * 0.015,
          ),
        ) / Math.sqrt(1 + Math.min(0.65, Math.abs(pan))),
        this.context.currentTime,
        0.06,
      );
    }
  }
  dispose() {
    for (const n of [
      this.input,
      this.normal,
      this.fx,
      this.pan,
      this.direct,
      this.wet,
      this.reverb,
    ])
      n.disconnect();
    this.reverb.buffer = null;
  }
}
