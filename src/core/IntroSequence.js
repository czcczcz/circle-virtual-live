import * as T from "three";

// Wall-clock presentation only. Completion releases the playlist gate; this
// sequence never seeks/plays media or changes the BeatClock.
export class IntroSequence {
  constructor(app, definition = { duration: 3.6, from: [0, 3, 18] }) {
    this.app = app;
    this.definition = definition;
    this.enabled = false;
    this.active = false;
    this.completed = -1;
  }
  beforePlay() {
    if (
      !this.enabled ||
      !this.definition ||
      this.app.audio.time > 0.05 ||
      this.completed === this.app.audio.generation
    )
      return true;
    // Unlock the one existing context while the original click still has activation.
    this.app.audio.init();
    const unlocked = this.app.audio.context.resume();
    this.cancel();
    const a = this.app;
    clearTimeout(a.ui.toastTimer);
    a.ui.$("toast")?.classList?.remove("visible");
    this.saved = {
      position: a.camera.position.clone(),
      quaternion: a.camera.quaternion.clone(),
      exposure: a.renderer.toneMappingExposure,
    };
    if (a.director) {
      this.controlsState = {
        orbit: a.director.controls.enabled,
        free: a.director.free.enabled,
      };
      a.director.controls.enabled = false;
      a.director.free.enabled = false;
    }
    this.generation = a.audio.generation;
    this.start = performance.now();
    this.active = true;
    a.ui.$("intro-status").hidden = false;
    a.ui.playing(true);
    const completion = new Promise((resolve) => (this.resolve = resolve));
    unlocked.catch(() => this.cancel());
    return completion;
  }
  update(now) {
    if (!this.active) return;
    const p = Math.min(
        1,
        (now - this.start) /
          (Math.max(0.1, this.definition.duration || 3.6) * 1000),
      ),
      ease = p * p * (3 - 2 * p);
    const a = this.app;
    a.camera.position.lerpVectors(
      new T.Vector3(...(this.definition.from || this.saved.position.toArray())),
      this.saved.position,
      ease,
    );
    a.camera.quaternion.copy(this.saved.quaternion);
    a.renderer.toneMappingExposure = this.saved.exposure * (0.08 + 0.92 * ease);
    // Scene modules may supply a pure pose sampler; playback remains owned by the gate.
    try {
      const pose = this.definition.sample?.(p, {
        endPosition: this.saved.position.toArray(),
      });
      const vector = (v) =>
        Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
      if (vector(pose?.position)) a.camera.position.fromArray(pose.position);
      if (vector(pose?.target)) a.camera.lookAt(...pose.target);
      if (Number.isFinite(pose?.brightness))
        a.renderer.toneMappingExposure =
          this.saved.exposure * T.MathUtils.clamp(pose.brightness, 0, 2);
    } catch {
      this.cancel();
      a.ui.notify("入场效果异常，已取消。关闭入场后可正常播放。");
      return;
    }
    a.ui.$("intro-caption").textContent =
      p < 0.6 ? this.definition.label || "舞台正在亮起" : "准备开演";
    if (p === 1) {
      this.completed = this.generation;
      this.finish(true);
    }
  }
  finish(ok) {
    if (!this.active) return;
    const a = this.app;
    this.active = false;
    a.camera.position.copy(this.saved.position);
    a.camera.quaternion.copy(this.saved.quaternion);
    a.renderer.toneMappingExposure = this.saved.exposure;
    a.ui.$("intro-status").hidden = true;
    if (this.controlsState) {
      a.director.controls.enabled = this.controlsState.orbit;
      a.director.free.enabled = this.controlsState.free;
      this.controlsState = null;
    }
    a.ui.playing(false);
    this.resolve?.(ok);
    this.resolve = null;
  }
  cancel() {
    this.finish(false);
  }
}
