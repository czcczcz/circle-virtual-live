import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import sharp from "sharp";
await sharp({
  create: { width: 128, height: 256, channels: 4, background: "#ff78bbaa" },
})
  .png()
  .toFile("reports/import-fixture.png");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5173");
  await page.waitForFunction(
    () => document.querySelector("[data-slot]")?.disabled === false,
  );
  await page.locator("#band-toggle").click();
  await page.locator(".character-import summary").click();
  await page
    .locator("#character-file")
    .setInputFiles("reports/import-fixture.png");
  await page.waitForFunction(
    () => !document.querySelector("#preview-character").disabled,
  );
  await page.locator("#preview-character").click();
  await page.waitForFunction(
    () => !document.querySelector("#apply-character").disabled,
  );
  await page.locator("#character-name").fill("测试图片");
  await page.locator("#apply-character").click();
  await page.waitForFunction(() =>
    __LIVE__.characters.characters.some((c) => c.source.custom),
  );
  const id = await page.evaluate(
    () => __LIVE__.characters.characters.find((c) => c.source.custom).source.id,
  );
  assert.equal(await page.locator("[data-slot]").count(), 5);
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector("[data-slot]")?.disabled === false,
  );
  assert.equal(
    await page.evaluate(
      () =>
        __LIVE__.characters.characters.find((c) => c.member.id === "kasumi")
          .source.type,
    ),
    "image",
  );
  await page.locator("#band-toggle").click();
  await page.locator(".character-import summary").click();
  await page.locator("#import-library").selectOption(id);
  await page.locator("#delete-character").click();
  await page.waitForFunction(() => __LIVE__.characters.characters.length === 4);
  await page
    .locator("#character-file")
    .setInputFiles("3D_model_optimized/kasumi.glb");
  await page.waitForFunction(
    () => !document.querySelector("#preview-character").disabled,
  );
  await page.locator("#preview-character").click();
  await page.waitForFunction(
    () => !document.querySelector("#apply-character").disabled,
  );
  assert.ok(
    (await page.locator("#character-analysis").textContent()).includes("1024"),
  );
  await page.locator("#apply-character").click();
  await page.waitForFunction(() => __LIVE__.characters.characters.length === 5);
  await page.locator("#character-file").setInputFiles("3D_model/kasumi.glb");
  await page.waitForFunction(
    () => !document.querySelector("#optimize-character").disabled,
  );
  const downloadPromise = page.waitForEvent("download", { timeout: 90000 });
  await page.locator("#optimize-character").click();
  await page.waitForFunction(
    () =>
      /已生成|失败|不可用/.test(
        document.querySelector("#character-analysis").textContent,
      ),
    {},
    { timeout: 90000 },
  );
  console.log(await page.locator("#character-analysis").textContent());
  const download = await downloadPromise;
  await download.saveAs("reports/ugc-optimized.glb");
  const size = (await fs.stat("reports/ugc-optimized.glb")).size;
  assert.ok(size < 25000000);
  assert.deepEqual(errors, []);
  const result = {
    imageImportedAndRestored: true,
    glbPreviewAndApplied: true,
    slots: 5,
    optimizedBytes: size,
    errors,
  };
  console.log(result);
  await fs.writeFile("reports/ugc-qa.json", JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
