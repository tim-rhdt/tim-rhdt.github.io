// Plays a Keynote HTML export in headless Chrome and captures every build stop, slide by slide.
// node kcap.mjs <chrome> <profileDir> <exportDir> <outDir> <dpr> <port> [onlySlides e.g. "3,4"]
// For each slide: jump there (type number + Return), wait until its textures are visible, capture,
// then press → and capture every visible change until the textures belong to the next slide.
// Env: KCAP_EXCLUDE="iO Clip,…" keeps those clips' still frames in the images; KCAP_DEBUG=1 logs every press.
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const [, , chromePath, profileDir, exportDir, outDir, dprArg, portArg, onlyArg] = process.argv;
const DPR = Number(dprArg || 1.3333333);
const PORT = Number(portArg || 9340);
const ONLY = onlyArg ? new Set(onlyArg.split(",").map(Number)) : null;
mkdirSync(outDir, { recursive: true });

const header = JSON.parse(readFileSync(path.join(exportDir, "assets/header.json"), "utf8"));
const EXCLUDE = (process.env.KCAP_EXCLUDE || "").split(",").filter(Boolean);
// absolute frame of a layer: position is its anchor point in the parent's coordinates
const frameOf = (layer) => {
  const st = layer.initialState || {};
  const w = st.width || 0, h = st.height || 0;
  const a = st.anchorPoint || { pointX: 0.5, pointY: 0.5 }, p = st.position || { pointX: 0, pointY: 0 };
  return { x: p.pointX - a.pointX * w, y: p.pointY - a.pointY * h, w, h };
};
const slides = header.slideList.map((sid) => {
  const j = JSON.parse(readFileSync(path.join(exportDir, "assets", sid, `${sid}.json`), "utf8"));
  const text = [];
  for (const e of j.events) for (const a of e.accessibility || []) {
    const t = (a.text || "").trim();
    if (t && !text.includes(t)) text.push(t);
  }
  // movie frames from the JSON (the movie effect's base layer), one per asset
  const movies = {};
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    if (o.movie && o.movie.asset && o.baseLayer && !movies[o.movie.asset]) {
      movies[o.movie.asset] = { ...frameOf(o.baseLayer), loopMode: o.movie.loopMode || null };
    }
    Object.values(o).forEach(walk);
  };
  walk(j.events);
  return { sid, assets: new Set(Object.keys(j.assets)), events: j.events.length, text, movies };
});

