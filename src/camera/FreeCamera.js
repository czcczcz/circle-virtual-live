import * as T from "three";
// Drag-to-look deliberately avoids pointer lock: it works in embedded browsers and on touch.
export class FreeCamera {
  constructor(camera, canvas, options = {}) {
    options ||= {};
    this.camera = camera;
    this.options = options;
    this.bounds = {
      x: [-6.6, 6.6],
      z: [3.1, 13],
      freeZ: [-3.4, 13],
      y: [0.8, 6.3],
      ...options.bounds,
    };
    this.canvas = canvas;
    this.enabled = false;
    this.keys = new Set();
    this.yaw = 0;
    this.pitch = 0;
    this.drag = null;
    this.forward = new T.Vector3();
    this.right = new T.Vector3();
    this.down = (e) => {
      if (!this.enabled || e.button > 0) return;
      this.drag = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    this.move = (e) => {
      if (!this.enabled || !this.drag) return;
      this.yaw -= (e.clientX - this.drag.x) * 0.004;
      this.pitch = T.MathUtils.clamp(
        this.pitch - (e.clientY - this.drag.y) * 0.004,
        -1.3,
        1.3,
      );
      this.drag = { x: e.clientX, y: e.clientY };
    };
    this.up = () => (this.drag = null);
    this.keydown = (e) => {
      if (
        !this.enabled ||
        /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)
      )
        return;
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "KeyQ",
          "KeyE",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.code)
      ) {
        e.preventDefault();
        this.keys.add(e.code);
      }
    };
    this.keyup = (e) => this.keys.delete(e.code);
    this.blur = () => {
      this.keys.clear();
      this.drag = null;
    };
    canvas.addEventListener("pointerdown", this.down);
    canvas.addEventListener("pointermove", this.move);
    canvas.addEventListener("pointerup", this.up);
    canvas.addEventListener("pointercancel", this.up);
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    window.addEventListener("blur", this.blur);
  }
  enter(mode) {
    this.enabled = true;
    this.mode = mode;
    this.keys.clear();
    this.camera.position.set(
      0,
      mode === "firstperson" ? 1.65 : 3.3,
      mode === "firstperson" ? 5.5 : 9,
    );
    this.camera.position.fromArray(
      mode === "firstperson"
        ? this.options.spawn || [0, 1.65, 5.5]
        : this.options.freeSpawn || [0, 3.3, 9],
    );
    this.yaw = 0;
    this.pitch = mode === "firstperson" ? 0.075 : -0.12;
  }
  leave() {
    this.enabled = false;
    this.keys.clear();
    this.drag = null;
  }
  update(dt) {
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    this.camera.getWorldDirection(this.forward);
    if (this.mode === "firstperson") this.forward.y = 0;
    this.forward.normalize();
    this.right.crossVectors(this.forward, new T.Vector3(0, 1, 0)).normalize();
    const z =
        (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0) -
        (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0),
      x =
        (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
        (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0);
    const factor = (2.8 * dt) / Math.max(1, Math.hypot(x, z));
    this.camera.position
      .addScaledVector(this.forward, z * factor)
      .addScaledVector(this.right, x * factor);
    if (this.mode === "free")
      this.camera.position.y +=
        ((this.keys.has("KeyE") ? 1 : 0) - (this.keys.has("KeyQ") ? 1 : 0)) *
        2.8 *
        dt;
    else this.camera.position.y = this.options.eyeHeight || 1.65;
    this.camera.position.x = T.MathUtils.clamp(
      this.camera.position.x,
      ...this.bounds.x,
    );
    this.camera.position.z = T.MathUtils.clamp(
      this.camera.position.z,
      ...(this.mode === "firstperson" ? this.bounds.z : this.bounds.freeZ),
    );
    this.camera.position.y = T.MathUtils.clamp(
      this.camera.position.y,
      ...this.bounds.y,
    );
  }
  dispose() {
    this.canvas.removeEventListener("pointerdown", this.down);
    this.canvas.removeEventListener("pointermove", this.move);
    this.canvas.removeEventListener("pointerup", this.up);
    this.canvas.removeEventListener("pointercancel", this.up);
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    window.removeEventListener("blur", this.blur);
  }
}
