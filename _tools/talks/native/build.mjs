// Builds a native reveal.js talk page from a slide source (see dgs.src.html):
// every text line sits on the baseline taken from the Keynote/PDF slide, and TeX in \( … \) is rendered
// to SVG with MathJax + STIX2 at build time, so readers download no math library and no math fonts.
//
// node build.mjs <deck.src.html> <website repo>
import MathJax from "@mathjax/src/bundle/node-main.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const [, , srcPath, repo] = process.argv;
const src = readFileSync(srcPath, "utf8");
const meta = JSON.parse(src.match(/<!--\s*deck\s*(\{[\s\S]*?\})\s*-->/)[1]);

await MathJax.init({
  loader: { load: ["input/tex", "output/svg"], paths: { "mathjax-stix2": "@mathjax/mathjax-stix2-font" } },
  tex: { packages: { "[+]": ["ams"] } },
  output: { font: "mathjax-stix2", linebreaks: { inline: false } },
  svg: { fontCache: "local" },
});
const adaptor = MathJax.startup.adaptor;

// Line classes: font and size. K = baseline offset / font size of a line box with line-height 2
// (measured in Chrome), so a line whose baseline is at y gets top = y − K·size.
const K = { slab: 1.39, inter: 1.36, mono: 1.37, hn: 1.37, cn: 1.266 };
// hn/cn: Helvetica Neue and Courier New, which Apple devices (and Windows, for Courier New) have installed;
// elsewhere Inter / IBM Plex Mono stand in, scaled to the same widths and baseline (see @font-face below)
const FAMILY = { slab: '"Roboto Slab", serif', inter: "Inter, sans-serif", mono: '"IBM Plex Mono", monospace',
  hn: '"Helvetica Neue", "HN Fallback", sans-serif', cn: '"Courier New", "CN Fallback", monospace' };
// A deck can define its own classes in its JSON header: "styles": { "name": [family, size, weight, italic, tracking (em)] }.
// Without them the classes of the first deck (dgs.src.html) apply; their CSS is written out in full below.
const STYLES = meta.styles || {
  xl: ["slab", 120], title: ["slab", 95], sub: ["slab", 55], author: ["slab", 33],
  h: ["inter", 35], b: ["inter", 35], s: ["inter", 30], c: ["mono", 30], brace: ["inter", 220],
};
const styleCss = meta.styles
  ? Object.entries(meta.styles).map(([name, [family, size, weight = 400, italic = false, tracking = 0]]) =>
      `.${name} { font-family: ${FAMILY[family]}; font-size: ${size ? `${size}px` : "var(--m)"}; font-weight: ${weight};` +
      `${italic ? " font-style: italic;" : ""}${tracking ? ` letter-spacing: ${tracking}em;` : ""} }`).join("\n")
  : null;
// STIX Two (MathJax) draws its glyphs about 6 % larger than Keynote's STIX General at the same font size
const MATH_SCALE = meta.mathScale ?? 0.94;
const DOT = 8; // bullet diameter; its centre sits 0.33 em above the baseline

