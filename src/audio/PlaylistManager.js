export const playbackModes = {
  single: "单次播放 · Single",
  loopOne: "单曲循环 · Loop One",
  sequential: "顺序播放 · Sequential",
  loopPlaylist: "列表循环 · Loop Playlist",
};
export function nextOnEnded(mode, index, length) {
  if (index < 0 || length === 0 || mode === "single") return null;
  if (mode === "loopOne") return index;
  if (index + 1 < length) return index + 1;
  return mode === "loopPlaylist" ? 0 : null;
}

// Owns transport intent, not the scene. Epochs prevent delayed resume/play from undoing
// a user's pause or newer song selection; natural ended is handled once per generation.
export class PlaylistManager {
  constructor({
    audio,
    songs,
    activate,
    beforeLeave = () => {},
    onError = () => {},
  }) {
    this.audio = audio;
    this.songs = songs;
    this.activate = activate;
    this.beforeLeave = beforeLeave;
    this.onError = onError;
    this.mode = "single";
    this.currentId = null;
    this.wantsPlayback = false;
    this.epoch = 0;
    this.handledEnd = -1;
    this.ended = () => {
      if (audio.media.ended) this.handleEnded();
    };
    audio.addEventListener("ended", this.ended);
  }
  get index() {
    return this.songs.findIndex((s) => s.id === this.currentId);
  }
  setMode(mode) {
    if (!Object.hasOwn(playbackModes, mode)) return;
    this.mode = mode;
  }
  async select(
    index,
    { autoplay = this.wantsPlayback, reason = "select" } = {},
  ) {
    const song = this.songs[index];
    if (!song) return false;
    const token = ++this.epoch;
    this.beforeLeave(reason);
    this.currentId = song.id;
    this.wantsPlayback = autoplay;
    this.activate(index);
    if (autoplay) return this.start(token);
    return true;
  }
  async start(token = this.epoch) {
    try {
      await this.audio.play();
      if (token !== this.epoch) return false;
      return true;
    } catch (error) {
      if (token !== this.epoch) return false;
      this.wantsPlayback = false;
      this.audio.pause();
      this.onError(error);
      return false;
    }
  }
  async play() {
    this.wantsPlayback = true;
    const token = ++this.epoch;
    if (this.audio.media.ended) {
      return this.select(this.index, { autoplay: true, reason: "restart" });
    }
    return this.start(token);
  }
  pause() {
    ++this.epoch;
    this.wantsPlayback = false;
    this.audio.pause();
  }
  toggle() {
    return this.wantsPlayback ? this.pause() : this.play();
  }
  move(delta) {
    if (!this.songs.length) return;
    return this.select(
      (Math.max(0, this.index) + delta + this.songs.length) % this.songs.length,
      { reason: "manual" },
    );
  }
  restart() {
    return this.select(Math.max(0, this.index), { reason: "restart" });
  }
  handleEnded() {
    const generation = this.audio.generation;
    if (this.handledEnd === generation) return;
    this.handledEnd = generation;
    this.beforeLeave("ended");
    const next = nextOnEnded(this.mode, this.index, this.songs.length);
    if (next === null) {
      this.wantsPlayback = false;
      return;
    }
    return this.select(next, { autoplay: true, reason: "continuation" });
  }
  dispose() {
    ++this.epoch;
    this.wantsPlayback = false;
    this.audio.removeEventListener("ended", this.ended);
  }
}
