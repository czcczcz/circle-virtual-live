import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FreeCamera } from "./FreeCamera.js";
export const shots = {
  wide: { label: "全景", p: [0, 4.7, 13.8], t: [0, 2, -0.6] },
  center: { label: "中央", p: [0, 3.3, 9], t: [0, 2, -0.5] },
  vocal: { label: "主唱特写", p: [0.7, 2.8, 6.4], t: [0, 2.1, 0.1] },
  left: { label: "舞台左侧", p: [-6, 3.1, 7], t: [-2, 2, -0.3] },
  right: { label: "舞台右侧", p: [6, 3.1, 7], t: [2, 2, -0.3] },
  low: { label: "低角度", p: [0.7, 1.65, 8], t: [0, 2.55, -1] },
  audience: { label: "观众远景", p: [-1, 2.6, 12.5], t: [0, 2.9, -0.7] },
  sweep: { label: "横向巡游", p: [-5, 3.6, 9], t: [0, 2, -0.5] },
  orbit: { label: "动态环绕", p: [4, 4.2, 10], t: [0, 2, -0.5] },
};
export class CameraDirector {
  constructor(camera, canvas) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, canvas);
    this.free = new FreeCamera(camera, canvas);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 22;
    this.controls.target.set(0, 2, -0.6);
    this.controls.enabled = false;
    this.mode = "auto";
    this.shot = "wide";
    this.previousBar = -1;
    this.lastSwitch = -100;
    this.target = new T.Vector3(0, 2, -0.6);
    this.camera.position.fromArray(shots.wide.p);
    this.camera.lookAt(this.target);
    this.progress = 1;
    this.sequence = [
      "wide",
      "center",
      "left",
      "vocal",
      "right",
      "sweep",
      "audience",
      "orbit",
      "low",
    ];
    this.cutIndex = 0;
  }
  setMode(mode) {
    if (this.mode === "manual") this.target.copy(this.controls.target);
    if (this.free.enabled) {
      this.camera.getWorldDirection(this.target);
      this.target.multiplyScalar(5).add(this.camera.position);
    }
    this.free.leave();
    this.mode = mode;
    this.syncProjection();
    this.controls.enabled = mode === "manual";
    if (mode === "firstperson" || mode === "free") {
      this.free.enter(mode);
      return;
    }
    if (mode === "manual") this.controls.target.copy(this.target);
    else if (mode !== "auto") this.select(mode);
    else this.select(this.shot);
  }
  select(shot) {
    this.shot = shot;
    this.fromPosition = this.camera.position.clone();
    this.fromTarget = this.target.clone();
    this.progress = 0;
  }
  syncProjection() {
    this.camera.fov = ["firstperson", "free"].includes(this.mode)
      ? 70
      : this.camera.aspect < 0.85
        ? 58
        : 43;
    this.camera.updateProjectionMatrix();
  }
  update(beat, bands, dt, playing) {
    if (this.free.enabled) {
      this.free.update(dt);
      return;
    }
    if (this.mode === "manual") {
      this.controls.update();
      return;
    }
    if (this.mode === "auto" && playing) {
      const interval = bands.energy > 0.58 ? 4 : 8;
      if (beat.bar !== this.previousBar) {
        if (beat.bar < this.lastSwitch) this.lastSwitch = beat.bar;
        if (beat.bar - this.lastSwitch >= interval) {
          this.lastSwitch = beat.bar;
          this.select(this.sequence[this.cutIndex++ % this.sequence.length]);
        }
        this.previousBar = beat.bar;
      }
    }
    const shot = shots[this.shot];
    const position = new T.Vector3(...shot.p),
      target = new T.Vector3(...shot.t);
    if (this.shot === "sweep")
      position.x = Math.sin((beat.beats / 32) * Math.PI) * 4.8;
    if (this.shot === "orbit") {
      position.x = Math.sin((beat.beats / 48) * Math.PI) * 4;
      position.z = 10 + Math.cos((beat.beats / 48) * Math.PI) * 0.5;
    }
    // Portrait framing backs away to keep the full band visible, instead of cropping the wings.
    if (this.camera.aspect < 0.85)
      position.sub(target).multiplyScalar(1.5).add(target);
    // Two-second eased transitions settle into a shot; only sweep/orbit keep moving.
    this.progress = Math.min(1, this.progress + dt / 2.4);
    const ease = this.progress * this.progress * (3 - 2 * this.progress);
    if (this.fromPosition) {
      this.camera.position.lerpVectors(this.fromPosition, position, ease);
      this.target.lerpVectors(this.fromTarget, target, ease);
    } else {
      this.camera.position.copy(position);
      this.target.copy(target);
    }
    this.camera.lookAt(this.target);
  }
  dispose() {
    this.controls.dispose();
    this.free.dispose();
  }
}
