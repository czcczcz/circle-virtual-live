import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

test("Scanning models preserves stage slots and prunes stale original indices", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "circle-manifest-"));
  try {
    for (const folder of ["src/config", "3D_model", "3D_model_optimized", "music", "characters"])
      await fs.mkdir(path.join(dir, folder), { recursive: true });
    const slots = await fs.readFile("src/config/stage-slots.json", "utf8");
    await fs.writeFile(path.join(dir, "src/config/stage-slots.json"), slots);
    await fs.writeFile(path.join(dir, "src/config/characters.json"), JSON.stringify([
      { id: "ksm", original: "/3D_model/ksm.glb", model: "/3D_model_optimized/ksm.glb" },
      { id: "paper", type: "image", src: "/characters/paper.png" }
    ]));
    for (const file of ["3D_model/new_guest.GLB", "3D_model_optimized/new_guest.GLB", "3D_model_optimized/ksm.glb", "characters/paper.png"])
      await fs.writeFile(path.join(dir, file), "fixture");
    const run = () => execFileSync(process.execPath, [path.resolve("scripts/generate-manifest.mjs")], { cwd: dir });
    run(); run();
    const catalog = JSON.parse(await fs.readFile(path.join(dir, "src/config/characters.json"), "utf8"));
    assert.deepEqual(catalog.map(m => m.id), ["new_guest", "paper"]);
    assert.equal(catalog[1].src, "/characters/paper.png");
    assert.equal(catalog[0].model, "/3D_model_optimized/new_guest.GLB");
    assert.equal(await fs.readFile(path.join(dir, "src/config/stage-slots.json"), "utf8"), slots);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
