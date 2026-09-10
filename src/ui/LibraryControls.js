export class LibraryControls {
  constructor(app, songs) {
    this.app = app;
    this.ui = app.ui;
    this.songs = songs;
    this.editId = null;
    this.ui.on("song-file", "change", (e) => {
      const file = e.target.files[0];
      if (file && !this.ui.$("song-title").value)
        this.ui.$("song-title").value = file.name.replace(/\.[^.]+$/, "");
    });
    this.ui.on("reset-song", "click", () => this.reset());
    this.ui.on("song-form", "submit", async (e) => {
      e.preventDefault();
      const ui = this.ui,
        button = ui.$("save-song");
      button.disabled = true;
      try {
        const id = this.editId,
          current = this.app.currentSong.id;
        const file = ui.$("song-file").files[0];
        const title = ui.$("song-title").value.trim();
        if (!title) throw Error("请填写歌曲名称");
        const bpm = Number(ui.$("song-bpm").value),
          offset = Number(ui.$("song-offset").value);
        if (
          !Number.isFinite(bpm) ||
          bpm < 30 ||
          bpm > 300 ||
          !Number.isFinite(offset)
        )
          throw Error("请填写有效的 BPM 和首拍位置");
        const song = await this.app.songLibrary.save({
          id,
          title,
          artist: ui.$("song-artist").value.trim(),
          bpm,
          offset,
          file,
        });
        try {
          localStorage.removeItem("circle-sync-" + song.id);
        } catch {}
        ui.refreshSongs(this.songs, current);
        if (current === song.id)
          this.app.song(this.songs.findIndex((s) => s.id === song.id));
        this.reset();
        ui.$("library-status").textContent =
          "已保存到此浏览器。点击「选用」即可播放。";
        ui.notify("歌曲与信息已保存");
      } catch (error) {
        ui.$("library-status").textContent =
          "保存失败：" + error.message + "。请检查浏览器存储权限或可用空间。";
      } finally {
        button.disabled = false;
      }
    });
    this.ui.on("library-list", "click", async (e) => {
      const button = e.target.closest("button");
      if (!button) return;
      const id =
        button.dataset.songPlay ||
        button.dataset.songEdit ||
        button.dataset.songRemove;
      const song = this.songs.find((s) => s.id === id);
      if (!song) return;
      if (button.dataset.songPlay) {
        this.ui.$("song").value = this.songs.indexOf(song);
        this.app.song(this.songs.indexOf(song));
        this.ui.notify(
          this.app.playlist.wantsPlayback
            ? "已选择歌曲，继续播放"
            : "已选择歌曲，点击播放开始",
        );
      }
      if (button.dataset.songEdit) {
        this.editId = id;
        for (const key of ["title", "artist", "bpm", "offset"])
          this.ui.$("song-" + key).value = song[key] ?? "";
        this.ui.$("song-file").value = "";
        this.ui.$("save-song").textContent = "保存歌曲信息";
        this.ui.$("library-status").textContent =
          "正在编辑；不选择文件会保留原音频。";
        this.ui.$("song-title").focus();
      }
      if (button.dataset.songRemove) {
        button.disabled = true;
        try {
          if (this.app.currentSong.id === id) this.app.song(0);
          await this.app.songLibrary.remove(id);
          this.ui.refreshSongs(this.songs, this.app.currentSong.id);
          if (this.editId === id) this.reset();
          this.ui.notify("已从本浏览器歌单删除，源文件未改变");
        } catch (error) {
          this.ui.notify("删除失败：" + error.message);
          button.disabled = false;
        }
      }
    });
  }
  reset() {
    this.editId = null;
    this.ui.$("song-form").reset();
    this.ui.$("save-song").textContent = "添加到歌单";
    this.ui.$("library-status").textContent =
      "音频只保存在本机，不会上传。浏览器清理数据后需重新添加。";
  }
}
