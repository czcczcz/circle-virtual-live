import { instrumentTargets, showInstruments } from "./InstrumentVisibility.js";
import * as T from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { beatMotion } from "./BeatMotion.js";
import { collectSupports, groundMotion, STAGE_Y } from "./GroundContact.js";

export class CharacterManager {
  constructor(scene, assets, members, stageHeight = STAGE_Y) {
    this.scene = scene;
    this.stageHeight = stageHeight;
    this.assets = assets;
    this.members = members;
    this.characters = [];
    this.cancelled = false;
    this.versions = new Map();
    this.strength = 1.25;
    this.instrumentsVisible = true;
  }
  async load(report) {
    for (const [i, member] of this.members.entries()) {
      if (this.cancelled) return;
      report(`正在加载 ${member.name}`, i / this.members.length);
      try {
        await this.replace(
          member.id,
          { ...member, id: member.modelId || member.id },
          (p) =>
            report(
              `正在加载 ${member.name} · ${Math.round(p * 100)}%`,
              (i + p) / this.members.length,
            ),
        );
        report(`${member.name} 已就绪`, (i + 1) / this.members.length);
      } catch {
        report(
          `${member.name} 加载失败，其余成员继续`,
          (i + 1) / this.members.length,
          true,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    report(
      this.assets.failed.length
        ? "舞台已就绪 · 部分角色未加载"
        : `全部 ${this.characters.length} 位成员已就绪`,
      1,
    );
  }
  async replace(slotId, source, onProgress) {
    const slot = this.members.find((m) => m.id === slotId);
    if (!slot) throw Error("未找到舞台位置");
    const version = (this.versions.get(slotId) || 0) + 1;
    this.versions.set(slotId, version);
    if (!source) {
      this.remove(slotId);
      return;
    }
    source = { ...source, model: source.model || source.src };
    const asset = await this.assets.acquire(source, onProgress);
    if (this.cancelled || this.versions.get(slotId) !== version) {
      this.assets.release(source.model);
      return;
    }
    let candidate;
    try {
      const model = clone(asset.scene);
      model.updateMatrixWorld(true);
      const bounds = new T.Box3().setFromObject(model, true),
        size = bounds.getSize(new T.Vector3()),
        center = bounds.getCenter(new T.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0)
        throw Error("模型没有有效的几何体");
      const normalized = new T.Group();
      normalized.scale.setScalar((slot.height || 2.6) / size.y);
      model.position.sub(new T.Vector3(center.x, bounds.min.y, center.z));
      normalized.add(model);
      const supports = collectSupports(normalized, slot.height || 2.6);
      const root = new T.Group();
      root.position.fromArray(slot.position);
      root.position.y += this.stageHeight;
      root.rotation.y = source.rotation || 0;
      const motion = new T.Group();
      motion.add(normalized);
      root.add(motion);
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            if (m.map) m.map.anisotropy = 2;
        }
      });
      const instrumentNodes = instrumentTargets(model, source.instrumentNodes);
      showInstruments(instrumentNodes, this.instrumentsVisible);
      const mixer =
        asset.animations.length && source.playClip
          ? new T.AnimationMixer(model)
          : null;
      if (mixer) mixer.clipAction(asset.animations[0]).play();
      candidate = {
        member: slot,
        source,
        root,
        motion,
        supports,
        mixer,
        normalized,
        instrumentNodes,
        isImage: asset.type === "image",
      };
      groundMotion(motion, supports);
    } catch (error) {
      this.assets.release(source.model);
      throw error;
    }
    // Keep the previous resident character until the replacement has finished decoding.
    this.remove(slotId);
    this.characters.push(candidate);
    this.scene.add(candidate.root);
  }
  setInstrumentsVisible(show) {
    this.instrumentsVisible = show;
    for (const c of this.characters) showInstruments(c.instrumentNodes, show);
  }
  remove(slotId) {
    const index = this.characters.findIndex((c) => c.member.id === slotId);
    if (index < 0) return;
    const c = this.characters[index];
    c.mixer?.stopAllAction();
    if (c.mixer) c.mixer.uncacheRoot(c.mixer.getRoot());
    this.scene.remove(c.root);
    this.assets.release(c.source.model);
    this.characters.splice(index, 1);
  }
  update(beat, bands, playing, dt, camera) {
    for (const c of this.characters) {
      if (c.isImage && camera) {
        const yaw = Math.atan2(
          camera.position.x - c.root.position.x,
          camera.position.z - c.root.position.z,
        );
        const diff = Math.atan2(
          Math.sin(yaw - c.root.rotation.y),
          Math.cos(yaw - c.root.rotation.y),
        );
        c.root.rotation.y += diff * (1 - Math.exp(-dt * 5));
      }
      const b = beat.beats - ((c.member.delay || 0) * beat.bpm) / 60;
      const m = beatMotion(
        b,
        (c.member.beatStrength ?? 0.8) * this.strength,
        bands.energy,
      );
      const blend = playing ? 1 : 1 - Math.exp(-dt * 16);
      c.motion.scale.set(
        T.MathUtils.lerp(c.motion.scale.x, playing ? m.x : 1, blend),
        T.MathUtils.lerp(c.motion.scale.y, playing ? m.y : 1, blend),
        T.MathUtils.lerp(c.motion.scale.z, playing ? m.z : 1, blend),
      );
      c.motion.rotation.z = T.MathUtils.lerp(
        c.motion.rotation.z,
        playing ? m.sway : 0,
        blend,
      );
      c.motion.rotation.y = T.MathUtils.lerp(
        c.motion.rotation.y,
        playing ? m.twist : 0,
        blend,
      );
      groundMotion(c.motion, c.supports);
      c.mixer?.update(playing ? dt : 0);
    }
  }
  dispose() {
    this.cancelled = true;
    for (const c of [...this.characters]) this.remove(c.member.id);
  }
}
