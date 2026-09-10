import * as T from "three";
export class AudienceSystem {
  constructor(scene) {
    this.group = new T.Group();
    scene.add(this.group);
    this.max = 160;
    this.dummy = new T.Object3D();
    this.people = new T.InstancedMesh(
      new T.CapsuleGeometry(0.17, 0.4, 3, 6),
      new T.MeshStandardMaterial({ color: 0x161223, roughness: 1 }),
      this.max,
    );
    this.sticks = new T.InstancedMesh(
      new T.CylinderGeometry(0.027, 0.027, 0.4, 5),
      new T.MeshBasicMaterial({ color: 0xffffff }),
      this.max,
    );
    this.sticks.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.group.add(this.people, this.sticks);
    this.positions = [];
    for (let i = 0; i < this.max; i++) {
      const row = Math.floor(i / 20),
        col = i % 20;
      const x = (col - 9.5) * 0.62 + Math.sin(i * 43) * 0.13,
        z = 4 + row * 0.78,
        y = 0.65;
      this.positions.push([x, y, z]);
      this.dummy.position.set(x, y, z);
      this.dummy.scale.set(1, 0.9 + (i % 4) * 0.07, 1);
      this.dummy.updateMatrix();
      this.people.setMatrixAt(i, this.dummy.matrix);
      this.sticks.setColorAt(
        i,
        new T.Color(
          ["#ff599a", "#66aaff", "#ffbf67", "#b589ff", "#ff89ca"][i % 5],
        ),
      );
    }
    this.sticks.instanceColor.needsUpdate = true;
    this.people.instanceMatrix.needsUpdate = true;
    this.sticks.frustumCulled = false;
  }
  configure(preset) {
    this.people.count = preset.audience;
    this.sticks.count = preset.audience;
  }
  update(beat, playing) {
    for (let i = 0; i < this.sticks.count; i++) {
      const [x, y, z] = this.positions[i];
      const swing =
        Math.sin(beat.beats * Math.PI * 2 + Math.sin(i * 3) * 0.65) *
        (playing ? 1 : 0.12);
      this.dummy.position.set(
        x + 0.18 + Math.sin(i) * 0.08,
        y + 0.55 + swing * 0.09,
        z,
      );
      this.dummy.rotation.set(0.1, 0, -0.25 + swing * 0.3);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.sticks.setMatrixAt(i, this.dummy.matrix);
    }
    this.sticks.instanceMatrix.needsUpdate = true;
  }
}
