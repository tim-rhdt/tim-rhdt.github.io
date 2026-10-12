"""Builds a reveal.js deck (talks/<slug>/) from a capture: one full-slide image per build step, plus clips.

Captures come from kcap.mjs (Keynote HTML export) or pdf2cap.py (PDF export). See README.md.
"""
import argparse
import html
import json
import os
import re
import shutil
import struct
import subprocess
import tempfile


def numbers(spec):
    out = set()
    for part in filter(None, (p.strip() for p in spec.split(","))):
        if "-" in part:
            a, b = part.split("-")
            out.update(range(int(a), int(b) + 1))
        else:
            out.add(int(part))
    return out


ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("--cap", required=True, help="capture dir with manifest.json")
ap.add_argument("--export", help="Keynote HTML export the capture was made from (clip files, loop settings)")
ap.add_argument("--repo", required=True, help="website repository")
ap.add_argument("--slug", required=True, help="deck folder name under talks/")
ap.add_argument("--title", required=True)
ap.add_argument("--event", required=True)
ap.add_argument("--date", required=True)
ap.add_argument("--reveal", help="unpacked reveal.js npm package (only needed while talks/reveal/ is missing)")
ap.add_argument("--quality", type=int, default=80, help="WebP quality")
ap.add_argument("--exclude-video", action="append", default=[], help="part of a clip name to leave out (its still frame stays)")
ap.add_argument("--drop", action="append", default=[], help="capture file to leave out, e.g. s01-01.png")
ap.add_argument("--use-frame", action="append", default=[], help="N=FILE: show slide N as this one still capture")
ap.add_argument("--remove-slides", default="", help="slides to leave out, e.g. 11-21,30")
ap.add_argument("--blank", action="append", default=[], help="N:x,y,w,h: paint this box (1920x1080 coordinates) white on slide N")
ap.add_argument("--note", action="append", default=[], help="N:x,y,w:text: small grey note on slide N (1920x1080 coordinates)")
ap.add_argument("--insert-title", action="append", default=[], help="N:text: insert a plain title slide before slide N")
args = ap.parse_args()

manifest = json.load(open(os.path.join(args.cap, "manifest.json"), encoding="utf-8"))
talks = os.path.join(args.repo, "talks")
deck = os.path.join(talks, args.slug)
slides_dir = os.path.join(deck, "slides")
media_dir = os.path.join(talks, "media")
if os.path.exists(slides_dir):
    shutil.rmtree(slides_dir)
os.makedirs(slides_dir)
os.makedirs(media_dir, exist_ok=True)

# reveal.js, shared by all decks
rv = os.path.join(talks, "reveal")
if not os.path.exists(os.path.join(rv, "reveal.js")):
    if not args.reveal:
        raise SystemExit("talks/reveal/ is missing: pass --reveal with an unpacked reveal.js package")
    os.makedirs(rv, exist_ok=True)
    for f in ("dist/reveal.js", "dist/reveal.css", "LICENSE"):
        shutil.copy(os.path.join(args.reveal, f), os.path.join(rv, os.path.basename(f)))

# loop behaviour of every clip, from the Keynote JSON
loop_modes = {}
if args.export:
    header = json.load(open(os.path.join(args.export, "assets/header.json"), encoding="utf-8"))
    for sid in header["slideList"]:
        j = json.load(open(os.path.join(args.export, "assets", sid, f"{sid}.json"), encoding="utf-8"))

        def walk(o):
            if isinstance(o, dict):
                m = o.get("movie")
                if isinstance(m, dict) and "asset" in m:
                    loop_modes[m["asset"]] = m.get("loopMode")
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(j["events"])


def movie_key(src):
    # "Clip Forces 2.mov-0.0000-2.7322.mov" -> asset key "Clip Forces 2.mov-0.0000-2.7322"
    return os.path.splitext(src)[0]


def slugify(src):
    base = re.sub(r"\.(mov|mp4|m4v)-[\d.]+-[\d.]+\.(mov|mp4|m4v)$", "", src)
    return re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")


