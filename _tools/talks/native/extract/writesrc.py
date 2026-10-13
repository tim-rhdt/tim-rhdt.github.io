# Writes the draft slide source (<deck>.src.html) and the figure layers (talks/<slug>/fig/*.svg)
# from the output of extract.py.
#
# python3 writesrc.py <work dir> <deck.json> <out .src.html> <repo>
#   deck.json: {"slug", "title", "event", "date", "slides": {"6": {"videos": [{"src", "rect": [x,y,w,h], "loop": true}]}}}
import sys, os, re, json, html, base64, io, subprocess, collections, hashlib
from PIL import Image

work, deck_path, out_path, repo = sys.argv[1:5]
CALIB = json.load(open(os.path.join(work, "calib.json"))) if os.path.exists(os.path.join(work, "calib.json")) else {}
SLIDE = 0
deck = json.load(open(deck_path))
ex = json.load(open(os.path.join(work, "extract.json")))
figdir = os.path.join(repo, "talks", deck["slug"], "fig")
os.makedirs(figdir, exist_ok=True)

# ------------------------------------------------------------ figure layers: PDF page → SVG, images → WebP
def webp_data(png_bytes):
    im = Image.open(io.BytesIO(png_bytes))
    im.load()
    colors = im.convert("RGBA").getcolors(4096)
    buf = io.BytesIO()
    if colors is not None:           # flat graphics: lossless
        im.save(buf, "WEBP", lossless=True, method=6)
    else:                            # photos, renderings
        im.save(buf, "WEBP", quality=86, method=6)
    data = buf.getvalue()
    if len(data) >= len(png_bytes):
        return "image/png", png_bytes
    return "image/webp", data

def merge_masks(svg):
    """cairo draws a PDF soft mask as an SVG <mask> of a second image; browsers then show a seam at the image
    edges. Merge mask and image into one RGBA image instead."""
    srcs = {m.group(1): m.group(2) for m in re.finditer(r'<image id="(source-\d+)" x="0" y="0" width="\d+" height="\d+" xlink:href="data:image/png;base64,([A-Za-z0-9+/=]+)"/>', svg)}
    for mm in list(re.finditer(r'<mask id="(mask-\d+)"><g filter="url\(#filter-remove-color\)"><use xlink:href="#(source-\d+)" filter="url\(#filter-color-to-alpha\)" transform="([^"]+)"/></g></mask>', svg)):
        mid, xsrc, T = mm.groups()
        use = re.search(r'<g mask="url\(#' + mid + r'\)"><use xlink:href="#(source-\d+)" transform="' + re.escape(T) + r'"/></g>', svg)
        if not use or xsrc not in srcs or use.group(1) not in srcs: continue
        ysrc = use.group(1)
        img = Image.open(io.BytesIO(base64.b64decode(srcs[ysrc]))).convert("RGB")
        alpha = Image.open(io.BytesIO(base64.b64decode(srcs[xsrc]))).convert("L")
        if img.size != alpha.size: alpha = alpha.resize(img.size, Image.LANCZOS)
        img.putalpha(alpha)
        buf = io.BytesIO(); img.save(buf, "PNG")
        data = base64.b64encode(buf.getvalue()).decode()
        svg = svg.replace(srcs[ysrc], data, 1); srcs[ysrc] = data
        svg = svg.replace(use.group(0), f'<use xlink:href="#{ysrc}" transform="{T}"/>', 1)
        svg = svg.replace(mm.group(0), "", 1)
        if svg.count(f'#{xsrc}"') == 0:
            svg = re.sub(r'<image id="' + xsrc + r'" [^>]*/>', "", svg, count=1)
    return svg

def svg_layer(page, name):
    tmp = os.path.join(work, "svg-tmp.svg")
    subprocess.run(["pdftocairo", "-svg", "-f", str(page), "-l", str(page), os.path.join(work, "figures.pdf"), tmp], check=True)
    svg = merge_masks(re.sub(r">\s+<", "><", open(tmp, encoding="utf-8").read()))
    def repl(m):
        mime, data = webp_data(base64.b64decode(m.group(2)))
        return f'{m.group(1)}data:{mime};base64,{base64.b64encode(data).decode()}"'
    svg = re.sub(r'(xlink:href=")data:image/png;base64,([A-Za-z0-9+/=]+)"', repl, svg)
    # cairo writes pt units; the layer is shown at 1920×1080 CSS px anyway
    svg = svg.replace('width="1920pt" height="1080pt"', 'width="1920" height="1080"', 1)
    svg = re.sub(r">\s+<", "><", svg)
    open(os.path.join(figdir, name), "w", encoding="utf-8").write(svg)
    return len(svg)

# ------------------------------------------------------------ text
STY = {}  # class name -> [family, size, weight, italic]
FONTS = {"sans": "inter", "mono": "mono", **deck.get("fonts", {})}

