export async function inspectFile(file) {
  if (/\.glb$/i.test(file.name)) {
    const header = new DataView(await file.slice(0, 20).arrayBuffer());
    if (
      header.byteLength < 20 ||
      header.getUint32(0, true) !== 0x46546c67 ||
      header.getUint32(4, true) !== 2
    )
      throw Error("不是有效的 GLB 2.0 文件");
    const length = header.getUint32(12, true);
    if (length > file.size - 20 || header.getUint32(16, true) !== 0x4e4f534a)
      throw Error("GLB JSON 数据损坏");
    const json = JSON.parse(await file.slice(20, 20 + length).text());
    if (
      [...(json.images || []), ...(json.buffers || [])].some(
        (x) => x.uri && !x.uri.startsWith("data:"),
      )
    )
      throw Error("请导出图片和缓冲区均内嵌的 GLB，网页导入不读取外部资源。");
    let triangles = 0;
    for (const m of json.meshes || [])
      for (const p of m.primitives) {
        const count =
          json.accessors[p.indices ?? p.attributes.POSITION]?.count || 0;
        triangles +=
          (p.mode ?? 4) === 4
            ? count / 3
            : [5, 6].includes(p.mode)
              ? Math.max(0, count - 2)
              : 0;
      }
    return {
      type: "glb",
      bytes: file.size,
      meshes: json.meshes?.length || 0,
      triangles,
      materials: json.materials?.length || 0,
      textures: json.textures?.length || 0,
      animations: json.animations?.length || 0,
      bones: new Set((json.skins || []).flatMap((s) => s.joints)).size,
      textureSizes: "预览后显示实际解码尺寸",
    };
  }
  if (!/\.(png|webp|jpe?g)$/i.test(file.name))
    throw Error("支持 GLB / PNG / WebP / JPG");
  const bitmap = await createImageBitmap(file);
  const result = {
    type: "image",
    bytes: file.size,
    width: bitmap.width,
    height: bitmap.height,
    textures: 1,
  };
  bitmap.close();
  return result;
}
export function describeFile(info) {
  return (
    `文件 ${(info.bytes / 1e6).toFixed(2)} MB\n` +
    (info.type === "image"
      ? `图片 ${info.width} × ${info.height}`
      : `网格 ${info.meshes} · 三角面 ${Math.round(info.triangles).toLocaleString()}\n材质 ${info.materials} · 纹理 ${info.textures}\n动画 ${info.animations} · 骨骼 ${info.bones}\n纹理尺寸：${info.textureSizes}`) +
    (info.bytes > 20e6 ||
    info.triangles > 300000 ||
    info.width > 4096 ||
    info.height > 4096
      ? "\n较大资源可能增加内存和加载时间；可继续预览，建议先生成压缩副本。"
      : "")
  );
}
