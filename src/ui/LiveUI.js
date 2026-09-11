import { icon } from "./icons.js";
import { shots } from "../camera/CameraDirector.js";
import { playbackModes } from "../audio/PlaylistManager.js";
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const time = (s) =>
  `${Math.floor((s || 0) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor((s || 0) % 60)
    .toString()
    .padStart(2, "0")}`;
export class LiveUI {
  constructor(
    songs,
    members,
    models = members,
    anchors = shots,
    presentation = {},
  ) {
    document.querySelector("#app").innerHTML = `
 <div id="viewport" aria-label="三维演出舞台"></div><div class="vignette"></div>
 <header><a class="brand" href="./" aria-label="CiRCLE 首页"><span class="brand-mark">C<span>•</span></span><span>${escape(presentation.brand || "CiRCLE")}<small>沉浸式虚拟 LIVE HOUSE</small></span></a><nav><span class="live-pill"><i></i> 沉浸现场</span><button id="library-toggle" class="nav-action">歌曲</button><button id="band-toggle" class="nav-action">阵容</button><button id="settings-toggle" class="icon-button" aria-label="演出设置">☷</button></nav></header>
 <section class="title-block"><div class="eyebrow">今夜，我们都是闪耀的星。</div><h1>${escape(presentation.title || "Poppin’Party")}<span>${escape(presentation.subtitle || "at CiRCLE")}<span class="star">✦</span></span></h1><p>五颗心，一座舞台。你的专属前排。</p><div class="tag-row"><span>迷你舞台 01</span><span>梦想，从此刻奏响</span></div></section>
 <aside class="members"><span class="rail-label">舞台阵容</span>${members.map((m, i) => `<div class="member" style="--member:${m.color}"><b>${String(i + 1).padStart(2, "0")}</b><span id="roster-${m.id}">${escape(m.name)}<small>${escape(m.role)}</small></span><i id="member-${m.id}"></i></div>`).join("")}</aside>
 <div class="camera-label"><span class="rec-dot"></span><span id="shot-label">机位 01 · 全景</span><span class="camera-rule"></span><span>现场画面</span></div>
 <div class="welcome" id="welcome"><button id="start" class="start-button"><span>${icon("play")}</span> 开始演出 <small>开声、亮灯，一起奔向星光</small></button><p>点击启用音频，进入你的专属 Live。</p></div>
 <div class="loading"><i></i><span id="load-status">正在搭建舞台</span><span id="load-count">0 / ${members.length}</span><div class="load-track"><div id="load-fill"></div></div></div>
 <section class="control-deck"><div class="song-info"><div class="album-art">P<span>✦</span><small>LIVE</small></div><div><span class="micro">正在播放</span><label class="sr-only" for="song">歌曲</label><select id="song"></select><small id="song-subtitle">Poppin’Party · CiRCLE 现场</small><label class="playback-select"><select id="playback-mode" aria-label="播放模式">${Object.entries(
   playbackModes,
 )
   .map(([key, label]) => `<option value="${key}">${label}</option>`)
   .join("")}</select></label></div></div>
 <div class="transport"><div class="transport-buttons"><button id="previous" aria-label="上一首" title="上一首">${icon("previous")}</button><button id="restart" aria-label="从头播放" title="从头播放">${icon("restart")}</button><button id="play" class="play-button" aria-label="播放">${icon("play")}</button><button id="next" aria-label="下一首" title="下一首">${icon("next")}</button></div><div class="timeline"><span id="elapsed">00:00</span><input id="seek" aria-label="播放进度" type="range" min="0" max="1000" value="0"><span id="duration">00:00</span></div></div>
 <div class="deck-right"><div class="volume-row"><span aria-hidden="true">♫</span><input id="volume" type="range" min="0" max="1" step=".01" value=".7" aria-label="音量"></div><label class="camera-select"><span>▣</span><select id="camera" aria-label="视角"><option value="auto">自动导播</option><option value="firstperson">第一人称 · 现场</option><option value="free">自由视角 · 漫游</option><option value="manual">环绕视角 · 拖动</option>${Object.entries(
   anchors,
 )
   .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
   .join("")}</select></label></div></section>
 <footer><span>非官方同人作品 <span class="footer-star">✦</span> 为音乐与梦想而来</span><button id="immersive" title="隐藏全部界面；按 H / Esc 或双击画面恢复">⛶ 隐藏全部界面 · H 恢复</button><span class="quality"><i></i><span id="quality-label">高画质</span><span>/</span><span id="fps">— FPS</span></span></footer>
 <aside class="settings" id="settings" hidden><div class="panel-heading"><span>我的 Live 控制台</span><button id="close-settings" aria-label="关闭设置">×</button></div>
 <div class="panel-tabs"><button data-tab="live" class="active">演出</button><button data-tab="songs">歌曲</button><button data-tab="band">阵容</button></div>
 <section data-panel="live"><label>实验性沉浸音频<select id="immersive-audio"><option value="off">关闭 · 原始音频</option><option value="low">开启 · 轻混响</option><option value="medium">开启 · 中混响</option></select></label><small>仅第一人称生效，含位置立体声。效果因耳机和设备而异。</small><label>入场动画<select id="intro-mode"><option value="off">关闭</option><option value="on">开启 · 开演前入场</option></select></label><label>舞台乐器<select id="instruments"><option value="show">显示 · Show</option><option value="hide">隐藏 · Hide</option></select></label><small>控制舞台独立乐器；与身体合并的模型部分保持原样。</small><label>画质<select id="preset"><option value="low">低 · 适合手机</option><option value="medium">中 · 均衡</option><option value="high">高 · 推荐桌面</option><option value="ultra">极高</option></select></label><label>自动应援（第一人称）<select id="auto-call"><option value="0">关闭 · Off</option><option value="1">每拍</option><option value="2">每 2 拍</option><option value="4">每 4 拍</option></select></label><label>玩偶律动强度 <output id="strength-value">125%</output><input id="strength" type="range" min=".5" max="1.6" step=".05" value="1.25"></label><div class="field-row"><label>速度（BPM）<input id="bpm" type="number" min="30" max="300" value="130"></label><label>首拍位置（秒）<input id="offset" type="number" step=".01" value="0"></label></div><button id="align">自动对齐 · 分析当前音频</button><small id="align-status">首拍由算法估计，可手动微调。</small><div class="beat-display"><span id="beat">第 1 拍</span><span id="bar">第 1 小节</span><div id="beat-dots">● ● ● ●</div></div><p class="help">第一人称：拖动观察，WASD / 方向键移动，保持观众身高。<br>自由视角：WASD 移动，Q / E 下降或上升。手机使用屏幕方向键。<br>第一人称空格 / 点击：挥棒；其他视角空格：播放 / 暂停；H：隐藏 / 显示全部界面。<br>隐藏后按 H / Esc 或双击画面恢复。</p></section>
 <section data-panel="songs" hidden><p class="panel-description">直接添加本地音频与信息，保存在此浏览器中。无需修改项目文件。</p><form id="song-form"><label>音频文件<input id="song-file" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"></label><label>歌曲名称<input id="song-title" required maxlength="120" placeholder="输入歌曲名称"></label><label>歌手 / 备注<input id="song-artist" maxlength="120" placeholder="例如 Poppin’Party"></label><div class="field-row"><label>速度（BPM）<input id="song-bpm" type="number" min="30" max="300" step=".01" required value="130"></label><label>首拍（秒）<input id="song-offset" type="number" step=".01" required value="0"></label></div><div class="form-actions"><button id="save-song" type="submit">添加到歌单</button><button id="reset-song" type="button">清空表单</button></div><small id="library-status">音频只保存在本机，不会上传。浏览器清理数据后需重新添加。</small></form><div id="library-list"></div></section>
 <section data-panel="band" hidden><details class="character-import"><summary>导入本地角色 / 生成压缩副本</summary><label>GLB / PNG / WebP / JPG<input id="character-file" type="file" accept=".glb,.png,.webp,.jpg,.jpeg"></label><label>角色名称<input id="character-name" maxlength="100"></label><pre id="character-analysis">选择本地文件。不会上传到服务器。</pre><button id="preview-character" disabled>分析后预览</button><button id="clear-character">清除预览</button><div id="character-preview"></div><label>放入舞台位置<select id="import-slot">${members.map((m) => `<option value="${m.id}">${escape(m.name)} · ${escape(m.role)}</option>`).join("")}</select></label><button id="apply-character" disabled>保存并使用</button><button id="optimize-character" disabled>生成压缩副本并下载</button><small>原文件保留，压缩在 Worker 中运行。复杂模型不保证变小，CLI 工具仍可使用。</small><label>已保存的本地角色<select id="import-library"></select></label><button id="delete-character">删除所选本地角色</button></details><p class="panel-description">每个位置可选择已有玩偶，也可留空。同款模型复用几何和纹理，切换失败时保留原角色。乐器跟随舞台岗位。</p>${members.map((m) => `<label>${escape(m.name)} · ${escape(m.role)}<select data-slot="${m.id}" disabled><option value="">空位（不显示角色与乐器）</option>${models.map((model) => `<option value="${model.id}" ${model.id === (m.modelId || m.id) ? "selected" : ""}>${escape(model.name)}</option>`).join("")}</select></label>`).join("")}<button id="reset-band" class="secondary-button" disabled>恢复原始阵容</button><small id="band-status">初始模型加载完成后即可切换。</small><details class="compression-help"><summary>如何压缩 GLB 模型？</summary><p>原模型放入 3D_model，在项目目录依次运行：</p><pre>npm run analyze
npm run optimize
npm run manifest</pre><p>输出到独立的 3D_model_optimized，原文件不变。当前方案：1024² WebP 纹理 + Meshopt 几何压缩；五人约 147 MB → 7.67 MB。完整说明见项目中的《GLB压缩指南.md》。</p></details></section>
 </aside>
 <div id="walk-pad" hidden aria-label="移动控制"><button data-key="KeyW" aria-label="向前">↑</button><div><button data-key="KeyA" aria-label="向左">←</button><button data-key="KeyS" aria-label="向后">↓</button><button data-key="KeyD" aria-label="向右">→</button></div><div class="fly-keys"><button data-key="KeyQ">下降</button><button data-key="KeyE">上升</button></div><span>拖动画面转头</span></div>
 <div id="solo-call" hidden><button id="swing">挥棒</button><small>空格 / 点击画面应援 · 拖动转头</small></div>
 <div id="intro-status" hidden><span id="intro-caption">准备入场</span><button id="cancel-intro">取消入场</button></div><div id="toast" role="status" aria-live="polite"></div>`;
    this.$ = (id) => document.getElementById(id);
    this.refreshSongs(songs);
    this.$("settings-toggle").onclick = () => {
      if (!this.$("settings").hidden) this.$("settings").hidden = true;
      else this.openPanel("live");
    };
    this.$("library-toggle").onclick = () => this.openPanel("songs");
    this.$("band-toggle").onclick = () => this.openPanel("band");
    this.$("close-settings").onclick = () => (this.$("settings").hidden = true);
    document
      .querySelectorAll("[data-tab]")
      .forEach(
        (button) => (button.onclick = () => this.openPanel(button.dataset.tab)),
      );
    this.$("immersive").onclick = () =>
      this.hideAll(!document.body.classList.contains("ui-hidden"));
  }
  openPanel(tab) {
    this.$("settings").hidden = false;
    document
      .querySelectorAll("[data-panel]")
      .forEach((el) => (el.hidden = el.dataset.panel !== tab));
    document
      .querySelectorAll("[data-tab]")
      .forEach((el) => el.classList.toggle("active", el.dataset.tab === tab));
  }
  hideAll(value) {
    document.body.classList.toggle("ui-hidden", value);
    if (value) {
      this.$("settings").hidden = true;
      document.activeElement?.blur();
    }
  }
  refreshSongs(songs, selectedId) {
    const selected = selectedId || songs[Number(this.$("song").value)]?.id;
    this.$("song").replaceChildren(
      ...songs.map(
        (s, i) => new Option(s.title, String(i), false, s.id === selected),
      ),
    );
    this.$("library-list").innerHTML = songs
      .map(
        (s) =>
          `<article class="library-row"><div><b>${escape(s.title)}</b><small>${escape(s.artist || "未填写歌手")} · ${escape(s.bpm)} BPM · 首拍 ${escape(s.offset)}s</small><small>${s.custom ? "本地音频 · 已保存" : "项目内置歌曲"}</small></div><div class="library-actions"><button data-song-play="${escape(s.id)}">选用</button><button data-song-edit="${escape(s.id)}">编辑</button>${s.custom ? `<button data-song-remove="${escape(s.id)}">删除</button>` : ""}</div></article>`,
      )
      .join("");
  }
  setSongInfo(song) {
    this.$("song-subtitle").textContent =
      `${song.artist || "CiRCLE 现场"} · ${song.bpm || 130} BPM`;
  }
  setSlot(slot, source) {
    const indicator = this.$("member-" + slot.id);
    indicator.classList.toggle("ready", Boolean(source));
    this.$("roster-" + slot.id).innerHTML =
      `${escape(source?.name || "空位")}<small>${escape(slot.role)}</small>`;
  }
  on(id, event, fn) {
    this.$(id).addEventListener(event, fn);
  }
  notify(text) {
    this.$("toast").textContent = text;
    this.$("toast").classList.add("visible");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(
      () => this.$("toast").classList.remove("visible"),
      6000,
    );
  }
  loading(text, fraction, count, failed) {
    this.$("load-status").textContent = text;
    this.$("load-fill").style.width = `${fraction * 100}%`;
    this.$("load-count").textContent = count;
    if (failed) this.notify(text);
  }
  playing(value) {
    this.$("play").innerHTML = icon(value ? "pause" : "play");
    this.$("play").setAttribute("aria-label", value ? "暂停" : "播放");
    if (value) this.$("welcome").classList.add("started");
    document.body.classList.toggle("is-playing", value);
  }
  update(audio, beat, camera, fps) {
    this.$("elapsed").textContent = time(audio.time);
    this.$("duration").textContent = time(audio.media.duration);
    if (document.activeElement !== this.$("seek"))
      this.$("seek").value = audio.media.duration
        ? (audio.time / audio.media.duration) * 1000
        : 0;
    this.$("shot-label").textContent =
      {
        manual: "环绕视角 · 手动",
        firstperson: "第一人称 · 沉浸现场",
        free: "自由视角 · 漫游",
      }[camera.mode] ||
      `机位 ${String(Object.keys(camera.shots).indexOf(camera.shot) + 1).padStart(2, "0")} · ${camera.shots[camera.shot].label}`;
    this.$("fps").textContent = `${Math.round(fps)} FPS`;
    this.$("beat").textContent = `第 ${(((beat.index % 4) + 4) % 4) + 1} 拍`;
    this.$("bar").textContent = `第 ${Math.max(1, beat.bar + 1)} 小节`;
    this.$("beat-dots").style.opacity = 0.3 + 0.7 * Math.exp(-beat.phase * 4);
  }
}
