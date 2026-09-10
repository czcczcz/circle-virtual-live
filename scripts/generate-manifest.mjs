import fs from "node:fs/promises";
await fs.mkdir("src/config", { recursive: true });
const read = async (file) =>
  JSON.parse(await fs.readFile(file, "utf8").catch(() => "[]"));
const old = await read("src/config/characters.json");
const known = {
  kasumi: ["戸山香澄", "Vocal & Guitar", "#ff527f", [0, 0, 0.3]],
  otae: ["花園たえ", "Guitar", "#528cff", [-3, 0, 0]],
  rimi: ["牛込りみ", "Bass", "#ff80c6", [3, 0, 0]],
  saya: ["山吹沙綾", "Drums", "#ffcc55", [-1.6, 0, -2.1]],
  arisa: ["市ヶ谷有咲", "Keyboard", "#b58aff", [2, 0, -2]],
};
const files = (await fs.readdir("3D_model"))
  .filter((f) => /\.glb$/i.test(f))
  .sort((a, b) =>
    a.startsWith("kasumi")
      ? -1
      : b.startsWith("kasumi")
        ? 1
        : a.localeCompare(b),
  );
const chars = [];
for (const [i, file] of files.entries()) {
  const id = file.replace(/\.glb$/i, "");
  const info = known[id] || [id, "Guest", "#9bfff0", [(i - 2) * 2, 0, 0]];
  const existing = old.find((c) => c.id === id);
  const optimized = await fs
    .access("3D_model_optimized/" + file)
    .then(() => true)
    .catch(() => false);
  chars.push({
    id,
    name: info[0],
    role: info[1],
    color: info[2],
    position: info[3],
    height: 2.6,
    beatStrength: id === "kasumi" ? 1 : 0.72,
    delay: i * 0.009,
    rotation: 0,
    ...existing,
    model: optimized ? "/3D_model_optimized/" + file : "/3D_model/" + file,
    original: "/3D_model/" + file,
  });
}
const bpm = await fs.readFile("music/bpm.txt", "utf8").catch(() => "");
const songs = await read("src/config/songs.json");
for (const file of (await fs.readdir("music")).filter((f) =>
  /\.(mp3|wav|ogg|m4a|flac)$/i.test(f),
)) {
  const id = file.replace(/\.[^.]+$/, "");
  if (!songs.some((s) => s.id === id)) {
    const match = bpm
      .split(/\r?\n/)
      .find((l) => l.startsWith(id))
      ?.match(/bpm\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
    songs.push({
      id,
      title:
        id === "popipa"
          ? "Poppin’Party Live"
          : id === "pengyoudejiu"
            ? "朋友的酒"
            : id,
      file: "/music/" + file,
      bpm: match ? Number(match[1]) : null,
      offset: 0,
    });
  }
}
for (const member of old)
  if (!chars.some((c) => c.id === member.id)) {
    // Preserve custom entries only while their source still exists. Old optimized
    // outputs are not evidence that a deleted original is still in the catalog.
    const source = member.original || member.model || member.src;
    if (source && await fs.access(source.replace(/^\//, "")).then(() => true).catch(() => false)) chars.push(member);
  }
await fs.writeFile(
  "src/config/characters.json",
  JSON.stringify(chars, null, 2),
);
await fs.writeFile("src/config/songs.json", JSON.stringify(songs, null, 2));
console.log(
  `Manifest: ${chars.length} selectable models (stage slots unchanged), ${songs.length} songs. Existing presentation settings preserved; scanned paths prefer optimized models.`,
);
