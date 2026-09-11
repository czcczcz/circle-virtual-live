import { WebIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";
import { dedup, prune, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
self.onmessage = async ({ data }) => {
  try {
    await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
    const io = new WebIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({
        "meshopt.decoder": MeshoptDecoder,
        "meshopt.encoder": MeshoptEncoder,
      });
    const doc = await io.readBinary(new Uint8Array(data));
    for (const texture of doc.getRoot().listTextures()) {
      const image = texture.getImage();
      if (!image) continue;
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(
          texture.getMimeType(),
        )
      )
        continue;
      const bitmap = await createImageBitmap(
        new Blob([image], { type: texture.getMimeType() }),
      );
      const ratio = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
      const canvas = new OffscreenCanvas(
        Math.max(1, Math.round(bitmap.width * ratio)),
        Math.max(1, Math.round(bitmap.height * ratio)),
      );
      canvas
        .getContext("2d")
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await canvas.convertToBlob({
        type: "image/webp",
        quality: 0.85,
      });
      texture
        .setImage(new Uint8Array(await blob.arrayBuffer()))
        .setMimeType(blob.type);
      if (blob.type === "image/webp")
        doc.createExtension(EXTTextureWebP).setRequired(true);
    }
    await doc.transform(
      dedup(),
      prune(),
      meshopt({ encoder: MeshoptEncoder, level: "medium" }),
    );
    const result = await io.writeBinary(doc);
    self.postMessage({ result: result.buffer }, [result.buffer]);
  } catch (e) {
    self.postMessage({ error: e.message });
  }
};
