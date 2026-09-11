# SceneDefinition：新增场景

先读 `circle/scene.js`。它只适配现有实现，没有搬迁原模型或重写 Live。

1. 新建 `src/scenes/<id>/scene.js`，导出场景定义。
2. 场景自己的资源放在同目录 `assets/`，用 `import url from './assets/xxx.glb?url'` 等方式引用，由 Vite 打包。不要直接写开发机绝对路径。
3. 在 `registry.js` 注册，以 `/?scene=<id>` 启动。默认仍是 CiRCLE；当前不做运行时场景编辑器。

| 字段 | 含义 |
| --- | --- |
| `id / name` | 稳定场景 ID / 名称；阵容保存按场景 ID 隔离 |
| `presentation` | `title / subtitle / brand`，页面主标题 |
| `environment` | `background / fogColor / fogDensity` |
| `models` | 可选的场景资源目录，`id/name/type/src`；与全局角色目录合并 |
| `stageHeight` | 舞台基准高度，Y 向上 |
| `performerSlots` | 固定岗位；`id` 为岗位 ID，`modelId` 可指定默认模型，省略时使用相同 ID；`position.y` 相对舞台高度。含 `height/beatStrength/delay/instrument` 等原参数 |
| `cameraAnchors` | 必须有 `wide`；每项 `{label,p:[x,y,z],t:[x,y,z]}` |
| `cameraSequence` | 可选自动导播顺序；省略时保留原顺序并追加其他命名机位 |
| `player` | `eyeHeight/spawn/freeSpawn`；`bounds` 含 `x/z/freeZ/y` 二元边界数组 |
| `lightingPreset` | 默认灯光组件目前接受 `palette`；其他布局可以提供自己的灯光适配器 |
| `audienceConfig` | 默认组件接受 `origin/scale`；其他布局可使用自己的观众适配器 |
| `introSequence` | 可选，空值表示无入场；见下方 |
| `audioEnvironment` | 可选，`source:[x,y,z] / decay`（秒）`/ referenceDistance`；声音随第一人称位置和朝向变化 |
| `create({world,members,definition})` | 将环境等加入给定 Three.Scene，返回下述适配器 |

`create` 返回：

- `stage.update(beat,bands)`：环境动画。
- `lighting.configure(performancePreset)` 与 `lighting.update(beat,bands,playing)`。
- `audience.configure(performancePreset)` 与 `audience.update(beat,playing)`。
- `instruments.visible`、`instruments.groups`（Map）和 `instruments.sync(characters)`：可直接复用 InstrumentSystem，其第三参数是舞台高度。
- 可选 `dispose()`：取消场景自己的异步任务、释放外部资源。引擎随后统一释放仍在 world 内的几何、材质、纹理。不要替换 App 的生命周期，也不要创建新的音频或节拍时钟。

可以分别复用已有的 LightingSystem、AudienceSystem、InstrumentSystem，只替换环境实现。不要先调用整个 CiRCLE 的 create 再覆盖 stage 字段，否则旧舞台几何仍会留在 world 中。CiRCLE 的招牌、墙体、灯架仍属于其专属 Stage。

## Intro 生命周期

默认配置 `{duration:3.6, from:[0,3,18], label:'舞台正在亮起'}` 使用推进镜头和渐亮。可提供纯函数 `sample(progress,{endPosition})` 返回 `{position,target,brightness}`，为新场景改变路径；progress 为 0–1，结束姿态应收敛到 endPosition，brightness 为相对亮度。

IntroSequence 用呈现时间驱动；它不播放或跳转媒体、不改 BeatClock。PlaylistManager 的 `beforePlay` 等待结束，之后才调用原 AudioManager.play。期间暂停、取消、切歌、切后台都会取消门控；完成或取消恢复相机、曝光及原控制器状态。默认关闭，只有新曲起点进入；暂停后的中途续播跳过。浏览器若拒绝延迟播放，会提示用户再次点击，已完成的入场不会重复。

## Audio Routing

同一个 MediaElementAudioSource → Analyser → routing.input。其后分成 Normal 与 Experimental 两路，使用互补输出增益在 80 ms 内过渡；不是两个播放器。Experimental 包含 StereoPanner、轻度干湿混合与短 Convolver，位置衰减和声像留有增益余量。

仅第一人称且开关非 Off 时生效。Off 最终恢复 `normal=1 / fx=0 / input=1`，混响尾音不会穿过已关闭的 FX 输出。分析在效果上游，原始音乐文件、BPM 与主播放时间轴不变。实测离线样本旁路差值为零；实际耳机、蓝牙和浏览器输出延迟仍由设备决定。
