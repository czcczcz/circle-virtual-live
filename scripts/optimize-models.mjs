import fs from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  resample,
  textureCompress,
  meshopt,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
await fs.mkdir("3D_model_optimized", { recursive: true });
await fs.mkdir("reports", { recursive: true });
const report = [];
for (const file of (await fs.readdir("3D_model"))
  .filter((f) => f.endsWith(".glb"))
  .sort()) {
  try {
    const doc = await io.read("3D_model/" + file);
    await doc.transform(
      dedup(),
      prune(),
      resample(),
      textureCompress({
        encoder: sharp,
        targetFormat: "webp",
        resize: [1024, 1024],
        quality: 85,
      }),
      meshopt({ encoder: MeshoptEncoder, level: "medium" }),
    );
    await io.write("3D_model_optimized/" + file, doc);
    const before = (await fs.stat("3D_model/" + file)).size,
      after = (await fs.stat("3D_model_optimized/" + file)).size;
    report.push({
      file,
      before,
      after,
      textureMax: 1024,
      format: "WebP",
      geometry: "EXT_meshopt_compression",
    });
    console.log(
      file,
      (before / 1e6).toFixed(2),
      "→",
      (after / 1e6).toFixed(2),
      "MB",
    );
  } catch (e) {
    console.error(file, e);
    report.push({ file, error: e.message });
  }
}
await fs.writeFile(
  "reports/optimization.json",
  JSON.stringify(report, null, 2),
);
