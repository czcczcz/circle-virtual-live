import { RhythmJudge } from "./RhythmJudge.js";
import { GlowStickController } from "./GlowStickController.js";

export const isEditing = (target) =>
  Boolean(
    target?.closest?.(
      "input,textarea,select,button,[contenteditable]:not([contenteditable=false])",
    ),
  );

// Enhances CameraDirector.firstperson; owns no camera, audio context or beat clock.
export class SoloInteraction {
  constructor(app) {
    this.app = app;
    this.judge = new RhythmJudge(app.beat);
    this.code = "";
    this.codeTime = 0;
    this.resultUntil = 0;
    this.overlay = document.createElement("div");
    this.overlay.id = "rhythm-feedback";
    this.overlay.hidden = true;
    this.overlay.innerHTML =
      '<strong id="rhythm-grade"></strong><span id="rhythm-stats"></span><small id="rhythm-detail"></small>';
    document.querySelector("#app").append(this.overlay);
    this.grade = this.overlay.querySelector("strong");
    this.stats = this.overlay.querySelector("span");
    this.detail = this.overlay.querySelector("small");
    this.songLeaving = (e) => {
      if (e.detail.reason !== "continuation")
        this.finish(
          e.detail.reason === "ended" ? "本曲应援完成" : "已结束本次应援",
          e.detail.reason === "ended",
        );
    };
    this.songChange = () => {
      this.code = "";
      this.judge.cancel();
    };
    this.seek = () => this.finish("播放位置已改变", false);
    app.addEventListener("songleaving", this.songLeaving);
    app.addEventListener("songchange", this.songChange);
    app.audio.addEventListener("seeked", this.seek);
    this.glow = new GlowStickController(app.camera);
    app.scene.add(app.camera);
    this.pointerStart = (e) => {
      if (e.button === 0) this.down = { x: e.clientX, y: e.clientY };
    };
    this.pointerEnd = (e) => {
      if (
        this.active &&
        this.down &&
        Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) < 9
      )
        this.input();
      this.down = null;
    };
    this.canvas = app.renderer.domElement;
    this.canvas.addEventListener("pointerdown", this.pointerStart);
    this.canvas.addEventListener("pointerup", this.pointerEnd);
    this.cancelPointer = () => {
      this.down = null;
      this.code = "";
    };
    this.canvas.addEventListener("pointercancel", this.cancelPointer);
    window.addEventListener("blur", this.cancelPointer);
    app.ui.on("auto-call", "change", (e) => {
      this.glow.autoEvery = Number(e.target.value);
    });
    app.ui.on("swing", "click", () => {
      if (this.active) this.input();
    });
  }
  get active() {
    return this.app.director.mode === "firstperson";
  }
  keydown(e) {
    if (e.key === "Escape" && (this.judge.active || this.resultUntil > 0)) {
      this.judge.cancel();
      this.resultUntil = 0;
      this.overlay.hidden = true;
      this.app.ui.hideAll(false);
      this.code = "";
      return true;
    }
    if (
      !this.active ||
      isEditing(e.target) ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    ) {
      this.code = "";
      return false;
    }
    if (e.repeat) {
      if (e.code === "Space") e.preventDefault();
      return e.code === "Space";
    }
    if (/^[a-z]$/i.test(e.key)) {
      const now = performance.now();
      if (now - this.codeTime > 2000) this.code = "";
      this.codeTime = now;
      this.code = (this.code + e.key.toLowerCase()).slice(-6);
      if (this.code === "popipa") {
        this.code = "";
        this.start();
        return true;
      }
    }
    if (e.code === "Space") {
      e.preventDefault();
      this.input();
      return true;
    }
    return false;
  }
  start() {
    if (!this.active || this.judge.active) return;
    if (!this.app.audio.running) {
      this.app.ui.notify("请先播放歌曲，再开始应援挑战。");
      return;
    }
    clearTimeout(this.app.ui.toastTimer);
    this.app.ui.$("toast").classList.remove("visible");
    this.judge.start(this.app.audio.time, this.app.audio.media.duration);
    this.grade.textContent = "准备应援 · 4";
    this.grade.style.opacity = "1";
    this.stats.textContent = "跟着音乐，准备踩拍";
    this.detail.textContent = "空格 / 点击踩拍 · Esc 返回现场";
    this.resultUntil = 0;
    this.glow.swing();
    this.overlay.hidden = false;
  }
  finish(label, flush = false) {
    const result = this.judge.finish(this.app.audio.time, flush);
    if (!result) return;
    this.grade.textContent = label;
    this.grade.style.opacity = "1";
    this.stats.textContent = `得分 ${result.score} · 准确率 ${result.accuracy.toFixed(1)}% · 最高连击 ${result.maxCombo}`;
    this.detail.textContent = `Perfect ${result.Perfect} · Great ${result.Great} · Good ${result.Good} · Miss ${result.Miss}`;
    this.resultUntil = performance.now() / 1000 + 10;
  }
  input() {
    // Feedback is unconditional, even during a miss, pause, or countdown.
    this.glow.swing();
    if (this.app.audio.running) this.judge.hit(this.app.audio.time);
  }
  update(beat, bands, now) {
    if (!this.active) {
      this.code = "";
      if (this.judge.active) this.finish("已退出应援挑战", false);
    }
    if (
      this.judge.active &&
      (this.judge.bpm !== this.app.beat.bpm ||
        this.judge.offset !== this.app.beat.offset)
    )
      this.finish("节拍设置已改变", false);
    if (this.judge.active) {
      if (this.app.audio.running) this.judge.update(beat.time);
      const remain = Math.max(0, Math.ceil(this.judge.first - beat.beats));
      const age = beat.time - this.judge.feedbackTime;
      this.grade.style.opacity = this.app.audio.running && this.judge.state === "playing" && age < .55
        ? String(Math.max(0, 1 - Math.max(0, age - .25) / .3)) : "1";
      this.grade.textContent = !this.app.audio.running
        ? "已暂停"
        : this.judge.state === "countdown"
          ? `准备应援 · ${remain}`
          : beat.time - this.judge.feedbackTime < 0.55
            ? this.judge.feedback.toUpperCase()
            : "跟着节拍 · 一起应援";
      this.stats.textContent = `连击 ${this.judge.combo} · 得分 ${this.judge.score} · 准确率 ${this.judge.accuracy.toFixed(1)}%`;
      this.detail.textContent = "空格 / 点击踩拍 · Esc 返回现场";
    }
    this.overlay.hidden = !(
      this.active &&
      (this.judge.active || now < this.resultUntil)
    );
    if (now >= this.resultUntil) this.resultUntil = 0;
    this.glow.update(beat, bands, this.app.audio.running, this.active, now);
    this.app.ui.$("solo-call").hidden = !this.active;
  }
  dispose() {
    this.canvas.removeEventListener("pointerdown", this.pointerStart);
    this.canvas.removeEventListener("pointerup", this.pointerEnd);
    this.canvas.removeEventListener("pointercancel", this.cancelPointer);
    window.removeEventListener("blur", this.cancelPointer);
    this.app.removeEventListener("songleaving", this.songLeaving);
    this.app.removeEventListener("songchange", this.songChange);
    this.app.audio.removeEventListener("seeked", this.seek);
    this.overlay.remove();
    this.glow.dispose();
  }
}
