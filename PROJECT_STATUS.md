# PROJECT_STATUS · 续接入口

Current phase: 第二阶段 P0 / P1 / P2 已完成，最终回归与生产验证通过。历史阶段范围以本段和文末最新记录为准。

最新修复：characters.json 是可选模型目录（目前 6 个，包括 saki_ave）；新增 stage-slots.json 独立定义 5 个固定舞台岗位。manifest 扫描只改模型目录，不改岗位；过期原文件索引不再因 optimized 残留复活。ksm 索引已移除，原有 GLB 文件未删除。App/LiveUI 使用 models 构建选项、members 构建岗位，失效的本地选择恢复默认玩偶并重写有效岗位存储。生产构建包含全部可选模型，但首屏只加载岗位成员。

最新验证：npm test 12/12；npm run build 通过；scripts/model-slots-qa.mjs 实测 5 岗位 / 6 模型、ksm 无选项、旧存储迁移、saki_ave 替换与刷新恢复，errors=[]。报告 reports/model-slots-qa.json。tests/manifest.test.mjs 使用临时目录验证重复扫描不改舞台岗位，且删除源文件的 ksm 索引不会复活。

后续增加玩偶：3D_model 放文件 → npm run optimize → npm run manifest → 页面阵容中选择。只有显式修改 stage-slots.json 才改变岗位数量。以下保留此前阶段记录。

用户已明确收窄范围：不存在的 Call/挑战/图片角色之后再加，本轮不实现。扩展现有 AudioManager/App.song，加入 PlaylistManager；所有切歌都经过同一入口，scene/renderer/GLB 不重建。优先测试 ended 自然触发、异步切歌取消、跨 BPM/offset。提供 songleaving/songchange 生命周期，供后续挑战接入，不宣称已存在节奏挑战。
Last update: 2026-09-10.
项目：C:/Users/22005/Downloads/project

## 本次完成

- 修订 3：四种模式 Single / Loop One / Sequential / Loop Playlist，上一首与下一首，播放模式持久化；手动选歌保留播放意图。
- 新增 src/audio/PlaylistManager.js、src/ui/playlist.css、tests/playlist.test.mjs、scripts/playlist-qa.mjs。修改 AudioManager、SongLibrary、App、LiveUI、LibraryControls、main.js 与本文档/README/TODO。
- 切歌只重置音频、BPM/offset、FFT 平滑状态、导播节拍计数与人物姿态；不重载 Three 场景或模型。异步 resume/play 用 token 取消过期请求。新增歌曲保存 addedAt 维持追加顺序。
- README 新增播放模式、作者 Tips、Seed3D / SongBPM 资源入口及 offset 示例；无公开彩蛋触发说明。不存在的图片角色、玩家应援棒、Call、节奏挑战按用户指示延后。
- 后续挑战集成：App 的同步 songleaving(reason=ended) 在自动选下一首之前触发，可结算当前挑战；continuation 是随后切歌通知，不要重复结算。songchange 在应用新 BPM/offset 后、开始播放前触发，供未来交互重置到普通模式。当前没有挑战实现。

- 玩偶律动幅度加大，默认强度 125%，界面可调 50%–160%。高能量主唱 scaleY 约 .844–1.094。
- 修复浮空：实际舞台顶面 .60，而旧版角色根为 .65；现在根为 .60，移除 lift，预计算真实下部支撑点，每帧补偿摇摆后最低点。五个实际模型所有顶点采样测得最大接触误差 1.43e-9 舞台单位。
- 每岗位有明显乐器：香澄星形吉他、多惠电吉他、里美贝斯、沙绫鼓组、有咲键盘。程序化几何，按岗位材质合批，空位隐藏其乐器。
- 全部交互提示和机位名称改为简体中文；专有标题保留 Poppin’Party / CiRCLE。
- 页面歌曲库：本地音频添加、歌名、歌手/备注、BPM、offset，支持选用、编辑、替换音频、自定义歌曲删除，IndexedDB 持久化。文件不上传、不修改 music/。
- 阵容面板：任意岗位选择五个既有模型或空位，混搭可用，同款复用几何与纹理。引用计数释放，成功替换才移除旧模型，请求版本防止过期加载覆盖新选择。localStorage 持久化与一键恢复。
- 新增第一人称现场（70° FOV，1.65 身高，观众区移动）、自由漫游（WASD/QE），拖动转头，手机方向键。保留原九机位与环绕控制。
- 隐藏全部 UI：包括提示和按钮，零覆盖层；H / Esc / 双击恢复，手机双点恢复。
- Windows 一键启动/停止：启动演出.cmd / 停止演出.cmd，后台本地服务+可见浏览器；首次缺依赖自动 npm install；Node.js 需预装。
- GLB压缩指南.md 与页面内压缩说明，原优化脚本继续可复用。
- README、TODO、此文件已更新。

