export const presets = {
  low: { dpr: 1, lights: 2, shadows: false, audience: 40 },
  medium: { dpr: 1.25, lights: 4, shadows: false, audience: 80 },
  high: { dpr: 1.5, lights: 6, shadows: true, audience: 120 },
  ultra: { dpr: 2, lights: 6, shadows: true, audience: 160 },
};
export const defaultPreset = () =>
  matchMedia("(pointer: coarse)").matches ? "low" : "high";
