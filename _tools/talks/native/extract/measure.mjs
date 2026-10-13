// Measures the rendered width of every text line of a built deck (for calibrate.py).
// node measure.mjs <chrome> <deck index.html> <out.json>
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const [, , chromePath, deckPath, outFile] = process.argv;
const PORT = 9395;
const profile = mkdtempSync(path.join(tmpdir(), "talk-measure-"));
const chrome = spawn(chromePath, ["--headless=new", "--hide-scrollbars", "--allow-file-access-from-files",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, nextId = 1;
const pending = new Map();
const send = (method, params = {}) => {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => pending.set(id, resolve));
};
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
  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: pathToFileURL(deckPath).href });
  await sleep(2500);
  const script = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "measure2.js"), "utf8");
  await send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => 1)", awaitPromise: true });
  const res = await send("Runtime.evaluate", { expression: script, returnByValue: true, awaitPromise: true });
  writeFileSync(outFile, res.result.result.value);
  console.log("measured", JSON.parse(res.result.result.value).length, "lines");
} finally {
  ws?.close();
  chrome.kill();
}