## 当前验证

- npm test：11/11 通过，包括五个播放列表策略/竞态测试与实际 GLB 解码、贴地求解。
- scripts/playlist-qa.mjs：本轮通过，三个临时短音频（90/160/210 BPM，不同 offset）、6 次真实 ended 事件验证全部模式；每次切歌分析能量归零。scene/camera/renderer/五个角色身份保持，额外模型加载 0；暂停取消延迟 resume、模式持久化、手机无横向溢出通过，浏览器 errors=[]。报告 playlist-qa.json，截图 playlist-desktop/mobile.png。
- 本轮 npm run build 与 scripts/preview-qa.mjs 通过：dist 21 文件、19,940,958 bytes；五个模型 HTTP 200、音乐时间推进、errors=[]、生产调试入口关闭。预览服务端口 4173，session 5562。以下修订 2 回归结果为此前验证记录。
- scripts/revision-qa.mjs：通过。实际顶点贴地测量、同款 geometry 相等且 refs=2、空位隐藏乐器、阵容刷新恢复、第一人称行走、自由升降、隐藏后覆盖层数=0、Esc 恢复、本地音频添加/播放/刷新/编辑/删除、中文文本转义、手机无横向溢出。
- scripts/browser-qa.mjs：通过。无 console error / warning / 404，暂停漂移 0，切歌/seek/restart/自动对齐/画质/环绕继续工作。
- scripts/browser-resilience.mjs：通过。故意让 arisa 404 时其他四人和音频正常，九导播镜头遍历，卸载后 geometry=0（renderer texture counter=1）。
- 桌面 headless Chrome 1440x900 High 最新采样约 56.7 FPS，104 draw calls，523,609 rendered triangles；非实体手机测试。
- npm run build：通过，无构建警告。dist 21 文件、19,936,365 bytes（约 19.94 MB，含两首歌/本地字体/五个优化模型）。
- scripts/preview-qa.mjs：通过。五模型 200、播放时间推进、无报错、生产不暴露 window.**LIVE**。
- 一键启动器测试：冷启动、重复启动复用、停止自身服务、真正执行启动演出.cmd 打开默认浏览器均通过。
- 启动器已修复 Windows PowerShell 5.1 localhost 健康探测 IPv6 超时：健康检查走 127.0.0.1，用户浏览器仍用 localhost，保持存储源一致。
- PowerShell 脚本使用 UTF-8 BOM，中文在 Windows PowerShell 5.1 正确读取；后台 Node 用 Hidden，用户浏览器用 Normal。

## 运行与恢复

推荐双击启动演出.cmd，或 npm run dev，固定访问 http://localhost:5173/。
启动器的进程记录为 .live/server.pid；停止脚本核验进程命令行的本项目 Vite 路径，避免 PID 复用误杀。
本次服务由启动器启动，端口 5173；另有生产预览端口 4173（工具 session 60363）。使用前先检查是否已在运行。
正常开发：npm install / npm run dev / npm test / npm run build。
完整回归：node scripts/revision-qa.mjs / node scripts/browser-qa.mjs / node scripts/browser-resilience.mjs。
生产预览：npm run preview -- --port 4173，再 node scripts/preview-qa.mjs。
所有报告和截图在 reports/，新截图 revision-*.png，生产图 production.png。

## 架构定位

