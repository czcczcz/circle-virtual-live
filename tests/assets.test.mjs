import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";
test("Every manifest model decodes, uses bounded textures and retains geometry", async () => {
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const members = JSON.parse(
    await fs.readFile("src/config/characters.json", "utf8"),
  );
  assert.ok(members.length >= 5);
  for (const member of members) {
    const url = member.model || member.src;
    if (member.type === "image" || /\.(png|webp|jpe?g)$/i.test(url)) {
      const metadata = await sharp("." + url).metadata();
      assert.ok(metadata.width > 0 && metadata.height > 0);
      continue;
    }
    const doc = await io.read("." + url);
    const root = doc.getRoot();
    assert.ok(root.listMeshes().length > 0);
    for (const texture of root.listTextures()) {
      const [w, h] = texture.getSize();
      assert.ok(w <= 1024 && h <= 1024, `${member.id}: oversized texture`);
    }
    const triangles = root
      .listMeshes()
      .flatMap((m) => m.listPrimitives())
      .reduce((a, p) => a + p.getIndices().getCount() / 3, 0);
    assert.ok(
      ["kasumi", "arisa", "otae", "rimi", "saya"].includes(member.id)
        ? triangles > 99000 && triangles < 101000
        : triangles > 0,
      `${member.id}: geometry unexpectedly changed`,
    );
  }
});
test("Song references exist and BPM metadata is valid", async () => {
  const songs = JSON.parse(await fs.readFile("src/config/songs.json", "utf8"));
  for (const song of songs) {
    await fs.access("." + song.file);
    assert.ok(song.bpm >= 30 && song.bpm <= 300);
    assert.ok(Number.isFinite(song.offset));
  }
});
