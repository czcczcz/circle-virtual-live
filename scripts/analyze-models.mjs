import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

await fs.mkdir("reports", { recursive: true });
const reports = [];
for (const file of (await fs.readdir("3D_model"))
  .filter((f) => f.endsWith(".glb"))
  .sort()) {
  const buffer = await fs.readFile(path.join("3D_model", file));
  const jsonLength = buffer.readUInt32LE(12),
    doc = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString());
  const bin = buffer.subarray(28 + jsonLength);
  let triangles = 0,
    vertices = 0;
  const primitives = (doc.meshes || []).flatMap((m) => m.primitives);
  for (const p of primitives) {
    const n = doc.accessors[p.indices ?? p.attributes.POSITION]?.count || 0;
    triangles += (p.mode ?? 4) === 4 ? n / 3 : 0;
    vertices += doc.accessors[p.attributes.POSITION]?.count || 0;
  }
  const images = [];
  for (const [i, img] of (doc.images || []).entries()) {
    const view = doc.bufferViews[img.bufferView];
    const data = view
      ? bin.subarray(
          view.byteOffset || 0,
          (view.byteOffset || 0) + view.byteLength,
        )
      : null;
    const meta = data
      ? await sharp(data)
          .metadata()
          .catch(() => ({}))
      : {};
    images.push({
      index: i,
      name: img.name,
      mime: img.mimeType,
      bytes: data?.length,
      width: meta.width,
      height: meta.height,
      decodedRGBABytes: meta.width * meta.height * 4,
      hash: data
        ? crypto.createHash("sha256").update(data).digest("hex")
        : null,
    });
  }
  const used = new Set(primitives.map((p) => p.material));
  const mats = doc.materials || [];
  reports.push({
    file,
    bytes: buffer.length,
    nodes: doc.nodes?.length,
    meshes: doc.meshes?.length,
    primitives: primitives.length,
    triangles,
    vertices,
    attributes: [
      ...new Set(primitives.flatMap((p) => Object.keys(p.attributes))),
    ],
    morphTargets: primitives.reduce((a, p) => a + (p.targets?.length || 0), 0),
    materials: mats.length,
    unusedMaterials: mats.map((_, i) => i).filter((i) => !used.has(i)),
    duplicateMaterialCount:
      mats.length -
      new Set(mats.map((m) => JSON.stringify({ ...m, name: undefined }))).size,
    textures: doc.textures?.length,
    images,
    duplicateImageCount:
      images.length - new Set(images.map((i) => i.hash)).size,
    skins: doc.skins?.length || 0,
    animations: (doc.animations || []).map((a) => ({
      name: a.name,
      channels: a.channels?.length,
    })),
    extensions: doc.extensionsUsed || [],
    geometryBufferBytes: (doc.bufferViews || [])
      .filter((_, i) => !(doc.images || []).some((img) => img.bufferView === i))
      .reduce((a, v) => a + v.byteLength, 0),
  });
}
await fs.writeFile("reports/models.json", JSON.stringify(reports, null, 2));
console.table(
  reports.map((r) => ({
    file: r.file,
    MB: (r.bytes / 1e6).toFixed(1),
    triangles: r.triangles,
    meshes: r.meshes,
    materials: r.materials,
    images: r.images.length,
    skins: r.skins,
    animations: r.animations.length,
    textureMB: (
      r.images.reduce((a, i) => a + i.decodedRGBABytes, 0) / 1e6
    ).toFixed(1),
  })),
);