- src/audio/SongLibrary.js：IndexedDB + Blob URL 生命周期；src/ui/LibraryControls.js：表单与列表绑定。
- src/characters/CharacterManager.js：slot 替换、归一化、动画；GroundContact.js：真实支撑点；BeatMotion.js：更大的连续变形曲线。
- src/core/AssetManager.js：acquire/release 引用计数 cache；GLTF 场景 clone 共享几何与纹理。
- src/stage/InstrumentSystem.js：每个岗位独立程序化乐器，材质合批，slot clear 同步隐藏。
- src/camera/FreeCamera.js：拖动观察与键盘/触摸移动；CameraDirector.js：统一模式与 70°/43°/58° 投影切换。
- src/ui/LiveUI.js / revision.css：简体中文 UI、标签页、阵容、隐藏全部界面。
- src/core/App.js：生命周期和系统连接。src/config/characters.json 中文成员名与岗位。
- 原稳定 AudioContext/媒体位置锚定时钟、BPM/FFT、灯光和 instanced audience 保留。

## 原资源和优化结论（仍有效）

五个 GLB 原始约 146.97 MB，优化 7.67 MB；1 mesh/1 material/2张4096² PNG/约10万三角面，无 skin/animation/morph。
优化使用 glTF Transform + 1024² WebP quality85 + Meshopt medium，保留约50万三角面。
原 3D_model/ 与 music/ 从未覆盖。输出在独立 3D_model_optimized/；manifest 可重新生成。
报告：reports/models.json / optimization.json。压缩指南给出完整命令和关键代码。

## 已知边界 / 无当前阻塞

- 固定 BPM 4/4。原始两首 130 BPM，offset 未人工听感确认。自动对齐为启发式估计（最新 popipa ~.45秒），参考得分不等于统计概率。
- Auto align 会短暂解码完整音轨；正常播放流式。受限手机可手调 offset。
- 页面导入的音频仅当前浏览器/源保存。localhost:5173、127.0.0.1:5173、localhost:4173 属于不同存储空间；清理数据后需重新导入。
- 同款模型纹理复用已验证；当前支撑点算法针对静态模型，自带骨骼/形变动画需要将来动态更新支撑点。
- 未实现 KTX2 或几何 LOD。没有 toktx/basisu，当前 WebP fallback。RGBA ~42 MB 基础/~56 MB 含 mip 为像素估算，不是显存实测。
- 实体 Android/iOS/Safari 未验证，桌面触屏模拟不替代实体性能测试。
- 一键启动依赖 Node.js 已安装，使用 HTTP 服务；不是一个脱离 Node 的 file:// 单 HTML 文件。

## 下一步

本次需求无未完成项。依据用户后续反馈继续；勿重建工程。未来方向见 TODO.md。

## 第二阶段 Priority 0 已完成

原始六个 GLB 已扫描：world → mesh、Mesh=mesh、Material_0、单 primitive，包围盒和属性详见 reports/instrument-scene-graph.json。无可安全隔离的乐器节点：Cannot safely isolate instrument from merged mesh。只隐藏独立程序化 InstrumentSystem.groups；模型本体保持原样。未来显式 instrumentNodes 精确名单由 InstrumentVisibility.js 保存/恢复原 visible，无模糊猜测、无 remove/dispose。设置 → 舞台乐器，localStorage 持久化，空位和换模型遵守开关。
验证：npm test 12/12，npm run build 通过；scripts/instruments-qa.mjs 真五人+音乐+运动+材质身份+相机+隐藏/恢复/刷新通过，errors=[]。首次测试采到媒体初始缓冲，改为等待实际音频时间推进后验证通过。截图 instruments-show/hide.png。
当前进入 Priority 1：在现有 CharacterManager 扩展图片，在现有 CameraDirector firstperson 接入单个应援棒。当前用户已授权本阶段，覆盖历史的延后范围记录。

## 第二阶段 Priority 1 已完成

ImageAsset 通过 PlaneGeometry + 透明纹理接入 AssetManager 引用计数，最长边限制 2048（解码 RAM 峰值仍与源图有关）；CharacterManager 原层级统一归一化、BeatMotion、脚底支撑与 billboard yaw 平滑。GLB/image 均支持 model 或 src；characters/ 由 Vite 服务和生产复制。图片应裁掉脚底透明留白。现有 firstperson CameraDirector 复用，单个 GlowStickController 是相机子节点，3 个小网格、无 render target。SoloInteraction 管理点击/触屏/空格，拖动不挥棒、编辑控件不拦截。auto-call 0/1/2/4 直接从 BeatClock 绝对相位计算，FFT 仅影响强度；手动 .48 秒分段 easing 使用 performance time。其他视角仍空格播放/暂停。
验证：P1 build 通过；solo-image-qa 混合 2 图片+3 GLB、共享 refs=2、最终释放、手动不暂停音乐、每2拍自动、切视角隐藏、手机无横向溢出，errors=[]。图片/应援棒截图 solo-image-live.png。当前进入 P2，尚无挑战半成品。

