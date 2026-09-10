import characterData from "./characters.json";
import slotData from "./stage-slots.json";
import songData from "./songs.json";
// Minimal guest entries only need an id and model URL; presentation defaults live here.
export const models = characterData.map((member, index) => ({
  name: member.id,
  role: "Guest",
  color: "#a98cdb",
  height: 2.6,
  position: [(index - 2) * 2, 0, 0],
  beatStrength: 0.75,
  delay: index * 0.009,
  rotation: 0,
  ...member,
  model: member.model || member.src,
  type:
    member.type ||
    (/\.(png|webp|jpe?g)$/i.test(member.model || member.src || "")
      ? "image"
      : "glb"),
}));
// Stage slots are explicit: scanning another model must never add a performer.
export const members = slotData.map((slot) => ({
  ...models.find((model) => model.id === slot.id),
  ...slot,
}));
export const songs = songData.map((song) => ({
  title: song.id,
  offset: 0,
  ...song,
  file: song.file || song.audio,
}));
