import { Stage } from "../../stage/Stage.js";
import { InstrumentSystem } from "../../stage/InstrumentSystem.js";
import { LightingSystem } from "../../stage/LightingSystem.js";
import { AudienceSystem } from "../../audience/AudienceSystem.js";
import { shots } from "../../camera/CameraDirector.js";
import slots from "../../config/stage-slots.json";
export const circleScene = {
  id: "circle",
  name: "CiRCLE",
  stageHeight: 0.6,
  environment: { background: 0x090910, fogColor: 0x0e0b19, fogDensity: 0.034 },
  presentation: {
    title: "Poppin’Party",
    subtitle: "at CiRCLE",
    brand: "CiRCLE",
  },
  performerSlots: slots,
  cameraAnchors: shots,
  player: {
    eyeHeight: 1.65,
    spawn: [0, 1.65, 5.5],
    freeSpawn: [0, 3.3, 9],
    bounds: { x: [-6.6, 6.6], z: [3.1, 13], freeZ: [-3.4, 13], y: [0.8, 6.3] },
  },
  lightingPreset: { palette: [0.92, 0.62, 0.78, 0.04] },
  audienceConfig: { origin: [0, 0, 0], scale: 1 },
  introSequence: {
    duration: 3.6,
    from: [0, 3, 18],
    label: "走进 CiRCLE · 舞台正在亮起",
  },
  audioEnvironment: { source: [0, 2, -1], decay: 0.55, referenceDistance: 5 },
  create({ world, members, definition }) {
    return {
      stage: new Stage(world),
      instruments: new InstrumentSystem(world, members, definition.stageHeight),
      lighting: new LightingSystem(world, definition.lightingPreset),
      audience: new AudienceSystem(world, definition.audienceConfig),
    };
  },
};
