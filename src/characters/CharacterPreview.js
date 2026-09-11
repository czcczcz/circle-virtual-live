import * as T from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export class CharacterPreview {
  constructor(container, assets) {
    this.container = container;
    this.assets = assets;
    this.version = 0;
  }
  async show(source) {
    this.clear();
    const version = this.version;
    const asset = await this.assets.acquire(source);
    if (version !== this.version) {
      this.assets.release(source.model);
      return;
    }
    this.source = source;
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x211a2b);
    const model = clone(asset.scene),
      box = new T.Box3().setFromObject(model),
      size = box.getSize(new T.Vector3()),
      center = box.getCenter(new T.Vector3());
    model.position.sub(center);
    this.scene.add(model, new T.HemisphereLight(0xffffff, 0x775577, 3));
    this.camera = new T.PerspectiveCamera(40, 1, 0.01, 100);
    this.camera.position.set(0, 0, Math.max(size.x, size.y, size.z) * 1.8);
    this.renderer = new T.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(260, 260);
    this.container.replaceChildren(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    const sizes = new Set();
    asset.scene.traverse((o) => {
      for (const m of (Array.isArray(o.material)
        ? o.material
        : [o.material]
      ).filter(Boolean))
        for (const v of Object.values(m))
          if (v?.isTexture && v.image)
            sizes.add(`${v.image.width}×${v.image.height}`);
    });
    this.render();
    return [...sizes].join("、") || "无";
  }
  render() {
    if (this.renderer && this.container.offsetParent) {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
  }
  clear() {
    this.version++;
    this.controls?.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.container.replaceChildren();
    if (this.source) this.assets.release(this.source.model);
    this.source = null;
  }
}
