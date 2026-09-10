import "./style.css";
import "./ui/revision.css";
import "./ui/playlist.css";
import "./ui/solo.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-700.css";
import { App } from "./core/App.js";
try {
  const app = new App();
  if (import.meta.env.DEV) window.__LIVE__ = app;
  import.meta.hot?.dispose(() => app.dispose());
} catch (error) {
  console.error(error);
  document.querySelector("#app").innerHTML =
    '<div style="padding:10%;color:#f9c5df"><h1>舞台暂时无法启动</h1><p>请使用支持 WebGL 2 的浏览器，并启用硬件加速。</p><button onclick="location.reload()">重新加载</button></div>';
}
