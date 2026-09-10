# CiRCLE · Web Virtual Live

可直接运行的 Poppin’Party 迷你 Live。使用五个舞台岗位、可扩展角色目录与两首音乐，原生 Three.js + Vite + Web Audio，无后端、无运行时 CDN。

## 启动

**Windows 一键启动：双击项目根目录的「启动演出.cmd」。** 启动器会在后台运行本地服务并打开默认浏览器；首次缺依赖时自动执行 npm install，需已安装 Node.js 22.12+。重复点击复用本项目服务；「停止演出.cmd」仅停止启动器创建且已核对路径的 Node 进程。日志在 `.live/`。这是本地 HTTP 启动，不是直接用 file:// 打开 index.html，后者无法可靠加载模块、GLB 和音频。

建议 Node.js 22.12+（本机 Node 25.1）。项目目录运行：

```sh
npm install
npm run dev
```

打开终端地址，点击 **开始演出** 启用音频。优化模型和配置已生成，无需再次优化。界面、错误提示、帮助与机位名称均为简体中文。

```sh
npm test
npm run build
npm run preview
```

`dist/` 是完整静态成品，只复制 manifest 引用的模型与音乐，不携带 147 MB 原始模型。默认部署在网站根路径；子目录部署需同时调整 manifest 绝对 URL。Vite 开发资源 middleware 支持音频 HTTP Range。

## 操作

- 上一首 / 下一首、播放 / 暂停、从头播放、歌曲选择、进度和音量。
- **自动导播**：普通每 8 小节、高能量每 4 小节切换，转换约 2.4 秒。
- 九机位：全景、中央、主唱特写、左侧、右侧、低角度、观众远景、横向巡游、动态环绕。
- **第一人称 · 现场**：70° 视野，固定 1.65 身高，观众区内 WASD / 方向键行走，拖动转头。
- **自由视角 · 漫游**：拖动观察，WASD 移动，Q / E 升降，手机屏幕方向键。活动范围限制在场馆内。
- **环绕视角**：原有拖动环绕、滚轮缩放、触摸手势。
- 右上角：演出设置、歌曲、阵容。支持 50%–160% 律动强度、四档画质和首拍调整。
- `Space` 在第一人称中挥棒，其他视角播放 / 暂停。`H` 或底部按钮 **隐藏全部界面**，包括提示、按钮和触控方向键。按 H / Esc 或双击画面（手机双点）恢复。未隐藏时可用手机方向键移动；隐藏后仍可拖动转头和挥棒。
- 切后台自动暂停，回来手动继续。

## 同步机制与边界

### 歌曲播放模式

歌曲名称下方可选择播放模式，浏览器会记住选择；默认单次播放。

| 模式 | 当前歌曲自然结束后 |
| --- | --- |
| 单次播放 · Single | 停止 |
| 单曲循环 · Loop One | 从头播放当前歌曲 |
| 顺序播放 · Sequential | 播放下一首，到列表末尾停止 |
| 列表循环 · Loop Playlist | 播放下一首，末尾回到第一首 |

内置歌曲按照 `src/config/songs.json` 顺序排列，页面新增歌曲追加到末尾。上一首 / 下一首手动操作会首尾环绕，并保留原来的播放或暂停状态。切换歌曲选择器也保留此状态。从头播放会重置当前歌曲进度。

切歌统一更新 BPM、offset、歌曲信息、节拍与音频分析状态；舞台、角色模型、渲染器和相机继续使用。音频加载失败时暂停并提示，可手动选下一首。

`beat = (audioTime - offset) * BPM / 60`；当前假设固定 BPM、4/4，每 4 小节为一个基础 phrase。

`AudioManager` 流式播放 HTMLAudioElement，经 MediaElementAudioSourceNode → AnalyserNode → destination。视觉以 AudioContext.currentTime 插值推进，以实际媒体位置校准；暂停、缓冲、seek 时重新锚定，预测偏差超过 75 ms 修正。不使用 setInterval 累积拍点。

`BeatClock` 无状态映射绝对时间。人物、灯光、LED、观众、导演共用采样结果，跳转不会累积漂移。FFT bass / mid / treble / energy 调节强度，不替代 BPM 网格。

原始 bpm.txt 指定两首均 **130 BPM**，未提供首拍 offset。默认 0 **未经过人工校准**。Auto align 解码音频、提取正向能量突变，在一个拍长内搜索 offset；有半拍歧义和弱起误判可能。显示的 confidence 是峰值对平均得分的启发式指标，**不是统计概率**。微调值按歌曲存入 localStorage。

Auto align 仅按需运行，分析最多前 90 秒，但需要暂时解码完整音轨。因此长歌会增加 RAM；正常播放不保留完整 PCM。手机可直接调 offset 避免分析峰值。未实现自动 BPM 估计、变速网格和复合拍号。

