import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { loadImageAsset } from "../characters/ImageAsset.js";
export class AssetManager {
  constructor() {
    this.loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    this.loaded = 0;
    this.failed = [];
    this.cache = new Map();
  }
  async acquire(member, onProgress) {
    const url = member.model || member.src;
    let record = this.cache.get(url);
    if (!record) {
      record = { refs: 0, asset: null };
      record.promise = (
        member.type === "image"
          ? loadImageAsset(url)
          : this.loader.loadAsync(url, (e) =>
              onProgress?.(e.total ? e.loaded / e.total : 0),
            )
      ).then((asset) => {
        record.asset = asset;
        return asset;
      });
      this.cache.set(url, record);
    }
    record.refs++;
    try {
      const asset = await record.promise;
      this.loaded++;
      return asset;
    } catch (error) {
      record.refs--;
      if (this.cache.get(url) === record) this.cache.delete(url);
      if (!this.failed.includes(member.id)) this.failed.push(member.id);
      console.warn(`角色加载失败：${member.name || member.id}`, error);
      throw error;
    }
  }
  release(url) {
    const record = this.cache.get(url);
    if (!record) return;
    if (--record.refs <= 0) {
      this.cache.delete(url);
      if (record.asset) disposeTree(record.asset.scene);
      else
        record.promise
          .then((asset) => disposeTree(asset.scene))
          .catch(() => {});
    }
  }
}
export function disposeTree(root) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  root.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    for (const m of (Array.isArray(o.material)
      ? o.material
      : [o.material]
    ).filter(Boolean)) {
      materials.add(m);
      for (const value of Object.values(m))
        if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => {
    t.dispose();
    t.source?.data?.close?.();
  });
}
