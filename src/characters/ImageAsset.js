import * as T from "three";

export async function loadImageAsset(url) {
  const texture = await new T.TextureLoader().loadAsync(url);
  try {
    const { width, height } = texture.image;
    if (!width || !height) throw Error("图片尺寸无效");
    // Cap GPU allocation; the source image still briefly occupies decoded RAM.
    const ratio = Math.min(1, 2048 / Math.max(width, height));
    if (ratio < 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      canvas
        .getContext("2d")
        .drawImage(texture.image, 0, 0, canvas.width, canvas.height);
      texture.image = canvas;
    }
    texture.colorSpace = T.SRGBColorSpace;
    texture.needsUpdate = true;
    const material = new T.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.08,
      side: T.DoubleSide,
      roughness: 0.9,
      metalness: 0,
    });
    const scene = new T.Group();
    const plane = new T.Mesh(new T.PlaneGeometry(width / height, 1), material);
    plane.name = "ImagePerformer";
    plane.position.y = 0.5;
    scene.add(plane);
    return { scene, animations: [], type: "image" };
  } catch (error) {
    texture.dispose();
    throw error;
  }
}