## 角色扩展与律动

模型目录在 `src/config/characters.json`；舞台岗位独立保存在 `src/config/stage-slots.json`，当前固定五个位置。新增模型不会新增舞台位置。模型都是静态玩偶，无 skin / AnimationClip，不做嘴形、手指或演奏骨骼动画。

层级 `CharacterRoot → Motion → NormalizedGroup → GLTF scene`，统一高度 2.6。连续 smoothstep 曲线实现预备、压缩、回弹过冲、二次回落、静止；基础曲线最大压缩 12.5%、拉伸 7.5%，默认强度 125% 下主唱范围约 **0.844–1.094**（能量较高时）。横向 `1/sqrt(scaleY)` 保持体积。取消旧版离地弹跳，修正根高度 0.65 → **0.60** 与实际舞台表面一致；预计算真实模型下部支撑顶点，每帧按缩放与摇摆后的最低接触点补偿。五个实际 GLB 的测试最大离地误差小于 0.000001 单位。此求解针对当前静态玩偶；将来启用变形骨骼动画需同步更新动态支撑点。

五人错位 0–36 ms、强度不同。播放直接按音乐相位求姿态，暂停才平滑回正，避免额外节拍迟滞。

### 页面切换模型与乐器

右上角 **阵容** 面板可为每个岗位选择目录中的 GLB / 图片角色或 **空位**，支持多个岗位使用同款。切换成功后才释放旧角色；同款几何/纹理采用引用计数复用，最后一个引用释放后销毁资源。阵容保存到 localStorage，刷新恢复；可一键恢复原始阵容。添加资源只增加可选角色，舞台仍由独立岗位配置决定。

每个岗位配有明显的程序化乐器：香澄星形吉他、多惠电吉他、里美贝斯、沙绫完整鼓组、有咲键盘。乐器跟随岗位而非所选模型；空位同时隐藏乐器。乐器材质按岗位合批，未引入新外部模型资源。

**演出设置 → 舞台乐器 → 显示 / 隐藏**，随时切换并自动保存。当前独立舞台乐器全部可隐藏，模型身体、材质和律动保持不变。已扫描的 GLB 都是单个整体 mesh，模型内部没有可以安全独立隐藏的乐器节点；如果乐器已合并进身体，开关不会尝试切割几何。未来有独立节点的 GLB，可在对应角色配置加入 `"instrumentNodes": ["Guitar_Main", "Guitar_Strap"]`，精确指定经过检查的节点名称；显示时恢复节点原有可见性。

最小新增配置：

```json
{
  "id": "new_character",
  "type": "glb",
  "src": "/3D_model/new_character.glb"
}
```

模型目录可填写 `name / color / rotation`（绕 Y 弧度）、`playClip`（显式启用首个动画）。`model` 与 `src` 均可指定资源地址。舞台岗位的 `position / height / beatStrength / delay / instrument` 写入 `stage-slots.json`；position.y 相对舞台高度 0.60。GLB 和图片共用岗位的 BeatMotion 与贴地逻辑。逐个加载，单个失败不阻塞其他角色。

新增 GLB 后运行 `npm run optimize` 和 `npm run manifest`，只更新可切换模型目录；在阵容面板选择新玩偶即可。岗位位置、乐器与律动参数仍由 stage-slots.json 管理；只有手动编辑此文件才会增减岗位。扫描优先采用优化路径，已删除原文件的旧索引不会因残留优化文件复活。替换 manifest 即可换乐队；新舞台可替换 Stage 实现。

### 添加图片角色

将 PNG / WebP / JPG 放入项目根目录的 `characters/`，在 `src/config/characters.json` 数组中追加：

```json
{
  "id": "my_image",
  "name": "我的纸片人",
  "type": "image",
  "src": "/characters/my_image.webp"
}
```

刷新后在阵容面板替换任意现有岗位。图片是有透视、深度和灯光的双面 3D 平面，轻柔朝向镜头，复用玩偶的挤压、拉伸与摇摆。推荐透明 PNG / WebP，裁掉脚底透明留白以免视觉浮空；JPG 的矩形背景会保留。最长边在上传 GPU 前限制为 2048，但原图解码仍有内存峰值，建议提前缩小超大图片。当前通过文件与配置添加，尚未提供网页角色导入面板。

### 第一人称应援

在视角中选择 **第一人称 · 现场**，就会看到随相机移动的 3D 应援棒。按空格、点击画面或点击「挥棒」按钮执行一次挥舞；拖动仍用于转头，WASD / 方向键仍用于行走。第一人称空格不再暂停歌曲，请使用底部播放按钮。

演出设置里的 **自动应援** 可选关闭、每拍、每 2 拍、每 4 拍，直接跟随当前歌曲的 BPM 与 offset。暂停时停止自动挥舞，仍可手动挥棒；切歌跟随新节拍，其他视角自动隐藏玩家应援棒。隐藏所有界面后仍可使用空格或点击画面。