## 第二阶段 Priority 2 已完成

开发者记录（不要复制到普通帮助）：仅 CameraDirector.mode=firstperson 且非输入框/textarea/select/button/contenteditable 时，2秒内连续键入 popipa，使用当前播放音频进入 4拍倒计时。RhythmJudge 直接引用 app.beat，目标=offset+index*60/BPM；默认每拍，配置 windows=.05/.1/.16秒，得分1000/750/400/0，accuracy=score/(判定总数*1000)。同拍不可重复刷分，漏拍自动Miss；游离点击Miss影响准确率但不消费未来目标。Auto Call 从不调用 judge.hit。手动输入无论结果都用同一个 GlowStickController。
暂停冻结音乐网格；seek、BPM/offset改变和离开第一人称结束当前挑战，避免追判跳过区间。Escape只退出挑战/结果并恢复界面，不暂停音乐。songleaving(ended)同步结算，然后 PlaylistManager 继续；songchange取消挑战状态，10秒结果文字保留，新歌普通沉浸。
验证：rhythm-qa.mjs 真实11秒音频、秘密输入作用域、倒计时、Perfect得分、自动不计分、Escape、自然结束顺序切歌120/.1→180/.23，Scene和AudioContext身份不变，errors=[]。rhythm.test 验证窗口边界、重复输入、丢帧漏拍、长时间对齐、重置与seek不误罚。
P3多动作/组合键和P4网页导入/分析/预览/压缩是可选后续，未添加半成品。继续复用现有CLI压缩工具。

## 第二阶段最终交付与续接

完成：乐器Show/Hide、GLB/图片共存、原firstperson的3D手动/每1/2/4拍自动应援、隐藏节奏挑战。README只介绍普通操作，不公开触发字符。默认阵容仍5岗位，模型目录仍6个GLB，测试图片是浏览器临时canvas生成，未污染用户配置或资源。characters/README.md说明如何加入真实PNG/WebP/JPG。
新增主要文件：characters/ImageAsset.js、characters/InstrumentVisibility.js、interaction/GlowStickController.js、interaction/SoloInteraction.js、interaction/RhythmJudge.js、ui/solo.css；审计与3套阶段QA脚本、interaction/rhythm测试。修改AssetManager/CharacterManager/App/LiveUI/InstrumentSystem/manifest/Vite/资产与目录测试/README/TODO。
最终验证：npm test 18/18、npm run build通过；browser-qa、browser-resilience、revision-qa、playlist-qa、instruments-qa、solo-image-qa、rhythm-qa与preview-qa均通过。普通视角104 draw calls，headless桌面采样约66FPS（非实体手机性能保证）；新增棒3小网格/无纹理/无RenderTarget，只第一人称可见；卸载geometry=0，renderer内部texture计数1。真实五GLB贴地误差1.43e-9。浏览器页面无异常；容错报告中的404为故意注入。
生产dist22文件/21,556,496 bytes（含6个可选GLB），首屏请求5个GLB均200，音乐推进，生产调试入口关闭。预览首次检查服务已停止，重新启动4173（session4309）后通过；dev仍5173。
已知边界：GLB合并乐器无法分割；图片脚底透明留白应先裁剪；图片源解码存在RAM峰值；蓝牙/设备输出延迟尚无独立输入校准；固定BPM/4拍，原曲offset未人工校准；实体Android/iOS/Safari未测试。鼠标/触摸轻点在释放时挥棒判定，明显拖动只转头；键盘Space在按下时判定。所有界面隐藏时包括挑战提示也隐藏，可H/Esc恢复。
下一步（仅后续授权/优先级）：P3多种动作/组合键；P4网页角色导入→分析→预览→选岗位。浏览器压缩器继续延后，保留现有CLI工具与原文件。没有半成品阻塞当前Live。命令：npm run dev / npm test / npm run build；node scripts/instruments-qa.mjs / node scripts/solo-image-qa.mjs / node scripts/rhythm-qa.mjs。
