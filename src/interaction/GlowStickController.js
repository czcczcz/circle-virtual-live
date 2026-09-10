import * as T from "three";
import { disposeTree } from "../core/AssetManager.js";

const keys = [
  [0, 0],
  [0.12, -0.18],
  [0.36, 1],
  [0.56, 0.94],
  [0.78, -0.09],
  [1, 0],
];
export function swingCurve(phase) {
  if (phase < 0 || phase >= 1) return 0;
  for (let i = 1; i < keys.length; i++) {
    if (phase <= keys[i][0]) {
      const [a, v] = keys[i - 1],
        [b, w] = keys[i];
      const t = (phase - a) / (b - a),
        ease = t * t * (3 - 2 * t);
      return v + (w - v) * ease;
    }
  }
  return 0;
}

export class GlowStickController {
  constructor(camera) {
    this.rig = new T.Group();
    this.rig.name = "PlayerGlowStick";
    camera.add(this.rig);
    this.handle = new T.Mesh(
      new T.CylinderGeometry(0.025, 0.032, 0.16, 10),
      new T.MeshStandardMaterial({ color: 0xddd5ee, roughness: 0.6 }),
    );
    this.rig.add(this.handle);
    this.material = new T.MeshStandardMaterial({
      color: 0xff83bf,
      emissive: 0xff328f,
      emissiveIntensity: 2,
      roughness: 0.4,
    });
    const tube = new T.Mesh(
      new T.CylinderGeometry(0.027, 0.027, 0.4, 12),
      this.material,
    );
    tube.position.y = 0.27;
    this.rig.add(tube);
    // A low polygon additive shell suggests glow without render targets/bloom.
    const halo = new T.Mesh(
      new T.CylinderGeometry(0.043, 0.043, 0.405, 10),
      new T.MeshBasicMaterial({
        color: 0xff60b0,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    halo.position.y = 0.27;
    this.rig.add(halo);
    this.manualStart = -Infinity;
    this.autoEvery = 0;
    this.swings = 0;
    this.rig.visible = false;
  }
  swing(now = performance.now() / 1000) {
    this.manualStart = now;
    this.swings++;
  }
  update(beat, bands, playing, active, now) {
    this.rig.visible = active;
    if (!active) return;
    const manual = swingCurve((now - this.manualStart) / 0.48);
    // Absolute beat phase eliminates skipped-frame drift. FFT changes expression only.
    const interval = this.autoEvery;
    const elapsed = interval
      ? ((((beat.beats % interval) + interval) % interval) * 60) / beat.bpm
      : Infinity;
    const auto =
      playing && beat.beats >= 0 && interval
        ? swingCurve(elapsed / Math.min(0.48, (interval * 60) / beat.bpm))
        : 0;
    const pose = now - this.manualStart < 0.48 ? manual : auto;
    const strength = 0.85 + bands.energy * 0.2;
    this.rig.position.set(0.27, -0.32 + pose * 0.07, -0.63);
    this.rig.rotation.set(
      -0.22 - pose * 0.75 * strength,
      0,
      -0.24 + pose * 0.24,
    );
    this.material.emissiveIntensity =
      1.6 + bands.energy * 1.2 + Math.max(0, pose) * 0.7;
  }
  dispose() {
    this.rig.removeFromParent();
    disposeTree(this.rig);
  }
}
