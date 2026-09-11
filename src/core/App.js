import { CharacterLibrary } from "../characters/CharacterLibrary.js";
import { resolveScene } from "../scenes/registry.js";
import { IntroSequence } from "./IntroSequence.js";
import { SoloInteraction } from "../interaction/SoloInteraction.js";
import * as T from "three";
import { AssetManager, disposeTree } from "./AssetManager.js";
import { AudioManager } from "../audio/AudioManager.js";
import { PlaylistManager, playbackModes } from "../audio/PlaylistManager.js";
import { SongLibrary } from "../audio/SongLibrary.js";
import { LibraryControls } from "../ui/LibraryControls.js";
import { BeatClock } from "../audio/BeatClock.js";
import { CharacterManager } from "../characters/CharacterManager.js";
import { CameraDirector } from "../camera/CameraDirector.js";
import { LiveUI } from "../ui/LiveUI.js";
import { presets, defaultPreset } from "../config/presets.js";
import { models as defaultModels, songs } from "../config/manifest.js";
export class App extends EventTarget {
  constructor(
    definition = resolveScene(
      new URLSearchParams(location.search).get("scene"),
    ),
  ) {
    super();
    this.definition = definition;
    const models = (this.models = [
      ...defaultModels,
      ...(definition.models || []).map((m) => ({
        ...m,
        model: m.model || m.src,
      })),
    ]);
    this.bandKey =
      definition.id === "circle" ? "circle-band" : `live-band-${definition.id}`;
    const members = (this.members = definition.performerSlots.map((slot) => ({
      ...models.find((m) => m.id === (slot.modelId || slot.id)),
      ...slot,
    })));
    this.ui = new LiveUI(
      songs,
      members,
      models,
      definition.cameraAnchors,
      definition.presentation,
    );
    this.scene = new T.Scene();
    this.scene.background = new T.Color(
      definition.environment?.background ?? 0x090910,
    );
    this.scene.fog = new T.FogExp2(
      definition.environment?.fogColor ?? 0x0e0b19,
      definition.environment?.fogDensity ?? 0.034,
    );
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.ui.$("viewport").append(this.renderer.domElement);
    this.camera = new T.PerspectiveCamera(
      43,
      innerWidth / innerHeight,
      0.1,
      70,
    );
    this.assets = new AssetManager();
    this.audio = new AudioManager(definition.audioEnvironment);
    this.songLibrary = new SongLibrary(songs);
    this.beat = new BeatClock();
    this.sceneModule = definition.create({
      world: this.scene,
      members,
      definition,
    });
    // Only these adapters enter the engine; a plugin's dispose must never replace App.dispose.
    const { stage, instruments, lighting, audience } = this.sceneModule;
    Object.assign(this, { stage, instruments, lighting, audience });
    this.characters = new CharacterManager(
      this.scene,
      this.assets,
      members,
      definition.stageHeight,
    );
    let showInstruments = true;
    try {
      showInstruments = localStorage.getItem("circle-instruments") !== "hide";
    } catch {}
    this.setInstrumentsVisible(showInstruments);
    this.director = new CameraDirector(this.camera, this.renderer.domElement, {
      anchors: definition.cameraAnchors,
      sequence: definition.cameraSequence,
      player: definition.player,
    });
    this.solo = new SoloInteraction(this);
    this.intro = new IntroSequence(this, definition.introSequence || null);
    this.addEventListener("songleaving", () => this.intro.cancel());
    this.playlist = new PlaylistManager({
      beforePlay: () => this.intro.beforePlay(),
      cancelPending: () => this.intro.cancel(),
      audio: this.audio,
      songs,
      activate: (index) => this.activateSong(index),
      beforeLeave: (reason) =>
        this.dispatchEvent(
          new CustomEvent("songleaving", {
            detail: { reason, song: this.currentSong },
          }),
        ),
      onError: (error) => {
        this.ui.playing(false);
        this.ui.notify(
          "无法播放当前歌曲：" + error.message + "。可手动选择下一首。",
        );
      },
    });
    try {
      this.playlist.setMode(localStorage.getItem("circle-playback-mode"));
    } catch {}
    this.ui.$("playback-mode").value = this.playlist.mode;
    this.last = performance.now();
    this.fps = 60;
    this.frames = 0;
    this.disposed = false;
    this.bind();
    this.libraryControls = new LibraryControls(this, songs);
    this.characterLibrary = new CharacterLibrary(this, models);
    this.quality(defaultPreset());
    this.song(0);
    const generation = this.audio.generation;
    this.songLibrary
      .init()
      .then(() => {
        if (this.disposed) {
          this.songLibrary.dispose();
          return;
        }
        const id = this.currentSong.id;
        this.ui.refreshSongs(songs, id);
        if (this.audio.generation === generation && !this.audio.running)
          this.song(songs.findIndex((s) => s.id === id));
      })
      .catch(
        () =>
          (this.ui.$("library-status").textContent =
            "浏览器本地存储暂不可用；内置歌曲仍可正常播放。"),
      );
    this.resize = () => {
      this.renderer.setSize(innerWidth, innerHeight);
      this.camera.aspect = innerWidth / innerHeight;
      this.director.syncProjection();
    };
    window.addEventListener("resize", this.resize);
    this.resize();
    this.renderer.setAnimationLoop((t) => this.frame(t));
    this.characters
      .load((text, p, failed) => {
        this.ui.loading(
          text,
          p,
          `${this.characters.characters.length} / ${members.length}`,
          failed,
        );
        for (const c of this.characters.characters)
          this.ui.$("member-" + c.member.id)?.classList.add("ready");
      })
      .then(async () => {
        await this.characterLibrary.ready;
        if (this.disposed) return;
        let saved = {};
        try {
          saved = JSON.parse(localStorage.getItem(this.bandKey) || "{}");
        } catch {}
        for (const member of members) {
          if (
            Object.hasOwn(saved, member.id) &&
            saved[member.id] !== (member.modelId || member.id)
          ) {
            try {
              await this.characters.replace(
                member.id,
                models.find((m) => m.id === saved[member.id]) ||
                  (saved[member.id] === ""
                    ? null
                    : { ...member, id: member.modelId || member.id }),
              );
            } catch {}
          }
        }
        if (this.disposed) return;
        for (const select of document.querySelectorAll("[data-slot]")) {
          select.disabled = false;
          select.value =
            this.characters.characters.find(
              (c) => c.member.id === select.dataset.slot,
            )?.source.id || "";
        }
        this.ui.$("reset-band").disabled = false;
        this.ui.$("band-status").textContent =
          "选择任意玩偶或空位，阵容将保存在此浏览器。";
        this.updateRoster();
        // Rewrite only current slots: remove obsolete saved slot/model IDs.
        this.saveBand();
      });
  }
  bind() {
    const members = this.members,
      models = this.models;
    const ui = this.ui;
    this.toggle = async () => {
      return this.playlist.toggle();
    };
    ui.on("immersive-audio", "change", (e) => {
      this.audio.immersiveMode = e.target.value;
    });
    ui.on("intro-mode", "change", (e) => {
      this.intro.enabled = e.target.value === "on";
      if (!this.intro.enabled && this.intro.active) this.playlist.pause();
    });
    ui.on("cancel-intro", "click", () => this.playlist.pause());
    ui.on("start", "click", this.toggle);
    ui.on("play", "click", this.toggle);
    ui.on("restart", "click", () => this.playlist.restart());
    ui.on("previous", "click", () => this.playlist.move(-1));
    ui.on("next", "click", () => this.playlist.move(1));
    ui.on("playback-mode", "change", (e) => {
      this.playlist.setMode(e.target.value);
      try {
        localStorage.setItem("circle-playback-mode", this.playlist.mode);
      } catch {}
      ui.notify(playbackModes[this.playlist.mode]);
    });
    ui.on("song", "change", (e) => this.song(Number(e.target.value)));
    ui.on(
      "volume",
      "input",
      (e) => (this.audio.media.volume = Number(e.target.value)),
    );
    ui.on("seek", "input", (e) => {
      if (this.intro.active) this.playlist.pause();
      if (Number.isFinite(this.audio.media.duration))
        this.audio.seek(
          (Number(e.target.value) / 1000) * this.audio.media.duration,
        );
    });
    ui.on("camera", "change", (e) => {
      if (this.intro.active) this.playlist.pause();
      this.director.setMode(e.target.value);
      ui.$("walk-pad").hidden = !["free", "firstperson"].includes(
        e.target.value,
      );
      ui.$("walk-pad").classList.toggle("flying", e.target.value === "free");
      if (["free", "firstperson"].includes(e.target.value))
        ui.notify(
          "拖动画面转头；WASD 或屏幕方向键移动。自由视角可用 Q / E 升降。",
        );
      e.target.blur();
    });
    ui.on("strength", "input", (e) => {
      this.characters.strength = Number(e.target.value);
      ui.$("strength-value").value =
        Math.round(this.characters.strength * 100) + "%";
    });
    for (const button of document.querySelectorAll("[data-key]")) {
      button.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        this.director.free.keys.add(button.dataset.key);
      });
      for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
        button.addEventListener(event, () =>
          this.director.free.keys.delete(button.dataset.key),
        );
    }
    for (const select of document.querySelectorAll("[data-slot]"))
      select.addEventListener("change", async () => {
        document
          .querySelectorAll("[data-slot]")
          .forEach((s) => (s.disabled = true));
        ui.$("reset-band").disabled = true;
        const previous =
          this.characters.characters.find(
            (c) => c.member.id === select.dataset.slot,
          )?.source.id || "";
        try {
          ui.$("band-status").textContent = "正在切换模型，请稍候…";
          await this.characters.replace(
            select.dataset.slot,
            models.find((m) => m.id === select.value) || null,
          );
          this.updateRoster();
          this.saveBand();
          ui.$("band-status").textContent = "阵容已更新并保存。";
        } catch (error) {
          select.value = previous;
          ui.$("band-status").textContent =
            "模型切换失败，已保留原角色：" + error.message;
        } finally {
          document
            .querySelectorAll("[data-slot]")
            .forEach((s) => (s.disabled = false));
          ui.$("reset-band").disabled = false;
        }
      });
    ui.on("reset-band", "click", async () => {
      const button = ui.$("reset-band");
      button.disabled = true;
      document
        .querySelectorAll("[data-slot]")
        .forEach((s) => (s.disabled = true));
      try {
        for (const member of members) {
          await this.characters.replace(member.id, {
            ...member,
            id: member.modelId || member.id,
          });
          document.querySelector(`[data-slot="${member.id}"]`).value =
            member.modelId || member.id;
        }
        this.saveBand();
        this.updateRoster();
        ui.$("band-status").textContent = "已恢复原始阵容。";
      } catch (e) {
        ui.notify("恢复阵容失败：" + e.message);
      } finally {
        button.disabled = false;
        document
          .querySelectorAll("[data-slot]")
          .forEach((s) => (s.disabled = false));
      }
    });
    ui.on("instruments", "change", (e) =>
      this.setInstrumentsVisible(e.target.value === "show"),
    );
    ui.on("preset", "change", (e) => this.quality(e.target.value));
    const configure = () => {
      this.beat.configure(ui.$("bpm").value, ui.$("offset").value);
      ui.setSongInfo({ ...this.currentSong, bpm: this.beat.bpm });
      try {
        localStorage.setItem(
          "circle-sync-" + this.currentSong.id,
          JSON.stringify({ bpm: this.beat.bpm, offset: this.beat.offset }),
        );
      } catch {}
    };
    ui.on("bpm", "change", configure);
    ui.on("offset", "change", configure);
    ui.on("align", "click", async () => {
      const button = ui.$("align");
      button.disabled = true;
      const id = this.currentSong.id;
      try {
        this.audio.init();
        ui.$("align-status").textContent = "正在分析音频起音与 BPM 网格…";
        const result = await this.audio.align(this.beat.bpm);
        if (id !== this.currentSong.id) return;
        ui.$("offset").value = result.offset.toFixed(2);
        configure();
        ui.$("align-status").textContent =
          `首拍估计 ${result.offset.toFixed(2)} 秒 · 参考得分 ${Math.round(result.confidence * 100)}%。可根据听感微调。`;
      } catch (e) {
        ui.$("align-status").textContent =
          `自动对齐失败：${e.message}。仍可手动调整首拍。`;
      } finally {
        button.disabled = false;
      }
    });
    for (const e of ["playing", "pause", "ended"])
      this.audio.addEventListener(e, () =>
        ui.playing(!this.audio.media.paused && !this.audio.media.ended),
      );
    this.audio.addEventListener("error", () => {
      this.playlist.pause();
      ui.notify("歌曲加载失败，请选择其他歌曲。");
    });
    this.keydown = (e) => {
      if (this.intro.active && e.key === "Escape") {
        this.playlist.pause();
        return;
      }
      if (this.solo.keydown(e)) return;
      if (e.key === "Escape" && document.body.classList.contains("ui-hidden")) {
        ui.hideAll(false);
        return;
      }
      if (
        e.key.toLowerCase() === "h" &&
        !/INPUT|TEXTAREA/.test(document.activeElement.tagName)
      ) {
        ui.hideAll(!document.body.classList.contains("ui-hidden"));
        return;
      }
      if (/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName))
        return;
      if (
        e.code === "Space" &&
        !e.repeat &&
        !document.activeElement.isContentEditable
      ) {
        e.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener("keydown", this.keydown);
    this.restoreUI = () => {
      if (document.body.classList.contains("ui-hidden")) ui.hideAll(false);
    };
    this.renderer.domElement.addEventListener("dblclick", this.restoreUI);
    let lastTap = 0,
      start = null;
    this.tapStart = (e) => {
      start = { x: e.clientX, y: e.clientY };
    };
    this.tapEnd = (e) => {
      if (
        e.pointerType !== "touch" ||
        !start ||
        Math.hypot(e.clientX - start.x, e.clientY - start.y) > 15
      )
        return;
      const now = performance.now();
      if (now - lastTap < 350) this.restoreUI();
      lastTap = now;
    };
    this.renderer.domElement.addEventListener("pointerdown", this.tapStart);
    this.renderer.domElement.addEventListener("pointerup", this.tapEnd);
    this.visibility = () => {
      if (document.hidden) {
        this.wasPlaying = this.audio.running;
        this.playlist.pause();
      } else this.last = performance.now();
    };
    document.addEventListener("visibilitychange", this.visibility);
    this.contextLost = (e) => {
      e.preventDefault();
      this.playlist.pause();
      ui.notify("三维画面连接已中断，请刷新页面并尝试低画质。");
    };
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
  }
  song(index, options) {
    return this.playlist.select(index, options);
  }
  activateSong(index) {
    const song = songs[index];
    if (!song) {
      this.ui.notify("暂无歌曲，请在歌曲面板添加音频。");
      return;
    }
    this.currentSong = song;
    this.ui.$("song").value = index;
    this.ui.setSongInfo(song);
    this.audio.load(song);
    let settings = {};
    try {
      settings = JSON.parse(
        localStorage.getItem("circle-sync-" + song.id) || "{}",
      );
    } catch {}
    this.beat.configure(
      settings.bpm || song.bpm,
      settings.offset ?? song.offset,
    );
    this.ui.$("bpm").value = this.beat.bpm;
    this.ui.$("offset").value = this.beat.offset;
    this.ui.setSongInfo({ ...song, bpm: this.beat.bpm });
    this.ui.$("align-status").textContent =
      "节拍网格已就绪。可自动估计首拍位置，或手动微调。";
    if (!song.bpm) this.ui.notify("缺少 BPM，请在演出设置中填写（暂用 130）。");
    this.director.lastSwitch = -100;
    this.director.previousBar = -1;
    this.director.cutIndex = 0;
    if (!["firstperson", "free", "manual"].includes(this.director.mode))
      this.director.select(this.director.shot);
    this.characters.update(this.beat.sample(0), this.audio.bands, false, 1);
    this.ui.update(
      this.audio,
      this.beat.sample(0),
      this.director,
      this.fps || 60,
    );
    this.dispatchEvent(
      new CustomEvent("songchange", {
        detail: {
          song,
          bpm: this.beat.bpm,
          offset: this.beat.offset,
          generation: this.audio.generation,
        },
      }),
    );
  }
  quality(name) {
    const preset = presets[name];
    this.preset = name;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, preset.dpr));
    this.renderer.shadowMap.enabled = preset.shadows;
    this.lighting.configure(preset);
    this.audience.configure(preset);
    this.ui.$("preset").value = name;
    this.ui.$("quality-label").textContent = {
      low: "低画质",
      medium: "中画质",
      high: "高画质",
      ultra: "极高画质",
    }[name];
  }
  frame(now) {
    if (this.disposed) return;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    if (document.hidden) return;
    this.fps = T.MathUtils.lerp(this.fps, 1 / Math.max(dt, 0.001), 0.03);
    const beat = this.beat.sample(this.audio.time),
      bands = this.audio.analyze();
    this.characters.update(beat, bands, this.audio.running, dt, this.camera);
    this.instruments.sync(this.characters.characters);
    this.stage.update(beat, bands);
    this.lighting.update(beat, bands, this.audio.running);
    this.audience.update(beat, this.audio.running);
    if (this.intro.active) this.intro.update(now);
    else this.director.update(beat, bands, dt, this.audio.running);
    this.solo.update(beat, bands, now / 1000);
    if (this.audio.routing) {
      const source = new T.Vector3(
        ...(this.audio.environment.source || [0, 2, -1]),
      );
      const delta = source.sub(this.camera.position),
        distance = delta.length();
      const right = new T.Vector3(1, 0, 0).applyQuaternion(
        this.camera.quaternion,
      );
      this.audio.routing.update(
        this.audio.immersiveMode,
        this.director.mode === "firstperson",
        delta.normalize().dot(right),
        distance,
      );
    }
    this.renderer.render(this.scene, this.camera);
    if (this.frames % 2 === 0) this.characterLibrary.update();
    if (this.frames++ % 12 === 0)
      this.ui.update(this.audio, beat, this.director, this.fps);
  }
  dispose() {
    this.disposed = true;
    this.solo.dispose();
    this.characters.dispose();
    this.characterLibrary.dispose();
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.keydown);
    document.removeEventListener("visibilitychange", this.visibility);
    this.audio.dispose();
    this.playlist.dispose();
    this.songLibrary.dispose();
    this.director.dispose();
    this.sceneModule.dispose?.();
    disposeTree(this.scene);
    this.renderer.dispose();
    clearTimeout(this.ui.toastTimer);
    this.renderer.domElement.removeEventListener("dblclick", this.restoreUI);
    this.renderer.domElement.removeEventListener("pointerdown", this.tapStart);
    this.renderer.domElement.removeEventListener("pointerup", this.tapEnd);
  }
  updateRoster() {
    const members = this.members;
    for (const member of members) {
      const c = this.characters.characters.find(
        (c) => c.member.id === member.id,
      );
      this.ui.setSlot(member, c?.source);
    }
    this.ui.$("load-count").textContent =
      `${this.characters.characters.length} / ${members.length}`;
  }
  setInstrumentsVisible(show) {
    this.instruments.visible = show;
    this.characters.setInstrumentsVisible(show);
    this.instruments.sync(this.characters.characters);
    this.ui.$("instruments").value = show ? "show" : "hide";
    try {
      localStorage.setItem("circle-instruments", show ? "show" : "hide");
    } catch {}
  }
  saveBand() {
    const members = this.members;
    const selection = Object.fromEntries(
      members.map((m) => [
        m.id,
        this.characters.characters.find((c) => c.member.id === m.id)?.source
          .id || "",
      ]),
    );
    try {
      localStorage.setItem(this.bandKey, JSON.stringify(selection));
    } catch {
      this.ui.notify("当前阵容已更新，但浏览器无法保存设置。");
    }
  }
}