const chrome = spawn(chromePath, [
  "--headless=new", "--hide-scrollbars", "--allow-file-access-from-files",
  "--autoplay-policy=no-user-gesture-required", "--mute-audio",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDir}`, "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, nextId = 1;
const pending = new Map();
const send = (method, params = {}) => {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => pending.set(id, resolve));
};
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
const key = async (k, code, kc, text) => {
  await send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key: k, code, text, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc });
  if (k === "Enter") await send("Input.dispatchKeyEvent", { type: "char", key: k, code, text: "\r", windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc });
};
const pressRight = () => key("ArrowRight", "ArrowRight", 39);
const jumpTo = async (n) => {
  for (const ch of String(n)) { await key(ch, "Digit" + ch, ch.charCodeAt(0), ch); await sleep(120); }
  await key("Enter", "Enter", 13);
};
const thumb = async () =>
  (await send("Page.captureScreenshot", { format: "jpeg", quality: 60, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 0.12 } })).result.data;

const stateJs = `(() => {
  const stage = document.getElementById("stage");
  const vis = e => e.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const textures = [...stage.querySelectorAll("[id]")].filter(e => /^[0-9A-F]{32}$/.test(e.id) && vis(e)).map(e => e.id);
  // the player keeps the <video> itself hidden and paints its frames into a texture at the same spot,
  // so a clip counts as on screen when its layer (the parent) is visible
  const videos = [...stage.querySelectorAll("video")].filter(v => vis(v.parentElement)).map(v => {
    const r = v.getBoundingClientRect();
    let op = 1; for (let e = v.parentElement; e && e !== document.body; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
    return { src: decodeURIComponent((v.currentSrc || v.src).split("/").pop()), x: r.x, y: r.y, w: r.width, h: r.height, loop: v.loop, opacity: op };
  }).filter(v => v.w > 2 && v.h > 2 && v.opacity > 0.05);
  return { textures: [...new Set(textures)].sort(), videos };
})()`;

// wait until the screen stops changing (fixed wait while a video is visible)
async function settle(minMs = 500, maxMs = 6000) {
  await sleep(minMs);
  let st = await evaluate(stateJs);
  if (st.videos.length) { await sleep(2500); return evaluate(stateJs); }
  let prev = await thumb();
  for (let t = 0; t < maxMs / 250; t++) {
    await sleep(250);
    const cur = await thumb();
    if (cur === prev) break;
    prev = cur;
  }
  return evaluate(stateJs);
}
const belongs = (st, i) => st.textures.length > 0 && st.textures.every((id) => slides[i].assets.has(id));

const manifest = { title: header.title, slideCount: slides.length, slides: slides.map((s) => ({ text: s.text, events: s.events, movies: s.movies })), stops: [], warnings: [] };
try {
  let targets;
  for (let i = 0; i < 60; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); break; }
    catch { await sleep(200); }
  }
  ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: DPR, mobile: false });
  await send("Page.navigate", { url: pathToFileURL(path.join(exportDir, "index.html")).href });
  await sleep(7000);
  await evaluate(`(() => { const s = document.createElement("style"); s.textContent = "#slideshowNavigator,#slideNumberControl,#slideNumberDisplay,#helpPlacard,#waitingIndicator{display:none!important}"; document.head.appendChild(s); })()`);

  for (let i = 0; i < slides.length; i++) {
    if (ONLY && !ONLY.has(i + 1)) continue;
    // jump to slide i+1 and wait until its textures are what is visible
    let st;
    await jumpTo(i + 1);
    for (let t = 0; t < 60; t++) {
      await sleep(250);
      st = await evaluate(stateJs);
      if (belongs(st, i) || (slides[i].assets.size === 0 && !st.textures.length)) break;
    }
    st = await settle(1500);
    if (!belongs(st, i)) manifest.warnings.push(`slide ${i + 1}: after the jump the visible textures are not all from this slide (${st.textures.map(t => t.slice(0, 4)).join(",")})`);
    const stages = [];
    const capture = async (s) => {
      const name = `s${String(i + 1).padStart(2, "0")}-${String(stages.length + 1).padStart(2, "0")}`;
      // hide the still frames the player paints where a clip sits, so the deck can lay the real clip there
      const present = new Set(s.videos.map((v) => v.src.replace(/\.[^.]+$/, "")));
      const frames = Object.entries(slides[i].movies).filter(([k]) => present.has(k) && !EXCLUDE.some((x) => k.includes(x))).map(([, f]) => f);
      if (frames.length) {
        await evaluate(`(() => { const frames = ${JSON.stringify(frames)};
          for (const e of document.getElementById("stage").querySelectorAll("[id], video")) {
            if (e.tagName !== "VIDEO" && !/^[0-9A-F]{32}$/.test(e.id)) continue;
            const r = e.getBoundingClientRect();
            if (frames.some(f => Math.abs(r.x - f.x) < 3 && Math.abs(r.y - f.y) < 3 && Math.abs(r.width - f.w) < 6 && Math.abs(r.height - f.h) < 6)) e.dataset.kcapHidden = e.style.visibility || "-", e.style.visibility = "hidden";
          } })()`);
        await sleep(150);
      }
      const shot = await send("Page.captureScreenshot", { format: "png" });
      if (frames.length) {
        await evaluate(`document.querySelectorAll("[data-kcap-hidden]").forEach(e => { e.style.visibility = e.dataset.kcapHidden === "-" ? "" : e.dataset.kcapHidden; delete e.dataset.kcapHidden; })`);
      }
      writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(shot.result.data, "base64"));
      stages.push({ slide: i + 1, stage: stages.length + 1, file: `${name}.png`, textures: s.textures, videos: s.videos });
      console.log(`${name} textures=${s.textures.length} videos=${s.videos.length}`);
    };
    await capture(st);
    const signature = (s) => s.textures.join(",") + "|" + s.videos.map((v) => v.src).join(",");
    let lastSig = signature(st), unchanged = 0;
    for (let press = 0; press < 60; press++) {
      const before = await thumb();
      await pressRight();
      // the player can lag while it renders textures: wait for the press to take visible effect
      let changed = false;
      for (let t = 0; t < 30; t++) {
        await sleep(200);
        if ((await thumb()) !== before) { changed = true; break; }
      }
      const next = changed ? await settle(300) : await evaluate(stateJs);
      const leftSlide = next.textures.length > 0 && !belongs(next, i);
      if (process.env.KCAP_DEBUG) console.log(`  press ${press}: changed=${changed} ${next.textures.map(t => t.slice(0, 4)).join(",")}${leftSlide ? " foreign=" + next.textures.filter(t => !slides[i].assets.has(t)).map(t => t.slice(0, 4)).join(",") : ""}`);
      if (leftSlide) break;                       // textures of another slide: this slide is done
      if (!next.textures.length) break;           // black end-of-show screen
      if (!changed) { if (++unchanged >= 2) break; continue; }
      unchanged = 0;
      // on video slides every frame differs; only keep stops whose layers actually changed
      if (next.videos.length && signature(next) === lastSig) continue;
      lastSig = signature(next);
      await capture(next);
    }
    manifest.stops.push(...stages);
  }
  writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1));
  console.log(`done: ${manifest.stops.length} stops, ${manifest.warnings.length} warnings ${JSON.stringify(manifest.warnings)}`);
} finally {
  ws?.close();
  chrome.kill();
}
