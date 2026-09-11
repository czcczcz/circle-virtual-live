import { circleScene } from "./circle/scene.js";
// Register scene modules here. Geometry stays in the module; clocks and interaction stay in App.
export const scenes = { circle: circleScene };
export function resolveScene(id = "circle") {
  const scene = scenes[id] || circleScene;
  if (
    !scene.id ||
    typeof scene.create !== "function" ||
    !scene.cameraAnchors?.wide ||
    !Array.isArray(scene.performerSlots)
  )
    throw Error("无效场景定义");
  return scene;
}
