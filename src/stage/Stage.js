import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export class Stage {
  constructor(scene) {
    this.group = new T.Group();
    scene.add(this.group);
    this.dark = new T.MeshStandardMaterial({ color: 0x151724, roughness: 0.8 });
    this.metal = new T.MeshStandardMaterial({
      color: 0x555669,
      metalness: 0.7,
      roughness: 0.35,
    });
    this.box([0, 0.3, -0.6], [12, 0.6, 6.8], 0x25212f);
    this.box([0, -0.07, 4], [28, 0.12, 28], 0x0b0b12);
    this.box([0, 3.6, -4.15], [15, 7.8, 0.25], 0x14121e);
    this.box([-7.5, 3, -0.5], [0.2, 7, 10], 0x15121c);
    this.box([7.5, 3, -0.5], [0.2, 7, 10], 0x15121c);
    // Vertical acoustic slats add depth without downloading scenery.
    for (let i = 0; i < 47; i++)
      this.box(
        [-7 + i * 0.3, 3.2, -3.92],
        [0.065, 5.8, 0.1],
        i % 3 === 0 ? 0x413246 : 0x24202c,
      );
    for (const z of [-3.3, 2.15]) {
      for (const x of [-6.2, 6.2]) this.pole([x, 0.65, z], [x, 6.25, z], 0.065);
      for (const y of [5.85, 6.25]) this.pole([-6.2, y, z], [6.2, y, z], 0.055);
      for (let x = -6; x < 6; x += 0.6)
        this.pole([x, 5.85, z], [x + 0.6, 6.25, z], 0.026);
    }
    this.sign("CiRCLE", 0, 4.1, -3.72, 5.4, 1.35, "#fdf3fd");
    this.sign("P O P P I N ’ P A R T Y", 0, 3.28, -3.68, 5, 0.5, "#fca5cf");
    this.sign("LIVE HOUSE  /  TOKYO", 0, 5.12, -3.68, 4, 0.35, "#b3a6be");
    for (const x of [-5.45, 5.45]) {
      this.box([x, 1.8, -1], [1, 2.3, 0.8], 0x080910);
      for (const y of [1.15, 2.3]) {
        const c = new T.Mesh(
          new T.CylinderGeometry(0.33, 0.33, 0.025, 20),
          this.dark,
        );
        c.rotation.x = Math.PI / 2;
        c.position.set(x, y, -0.57);
        this.group.add(c);
      }
    }
    for (const x of [-3.8, -0.8, 2.3, 4]) {
      const monitor = this.box([x, 0.83, 2.05], [0.85, 0.45, 0.55], 0x11121d);
      monitor.rotation.x = -0.25;
    }
    for (const x of [-3, 0, 3]) {
      this.pole([x, 0.65, 0.9], [x, 2.6, 0.9], 0.023);
      this.pole([x, 2.6, 0.9], [x + 0.25, 2.7, 0.65], 0.028);
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3;
        this.pole(
          [x, 0.74, 0.9],
          [x + Math.cos(a) * 0.3, 0.66, 0.9 + Math.sin(a) * 0.3],
          0.016,
        );
      }
    }
    this.led = [];
    for (let i = 0; i < 21; i++) {
      const material = new T.MeshBasicMaterial({ color: 0xff4f9a });
      const m = new T.Mesh(new T.BoxGeometry(0.055, 1, 0.06), material);
      m.position.set(-5 + i * 0.5, 2, -3.67);
      this.group.add(m);
      this.led.push(m);
    }
    const edge = new T.Mesh(
      new T.BoxGeometry(11.7, 0.035, 0.03),
      new T.MeshBasicMaterial({ color: 0xff64ab }),
    );
    edge.position.set(0, 0.58, 2.81);
    this.group.add(edge);
    this.batchStatic();
  }
  // Static scenery is grouped by material; animated LEDs and texture signs stay separate.
  batchStatic() {
    const batches = new Map();
    for (const object of [...this.group.children]) {
      if (!object.isMesh || !object.material.isMeshStandardMaterial) continue;
      object.updateMatrix();
      const m = object.material,
        key = [m.color.getHex(), m.metalness, m.roughness].join(":");
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(object);
    }
    for (const objects of batches.values()) {
      if (objects.length < 2) continue;
      const parts = objects.map((o) =>
        o.geometry.clone().applyMatrix4(o.matrix),
      );
      const merged = mergeGeometries(parts);
      parts.forEach((g) => g.dispose());
      if (!merged) continue;
      const material = objects[0].material;
      const mesh = new T.Mesh(merged, material);
      mesh.receiveShadow = true;
      this.group.add(mesh);
      const removedMaterials = new Set();
      for (const o of objects) {
        this.group.remove(o);
        o.geometry.dispose();
        if (o.material !== material) removedMaterials.add(o.material);
      }
      removedMaterials.forEach((m) => m.dispose());
    }
  }
  box(position, size, color) {
    const m = new T.Mesh(
      new T.BoxGeometry(...size),
      new T.MeshStandardMaterial({ color, roughness: 0.7 }),
    );
    m.position.fromArray(position);
    m.receiveShadow = true;
    this.group.add(m);
    return m;
  }
  pole(a, b, r) {
    const va = new T.Vector3(...a),
      vb = new T.Vector3(...b),
      delta = vb.clone().sub(va);
    const m = new T.Mesh(
      new T.CylinderGeometry(r, r, delta.length(), 8),
      this.metal,
    );
    m.position.copy(va.add(vb).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    this.group.add(m);
    return m;
  }
  sign(text, x, y, z, w, h, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 1536;
    canvas.height = 384;
    const c = canvas.getContext("2d");
    c.fillStyle = color;
    c.font = `${text === "CiRCLE" ? "900" : "600"} ${text === "CiRCLE" ? 260 : 110}px Arial`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.shadowColor = color;
    c.shadowBlur = 14;
    c.fillText(text, 768, 200, 1490);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      }),
    );
    m.position.set(x, y, z);
    this.group.add(m);
  }
  update(beat, bands) {
    for (const [i, m] of this.led.entries()) {
      m.scale.y =
        0.22 +
        Math.pow(0.5 + 0.5 * Math.sin(i * 0.73 + beat.beats * 0.8), 2) *
          (0.5 + bands.mid * 1.6);
      m.material.color.setHSL(
        0.9 + Math.sin(i * 0.3 + beat.phrase) * 0.09,
        0.8,
        0.28 + bands.energy * 0.35,
      );
    }
  }
}
