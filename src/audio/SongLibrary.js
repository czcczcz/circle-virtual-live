const openDB = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open("circle-live-library", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("songs", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
export class SongLibrary {
  constructor(songs) {
    this.songs = songs;
    this.defaults = songs.map((s) => ({ ...s }));
    this.records = new Map();
    this.urls = new Map();
  }
  async init() {
    this.db = await openDB();
    const records = await new Promise((resolve, reject) => {
      const req = this.db.transaction("songs").objectStore("songs").getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    // IndexedDB getAll is key-ordered. Preserve append order for imported playlist songs.
    for (const record of records.sort(
      (a, b) => (a.addedAt || 0) - (b.addedAt || 0) || a.id.localeCompare(b.id),
    ))
      this.upsert(record);
  }
  upsert(record) {
    this.records.set(record.id, record);
    const oldURL = this.urls.get(record.id);
    if (oldURL) URL.revokeObjectURL(oldURL);
    const file = record.blob ? URL.createObjectURL(record.blob) : record.file;
    if (record.blob) this.urls.set(record.id, file);
    const song = {
      ...record,
      file,
      custom: !this.defaults.some((s) => s.id === record.id),
    };
    delete song.blob;
    const i = this.songs.findIndex((s) => s.id === record.id);
    if (i < 0) this.songs.push(song);
    else this.songs[i] = song;
    return song;
  }
  async write(record) {
    if (!this.db) this.db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction("songs", "readwrite");
      tx.objectStore("songs").put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  async save({ id, title, artist, bpm, offset, file }) {
    const existing = this.songs.find((s) => s.id === id);
    if (!existing && !file) throw Error("请选择音频文件");
    const record = {
      ...(this.records.get(id) || existing || {}),
      id: id || crypto.randomUUID(),
      addedAt:
        this.records.get(id)?.addedAt ||
        Math.max(
          Date.now(),
          ...Array.from(this.records.values(), (r) => (r.addedAt || 0) + 1),
        ),
      title,
      artist,
      bpm,
      offset,
    };
    if (file) {
      record.blob = file;
      delete record.file;
    }
    await this.write(record);
    return this.upsert(record);
  }
  async remove(id) {
    if (!this.songs.find((s) => s.id === id)?.custom)
      throw Error("内置歌曲不能删除");
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction("songs", "readwrite");
      tx.objectStore("songs").delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    this.records.delete(id);
    const url = this.urls.get(id);
    if (url) URL.revokeObjectURL(url);
    this.urls.delete(id);
    this.songs.splice(
      this.songs.findIndex((s) => s.id === id),
      1,
    );
  }
  dispose() {
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
    this.db?.close();
  }
}
