import { inspectFile, describeFile } from "./inspectFile.js";
import { CharacterPreview } from "./CharacterPreview.js";

export class CharacterLibrary {
  constructor(app, models) {
    this.app = app;
    this.models = models;
    this.urls = new Set();
    this.revision = 0;
    const ui = app.ui;
    this.preview = new CharacterPreview(ui.$("character-preview"), app.assets);
    ui.on("character-file", "change", (e) => this.choose(e.target.files[0]));
    ui.on("preview-character", "click", () => this.show());
    ui.on("apply-character", "click", () => this.apply());
    ui.on("clear-character", "click", () => this.clear());
    ui.on("optimize-character", "click", () => this.optimize());
    ui.on("delete-character", "click", () =>
      this.remove(ui.$("import-library").value),
    );
    this.ready = this.init().catch(() => {
      if (!this.disposed)
        ui.notify("本地角色存储暂不可用，仍可预览；请保留原文件。");
    });
  }
  async init() {
    this.db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("circle-character-library", 1);
      r.onupgradeneeded = () =>
        r.result.createObjectStore("files", { keyPath: "id" });
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    if (this.disposed) {
      this.db.close();
      return;
    }
    const rows = await new Promise((resolve, reject) => {
      const r = this.db.transaction("files").objectStore("files").getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    if (this.disposed) return;
    for (const row of rows.sort((a, b) => a.addedAt - b.addedAt)) {
      const model = {
        id: row.id,
        name: row.name,
        type: row.info.type,
        custom: true,
        model: this.url(row.file),
      };
      this.models.push(model);
    }
    this.refresh();
  }
  url(file) {
    const url = URL.createObjectURL(file);
    this.urls.add(url);
    return url;
  }
  refresh() {
    for (const select of document.querySelectorAll("[data-slot]")) {
      const value = select.value;
      select.replaceChildren(
        new Option("空位（不显示角色与乐器）", ""),
        ...this.models.map((m) => new Option(m.name || m.id, m.id)),
      );
      select.value = this.models.some((m) => m.id === value) ? value : "";
    }
    this.app.ui
      .$("import-library")
      .replaceChildren(
        ...this.models
          .filter((m) => m.custom)
          .map((m) => new Option(m.name, m.id)),
      );
  }
  status(text) {
    this.app.ui.$("character-analysis").textContent = text;
  }
  async choose(file) {
    this.clear(false);
    if (!file) return;
    const revision = this.revision;
    try {
      this.status("正在分析文件…");
      const info = await inspectFile(file);
      if (revision !== this.revision) return;
      this.draft = {
        file,
        info,
        source: {
          id: "import-" + crypto.randomUUID(),
          name: file.name.replace(/\.[^.]+$/, ""),
          type: info.type,
          custom: true,
          model: this.url(file),
        },
      };
      this.app.ui.$("character-name").value = this.draft.source.name;
      this.status(describeFile(info));
      this.app.ui.$("preview-character").disabled = false;
      this.app.ui.$("optimize-character").disabled = info.type !== "glb";
    } catch (e) {
      if (revision === this.revision) this.status("分析失败：" + e.message);
    }
  }
  async show() {
    const draft = this.draft;
    if (!draft) return;
    const revision = this.revision;
    this.app.ui.$("preview-character").disabled = true;
    try {
      const sizes = await this.preview.show(draft.source);
      if (revision !== this.revision) return;
      draft.info.textureSizes = sizes;
      this.status(describeFile(draft.info));
      this.app.ui.$("apply-character").disabled = false;
    } catch (e) {
      if (revision === this.revision) {
        this.preview.clear();
        this.status("预览失败，舞台未改变：" + e.message);
      }
    } finally {
      if (revision === this.revision)
        this.app.ui.$("preview-character").disabled = false;
    }
  }
  async write(operation) {
    if (!this.db) throw Error("浏览器存储不可用");
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("files", "readwrite");
      operation(tx.objectStore("files"));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || Error("保存中止"));
    });
  }
  async apply() {
    const draft = this.draft;
    if (!draft || !this.preview.source || this.applying) return;
    if ([...document.querySelectorAll("[data-slot]")].some((s) => s.disabled)) {
      this.status("舞台仍在加载或切换，请稍后再使用。");
      return;
    }
    this.applying = true;
    const locked = [
      ...document.querySelectorAll("[data-slot]"),
      ...[
        "character-file",
        "clear-character",
        "preview-character",
        "import-slot",
        "reset-band",
      ].map((id) => this.app.ui.$(id)),
    ];
    locked.forEach((el) => (el.disabled = true));
    const button = this.app.ui.$("apply-character");
    button.disabled = true;
    try {
      draft.source.name =
        this.app.ui.$("character-name").value.trim() || draft.source.name;
      await this.ready;
      await this.write((store) =>
        store.put({
          id: draft.source.id,
          name: draft.source.name,
          file: draft.file,
          info: draft.info,
          addedAt: Date.now(),
        }),
      );
      if (this.disposed) return;
      if (!this.models.some((m) => m.id === draft.source.id))
        this.models.push(draft.source);
      draft.saved = true;
      this.refresh();
      const slot = this.app.ui.$("import-slot").value;
      await this.app.characters.replace(slot, draft.source);
      document.querySelector(`[data-slot="${slot}"]`).value = draft.source.id;
      this.app.saveBand();
      this.app.updateRoster();
      this.status("已保存到本浏览器，并放入所选舞台位置。");
      this.preview.clear();
    } catch (e) {
      this.status("使用失败，原角色保留：" + e.message);
      button.disabled = false;
    } finally {
      this.applying = false;
      if (!this.disposed) locked.forEach((el) => (el.disabled = false));
    }
  }
  async remove(id) {
    const model = this.models.find((m) => m.id === id && m.custom);
    if (!model || this.deleting) return;
    this.deleting = true;
    this.app.ui.$("delete-character").disabled = true;
    try {
      await this.write((store) => store.delete(id));
      for (const c of [...this.app.characters.characters])
        if (c.source.id === id)
          await this.app.characters.replace(c.member.id, null);
      const index = this.models.indexOf(model);
      if (index >= 0) this.models.splice(index, 1);
      if (this.draft?.source.id === id) this.clear();
      this.refresh();
      this.app.saveBand();
      this.app.updateRoster();
      URL.revokeObjectURL(model.model);
      this.urls.delete(model.model);
      this.status("已删除本地角色，相关岗位留空。原磁盘文件未改动。");
    } catch (e) {
      this.status("删除失败：" + e.message);
    } finally {
      this.deleting = false;
      if (!this.disposed) this.app.ui.$("delete-character").disabled = false;
    }
  }
  async optimize() {
    const draft = this.draft;
    if (!draft || draft.info.type !== "glb") return;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.app.ui.$("optimize-character").textContent = "生成压缩副本并下载";
      this.status("已取消压缩，原文件未改动。");
      return;
    }
    this.status("Worker 中压缩纹理与几何；Live 可继续。再次点击可取消。");
    this.app.ui.$("optimize-character").textContent = "取消压缩";
    const worker = (this.worker = new Worker(
      new URL("./optimize.worker.js", import.meta.url),
      { type: "module" },
    ));
    const finish = () => {
      worker.terminate();
      if (this.worker === worker) this.worker = null;
      this.app.ui.$("optimize-character").textContent = "生成压缩副本并下载";
    };
    worker.onmessage = ({ data }) => {
      if (this.worker !== worker) return;
      if (data.error) this.status("压缩失败，原文件未改动：" + data.error);
      else {
        if (this.downloadURL) {
          URL.revokeObjectURL(this.downloadURL);
          this.urls.delete(this.downloadURL);
        }
        const blob = new Blob([data.result], { type: "model/gltf-binary" }),
          url = this.url(blob),
          link = document.createElement("a");
        this.downloadURL = url;
        link.href = url;
        link.download = draft.file.name.replace(/\.glb$/i, "-optimized.glb");
        link.click();
        this.status(
          `已生成 ${(blob.size / 1e6).toFixed(2)} MB 的独立副本。可再次导入使用；原文件与当前阵容均未改动。`,
        );
      }
      finish();
    };
    worker.onerror = (e) => {
      if (this.worker !== worker) return;
      this.status("Worker 不可用，可使用项目 CLI 压缩：" + e.message);
      finish();
    };
    try {
      const bytes = await draft.file.arrayBuffer();
      if (this.worker === worker) worker.postMessage(bytes, [bytes]);
    } catch (e) {
      this.status(e.message);
      finish();
    }
  }
  clear(resetFile = true) {
    this.revision++;
    this.worker?.terminate();
    this.worker = null;
    this.preview.clear();
    if (this.draft && !this.draft.saved) {
      URL.revokeObjectURL(this.draft.source.model);
      this.urls.delete(this.draft.source.model);
    }
    this.draft = null;
    if (resetFile) this.app.ui.$("character-file").value = "";
    for (const id of [
      "preview-character",
      "apply-character",
      "optimize-character",
    ])
      this.app.ui.$(id).disabled = true;
    this.app.ui.$("optimize-character").textContent = "生成压缩副本并下载";
    this.status("选择本地文件。文件不会上传到服务器。");
  }
  update() {
    this.preview.render();
  }
  dispose() {
    this.disposed = true;
    this.clear();
    this.db?.close();
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.urls.clear();
  }
}
