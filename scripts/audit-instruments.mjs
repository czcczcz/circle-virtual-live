import fs from "node:fs/promises";
const report = [];
for (const file of (await fs.readdir("3D_model")).filter((f) =>
  /\.glb$/i.test(f),
)) {
  const b = await fs.readFile("3D_model/" + file);
  const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
  report.push({
    file,
    nodes: (j.nodes || []).map((n, i) => ({
      index: i,
      name: n.name,
      parent: (j.nodes || []).findIndex((p) => p.children?.includes(i)),
      children: n.children || [],
      mesh: n.mesh,
      translation: n.translation,
      rotation: n.rotation,
      scale: n.scale,
    })),
    meshes: (j.meshes || []).map((m) => ({
      name: m.name,
      primitives: m.primitives.map((p) => ({
        material: p.material,
        attributes: p.attributes,
        vertices: j.accessors[p.attributes.POSITION].count,
        bounds: {
          min: j.accessors[p.attributes.POSITION].min,
          max: j.accessors[p.attributes.POSITION].max,
        },
        indices: j.accessors[p.indices]?.count,
      })),
    })),
    materials: (j.materials || []).map((m) => m.name),
    conclusion: j.meshes?.length === 1 && j.meshes[0].primitives.length === 1
      ? "Single combined body mesh; no independently identifiable instrument node. Cannot safely isolate instrument from merged mesh."
      : "Multiple parts require visual review; no automatic visibility changes are authorized by this report.",
  });
}
await fs.writeFile(
  "reports/instrument-scene-graph.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