def find_source(src):
    for root, _, files in os.walk(os.path.join(args.export, "assets")):
        if src in files:
            return os.path.join(root, src)
    return None


def transcode(src, mode):
    out_name = slugify(src) + (".pingpong" if mode == "loopBackAndForth" else "") + ".mp4"
    out = os.path.join(media_dir, out_name)
    if os.path.exists(out):
        return out_name
    path = find_source(src) if args.export else None
    if not path:
        raise SystemExit(f"clip source not found: {src}")
    if mode == "loopBackAndForth":
        # bake the forward-then-backward loop into the file (at most 900px high, 20 fps)
        vf = "fps=20,scale=-2:'min(900,ih)':flags=lanczos,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0"
        cmd = ["ffmpeg", "-v", "error", "-y", "-i", path, "-filter_complex", vf, "-crf", "30"]
    else:
        cmd = ["ffmpeg", "-v", "error", "-y", "-i", path, "-vf", "scale='min(1280,iw)':-2:flags=lanczos", "-crf", "27"]
    cmd += ["-an", "-c:v", "libx264", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    return out_name


def clean_text(t):
    t = t.replace("￼", "…").replace(" ", " ")
    return re.sub(r"\s+", " ", t).strip()


def png_width(path):
    with open(path, "rb") as f:
        return struct.unpack(">I", f.read(24)[16:20])[0]


SMALL_W, SMALL_H = 320, 180
_small = {}


def small_gray(file):
    if file not in _small:
        _small[file] = subprocess.run(
            ["ffmpeg", "-v", "error", "-i", os.path.join(args.cap, file),
             "-vf", f"scale={SMALL_W}:{SMALL_H}:flags=area,format=gray", "-f", "rawvideo", "-"],
            capture_output=True, check=True).stdout
    return _small[file]


def differs_only_inside(file_a, file_b, rects):
    """True if two captures match outside the given 1920x1080 rects and (if rects are given) differ inside."""
    ga, gb = small_gray(file_a), small_gray(file_b)
    inside = bytearray(SMALL_W * SMALL_H)
    for r in rects:
        x0 = max(0, int(r["x"] / 1920 * SMALL_W) - 1)
        x1 = min(SMALL_W, int((r["x"] + r["w"]) / 1920 * SMALL_W) + 2)
        y0 = max(0, int(r["y"] / 1080 * SMALL_H) - 1)
        y1 = min(SMALL_H, int((r["y"] + r["h"]) / 1080 * SMALL_H) + 2)
        for y in range(y0, y1):
            inside[y * SMALL_W + x0:y * SMALL_W + x1] = b"\x01" * (x1 - x0)
    out_max = in_max = 0
    for i in range(SMALL_W * SMALL_H):
        d = abs(ga[i] - gb[i])
        if inside[i]:
            in_max = max(in_max, d)
        else:
            out_max = max(out_max, d)
    return out_max <= 12 and (in_max > 40 if rects else True)


def per_slide(options):
    out = {}
    for o in options:
        n, rest = o.split(":", 1)
        out.setdefault(int(n), []).append(rest)
    return out


blanks, notes, titles = per_slide(args.blank), per_slide(args.note), per_slide(args.insert_title)
removed = numbers(args.remove_slides)
use_frame = {int(k): v for k, v in (x.split("=", 1) for x in args.use_frame)}

# group the capture by slide and clean it up
by_slide = {}
for s in manifest["stops"]:
    by_slide.setdefault(s["slide"], []).append(s)
dropped = []
for n, stages in by_slide.items():
    # a trailing capture showing one texture that was not on the slide before is the next slide's transition frame
    if len(stages) >= 2:
        last = stages[-1]
        seen = {t for s in stages[:-1] for t in s["textures"]}
        if len(last["textures"]) == 1 and last["textures"][0] not in seen and not last["videos"]:
            dropped.append(last["file"])
            stages.pop()
    stages[:] = [s for s in stages if s["file"] not in args.drop]
    movies = manifest["slides"][n - 1].get("movies") or {}
    k = 0
    while k + 1 < len(stages):
        a, b = stages[k], stages[k + 1]
        rects = [movies.get(movie_key(v["src"])) or v for v in b["videos"]]
        if not a["videos"] and b["videos"] and differs_only_inside(a["file"], b["file"], rects):
            dropped.append(stages.pop(k)["file"])   # the moment before the clip starts (still frame, no clip)
        elif differs_only_inside(a["file"], b["file"], []):
            dropped.append(stages.pop(k)["file"])   # no visible change at all
        else:
            k += 1
# slides the player cannot stop on (auto-advancing) are shown as one still, e.g. their transition frame
for n, file in use_frame.items():
    by_slide[n] = [{"slide": n, "stage": 1, "file": file, "textures": [], "videos": []}]

tmp = tempfile.mkdtemp()
sections, image_count, video_files = [], 0, set()
for n in sorted(by_slide):
    if n in removed:
        continue
    for text in titles.get(n, []):
        sections.append(
            f'      <section aria-label="{html.escape(text)}">\n'
            f'        <div class="stage"><h2 class="divider">{html.escape(text)}</h2></div>\n'
            "      </section>")
    stages = by_slide[n]
    parts = []
    for k, s in enumerate(stages, start=1):
        src = os.path.join(args.cap, s["file"])
        if n in blanks:
            scale = png_width(src) / 1920
            boxes = []
            for b in blanks[n]:
                x, y, w, h = (float(v) * scale for v in b.split(","))
                boxes.append(f"drawbox=x={x:.0f}:y={y:.0f}:w={w:.0f}:h={h:.0f}:color=white:t=fill")
            blanked = os.path.join(tmp, f"{n}-{k}.png")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", ",".join(boxes), blanked], check=True)
            src = blanked
        name = f"s{n:02d}-{k}.webp"
        subprocess.run(["cwebp", "-quiet", "-q", str(args.quality), "-m", "6", "-sharp_yuv", "-mt",
                        src, "-o", os.path.join(slides_dir, name)], check=True)
        image_count += 1
        frag = "" if k == 1 else f' class="fragment" data-fragment-index="{k - 2}"'
        parts.append(f'<img{frag} data-src="slides/{name}" alt="">')
    # clips: first build step that shows each clip; position from the Keynote JSON when known
    movies = manifest["slides"][n - 1].get("movies") or {}
    clips = {}
    for k, s in enumerate(stages, start=1):
        for v in s["videos"]:
            if not any(x in v["src"] for x in args.exclude_video):
                clips.setdefault(v["src"], {"first": k, "rect": v})
    for src, c in clips.items():
        mode = loop_modes.get(movie_key(src))
        file = transcode(src, mode)
        video_files.add(file)
        r = movies.get(movie_key(src)) or c["rect"]
        style = (f'left:{r["x"] / 19.2:.3f}%;top:{r["y"] / 10.8:.3f}%;'
                 f'width:{r["w"] / 19.2:.3f}%;height:{r["h"] / 10.8:.3f}%')
        loop = " loop" if mode in ("looping", "loopBackAndForth") else ""
        frag = "" if c["first"] == 1 else f' class="fragment" data-fragment-index="{c["first"] - 2}"'
        # a clip keeps playing through later builds (the Keynote player swaps in a still, Keynote does not)
        parts.append(f'<video{frag} data-src="../media/{file}" style="{style}" muted playsinline data-autoplay{loop}></video>')
    for note in notes.get(n, []):
        pos, text = note.split(":", 1)
        x, y, w = (float(v) for v in pos.split(","))
        parts.append(f'<p class="note" style="left:{x / 19.2:.3f}%;top:{y / 10.8:.3f}%;width:{w / 19.2:.3f}%">{html.escape(text)}</p>')
    texts = [clean_text(t) for t in manifest["slides"][n - 1]["text"]]
    texts = [t for t in texts if t and t != "…" and not re.search(r"\.(png|jpe?g|gif|pdf|mov|mp4|m4v|tiff?)$", t, re.I)]
    sr = "\n".join(f"          <p>{html.escape(t)}</p>" for t in texts)
    sections.append(
        f'      <section aria-label="Slide {n}">\n'
        '        <div class="stage">\n' + "\n".join("          " + p for p in parts) + "\n        </div>\n"
        + (f'        <div class="sr-only">\n{sr}\n        </div>\n' if sr else "")
        + "      </section>")
shutil.rmtree(tmp)

title = html.escape(args.title)
desc = html.escape(f"Slides of the talk “{args.title}” by Tim Reinhardt ({args.event}, {args.date}).")
page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="{desc}">
  <link rel="stylesheet" href="../reveal/reveal.css">
  <style>
    @font-face {{
      font-family: "IBM Plex Mono";
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url("../../assets/fonts/ibm-plex-mono-latin.woff2") format("woff2");
    }}

    @font-face {{
      font-family: "IBM Plex Mono";
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url("../../assets/fonts/ibm-plex-mono-arrows.woff2") format("woff2");
      unicode-range: U+2190-2199;
    }}

    html, body, .reveal-viewport {{ background: #161718; }}

    .reveal .controls,
    .reveal .progress {{ color: #fff; }}

    .reveal .slides section {{ padding: 0; }}

    /* every build step is a full-slide image; later steps are fragments stacked on top */
    .stage {{
      position: relative;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      background: #fff;
    }}

    .stage img {{
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
    }}

    /* builds appear at once, as Keynote's "appear" builds do */
    .reveal .slides .stage .fragment {{ transition: none; }}

    /* clips sit where Keynote had them; the still underneath is cut out of the step images,
       and multiply keeps whatever Keynote drew on top of a clip (the clips have white backgrounds) */
    .stage video {{
      position: absolute;
      margin: 0;
      object-fit: fill;
      mix-blend-mode: multiply;
    }}

    .stage .note {{
      position: absolute;
      margin: 0;
      font: 28px/1.4 "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: #8a8a8a;
      text-align: center;
    }}

    .stage .divider {{
      position: absolute;
      left: 100px;
      top: 50%;
      margin: 0;
      transform: translateY(-50%);
      font: 700 80px/1.1 "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: #000;
      text-transform: none;
    }}

    .reveal .slide-number,
    .home {{
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 12px;
      line-height: 1;
      color: #fff;
      background: rgba(0, 0, 0, 0.4);
      padding: 5px 6px;
    }}

    .home {{
      position: fixed;
      left: 8px;
      bottom: 8px;
      z-index: 40;
      text-decoration: none;
      opacity: 0.75;
      transition: opacity 0.2s ease;
    }}

    .home:hover,
    .home:focus-visible {{ opacity: 1; }}

    .sr-only {{
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }}
  </style>
</head>

<body>
  <a class="home" href="../../#talks">← Tim Reinhardt</a>

  <div class="reveal">
    <div class="slides">
{chr(10).join(sections)}
    </div>
  </div>

  <script src="../reveal/reveal.js"></script>
  <script>
    Reveal.initialize({{
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
      viewDistance: 3,
      mobileViewDistance: 2,
    }});

    // clips that appear with a build start from the beginning when they appear
    Reveal.on("fragmentshown", function (event) {{
      event.fragments.forEach(function (fragment) {{
        var videos = fragment.tagName === "VIDEO" ? [fragment] : fragment.querySelectorAll("video");
        Array.prototype.forEach.call(videos, function (video) {{
          video.currentTime = 0;
          video.play().catch(function () {{}});
        }});
      }});
    }});
  </script>
</body>
</html>
"""
open(os.path.join(deck, "index.html"), "w", encoding="utf-8").write(page)

size = sum(os.path.getsize(os.path.join(slides_dir, f)) for f in os.listdir(slides_dir))
print(f"{args.slug}: {len(sections)} slides, {image_count} images ({size / 1e6:.1f} MB), clips: {sorted(video_files)}")
print(f"left out: {sorted(dropped)}; removed slides: {sorted(removed)}")