def style_name(kind, weight, italic, size, tracking=0.0):
    fam = FONTS["mono"] if kind == "mono" else FONTS["sans"]
    w = {300: "l", 400: "r", 500: "m", 700: "b", 200: "t"}.get(weight, "r")
    s = ("%g" % round(size, 1)).replace(".", "_")
    tracking = round(tracking * 200) / 200          # steps of 0.005 em
    name = ("c" if kind == "mono" else "") + w + ("i" if italic else "") + s + (f"t{round(-tracking * 1000):g}" if tracking else "")
    STY[name] = [fam, round(size, 2), weight, italic] + ([tracking] if tracking else [])
    return name

LIG = {"ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl"}

def esc(t):
    t = "".join(LIG.get(ch, ch) for ch in t)
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

TEX_SPECIAL = {"{": r"\{", "}": r"\}", "%": r"\%", "#": r"\#", "&": r"\&", "_": r"\_", "$": r"\$", "\\": r"\backslash "}

def math_run_tex(chars):
    """Characters set in the math font outside an equation (labels typed as text) → TeX for MathJax."""
    out = []
    for p in chars:
        ch = p["c"]
        if ch == " ": out.append(r"\ "); continue
        ch = TEX_SPECIAL.get(ch, ch)
        if not p["i"] and ch.isalpha() and len(ch) == 1: ch = r"\mathrm{" + ch + "}"
        out.append(ch)
    return "".join(out)

def line_html(L):
    if L["kind"] == "eq":
        cls = "eq"; base = ("sans", 400, False)
    else:
        tr = CALIB.get(f'{SLIDE},{L["x"]:g},{L["y"]:g}', L.get("tracking", 0.0))
        cls = style_name(L["kind"], L["weight"], L["italic"], L["size"], tr)
        base = (L["kind"], L["weight"], L["italic"])
    lc = L.get("color")
    out = []; run = None; buf = []
    def flush():
        if not buf: return
        kind, w, it, u, col = run
        if kind == "math":
            tex = math_run_tex(buf)
            out.append(r"\(" + (tex if not col or col == lc else "{\\color{%s} %s}" % (col, tex)) + r"\)"); buf.clear(); return
        text = esc("".join(p["c"] for p in buf))
        if u: text = f"<u>{text}</u>"
        if kind == "mono" and base[0] != "mono": text = f"<code>{text}</code>"
        if w != base[1]:
            text = f"<b>{text}</b>" if w == 700 and base[1] < 600 else f'<span class="w{w}">{text}</span>'
        if it and not base[2]: text = f"<i>{text}</i>"
        if not it and base[2]: text = f'<span class="up">{text}</span>'
        if col and col != lc: text = f'<span style="color:{col}">{text}</span>'
        out.append(text); buf.clear()
    texrun = []   # consecutive formula pieces: one formula, pieces in other colours wrapped in \color
    def flush_tex():
        if not texrun: return
        body = " ".join(t if not c or c == lc else "{\\color{%s} %s}" % (c, t) for t, c in texrun)
        out.append(r"\(\displaystyle " + body + r"\)"); texrun.clear()
    for p in L["parts"]:
        if "tex" in p:
            flush(); run = None
            texrun.append((p["tex"], p.get("color")))
            continue
        flush_tex()
        if p.get("sp"):
            flush(); run = None; out.append(" ")
        else:
            key = (p["kind"], p["w"], p["i"], p["u"], p.get("color"))
            if p["c"] == " " and run is not None and run[0] != "math": key = run   # spaces join the current run
            elif p["c"] == " ": key = (base[0], base[1], base[2], False, lc)
            if key != run: flush(); run = key
            buf.append(p)
    flush(); flush_tex()
    inner = "".join(out)
    attrs = f'class="ln {cls}" data-x="{L["x"]:g}" data-y="{L["y"]:g}"'
    msize = L["msize"]
    if "\\(" in inner and not msize:
        msize = round(L["size"] * 1.2, 2)        # math-font labels without an equation: like Keynote's formulas
    if msize and "\\(" in inner: attrs += f' data-m="{msize:g}"'
    if L["kind"] == "eq" and L.get("gw"): attrs += f' data-kw="{L["gw"]:g}"'   # Keynote width: build.mjs fits the label to it
    if lc and lc != DEFAULT_COLOR:
        attrs += f' style="color:{lc}"'
    return f"<p {attrs}>{inner}</p>"

colors = collections.Counter(L.get("color") for sl in ex["slides"] for L in sl["lines"])
DEFAULT_COLOR = colors.most_common(1)[0][0] if colors else None

# ------------------------------------------------------------ slides
def with_build(html_, step, gone):
    """Mark an element as a build: appears at `step`, disappears at `gone` (reveal.js fragments)."""
    if gone is not None:
        html_ = add_class(html_, "fragment fade-out", gone)
    if step:
        html_ = add_class(html_, "fragment", step) if gone is None else f'<div class="fragment" data-fragment-index="{step}">{html_}</div>'
    return html_