## 歌曲扩展

**无需改文件：右上角「歌曲」→选择音频→填写名称、歌手/备注、BPM、首拍秒数→添加到歌单。** 支持选用、编辑、替换音频、删除自定义歌曲。内置歌曲允许编辑信息，不允许删除。编辑信息时不选文件会保留原音频。

音频 Blob 与元数据保存在本浏览器 IndexedDB，刷新后恢复，不上传到服务器、不改动 music/。受浏览器存储配额限制，清理网站数据会丢失本地歌单。始终使用相同地址（推荐启动器的 `http://localhost:5173`）；不同端口、127.0.0.1、不同浏览器属于独立存储空间。此模式方便个人使用；要随项目发布，请仍使用下方 JSON 方法。

音频放入 music/，编辑 `src/config/songs.json`：

```json
{
  "id": "song02",
  "title": "Song 02",
  "file": "/music/song02.mp3",
  "bpm": 185,
  "offset": 0.12
}
```

offset 为首个网格拍的音轨秒数，支持负数；`audio` 可作为 `file` 别名。缺 BPM 提示手动输入并默认 130。浏览器校准优先于 JSON；清除 `circle-sync-<id>` localStorage 可恢复配置值。

manifest 命令扫描 mp3/wav/ogg/m4a/flac，解析 bpm.txt 中 `文件主名 bpm130` 或 `文件主名 bpm=130`，保留已有歌曲设置。默认 popipa.mp3，不推断其实际歌曲名。

## 分析与优化

完整步骤与可复用代码见 **[GLB压缩指南.md](./GLB压缩指南.md)**，阵容面板也提供快捷说明。

```sh
npm run analyze       # reports/models.json
npm run optimize      # separate 3D_model_optimized/, reports/optimization.json
npm run manifest      # use optimized URLs
```

| 模型   | 原始 MB | 优化 MB |  三角面 |
| ------ | ------: | ------: | ------: |
| arisa  |   30.24 |    1.55 |  99,977 |
| kasumi |   25.04 |    1.46 |  99,998 |
| otae   |   31.33 |    1.56 |  99,994 |
| rimi   |   31.42 |    1.58 |  99,990 |
| saya   |   28.94 |    1.52 |  99,994 |
| 合计   |  146.97 |    7.67 | 499,953 |

每个 GLB 原始均为 1 mesh / 1 primitive / 1 material / 两张 4096² PNG，含 POSITION/NORMAL/TEXCOORD_0/index，无 tangent/morph/skin/animation。未发现内部重复纹理/材质或闲置材质。体积主要来自 PNG。

优化链：dedup → prune → resample → 1024² WebP quality 85 → Meshopt medium。保留三角面，量化压缩采用 EXT_meshopt_compression，运行时配置 MeshoptDecoder。原文件不覆盖。

纹理 RGBA 基础估算由 **671 MB → 42 MB**，优化后含 mip 链约 **56 MB**。这不是实测显存，不含几何、shadow、framebuffer、驱动开销。WebP 减少下载，GPU 通常仍解码 RGBA；本次显存减少来自分辨率缩减。

本机无 toktx/basisu，采用 WebP fallback，**未完成 KTX2 GPU 压缩**。未来需同时加入编码器与 KTX2Loader，不能直接更换文件而不配解码器。

静态舞台与新版岗位乐器按材质合批，观众使用两组 InstancedMesh；无 bloom 全屏 target，无多盏高分辨率 shadow。卸载释放引用计数模型、去重 dispose geometry/material/texture、关闭音频和 IndexedDB、释放 Blob URL、销毁 renderer/controls。

## 作者 Tips

### 3D 模型

