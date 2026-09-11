# Current Priority

- [x] 模型目录与固定舞台岗位分离，新增 GLB 只增加可选玩偶
- [x] 清理 ksm 过期索引和浏览器阵容残留
- [x] 扫描幂等性、新玩偶替换/刷新回归、12 项测试与生产构建

## 用户修订 3（已完成）

- [x] 四种播放模式、上一首/下一首与状态持久化
- [x] 统一切歌同步 BPM/offset/FFT，保持舞台和模型
- [x] 真实音频 ended 浏览器测试与异步播放取消测试
- [x] 作者 Tips、资源准备、offset 与播放模式说明
- [x] 11 项测试、生产构建及桌面/手机布局检查
- [x] 原延后项：已获第二阶段授权并完成图片角色、乐器隐藏、玩家应援棒、Manual/Auto Call、节奏挑战

## 用户修订 2

- [x] 加大律动，真实支撑点贴地修正，移除离地位移
- [x] 星形吉他、电吉他、贝斯、完整鼓组、键盘
- [x] 简体中文界面与提示
- [x] 页面添加/编辑歌曲与信息，IndexedDB 持久化
- [x] 模型切换/复用/留空，阵容持久化
- [x] 第一人称现场、自由漫游、触屏方向键
- [x] 隐藏全部界面与键盘/双击恢复
- [x] GLB 压缩指南与页面帮助
- [x] Windows 双击启动/停止脚本，冷启动与复用实测
- [x] 最终修订版回归、生产构建与文档状态收尾

- [x] Inspect folders and BPM metadata
- [x] Choose modular architecture and checkpoint files
- [x] Analyze and optimize five GLBs
- [x] Stage, audio clock, beat motion, single character
- [x] Five characters and progressive loading
- [x] Camera director, lighting, instanced audience
- [x] Controls and responsive visual polish
- [x] Tests, initial build and browser validation
- [x] Document extension and performance limitations
- [x] Fault-injection model failure and mobile defaults test
- [x] Format source and final production build/preview check
- [x] Update final status and show local site

# Future improvements

- Physical Android/iOS and Safari QA
- Optional KTX2 encoder/decoder and weak-device geometry LOD
- Musical section annotations, tempo maps, non-4/4 support
- Manually verified downbeat offsets and additional bands/stages

# Next Session

Read PROJECT_STATUS.md for verified state; never overwrite original assets.

## 第二阶段
- [x] P0 审计/安全乐器隐藏/实际测试/构建
- [x] P1 图片角色、现有第一人称应援棒、手动/自动 Call
- [x] P2 同音乐时间轴的隐藏节奏挑战
- [ ] P3/P4 可选增强（核心稳定后评估）

- [x] 第二阶段最终回归：18测试、原Live/容错/阵容/歌曲库/播放列表/3阶段专项/生产预览
- [x] README普通操作与PROJECT_STATUS开发者续接记录分离
- [ ] 后续可选：网页角色导入、文件分析与预览（当前角色通过目录+配置添加）

## 2026-09-11
- [x] A SVG图标与移动防误选
- [x] B 可取消的独立Intro门控
- [x] C 可完全旁路的实验音频
- [x] D CiRCLE最小SceneDefinition适配
- [x] 追加Priority4：网页角色导入/分析/预览/使用/保存/Worker压缩副本
- [ ] 最终接口/音频/生产与全功能回归、文档收尾
- 原Priority3多动作与组合键：按用户指示跳过
