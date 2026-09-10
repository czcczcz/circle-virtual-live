# GLB 模型压缩：可直接复用的流程

本项目已附完整脚本 `scripts/analyze-models.mjs`、`scripts/optimize-models.mjs` 和 `scripts/generate-manifest.mjs`。

## 最简单的用法

将原始 GLB 放入 `3D_model/`，在项目目录运行：

```sh
npm install
npm run analyze
npm run optimize
npm run manifest
```

输出在 **3D_model_optimized/**，绝不覆盖原文件。模型审计在 **reports/models.json**，前后体积对比在 **reports/optimization.json**。刷新网页即可加载优化版本。

## 压缩内容

1. 读取 GLB 的几何、材质、纹理、骨骼和动画。
2. `dedup()` 合并重复资源，`prune()` 移除闲置数据。
3. `resample()` 优化动画采样（当前五个模型没有动画）。
4. 纹理等比限制到 **1024 × 1024**，编码为 **WebP / quality 85**。
5. `meshopt({ level: "medium" })` 使用量化与 `EXT_meshopt_compression` 编码几何。
6. 写入独立的新 GLB，再由 manifest 选择优化路径。

核心代码：

```js
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
```

完整代码负责注册 glTF 扩展、编码器与解码器。浏览器通过 `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)` 解码，不能只压缩而不配置加载器。

## 实际结果

五个人原文件约 **147 MB → 7.67 MB**，仍保留合计约 50 万三角面，没有进行面数简化。每人两张 4096² PNG 原始纹理改为两张 1024² WebP。

RGBA 基础纹理内存估算约 **671 MB → 42 MB**，含 mipmap 约 **56 MB**。注意：**WebP 是文件压缩，不是 GPU 原生压缩**，显存降低主要来自分辨率。几何、缓冲区和驱动内存另计。

如近景需要更清晰的贴图，可在脚本中把 `resize` 改为 `[2048, 2048]`，再重新运行优化。单张贴图像素内存约增加到四倍。不要直接覆盖原始目录，也不要只根据 GLB 文件大小判断显存。

## KTX2 / Basis 与其他方案

本机没有 `toktx` 或 `basisu`，所以实际交付使用 WebP fallback，未伪称完成 KTX2。若未来接入 KTX2，需要完整的编码工具链、正确的纹理色彩空间设置以及运行时 KTX2Loader 转码支持。Meshopt 已满足当前几何压缩需要，没有同时叠加 Draco。

任意单个模型优化失败会记录错误并继续其他模型。运行完成后应查看报告；失败项会保持原始路径。原模型很大时建议先解决优化问题，不要直接给手机加载五份原始资源。

## 页面上切换角色

右上角 **阵容** 面板可以给每个岗位选择现有模型或 **空位**，无需重新导出 GLB。同一模型被多岗位选用时复用解码后的纹理与几何；最后一个引用释放时销毁资源。该面板切换的是显示模型，岗位乐器保持不变；空位同时隐藏该岗位的乐器。