let texErrors = 0;
async function tex(t) {
  const node = await MathJax.tex2svgPromise(t, { display: false, em: 16, ex: 8 });
  const err = adaptor.serializeXML(node).match(/data-mjx-error="([^"]*)"/);
  if (err) { console.error(`TeX error: ${err[1]}\n  in: ${t}`); texErrors++; }
  // MathJax sizes the SVG in ex with 1ex = 0.5em; use em so the formula scales with its own font size
  const svg = adaptor.serializeXML(node).replace(/(-?\d*\.?\d+)ex\b/g, (_, n) => `${+(Number(n) / 2).toFixed(4)}em`);
  // the SVG has role="img"; give screen readers the TeX source as its text
  const label = t.replace(/^\s*\\displaystyle\s*/, "").trim().replace(/\s+/g, " ").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  // the formula sits in a zero-height box on the baseline, so tall formulas (∑ with limits, fractions)
  // do not enlarge the line box and move the baseline; the SVG hangs from that box by its depth
  const width = (svg.match(/<svg[^>]*\swidth="([-\d.]+)em"/) || [, "0"])[1];
  const depth = (svg.match(/<svg[^>]*style="vertical-align:\s*(-?[\d.]+)(?:em)?;?/) || [, "0"])[1];
  const placed = svg.replace(/(<svg[^>]*?)style="vertical-align:\s*-?[\d.]+(?:em)?;?\s*/, `$1style="bottom: ${depth}em; `)
    .replace("<svg ", `<svg aria-label="${label}" `);
  return `<span class="m" style="width:${width}em">${placed}</span>`;
}

let body = src.replace(/<!--[\s\S]*?-->\s*/g, "");
// 1. TeX → SVG
const parts = body.split(/\\\(([\s\S]*?)\\\)/);
let out = "";
for (let i = 0; i < parts.length; i++) out += i % 2 ? await tex(parts[i]) : parts[i];
body = out;
// 1b. formula labels (class eq with data-kw = their width in Keynote): TeX spacing is wider than Keynote's,
//     so a label is set up to 12 % smaller where it would otherwise run into the figure around it
body = body.replace(/<p class="ln eq([^"]*)"([^>]*?)\sdata-kw="([\d.]+)"([^>]*)>([\s\S]*?)<\/p>/g, (m, cls, a1, kw, a2, inner) => {
  let attrs = a1 + a2;
  const mm = attrs.match(/\sdata-m="([\d.]+)"/);
  const wem = [...inner.matchAll(/<span class="m" style="width:([\d.]+)em">/g)].reduce((a, x) => a + Number(x[1]), 0);
  if (mm && wem) {
    const fit = Math.min(1, Math.max(0.88, Number(kw) / (wem * Number(mm[1]) * MATH_SCALE)));
    attrs = attrs.replace(/\sdata-m="[\d.]+"/, ` data-m="${+(Number(mm[1]) * fit).toFixed(2)}"`);
  }
  return `<p class="ln eq${cls}"${attrs}>${inner}</p>`;
});
// 2. place lines on their baselines; data-dot adds a bullet at that x
// data-m sets the size of the formulas in that line (default: the class sizes below)
body = body.replace(/<([a-z][a-z0-9]*)\b([^>]*?)\sdata-x="(-?[\d.]+)"\s+data-y="(-?[\d.]+)"([^>]*)>/g, (m, tag, before, x, y, after) => {
  const attrs = before + after;
  const cls = (attrs.match(/class="([^"]*)"/) || [, ""])[1].split(/\s+/).find((c) => STYLES[c]);
  if (!cls) throw new Error(`line without a style class: ${m}`);
  const msize = attrs.match(/\sdata-m="([\d.]+)"/);
  // a class with size 0 (formula-only lines) takes the formula size
  const [font, csize] = STYLES[cls], size = csize || Number(msize && msize[1]);
  if (!size) throw new Error(`line without a size: ${m}`);
  const top = +(Number(y) - K[font] * size).toFixed(2);
  const dot = attrs.match(/\sdata-dot="([\d.]+)"/);
  const clean = attrs.replace(/\sdata-dot="[\d.]+"/, "").replace(/\sdata-m="[\d.]+"/, "");
  const pos = `left:${x}px;top:${top}px;${msize ? `--m:${msize[1]}px;` : ""}`;
  const styled = clean.includes('style="')
    ? clean.replace(/style="/, `style="${pos}`)
    : `${clean} style="${pos.replace(/;$/, "")}"`;
  const bullet = dot
    ? `<i class="dot" style="left:${dot[1]}px;top:${+(Number(y) - 0.33 * size - DOT / 2).toFixed(2)}px"></i>`
    : "";
  return `${bullet}<${tag}${styled}>`;
});
// 3. scripts written in the source run after reveal.js is set up
const scripts = [];
body = body.replace(/<script>([\s\S]*?)<\/script>\s*/g, (m, code) => { scripts.push(code.trim()); return ""; });

const mathCss = adaptor.textContent(MathJax.svgStylesheet());
// Inter in place of Helvetica Neue: size-adjust per weight matches the line lengths, the overrides the baseline
const fallbackFaces = [[100, 349, 91.7], [350, 549, 94.4], [550, 900, 97.6]].flatMap(([w0, w1, adj]) =>
  [["normal", "inter-latin"], ["italic", "inter-italic-latin"]].map(([style, file]) =>
    `    @font-face { font-family: "HN Fallback"; font-style: ${style}; font-weight: ${w0} ${w1}; size-adjust: ${adj}%; ascent-override: 95.2%; descent-override: 21.3%; line-gap-override: 0%; src: url("../../assets/fonts/${file}.woff2") format("woff2"); }`))
  .concat(`    @font-face { font-family: "CN Fallback"; ascent-override: 83.25%; descent-override: 30.03%; line-gap-override: 0%; src: url("../../assets/fonts/ibm-plex-mono-latin.woff2") format("woff2"); }`)
  .join("\n") + "\n";
const typography = styleCss
  ? `${styleCss.replace(/^/gm, "    ")}
    .ln b { font-weight: 700; }
    .ln i { font-style: italic; }
    .up { font-style: normal; }
    .ln u { text-decoration-thickness: 0.05em; text-underline-offset: 0.12em; }
    .ln code { font-family: "IBM Plex Mono", monospace; }
    .w300 { font-weight: 300; } .w400 { font-weight: 400; } .w500 { font-weight: 500; }
    .m { font-size: calc(var(--m, 1.22em) * ${MATH_SCALE}); line-height: 0; }
    .m { position: relative; display: inline-block; height: 0; vertical-align: baseline; }
    /* only the formula's own SVG: MathJax nests further SVGs (stretched lines, braces) that must keep clipping */
    .m > mjx-container > svg { position: absolute; left: 0; overflow: visible; }`
  : `    .xl, .title, .sub, .author { font-family: "Roboto Slab", serif; font-weight: 100; }
    /* letter-spacing: measured against the Keynote fonts so line lengths (and inline formulas) line up */
    .xl { font-size: 120px; letter-spacing: -0.012em; }
    .title { font-size: 95px; letter-spacing: -0.01em; }
    .sub { font-size: 55px; letter-spacing: -0.01em; }
    .author { font-size: 33px; font-weight: 250; }
    /* Inter stands in for Graphik; cv11 gives the single-storey a used on the slides */
    .h, .b, .s, .brace { font-family: Inter, sans-serif; font-weight: 250; font-feature-settings: "cv11"; }
    .h { font-size: 35px; font-weight: 700; letter-spacing: 0.007em; }
    .b { font-size: 35px; letter-spacing: -0.006em; }
    .s { font-size: 30px; letter-spacing: -0.006em; }
    .ln b { letter-spacing: 0.007em; }
    .brace { font-size: 220px; font-weight: 200; }
    .c, .ln code { font-family: "IBM Plex Mono", monospace; font-size: 30px; font-weight: 400; }
    .ln b { font-weight: 700; }
    .ln em { font-style: italic; font-weight: 600; }
    .gray { color: #929292; }
    .dot { position: absolute; width: ${DOT}px; height: ${DOT}px; border-radius: 50%; background: #000; }
    .dot.gray { background: #929292; }
    /* formulas are set slightly larger than the text, as in Keynote; line-height 0 keeps the
       larger font from enlarging the line box (which would move the baseline) */
    .m { font-size: ${+(43 * MATH_SCALE).toFixed(2)}px; line-height: 0; }
    .s .m { font-size: ${+(37 * MATH_SCALE).toFixed(2)}px; }
    .c .m, .ln code .m { font-size: ${+(36 * MATH_SCALE).toFixed(2)}px; }
    .sub .m { font-size: ${+(55 * MATH_SCALE).toFixed(2)}px; }`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(meta.title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${esc(`Slides of the talk “${meta.title}” by Tim Reinhardt (${meta.event}, ${meta.date}).`)}">
  <link rel="stylesheet" href="../reveal/reveal.css">
  <style>
    @font-face { font-family: "Roboto Slab"; font-weight: 100 900; font-display: swap; src: url("../../assets/fonts/roboto-slab-latin.woff2") format("woff2"); }
    @font-face { font-family: "Inter"; font-weight: 100 900; font-display: swap; src: url("../../assets/fonts/inter-latin.woff2") format("woff2"); }
    @font-face { font-family: "Inter"; font-style: italic; font-weight: 100 900; font-display: swap; src: url("../../assets/fonts/inter-italic-latin.woff2") format("woff2"); }
    @font-face { font-family: "IBM Plex Mono"; font-weight: 400; font-display: swap; src: url("../../assets/fonts/ibm-plex-mono-latin.woff2") format("woff2"); }
    @font-face { font-family: "IBM Plex Mono"; font-weight: 400; font-display: swap; src: url("../../assets/fonts/ibm-plex-mono-arrows.woff2") format("woff2"); unicode-range: U+2190-2199; }
${meta.styles ? fallbackFaces : ""}
    html, body, .reveal-viewport { background: #161718; }
    .reveal .controls, .reveal .progress { color: #fff; }
    .reveal .slides section { padding: 0; }
    /* builds appear at once; no compositing layer per build, so the drawing order stays as in Keynote */
    .reveal .slides .stage .fragment { transition: none; will-change: auto; }
    /* opacity builds: visible from the start, dimmed to --dim at their step */
    .reveal .slides section .fragment.dim { opacity: 1; visibility: inherit; }
    .reveal .slides section .fragment.dim.visible { opacity: var(--dim); }

    /* slides are laid out in Keynote's 1920×1080 coordinates */
    .stage { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #fff; color: #000; text-align: left; }
    .ln { position: absolute; margin: 0; white-space: nowrap; line-height: 2; }
    /* figure layers (one SVG per build step) and clips */
    .layer { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; pointer-events: none; }
    .clip { position: absolute; display: block; }
    .raster { position: absolute; display: block; pointer-events: none; }
    iframe.applet { border: 0; background: transparent; }
    iframe.applet:focus { outline: none; }
${typography}
    .m { position: relative; display: inline-block; height: 0; vertical-align: baseline; }
    /* only the formula's own SVG: MathJax nests further SVGs (stretched lines, braces) that must keep clipping */
    .m > mjx-container > svg { position: absolute; left: 0; overflow: visible; }
${mathCss.replace(/^/gm, "    ")}

    .reveal .slide-number, .home {
      font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 12px; line-height: 1;
      color: #fff; background: rgba(0, 0, 0, 0.4); padding: 5px 6px;
    }
    .home { position: fixed; left: 8px; bottom: 8px; z-index: 40; text-decoration: none; opacity: 0.75; transition: opacity 0.2s ease; }
    .home:hover, .home:focus-visible { opacity: 1; }
${(meta.css || "").replace(/^/gm, "    ")}
  </style>
</head>

<body>
  <a class="home" href="../../#talks">← Tim Reinhardt</a>

  <div class="reveal">
    <div class="slides">
${body.trim().replace(/^/gm, "      ")}
    </div>
  </div>

  <script src="../reveal/reveal.js"></script>
  <script>
    Reveal.initialize({
      width: 1920,
      height: 1080,
      margin: 0,
      minScale: 0.05,
      maxScale: 4,
      center: false,
      hash: true,
      slideNumber: "c/t",
      transition: "none",
      backgroundTransition: "none",
    });
  </script>
${body.includes('class="clip applet"') ? `  <script>
    // applets run only while their slide is shown
    function applets(slide, on) {
      if (!slide) return;
      slide.querySelectorAll("iframe.applet").forEach(function (f) {
        if (on && f.getAttribute("src") !== f.dataset.applet) f.setAttribute("src", f.dataset.applet);
        if (!on && f.getAttribute("src") !== "about:blank") f.setAttribute("src", "about:blank");
      });
    }
    Reveal.on("ready", function (e) { applets(e.currentSlide, true); });
    Reveal.on("slidechanged", function (e) { applets(e.previousSlide, false); applets(e.currentSlide, true); });
  </script>
` : ""}${scripts.map((s) => `  <script>\n${s.replace(/^/gm, "    ")}\n  </script>`).join("\n")}
</body>
</html>
`;
const outDir = path.join(repo, "talks", meta.slug);
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "index.html"), page);
console.log(`${meta.slug}: ${(page.length / 1024).toFixed(0)} KB, ${(page.match(/<section/g) || []).length} slides${texErrors ? `, ${texErrors} TeX errors` : ""}`);
