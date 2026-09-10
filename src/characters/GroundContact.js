import * as T from "three";
export const STAGE_Y = 0.6;
// Retain exact low vertices once; a few dot products per support vertex then compensate
// sway about real feet. An AABB corner would overestimate and visibly lift curved feet.
export function collectSupports(normalized, height) {
  normalized.updateMatrixWorld(true);
  const points = [];
  const v = new T.Vector3();
  normalized.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      if (v.y <= height * 0.2) points.push(v.x, v.y, v.z);
    }
  });
  return new Float32Array(points);
}
export function groundMotion(motion, supports) {
  motion.position.y = 0;
  motion.updateMatrix();
  const e = motion.matrix.elements;
  let min = Infinity;
  for (let i = 0; i < supports.length; i += 3)
    min = Math.min(
      min,
      e[1] * supports[i] + e[5] * supports[i + 1] + e[9] * supports[i + 2],
    );
  motion.position.y = Number.isFinite(min) ? -min : 0;
}
