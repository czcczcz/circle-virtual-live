import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
const folders = ["3D_model", "3D_model_optimized", "music", "characters"];
export default defineConfig({
  plugins: [
    {
      name: "local-live-assets",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = decodeURIComponent((req.url || "").split("?")[0]);
          if (url === "/__circle_health") {
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                app: "circle-virtual-live",
                root: process.cwd(),
                version: 2,
              }),
            );
            return;
          }
          const folder = folders.find((f) => url.startsWith("/" + f + "/"));
          if (!folder) return next();
          const root = path.resolve(folder),
            file = path.resolve("." + url);
          if (!file.startsWith(root + path.sep) || !fs.existsSync(file))
            return next();
          const size = fs.statSync(file).size;
          res.setHeader(
            "Content-Type",
            file.endsWith(".glb")
              ? "model/gltf-binary"
              : file.endsWith(".mp3")
                ? "audio/mpeg"
                : "application/octet-stream",
          );
          res.setHeader("Accept-Ranges", "bytes");
          const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
          let start = 0,
            end = size - 1;
          if (range) {
            start = Number(range[1]);
            end = range[2] ? Math.min(Number(range[2]), end) : end;
            if (start > end) {
              res.writeHead(416);
              return res.end();
            }
            res.statusCode = 206;
            res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
          }
          res.setHeader("Content-Length", end - start + 1);
          if (req.method === "HEAD") return res.end();
          fs.createReadStream(file, { start, end }).pipe(res);
        });
      },
      closeBundle() {
        const members = JSON.parse(
            fs.readFileSync("src/config/characters.json", "utf8"),
          ),
          songs = JSON.parse(fs.readFileSync("src/config/songs.json", "utf8"));
        for (const asset of new Set([
          ...members.map((m) => m.model || m.src),
          ...songs.map((s) => s.file || s.audio),
        ])) {
          const relative = asset.replace(/^\//, "");
          const source = path.resolve(relative),
            destination = path.resolve("dist", relative);
          if (
            !source.startsWith(process.cwd() + path.sep) ||
            !destination.startsWith(path.resolve("dist") + path.sep)
          )
            throw Error("Asset path outside project");
          fs.mkdirSync(path.dirname(destination), { recursive: true });
          fs.copyFileSync(source, destination);
        }
      },
    },
  ],
  build: {
    // Three.js core is intentionally a separately cached ~545 kB chunk.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          gltf: [
            "three/addons/loaders/GLTFLoader.js",
            "three/addons/libs/meshopt_decoder.module.js",
          ],
        },
      },
    },
  },
});
