import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { STAGE_Y } from "../characters/GroundContact.js";

// Instruments belong to stage slots, not the selected mesh. A replacement model can play
// any part; clearing a slot also clears its equipment. Geometry is entirely procedural.
export class InstrumentSystem {
  constructor(scene, members) {
    this.visible = true;
    this.groups = new Map();
    this.materials = new Map();
    for (const member of members) {
      const g = new T.Group();
      g.position.fromArray(member.position);
      g.position.y += STAGE_Y;
      g.name = "instrument-" + member.id;
      scene.add(g);
      this.groups.set(member.id, g);
      const role =
        member.instrument ||
        {
          kasumi: "star",
          otae: "guitar",
          rimi: "bass",
          saya: "drums",
          arisa: "keyboard",
        }[member.id] ||
        "guitar";
      if (role === "drums") this.drums(g);
      else if (role === "keyboard") this.keyboard(g);
      else this.guitar(g, role, member.color);
      this.batch(g);
    }
  }
  mat(color, metalness = 0.15) {
    const key = color + ":" + metalness;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new T.MeshStandardMaterial({ color, metalness, roughness: 0.35 }),
      );
    return this.materials.get(key);
  }
  batch(root) {
    root.updateMatrixWorld(true);
    const inverse = root.matrixWorld.clone().invert(),
      groups = new Map(),
      oldGeometry = new Set();
    root.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const list = groups.get(mesh.material) || [];
      const geometry = mesh.geometry.index
        ? mesh.geometry.toNonIndexed()
        : mesh.geometry.clone();
      geometry.applyMatrix4(
        new T.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld),
      );
      list.push(geometry);
      groups.set(mesh.material, list);
      oldGeometry.add(mesh.geometry);
    });
    root.clear();
    for (const [material, parts] of groups) {
      const mesh = new T.Mesh(mergeGeometries(parts), material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
      parts.forEach((g) => g.dispose());
    }
    oldGeometry.forEach((g) => g.dispose());
  }
  mesh(g, geo, color, p, metalness) {
    const m = new T.Mesh(geo, this.mat(color, metalness));
    m.position.set(...p);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }
  box(g, p, size, color) {
    return this.mesh(g, new T.BoxGeometry(...size), color, p);
  }
  rod(g, a, b, r = 0.02, color = "#b8b6c8") {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b),
      delta = end.clone().sub(start);
    const m = this.mesh(
      g,
      new T.CylinderGeometry(r, r, delta.length(), 8),
      color,
      start.add(end).multiplyScalar(0.5).toArray(),
      0.75,
    );
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    return m;
  }
  guitar(parent, type, color) {
    const g = new T.Group();
    g.position.set(-0.13, 0.72, 1.13);
    g.rotation.z = -0.7;
    parent.add(g);
    const shape = new T.Shape();
    if (type === "star") {
      for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / 5,
          r = i % 2 ? 0.29 : 0.64;
        const x = Math.cos(a) * r,
          y = Math.sin(a) * r;
        if (!i) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      color = "#eb285d";
    } else {
      shape.moveTo(0, -0.52);
      shape.bezierCurveTo(-0.72, -0.53, -0.64, 0.02, -0.29, 0.19);
      shape.bezierCurveTo(-0.57, 0.63, -0.14, 0.74, -0.12, 0.31);
      shape.lineTo(0.12, 0.31);
      shape.bezierCurveTo(0.48, 0.66, 0.53, 0.42, 0.29, 0.14);
      shape.bezierCurveTo(0.72, -0.13, 0.5, -0.6, 0, -0.52);
      color = type === "bass" ? "#ae5234" : "#2b89ea";
    }
    const body = this.mesh(
      g,
      new T.ExtrudeGeometry(shape, {
        depth: 0.13,
        bevelEnabled: true,
        bevelSize: 0.025,
        bevelThickness: 0.025,
        bevelSegments: 2,
        steps: 1,
        curveSegments: 12,
      }),
      color,
      [0, 0, 0],
    );
    body.name = type + "-body";
    const guard = new T.Mesh(new T.ShapeGeometry(shape), this.mat("#fff4e5"));
    guard.scale.setScalar(0.65);
    guard.position.set(-0.02, 0.015, 0.161);
    g.add(guard);
    const neckLength = type === "bass" ? 1.35 : 1.1;
    this.box(
      g,
      [0, 0.43 + neckLength / 2, 0.07],
      [0.145, neckLength, 0.12],
      "#9e7550",
    );
    this.box(
      g,
      [0, 0.43 + neckLength / 2, 0.141],
      [0.13, neckLength, 0.014],
      "#292433",
    );
    this.box(g, [0.03, neckLength + 0.57, 0.07], [0.23, 0.32, 0.13], color);
    for (const y of [-0.23, 0.05, 0.27])
      this.box(
        g,
        [0, y, 0.192],
        [0.25, 0.062, 0.04],
        y === -0.23 ? "#d6cfd8" : "#252130",
      );
    const strings = type === "bass" ? 4 : 6;
    for (let i = 0; i < strings; i++) {
      const x = (i - (strings - 1) / 2) * 0.019;
      this.rod(
        g,
        [x, -0.29, 0.217],
        [x, neckLength + 0.55, 0.217],
        0.003,
        "#f5e7c7",
      );
    }
    for (let i = 0; i < 12; i++)
      this.box(
        g,
        [0, 0.48 + (i * (neckLength - 0.1)) / 12, 0.16],
        [0.14, 0.011, 0.012],
        "#cdc3d4",
      );
    for (let i = 0; i < strings; i++) {
      const side = i % 2 ? -1 : 1;
      this.mesh(
        g,
        new T.SphereGeometry(0.035, 8, 6),
        "#e2dcea",
        [side * 0.16, neckLength + 0.45 + Math.floor(i / 2) * 0.08, 0.09],
        0.8,
      );
    }
    for (const x of [0.29, 0.38])
      this.mesh(
        g,
        new T.SphereGeometry(0.036, 8, 6),
        "#ddd9e7",
        [x, -0.18, 0.2],
        0.8,
      );
  }
  drums(g) {
    const bass = this.mesh(
      g,
      new T.CylinderGeometry(0.62, 0.62, 0.62, 32),
      "#e3589a",
      [0, 0.64, 0.83],
      0.4,
    );
    bass.rotation.x = Math.PI / 2;
    for (const z of [0.505, 1.155]) {
      const head = this.mesh(
        g,
        new T.CylinderGeometry(0.59, 0.59, 0.025, 32),
        "#f5eee9",
        [0, 0.64, z],
      );
      head.rotation.x = Math.PI / 2;
    }
    const hole = this.mesh(
      g,
      new T.CircleGeometry(0.13, 20),
      "#252133",
      [0.25, 0.44, 1.173],
    );
    hole.rotation.z = 0.1;
    for (const [x, y, z, r] of [
      [-0.47, 1.34, 0.49, 0.32],
      [0.34, 1.39, 0.43, 0.35],
      [0.92, 0.68, 0.42, 0.43],
      [-0.86, 0.88, 0.85, 0.34],
    ]) {
      this.mesh(
        g,
        new T.CylinderGeometry(r, r, 0.4, 24),
        "#b52d71",
        [x, y, z],
        0.5,
      );
      this.mesh(g, new T.CylinderGeometry(r, r, 0.025, 24), "#eee9ed", [
        x,
        y + 0.21,
        z,
      ]);
      for (const dx of [-r * 0.7, r * 0.7])
        this.rod(g, [x + dx, 0.02, z], [x + dx, y - 0.1, z]);
    }
    for (const [x, y, z, r] of [
      [-1.02, 1.9, 0.38, 0.49],
      [1.12, 1.85, 0.15, 0.53],
      [-0.83, 1.55, 1.02, 0.3],
    ]) {
      this.rod(g, [x, 0, z], [x, y, z]);
      const c = this.mesh(
        g,
        new T.CylinderGeometry(r * 0.9, r, 0.028, 30),
        "#eed078",
        [x, y, z],
        0.6,
      );
      c.rotation.z = x * 0.08;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3;
        this.rod(
          g,
          [x, 0.2, z],
          [x + Math.cos(a) * 0.3, 0, z + Math.sin(a) * 0.3],
          0.014,
        );
      }
    }
    this.rod(g, [-0.5, 1.55, 0.5], [0.35, 1.59, 0.68], 0.012, "#e8bc82");
    this.rod(g, [0.35, 1.55, 0.45], [-0.4, 1.57, 0.74], 0.012, "#e8bc82");
  }
  keyboard(g) {
    const keys = new T.Group();
    keys.position.set(0, 1.02, 1.06);
    keys.rotation.x = 0.18;
    g.add(keys);
    this.box(keys, [0, 0, 0], [2.6, 0.18, 0.66], "#322343");
    this.box(keys, [0, 0.103, -0.2], [2.4, 0.025, 0.16], "#622d89");
    for (let i = 0; i < 28; i++) {
      const x = -1.17 + i * 0.087;
      this.box(keys, [x, 0.114, 0.08], [0.082, 0.035, 0.38], "#fff9e8");
      if ([0, 1, 3, 4, 5].includes(i % 7))
        this.box(
          keys,
          [x + 0.043, 0.156, -0.025],
          [0.043, 0.06, 0.23],
          "#181522",
        );
    }
    this.box(keys, [0.45, 0.13, -0.21], [0.33, 0.01, 0.1], "#78e9e5");
    for (const x of [-0.8, 0.8])
      this.rod(g, [x, 0, 1.1], [-x, 0.96, 1.1], 0.04);
    for (const x of [-0.8, 0.8]) this.rod(g, [x, 0, 0.8], [x, 0, 1.4], 0.03);
  }
  sync(characters) {
    const active = new Set(characters.map((c) => c.member.id));
    for (const [id, g] of this.groups)
      g.visible = this.visible && active.has(id);
  }
}
