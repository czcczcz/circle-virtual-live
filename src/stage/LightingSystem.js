import * as T from "three";
export class LightingSystem {
  constructor(scene) {
    this.scene = scene;
    this.spots = [];
    this.beams = [];
    this.ambient = new T.HemisphereLight(0xbab9ff, 0x46303a, 1.5);
    scene.add(this.ambient);
    this.key = new T.DirectionalLight(0xffedf4, 2.3);
    this.key.position.set(1, 5, 6);
    scene.add(this.key);
    this.rim = new T.PointLight(0xff4499, 24, 15, 2);
    this.rim.position.set(0, 3, -3);
    scene.add(this.rim);
    for (let i = 0; i < 6; i++) {
      const x = -5 + i * 2;
      const spot = new T.SpotLight(0xff69b4, 45, 17, 0.42, 0.65, 1.5);
      spot.position.set(x, 5.9, i % 2 ? -2.8 : 1.8);
      spot.target.position.set(x * 0.6, 0.8, 0);
      scene.add(spot, spot.target);
      spot.shadow.mapSize.set(512, 512);
      spot.shadow.bias = -0.001;
      this.spots.push(spot);
      const beam = new T.Mesh(
        new T.ConeGeometry(1.25, 5.2, 20, 1, true),
        new T.MeshBasicMaterial({
          color: 0xff66ad,
          transparent: true,
          opacity: 0.035,
          depthWrite: false,
          blending: T.AdditiveBlending,
          side: T.DoubleSide,
        }),
      );
      scene.add(beam);
      this.beams.push(beam);
      const fixture = new T.Mesh(
        new T.CylinderGeometry(0.18, 0.23, 0.3, 12),
        new T.MeshStandardMaterial({ color: 0x222332, metalness: 0.7 }),
      );
      fixture.position.copy(spot.position);
      scene.add(fixture);
    }
  }
  configure(preset) {
    this.spots.forEach((s, i) => {
      s.visible = i < preset.lights;
      s.castShadow = preset.shadows && i === 0;
      this.beams[i].visible = i < preset.lights;
    });
  }
  update(beat, bands, playing) {
    const palette = [0.92, 0.62, 0.78, 0.04];
    const hue = palette[((beat.phrase % 4) + 4) % 4];
    const pulse = playing ? Math.exp(-beat.phase * 6) : 0.05;
    this.spots.forEach((s, i) => {
      s.color.setHSL((hue + i * 0.09) % 1, 0.7, 0.65);
      s.intensity = 28 + pulse * 9 + bands.bass * 22;
      const t = beat.beats / 4;
      const target = new T.Vector3(
        Math.sin(t * 0.55 + i * 1.3) * 4,
        0.4,
        -0.4 + Math.cos(t * 0.4 + i) * 1.5,
      );
      s.target.position.lerp(target, 0.025);
      const beam = this.beams[i];
      const direction = s.position.clone().sub(s.target.position);
      beam.position
        .copy(s.position)
        .addScaledVector(direction.clone().normalize(), -2.6);
      beam.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        direction.normalize(),
      );
      beam.material.color.copy(s.color);
      beam.material.opacity = 0.024 + bands.energy * 0.022;
    });
    this.rim.intensity = 18 + bands.mid * 15;
  }
}
