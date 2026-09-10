// Compact spring response: pre-beat anticipation, compression, overshoot, then stillness.
// Foot contact is solved by CharacterManager after scale and sway. No airborne lift.
const keys = [
  [0, -0.065],
  [0.07, -0.125],
  [0.23, 0.075],
  [0.48, -0.016],
  [0.68, 0],
  [0.88, 0],
  [1, -0.065],
];
export function beatMotion(beats, strength = 1, energy = 0.5) {
  const p = ((beats % 1) + 1) % 1;
  const a = strength * (0.7 + 0.3 * energy);
  let displacement = 0;
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i][0]) {
      const [t0, v0] = keys[i - 1],
        [t1, v1] = keys[i];
      const t = (p - t0) / (t1 - t0),
        ease = t * t * (3 - 2 * t);
      displacement = v0 + (v1 - v0) * ease;
      break;
    }
  }
  const y = 1 + a * displacement,
    x = 1 / Math.sqrt(y);
  return {
    x,
    y,
    z: x,
    lift: 0,
    sway: a * 0.032 * Math.sin(beats * Math.PI),
    twist: a * 0.02 * Math.sin(beats * Math.PI * 2 + 0.4),
  };
}