def add_class(html_, cls, index):
    m = re.match(r'<(\w+) class="([^"]*)"', html_)
    return html_[:m.start(2)] + m.group(2) + " " + cls + f'" data-fragment-index="{index}' + html_[m.end(2):]

sections = []
total_svg = 0
for sl in ex["slides"]:
    n = sl["n"]; scfg = deck.get("slides", {}).get(str(n), {}); SLIDE = n
    body = []; layer_no = 0
    for it in sl["items"]:
        if "line" in it:
            L = it["line"]
            body.append(with_build(line_html(L), L["step"], L.get("gone")))
        elif "layer" in it:
            name = f"s{n:02d}-{layer_no}.svg"; layer_no += 1
            total_svg += svg_layer(it["layer"], name)
            el = f'<img class="layer" data-src="fig/{name}" alt="">'
            if it.get("dim"):
                k, alpha = it["dim"]       # picture dimmed at build k (Keynote opacity build)
                el = f'<div class="fragment dim" data-fragment-index="{k}" style="--dim:{alpha}">{el}</div>'
                if it["step"]: el = f'<div class="fragment" data-fragment-index="{it["step"]}">{el}</div>'
                body.append(el)
            else:
                body.append(with_build(el, it["step"], it.get("gone")))
        elif "raster" in it:
            x0, y0, x1, y1 = it["rect"]
            name = f"s{n:02d}-r{layer_no}.webp"; layer_no += 1
            Image.open(os.path.join(work, it["raster"])).save(os.path.join(figdir, name), "WEBP", lossless=True, method=6)
            body.append(with_build(f'<img class="raster" data-src="fig/{name}" style="left:{x0}px;top:{y0}px;width:{x1 - x0}px;height:{y1 - y0}px" alt="">', it["step"], None))
        elif "clip" in it:
            v = scfg.get("videos", [])[it["clip"]] if it["clip"] < len(scfg.get("videos", [])) else None
            if v is None: continue
            x, y, w, h = v.get("frame", v["rect"])
            pos = f"left:{x:g}px;top:{y:g}px;width:{w:g}px;height:{h:g}px"
            if v.get("applet"):
                # a live applet in place of the screen recording; loaded while its slide is shown
                el = f'<iframe class="clip applet" data-applet="{v["applet"]}" style="{pos}" title="{esc(v.get("title", "Applet"))}"></iframe>'
            else:
                attrs = f'class="clip" data-src="{v["src"]}" style="{pos}" muted playsinline data-autoplay'
                if v.get("loop", True): attrs += " loop"
                el = f"<video {attrs}></video>"
            body.append(with_build(el, v.get("step", it["step"]), None))
    title = next((L for L in sl["lines"] if L["kind"] == "sans" and L["weight"] == 700 and (L["size"] or 0) >= 60), None)
    label = "".join(p.get("c", " ") for p in title["parts"]).strip() if title else f"Slide {n}"
    sections.append("\n".join([f'<section aria-label="{esc(label)}">', '  <div class="stage">'] + ["    " + e for e in body] + ["  </div>", "</section>"]))

STY["eq"] = [FONTS["sans"], 0, 400, False]
STY.update(deck.get("styles", {}))      # classes used by hand edits ("edits" in deck.json)
meta = {k: deck[k] for k in ("slug", "title", "event", "date")}
css = deck.get("css", "")
if DEFAULT_COLOR and DEFAULT_COLOR != "#000000":
    css = f".stage {{ color: {DEFAULT_COLOR}; }}\n" + css
head = ",\n".join(f'  "{k}": {json.dumps(meta[k], ensure_ascii=False)}' for k in meta)
styles = ",\n".join(f'    "{k}": {json.dumps(STY[k])}' for k in sorted(STY))
src = "<!-- deck {\n" + head + ',\n  "styles": {\n' + styles + "\n  },\n" + f'  "css": {json.dumps(css, ensure_ascii=False)}\n' + "} -->\n"
src += f"<!--\n  Source of talks/{deck['slug']}/ (build: node build.mjs {os.path.basename(out_path)} ../../..).\n" \
       "  Generated from the Keynote file by extract.py/writesrc.py, then edited by hand.\n" \
       "  Lines: class = style (see \"styles\"), data-x / data-y = left edge and baseline in 1920×1080 slide\n" \
       "  coordinates, data-m = size of the formulas in the line. Figures: fig/sNN-K.svg = what appears at build step K.\n-->\n\n"
src += "\n\n".join(sections) + "\n"
# hand edits that survive regeneration: "edits": [[find, replace], ...] in deck.json
for find, repl in deck.get("edits", []):
    if find not in src: print("  EDIT NOT APPLIED (text not found):", find[:80])
    src = src.replace(find, repl)
open(out_path, "w", encoding="utf-8").write(src)
print(f"{out_path}: {len(ex['slides'])} slides, {len(STY)} styles, figure layers {total_svg / 1024:.0f} KB")