GLB 角色不一定需要自己建模，也可以使用 AI 3D 生成服务准备 Q 版角色、玩偶或舞台道具。例如可尝试火山引擎方舟的 [Seed3D 体验入口](https://ark.volcengine.com/region:cn-beijing/experience/gen_3d?model=doubao-seed3d-2-0-260328)。是否提供体验额度、具体次数及可用模型，以登录后平台当前规则为准。

**强烈建议加入网页前压缩 GLB。** 原始生成模型常有面数偏高、4K PNG、过多材质等问题；几十 MB 的文件进入 RAM / GPU 后占用可能显著增加。可评估 Meshopt、Draco、KTX2 / Basis 与纹理缩小。本项目已提供 Meshopt + 纹理缩小 + WebP 的可运行脚本；KTX2 还需安装编码器并接入加载器，详见上方压缩指南。始终保留原文件，在优化目录生成副本。

### 歌曲、BPM 与 offset

准备浏览器可播放且你有权使用的音频，在歌曲面板添加，或放入 `music/` 并写入歌曲配置。每首歌尽量填写准确的 BPM，角色律动、灯光和观众应援棒都会依赖它。

可在 [SongBPM](https://songbpm.com/) 搜索歌曲名称查询 BPM，也可使用音频 BPM Analyzer 分析。请核对录音版本，并试听校准；Live Version、Remix 或变速版本可能不同。

**BPM = 节拍速度；offset = 第一拍从音频什么位置开始（秒）。** 例如：

```json
{
  "title": "Example Song",
  "bpm": 180,
  "offset": 0.42
}
```

表示第一拍约在音频开始后 0.42 秒。前奏留白、弱起或非整拍起奏时，仅填写 BPM 不够，还需要调整 offset。当前使用固定 BPM；歌曲中途变速无法只靠一个 offset 全程对齐。

资源准备流程：准备角色 → 获得 GLB → 压缩并放入资源目录 → 准备音频 → 查询 / 测量 BPM → 调整 offset → 更新 characters / songs 配置 → 启动演出。

当前支持 GLB / 图片角色、第一人称现场视角、玩家手动 / 自动应援棒和观众应援棒。网页角色导入、更多挥舞动作与网页模型压缩留待后续开发。

## 性能档位

| 档位   | DPR 上限 | Spot | 观众 | 阴影      |
| ------ | -------: | ---: | ---: | --------- |
| Low    |        1 |    2 |   40 | 关闭      |
| Medium |     1.25 |    4 |   80 | 关闭      |
| High   |      1.5 |    6 |  120 | 1 盏 512² |
| Ultra  |        2 |    6 |  160 | 1 盏 512² |

触屏默认 Low，桌面默认 High。档位共用 1024² 人物纹理和约 50 万三角面，不重新下载模型。弱 GPU 后续可增加简化 LOD。手机竖屏后移取景保留五人。

## 架构

```text
src/core/           App lifecycle, renderer, assets, disposal
src/audio/          Stream transport, playlist, master clock, FFT, alignment, beat grid
src/characters/     Foot pivots, sequential loading, deterministic beat motion
src/camera/         Shot definitions, bar-aware director, eased transitions, controls
src/stage/          Procedural CiRCLE, static batching, music lighting
src/audience/       Instanced silhouettes and phased glow sticks
src/interaction/    Existing first-person interaction, shared 3D glow stick and rhythm judge
src/config/         Members, songs, defaults and performance presets
src/ui/             Controls and responsive overlay
scripts/            Audit, optimization, manifests, browser QA
tests/              Beat invariants, motion limits, actual GLB decode
reports/            Metrics, audits, desktop/mobile screenshots
```

## 验证与续接

`npm test` 当前 18 项，覆盖长时间/seek 网格、变形与贴地、GLB/图片引用、播放列表、岗位目录分离、安全可见性恢复、挥棒帧率无关与节奏判定边界。

先启动 dev，再在安装了 Chrome 的机器运行：

```sh
node scripts/browser-qa.mjs
node scripts/browser-resilience.mjs
node scripts/revision-qa.mjs
node scripts/playlist-qa.mjs
node scripts/instruments-qa.mjs
node scripts/solo-image-qa.mjs
```

生产检查：先运行 `npm run preview -- --port 4173`，再执行 `node scripts/preview-qa.mjs`。当前 `dist` 约 21.56 MB（包含第六个可选 GLB，首屏仍只加载五岗位），含两首音轨与本地字体；五个优化 GLB 均通过 HTTP 200 和播放 smoke test。

QA 测试播放、暂停、切歌、seek/restart、Auto align、机位、性能、竖屏；容错故意让一个模型 404，确认其余四人和音频继续。修订版测试遍历实际模型顶点测量贴地误差，验证模型资源复用、空位与阵容持久化、第一人称移动、自由升降、零覆盖层隐藏/恢复、本地音频上传/播放/编辑/删除/持久化。结果与截图在 reports/。桌面 headless Chrome 实测不等于真实手机 GPU / Safari 验证。

开发环境暴露 `window.__LIVE__` 检查 clock/characters/renderer.info；生产无此入口。Windows 受限沙箱如阻挡 npm 缓存或 esbuild，在允许的普通终端运行同样命令。

后续先读 **PROJECT_STATUS.md → TODO.md → README.md**。资源权利归原权利人，页面标注 unofficial fan experience。

## AI 生成声明 / AI-Generated Content Disclosure

本项目在开发过程中大量使用 AI 编程助手（扣子 Coze 编程 Agent）生成与迭代代码、文档和测试，由项目维护者审核、验收后发布。

This repository was developed with substantial assistance from an AI coding agent (Coze Coding Agent): most code, documentation, and tests are AI-generated, then reviewed and verified by the maintainer before publication. All third-party character names and model assets referenced on the page belong to their original rights holders; this is an unofficial fan experience.
