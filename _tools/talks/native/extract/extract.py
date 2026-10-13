# Converts a Keynote PDF export (+ the equation PDFs inside the .key, + build captures of the HTML export)
# into an intermediate description of each slide: text lines on their baselines, TeX formulas,
# and the vector/raster figure content split by build step (figures.pdf, one page per slide and step).
#
# python3 extract.py <work dir> <export.pdf> <capture dir> <slides, e.g. 1-10> [config.json]
#   work dir: eq.json (eqindex.py), ref/p-NN.png (pdftoppm -r 72), txt/pNN.xml (gs txtwrite)
#   config:   {"slides": {"6": {"drop": [[x, y, w, h], ...]}}}  regions whose figure content is left out
#             (video posters, images without rights); everything inside them is dropped
import sys, os, io, re, json, html, math, collections, subprocess
import pikepdf
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pdfscan import scan, eq_block

def parse_range(s):
    out = []
    for part in s.split(","):
        if "-" in part:
            a, b = part.split("-"); out += list(range(int(a), int(b) + 1))
        elif part: out.append(int(part))
    return out

def font_kind(f):
    if "STIX" in f: return "math"
    if "Courier" in f or "Mono" in f or "Menlo" in f: return "mono"
    return "sans"

def font_weight(f):
    if "Bold" in f: return 700
    if "Medium" in f: return 500
    if "Light" in f: return 300
    if "Thin" in f or "UltraLight" in f: return 200
    return 400

def font_italic(f):
    return "Italic" in f or "Oblique" in f

def read_chars(xml_path):
    xml = open(xml_path, encoding="utf-8", errors="replace").read()
    chars = []
    for n, m in enumerate(re.finditer(r'<span bbox="[^"]*" font="([^"]+)" size="([\d.]+)">(.*?)</span>', xml, re.S)):
        font = m.group(1).split("+")[-1]; size = float(m.group(2))
        for c in re.finditer(r'<char bbox="(-?\d+) (-?\d+) (-?\d+) (-?\d+)" c="([^"]*)"/>', m.group(3)):
            chars.append({"c": html.unescape(c.group(5)), "font": font, "size": size, "span": n,
                          "x0": int(c.group(1)), "x1": int(c.group(3)), "y": int(c.group(2))})
    return chars

def norm_seq(glyphs):
    return "".join(g for g in glyphs if g.strip())

class EqIndex:
    def __init__(self, path):
        self.eqs = json.load(open(path))
        self.by_seq = collections.defaultdict(list)
        for name, e in self.eqs.items():
            reg = [g for g in e["glyphs"] if g[0].strip() and re.match(r"STIX(General|Variants)", g[1])]
            e["base"] = max((g[2] for g in reg), default=30.0)
            width = collections.Counter()
            for g in reg:
                if abs(g[2] - e["base"]) < 0.01: width[g[4]] += max(1, g[5] - g[3])
            e["baseline"] = width.most_common(1)[0][0] if width else e["h"] * 0.75
            self.by_seq[norm_seq(g[0] for g in e["glyphs"])].append(name)

    def match(self, seq, w, h):
        cands = self.by_seq.get(seq, [])
        if not cands: return None
        return min(cands, key=lambda n: abs(self.eqs[n]["w"] / max(self.eqs[n]["h"], 1) - w / max(h, 1)))

class Steps:
    """Build step of a region, from the captures of the Keynote HTML export (one PNG per build state)."""
    def __init__(self, capdir, slide, stops):
        stops = [st for st in stops if st["slide"] == slide]
        # the last capture of a slide can be the next slide's transition frame: one texture not seen before
        if len(stops) > 1:
            seen = {t for st in stops[:-1] for t in st["textures"]}
            last = stops[-1]
            if len(last["textures"]) == 1 and last["textures"][0] not in seen and not last["videos"]:
                stops = stops[:-1]
        self.frames = []
        for st in stops:
            im = Image.open(os.path.join(capdir, st["file"])).convert("RGB").resize((1920, 1080), Image.BILINEAR)
            self.frames.append(np.asarray(im, dtype=np.int16))
        self.final = self.frames[-1] if self.frames else None

    def dilated_ink(self, k, x0, y0, x1, y1, r=2):
        C = self.frames[k]
        ya, yb, xa, xb = max(0, y0 - r), min(1080, y1 + r), max(0, x0 - r), min(1920, x1 + r)
        ink = np.abs(C[ya:yb, xa:xb] - 255).max(axis=2) > 24
        d = ink.copy()
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                d[max(0, dy):d.shape[0] + min(0, dy), max(0, dx):d.shape[1] + min(0, dx)] |= \
                    ink[max(0, -dy):ink.shape[0] + min(0, -dy), max(0, -dx):ink.shape[1] + min(0, -dx)]
        return d[y0 - ya:y0 - ya + (y1 - y0), x0 - xa:x0 - xa + (x1 - x0)]

    def vis(self, bbox, ref):
        """Per capture: share of the object's own ink (from ref) that the capture shows."""
        x0, y0, x1, y1 = [int(round(v)) for v in bbox]
        x0, y0 = max(0, x0 - 1), max(0, y0 - 1); x1, y1 = min(1920, x1 + 2), min(1080, y1 + 2)
        if x1 <= x0 or y1 <= y0 or not self.frames: return []
        rink = (np.abs(ref[y0:y1, x0:x1].astype(np.int16) - 255).max(axis=2) > 24)
        if rink.sum() < 3: return []
        return [float(self.dilated_ink(k, x0, y0, x1, y1, 1)[rink].mean()) for k in range(len(self.frames))]

    def region(self, bbox):
        x0, y0, x1, y1 = [int(round(v)) for v in bbox]
        return max(0, x0), max(0, y0), min(1920, x1), min(1080, y1)

    def dim(self, bbox, k0):
        """A picture that is still there but lighter at the end (opacity build): (step, opacity) or None."""
        x0, y0, x1, y1 = self.region(bbox)
        if x1 - x0 < 4 or y1 - y0 < 4 or k0 is None or k0 >= len(self.frames) - 1: return None
        G = [self.frames[k][y0:y1, x0:x1].mean(axis=2) for k in range(len(self.frames))]
        ink = [float((255 - g).mean()) for g in G]
        a, z = ink[k0], ink[-1]
        if a < 8 or z > 0.85 * a: return None
        if np.corrcoef(G[k0].ravel(), G[-1].ravel())[0, 1] < 0.8: return None
        k = next(k for k in range(k0 + 1, len(G)) if ink[k] < (a + z) / 2)
        return k, round(z / a, 2)

    def cover(self, bbox, ref, refnc):
        """A white shape that hides what lies under it: (first, gone) steps in which it is there, None if never."""
        x0, y0, x1, y1 = self.region(bbox)
        if x1 - x0 < 4 or y1 - y0 < 4 or not self.frames: return 0, None
        A = ref[y0:y1, x0:x1].astype(np.int16); B = refnc[y0:y1, x0:x1].astype(np.int16)
        if float(np.abs(A - B).mean()) < 3: return 0, None          # hides nothing (white on white)
        present = [float(np.abs(F[y0:y1, x0:x1] - A).mean()) <= float(np.abs(F[y0:y1, x0:x1] - B).mean()) for F in self.frames]
        if not any(present): return None, None
        a = present.index(True)
        b = next((k for k in range(a + 1, len(present)) if not present[k]), None)
        return a, b

    def step(self, bbox, ref=None, white=False, image=False):
        """(appear, disappear) build steps of a region; disappear is None if it stays; (None, None) if never shown.
        ref: render of the PDF page without white covers, so it shows each object's own ink."""
        if self.final is None or len(self.frames) == 1: return 0, None
        x0, y0, x1, y1 = [int(round(v)) for v in bbox]
        x0, y0 = max(0, x0 - 1), max(0, y0 - 1); x1, y1 = min(1920, x1 + 2), min(1080, y1 + 2)
        if x1 <= x0 or y1 <= y0: return 0, None
        # first capture in which the region looks like it does at the end (captures compare exactly)
        F = self.final[y0:y1, x0:x1]
        ink = (np.abs(F - 255).max(axis=2) > 24)
        if ink.sum() < 3: ink = np.ones(ink.shape, bool)
        k_final = len(self.frames) - 1
        Fg = F.mean(axis=2)
        for k, C in enumerate(self.frames):
            if (np.abs(C[y0:y1, x0:x1] - F).max(axis=2) < 40)[ink].mean() >= 0.85: k_final = k; break
            if image:
                # Keynote fades pictures (opacity builds): the same picture, only lighter, is already there
                G = C[y0:y1, x0:x1].mean(axis=2)
                if Fg.std() > 10 and G.std() > 10 and np.corrcoef(Fg.ravel(), G.ravel())[0, 1] > 0.9: k_final = k; break
        if white or ref is None: return k_final, None
        Rf = ref[y0:y1, x0:x1].astype(np.int16)
        rink = (np.abs(Rf - 255).max(axis=2) > 24)
        if rink.sum() < 3: return k_final, None
        # is the object's own ink there? (capture ink within 1 px; Keynote and poppler rasterise differently)
        vis = [float(self.dilated_ink(k, x0, y0, x1, y1, 1)[rink].mean()) for k in range(len(self.frames))]
        if vis[-1] >= 0.6: return k_final, None
        shown = [k for k, v in enumerate(vis) if v >= 0.8]
        if not shown: return None, None
        a = shown[0]
        return a, next((k for k in range(a + 1, len(vis)) if vis[k] < 0.5), None)

def ink_color(ref, bbox):
    x0, y0, x1, y1 = [int(round(v)) for v in bbox]
    x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(ref.shape[1], x1), min(ref.shape[0], y1)
    if x1 <= x0 or y1 <= y0: return None
    R = ref[y0:y1, x0:x1].reshape(-1, 3).astype(int)
    lum = R.mean(axis=1); sat = R.max(axis=1) - R.min(axis=1)
    ink = R[(lum < 200) | (sat > 60)]
    if len(ink) < 4: return None
    key = ink.mean(axis=1) - (ink.max(axis=1) - ink.min(axis=1))
    sel = ink[np.argsort(key)[: max(3, len(ink) // 3)]]
    return [int(v) for v in np.median(sel, axis=0)]

def hexcolor(fill):
    v = [max(0, min(255, int(round(float(x) * 255)))) for x in (list(fill) * 3)[:3]]
    return "#%02x%02x%02x" % tuple(v)

def snap_color(rgb, palette):
    """Nearest colour actually used for text in the PDF (the sample is blurred by anti-aliasing)."""
    if rgb is None or not palette: return None
    best = min(palette, key=lambda c: sum((a - b) ** 2 for a, b in zip(c, rgb)))
    return "#%02x%02x%02x" % best

COLOR_OPS = {"cs", "CS", "sc", "SC", "scn", "SCN", "g", "G", "rg", "RG", "k", "K", "gs"}

def figure_page(pdf_out, src_page, ops, keep_units, all_units, keep_text=False):
    """Append a copy of src_page whose content keeps only the paint units in keep_units (no text unless keep_text)."""
    keep = set(id(u) for u in keep_units)
    neutral = set(); drop = set()
    for u in all_units:
        if u["kind"] == "text":
            if keep_text: continue
            for j in range(u["i"], u["end"] + 1):
                if str(ops[j][1]) not in COLOR_OPS: drop.add(j)
        elif id(u) not in keep:
            if u["kind"].startswith("path:"): neutral.add(u["i"])
            else: drop.add(u["i"])
    new = []
    for j, (a, op) in enumerate(ops):
        if j in drop or str(op) in ("BDC", "BMC", "EMC"): continue
        new.append(([], pikepdf.Operator("n")) if j in neutral else (a, op))
    pdf_out.pages.append(src_page)
    page = pdf_out.pages[-1]
    page.Contents = pdf_out.make_stream(pikepdf.unparse_content_stream(new))

def inside(bb, r, tol=4):
    """bb lies in the region r (x, y, w, h), or covers most of it (a poster with a larger clip)."""
    x, y, w, h = r
    if bb[0] >= x - tol and bb[1] >= y - tol and bb[2] <= x + w + tol and bb[3] <= y + h + tol: return True
    ov = max(0, min(bb[2], x + w) - max(bb[0], x)) * max(0, min(bb[3], y + h) - max(bb[1], y))
    return ov >= 0.9 * w * h and ov >= 0.5 * (bb[2] - bb[0]) * (bb[3] - bb[1])

def make_eq(e, name, used, rect, z):
    """A formula on the slide: TeX from the .key, size and baseline from its glyphs (they match the equation PDF
    glyph by glyph), colour from the text objects that drew it."""
    x0, y0, x1, y1 = rect
    sg = [c for c in used if c["c"].strip()]
    eg = [g for g in e["glyphs"] if g[0].strip()]
    if len(sg) == len(eg) and sg:
        scale = float(np.median([c["size"] / g[2] for c, g in zip(sg, eg) if g[2] > 0]))
        base_ys = [c["y"] for c, g in zip(sg, eg) if abs(g[4] - e["baseline"]) <= 1 and abs(g[2] - e["base"]) < 0.01]
        baseline = float(np.median(base_ys)) if base_ys else y0 + e["baseline"] * scale
    else:
        scale = (x1 - x0) / e["w"]; baseline = y0 + e["baseline"] * scale
    gx0 = min((c["x0"] for c in sg), default=x0)
    if sg and (x1 - x0) >= 1900:      # page-sized clip: the glyphs tell where the formula is
        x0, x1 = gx0, max(c["x1"] for c in sg)
    if sg and (y1 - y0) >= 1060:
        y0, y1 = baseline - 1.2 * e["base"] * scale, baseline + 0.6 * e["base"] * scale
    if re.match(r"\s*(\\[,;:! >]|\\quad|\\qquad|~)", e["tex"]): gx0 = x0
    colors = collections.Counter(c.get("color") for c in sg if c.get("color"))
    gx1 = max((c["x1"] for c in sg), default=x1)
    return {"rect": [round(v, 1) for v in (x0, y0, x1, y1)], "tex": e["tex"], "name": name, "gx0": gx0, "gx1": gx1, "z": z,
            "size": round(e["base"] * scale, 2), "baseline": round(baseline, 1),
            "color": colors.most_common(1)[0][0] if colors else None}

def build_lines(text_chars, eqs):
    """Group characters and equations into lines: same baseline, no tab-sized gaps."""
    rows = []
    for c in sorted(text_chars, key=lambda c: (c["y"], c["x0"])):
        for r in rows:
            if abs(r["y"] - c["y"]) <= max(3, 0.12 * c["size"]):
                r["items"].append({"t": "c", "x0": c["x0"], "x1": c["x1"], "size": c["size"], "c": c}); break
        else:
            rows.append({"y": c["y"], "items": [{"t": "c", "x0": c["x0"], "x1": c["x1"], "size": c["size"], "c": c}]})
    for e in eqs:
        x0, y0, x1, y1 = e["rect"]; sz = e["size"] / 1.22
        cands = [r for r in rows if y0 - 2 <= r["y"] <= y1 + 2 and
                 any(it["t"] == "c" and it["c"]["c"].strip() and it["x0"] <= x1 + sz and it["x1"] >= x0 - sz for it in r["items"])]
        item = {"t": "e", "x0": x0, "x1": x1, "size": sz, "e": e}
        if cands:
            min(cands, key=lambda r: abs(r["y"] - e["baseline"]))["items"].append(item)
            continue
        # pieces of one formula lie side by side; a label lying on top of another formula is something else
        def overlaps_x(a, b):
            ov = min(a["x1"], b["x1"]) - max(a["x0"], b["x0"])
            return ov > 0.3 * max(1, min(a["x1"] - a["x0"], b["x1"] - b["x0"]))
        same = [r for r in rows if r.get("eqonly") and abs(r["y"] - e["baseline"]) <= max(3, 0.12 * sz)
                and not any(overlaps_x(item, it) for it in r["items"])]
        if same:
            same[0]["items"].append(item)
        else:
            rows.append({"y": e["baseline"], "items": [item], "eqonly": True})
    lines = []
    for r in rows:
        its = sorted(r["items"], key=lambda it: it["x0"])
        cur = [its[0]]
        for it in its[1:]:
            prev = cur[-1]
            gap = it["x0"] - prev["x1"]
            size = max(it["size"], prev["size"])
            limit = 0.9 * size if "e" in (it["t"], prev["t"]) else 0.35 * size
            bullet = len(cur) == 1 and prev["t"] == "c" and prev["c"]["c"] in "•◦▪‣" and gap > 0.05 * size
            if gap > limit or bullet:
                lines.append((r["y"], cur)); cur = [it]
            else:
                cur.append(it)
        lines.append((r["y"], cur))
    return lines

def downscale_images(pdf, factor=2.0):
    """Images larger than factor × their displayed size are resampled (keeps the figure files small)."""
    import zlib
    need = {}
    for pno in range(1, len(pdf.pages) + 1):
        ops, units, *_ = scan(pdf, pno)
        xo = pdf.pages[pno - 1].Resources.get("/XObject", {})
        for u in units:
            if u["kind"] != "Do:/Image": continue
            obj = xo[u["name"]]
            key = obj.objgen
            w, h = u["dsize"]
            prev = need.get(key, (obj, 0, 0))
            need[key] = (obj, max(prev[1], w), max(prev[2], h))
    saved = 0
    for obj, dw, dh in need.values():
        W, H = int(obj.Width), int(obj.Height)
        tw, th = min(W, math.ceil(factor * dw)), min(H, math.ceil(factor * dh))
        sc = max(tw / W, th / H)
        if sc > 0.8: continue
        nw, nh = max(1, round(W * sc)), max(1, round(H * sc))
        for o in [obj] + ([obj.SMask] if "/SMask" in obj else []):
            try:
                im = pikepdf.PdfImage(o).as_pil_image()
            except Exception as ex:
                print("  (image kept:", ex, ")"); break
            before = len(o.read_raw_bytes())
            im = im.resize((nw, nh), Image.LANCZOS)
            if str(o.get("/Filter")) == "/DCTDecode":
                buf = io.BytesIO(); im.save(buf, "JPEG", quality=88); o.write(buf.getvalue(), filter=pikepdf.Name.DCTDecode)
            else:
                o.write(zlib.compress(im.tobytes(), 9), filter=pikepdf.Name.FlateDecode)
            if "/DecodeParms" in o: del o["/DecodeParms"]
            o.Width, o.Height = nw, nh
            saved += before - len(o.read_raw_bytes())
    print(f"images resampled, {saved / 1024:.0f} KB less")

def is_white_fill(u):
    return u["kind"] in ("path:f", "path:f*") and min(u.get("fill") or (0,)) > 0.98

def overlaps(a, b, pad=1):
    return a[0] < b[2] + pad and b[0] < a[2] + pad and a[1] < b[3] + pad and b[1] < a[3] + pad

def raster_patch(capfile, ref, rect, steps):
    """Transparent image of the ink in rect that the capture shows but the PDF render does not."""
    from PIL import ImageFilter
    x0, y0, x1, y1 = rect
    cap = Image.open(capfile).convert("RGB")
    k = cap.width / 1920
    crop = cap.crop((round(x0 * k), round(y0 * k), round(x1 * k), round(y1 * k)))
    refc = Image.fromarray(ref).crop((x0, y0, x1, y1)).resize(crop.size, Image.BILINEAR).convert("L")
    rd = np.asarray(refc.filter(ImageFilter.MinFilter(9))).astype(int)        # PDF text, grown by ~4 px
    rgb = np.asarray(crop).astype(int); g = rgb.mean(axis=2)
    miss = (g < 245) & (rd > 240)
    if not miss.any():
        return Image.new("RGBA", crop.size), 0
    dark = rgb[miss & (g <= np.percentile(g[miss], 15) + 1)]
    col = np.median(dark, axis=0)
    alpha = np.clip((255 - g) / max(1.0, 255 - col.mean()), 0, 1) * miss
    out = np.dstack([np.full(g.shape, c) for c in col] + [alpha * 255]).astype(np.uint8)
    # first build state in which these strokes are there
    small = np.asarray(Image.fromarray(miss.astype(np.uint8) * 255).resize((x1 - x0, y1 - y0))) > 127
    step = 0
    for i, F in enumerate(steps.frames):
        R = F[y0:y1, x0:x1].mean(axis=2)
        if small.any() and float((R[small] < 200).mean()) >= 0.7: step = i; break
    return Image.fromarray(out, "RGBA"), step

def main():
    work, pdf_path, capdir, slides = sys.argv[1:5]
    cfg = json.load(open(sys.argv[5])) if len(sys.argv) > 5 else {}
    slides = parse_range(slides)
    eqidx = EqIndex(os.path.join(work, "eq.json"))
    manifest = json.load(open(os.path.join(capdir, "manifest.json")))
    pdf = pikepdf.open(pdf_path)

    # reference renders without white shapes: Keynote decks hide things under white rectangles
    ncpdf = pikepdf.new()
    for s in slides:
        ops, units, *_ = scan(pdf, s)
        figure_page(ncpdf, pdf.pages[s - 1], ops, [u for u in units if u["kind"] != "text" and not is_white_fill(u)], units, keep_text=True)
    ncdir = os.path.join(work, "nocover"); os.makedirs(ncdir, exist_ok=True)
    ncpdf.save(os.path.join(ncdir, "nocover.pdf"))
    subprocess.run(["pdftoppm", "-r", "72", "-png", os.path.join(ncdir, "nocover.pdf"), os.path.join(ncdir, "p")], check=True)
    ncfiles = sorted(f for f in os.listdir(ncdir) if f.endswith(".png"))

    figpdf = pikepdf.new()
    out = {"slides": []}; unmatched = []
    for si, s in enumerate(slides):
        scfg = cfg.get("slides", {}).get(str(s), {})
        ops, units, blocks, fonts, text_colors = scan(pdf, s)
        palette = [tuple(int(round(v * 255)) for v in c) for c in text_colors]
        steps = Steps(capdir, s, [] if scfg.get("static") else manifest["stops"])
        ref = np.asarray(Image.open(os.path.join(work, "ref", f"p-{s:02d}.png")).convert("RGB"))
        refnc = np.asarray(Image.open(os.path.join(ncdir, ncfiles[si])).convert("RGB"))
        chars = read_chars(os.path.join(work, "txt", f"p{s:02d}.xml"))

        # which text object drew each character: the first character of a span starts at a text object's origin
        origins = {}
        for u in units:
            if u["kind"] == "text" and u.get("origin"): origins.setdefault((round(u["origin"][0]), round(u["origin"][1])), u)
        span_unit = {}; prev_u = None
        for c in chars:
            if c["span"] in span_unit: continue
            for dx in (0, -1, 1, -2, 2):
                for dy in (0, -1, 1):
                    u = origins.get((c["x0"] + dx, c["y"] + dy))
                    if u is not None: span_unit[c["span"]] = u; break
                if c["span"] in span_unit: break
            # a span that does not start a text object continues the previous one (TJ arrays split by txtwrite)
            if c["span"] not in span_unit and prev_u is not None: span_unit[c["span"]] = prev_u
            prev_u = span_unit.get(c["span"], prev_u)
        for c in chars:
            u = span_unit.get(c["span"])
            c["z"] = u["i"] if u else 0
            c["blk"] = u["block"] if u else None
            c["color"] = hexcolor(u["fill"]) if u and u.get("fill") else None

        # equations: clip frames that contain STIX glyphs; their TeX comes from the .key
        eqs = []
        def hidden(b):
            # white formulas on white ground (Keynote leftovers); white on a dark shape stays
            if not (b.get("colors") and all(min(c) > 0.98 for c in b["colors"])): return False
            x0, y0, x1, y1 = [int(round(v)) for v in b["rect"]]
            R = ref[max(0, y0):max(1, y1), max(0, x0):max(1, x1)]
            return R.size == 0 or float((R.min(axis=2) > 235).mean()) > 0.95
        def block_chars(b):
            own = [c for c in chars if c["blk"] is b and not c.get("eq")]
            if own: return own
            x0, y0, x1, y1 = b["rect"]
            return [c for c in chars if x0 - 2 <= (c["x0"] + c["x1"]) / 2 <= x1 + 2 and y0 - 2 <= c["y"] <= y1 + 4 and not c.get("eq")]
        for b in sorted(blocks, key=lambda b: (b["rect"][2] - b["rect"][0]) * (b["rect"][3] - b["rect"][1]) if b["rect"] else 0):
            if not (b["stix"] and not b["text"] and b["rect"]): continue
            ins = block_chars(b)
            if (b["rect"][2] - b["rect"][0]) * (b["rect"][3] - b["rect"][1]) > 0.8 * 1920 * 1080:
                # a formula drawn inside a page-sized clip: only its own glyphs tell where it is
                own = [c for c in chars if c["blk"] is b and not c.get("eq")]
                if not own: continue
                ins = own
            if hidden(b):
                print(f"  slide {s}: white formula at {[round(v) for v in b['rect']]} left out")
                for c in ins: c["eq"] = True
                continue
            x0, y0, x1, y1 = b["rect"]
            math = [c for c in ins if font_kind(c["font"]) == "math"]
            name = eqidx.match(norm_seq(c["c"] for c in math), x1 - x0, y1 - y0)
            used = math + [c for c in ins if not c["c"].strip()]
            if not name:
                name = eqidx.match(norm_seq(c["c"] for c in ins), x1 - x0, y1 - y0); used = ins
            if not name:
                unmatched.append((s, norm_seq(c["c"] for c in ins), [round(v) for v in b["rect"]])); continue
            for c in used: c["eq"] = True
            e = eqidx.eqs[name]
            eqs.append(make_eq(e, name, used, b["rect"], b["start"]))
        # formulas drawn inside a text block (no clip frame of their own): runs of math glyphs in drawing order
        rest = [c for c in chars if not c.get("eq") and font_kind(c["font"]) == "math"]
        runs = []
        for c in rest:
            if runs:
                r = runs[-1]; last = r[-1]
                big = max([x["size"] for x in r] + [c["size"]])
                near = abs(c["x0"] - last["x1"]) <= 3 * big or (r[0]["x0"] - 3 * big <= c["x0"] <= max(x["x1"] for x in r) + 3 * big)
                ys = [x["y"] for x in r]
                if near and min(ys) - 2 * big <= c["y"] <= max(ys) + 2 * big and c["blk"] is last["blk"]:
                    r.append(c); continue
            runs.append([c])
        for r in runs:
            # longest prefix/suffix combination that is a Keynote formula
            found = None
            for i0 in range(len(r)):
                for i1 in range(len(r), i0, -1):
                    sub = r[i0:i1]
                    if len(sub) < 2 and i1 - i0 < len(r): continue
                    xs0, xs1 = min(c["x0"] for c in sub), max(c["x1"] for c in sub)
                    name = eqidx.match(norm_seq(c["c"] for c in sub), xs1 - xs0, 1.5 * max(c["size"] for c in sub))
                    if name: found = (i0, i1, name); break
                if found: break
            if not found: continue
            i0, i1, name = found
            sub = r[i0:i1]
            for c in sub: c["eq"] = True
            e = eqidx.eqs[name]
            ys0 = min(c["y"] - 0.9 * c["size"] for c in sub); ys1 = max(c["y"] + 0.35 * c["size"] for c in sub)
            eqs.append(make_eq(e, name, sub, [min(c["x0"] for c in sub), ys0, max(c["x1"] for c in sub), ys1], min(c["z"] for c in sub)))
            print(f"  slide {s}: formula inside a text block: {e['tex'][:50]}")
        text_chars = [c for c in chars if not c.get("eq")]

        # figure content: no text, no equations, no slide background, nothing in dropped regions
        fig = []; dropped = []
        for u in units:
            if u["kind"] == "text" or (eq_block(u) and not is_white_fill(u)): continue
            bb = u["bbox"]
            if bb[2] <= bb[0] or bb[3] <= bb[1]: continue
            if u["kind"] == "path:f" and bb[2] - bb[0] >= 1900 and bb[3] - bb[1] >= 1060: continue
            if any(inside(bb, r) for r in scfg.get("drop", [])):
                dropped.append(u); continue
            fig.append(u)
        # underlines: thin horizontal strokes just below a text baseline
        for u in list(fig):
            bb = u["bbox"]
            if bb[3] - bb[1] > 3.5 or bb[2] - bb[0] < 8: continue
            hit = [c for c in text_chars if c["y"] + 1 <= (bb[1] + bb[3]) / 2 <= c["y"] + 0.3 * c["size"]
                   and c["x0"] >= bb[0] - 3 and c["x1"] <= bb[2] + 3]
            if hit:
                for c in hit: c["u"] = True
                fig.remove(u)

        lines = []
        for row_y, L in build_lines([c for c in text_chars if c["c"] != "\t"], eqs):
            while L and L[0]["t"] == "c" and not L[0]["c"]["c"].strip(): L = L[1:]
            while L and L[-1]["t"] == "c" and not L[-1]["c"]["c"].strip(): L = L[:-1]
            if not L: continue
            tch = [it["c"] for it in L if it["t"] == "c"]
            letters = [c for c in tch if c["c"].strip()]
            if letters:
                cnt = collections.Counter((font_kind(c["font"]), font_weight(c["font"]), font_italic(c["font"]), c["size"]) for c in letters)
                kind, weight, italic, size = cnt.most_common(1)[0][0]
                y = collections.Counter(c["y"] for c in letters).most_common(1)[0][0]
            else:
                kind, weight, italic, size = "eq", 400, False, None
                y = row_y
            msize = next((it["e"]["size"] for it in L if it["t"] == "e"), None)
            parts = []; prev = None
            for it in L:
                if prev is not None and (it["t"] == "e" or prev["t"] == "e"):
                    lead = it["c"]["c"] if it["t"] == "c" else "x"
                    tail = prev["c"]["c"] if prev["t"] == "c" else "x"
                    if lead.strip() and tail.strip() and it["x0"] - prev["x1"] > 0.15 * (size or msize):
                        parts.append({"sp": True})
                if it["t"] == "e":
                    parts.append({"tex": it["e"]["tex"], "color": it["e"].get("color")})
                else:
                    c = it["c"]
                    parts.append({"c": c["c"], "kind": font_kind(c["font"]), "w": font_weight(c["font"]),
                                  "i": font_italic(c["font"]), "u": bool(c.get("u")), "font": c["font"], "color": c.get("color")})
                prev = it
            h = size or msize
            top = y - 0.8 * h; bot = y + 0.25 * h
            for it in L:
                if it["t"] == "e": top = min(top, it["e"]["rect"][1]); bot = max(bot, it["e"]["rect"][3])
            bbox = [L[0]["x0"], top, L[-1]["x1"], bot]
            tcs = collections.Counter(round(u["tc"], 3) for u in units if u["kind"] == "text" and u.get("origin")
                                      and abs(u["origin"][1] - y) <= 2 and L[0]["x0"] - 2 <= u["origin"][0] <= L[-1]["x1"])
            tracking = tcs.most_common(1)[0][0] if tcs else 0.0
            # colour from the PDF render; text hidden under a white shape at the end only shows without covers
            ink = ink_color(ref, bbox) or ink_color(refnc, bbox)
            if ink is None:
                print(f"  slide {s}: no visible ink for line at ({L[0]['x0']}, {y}), left out:", "".join(p.get("c", "") for p in parts)[:50])
                continue
            x = L[0]["e"]["gx0"] if L[0]["t"] == "e" else L[0]["x0"]
            appear, gone = steps.step(bbox, ref)
            if appear is None:
                print(f"  slide {s}: line at ({x}, {y}) is never visible in Keynote, left out:", "".join(p.get("c", "") for p in parts)[:50]); continue
            z = min([c["z"] for c in tch] + [it["e"]["z"] for it in L if it["t"] == "e"])
            weight_c = collections.Counter()
            for p_ in parts:
                if p_.get("color"): weight_c[p_["color"]] += (len(p_["tex"]) if "tex" in p_ else 1)
            color = weight_c.most_common(1)[0][0] if weight_c else snap_color(ink, palette)
            # width of the ink on the slide (glyph extent), for fitting formula labels
            gxs0 = [it["e"]["gx0"] if it["t"] == "e" else it["x0"] for it in L]
            gxs1 = [it["e"].get("gx1", it["x1"]) if it["t"] == "e" else it["x1"] for it in L]
            gw = round(max(gxs1) - min(gxs0), 1)
            lines.append({"x": x, "y": y, "z": z, "gw": gw, "gone": gone, "tracking": tracking, "kind": kind, "weight": weight, "italic": italic,
                          "size": size, "msize": msize, "parts": parts, "bbox": [round(v, 1) for v in bbox],
                          "color": color, "step": appear})

        # two lines drawn on top of each other are never both visible: the earlier one goes when the later comes
        def overlap(a, b):
            ov = max(0, min(a[2], b[2]) - max(a[0], b[0])) * max(0, min(a[3], b[3]) - max(a[1], b[1]))
            return ov / max(1, min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1])))
        for A in lines:
            for B in lines:
                if A is not B and A["step"] < B["step"] and A["gone"] is None and overlap(A["bbox"], B["bbox"]) > 0.5:
                    A["gone"] = B["step"]
        for A in lines:
            if A["gone"] is not None or not A["step"]: continue
            area = lambda b: (b[2] - b[0]) * (b[3] - b[1])
            B = next((B for B in lines if B is not A and B["step"] == A["step"] and overlap(A["bbox"], B["bbox"]) > 0.5
                      and area(B["bbox"]) > 1.5 * area(A["bbox"])), None)
            if B is None: continue
            vis = steps.vis(A["bbox"], ref)
            early = [k for k in range(A["step"]) if vis and vis[k] >= 0.8]
            if early:
                A["step"], A["gone"] = early[0], B["step"]
        for u in fig:
            img = u["kind"] == "Do:/Image"
            if is_white_fill(u):
                # white shapes matter only where they hide something; Keynote removes some of them in a build
                u["step"], u["gone"] = steps.cover(u["bbox"], ref, refnc)
                continue
            u["step"], u["gone"] = steps.step(u["bbox"], ref, image=img)
            if img and u["step"] is not None:
                v = steps.vis(u["bbox"], ref)
                early = next((k for k, x in enumerate(v) if x >= 0.9), None)
                if early is not None and early < u["step"]: u["step"] = early
                d = steps.dim(u["bbox"], u["step"])
                if d and u["gone"] is None: u["dim"] = list(d)
        # objects that something opaque is drawn over later: visible only until that cover appears
        opaque = [u for u in fig if u["step"] is not None and (u["kind"] in ("path:f", "path:f*", "path:b", "path:b*", "path:B", "path:B*")
                                     or (u["kind"] == "Do:/Image" and not u.get("smask")))]
        def cover_step(bbox, z):
            x0, y0, x1, y1 = [int(v) for v in bbox]
            if x1 - x0 < 2 or y1 - y0 < 2: return None
            mask = np.zeros(((y1 - y0) // 2 + 1, (x1 - x0) // 2 + 1), bool)
            cov = [u for u in opaque if u["i"] > z and overlaps(bbox, u["bbox"], 0)]
            for c in sorted(set(u["step"] for u in cov)):
                for u in cov:
                    if u["step"] != c: continue
                    b = u["bbox"]
                    mask[max(0, int(b[1] - y0) // 2):max(0, int(b[3] - y0) // 2 + 1), max(0, int(b[0] - x0) // 2):max(0, int(b[2] - x0) // 2 + 1)] = True
                if mask.mean() >= 0.95: return c
            return None
        covered_out = 0
        for el, z in [(L, L["z"]) for L in lines] + [(u, u["i"]) for u in fig if not is_white_fill(u)]:
            c = cover_step(el["bbox"], z)
            if c is None or (el["step"] is not None and el["step"] < c): continue
            if c == 0:
                el["step"] = None; covered_out += 1; continue
            # appears when its region first looks like it does just before the cover comes
            x0, y0, x1, y1 = [int(round(v)) for v in el["bbox"]]
            x0, y0 = max(0, x0 - 1), max(0, y0 - 1); x1, y1 = min(1920, x1 + 2), min(1080, y1 + 2)
            P = steps.frames[c - 1][y0:y1, x0:x1]
            ink = (np.abs(P - 255).max(axis=2) > 24)
            if ink.sum() < 3: ink = np.ones(ink.shape, bool)
            el["step"] = next((k for k in range(c) if (np.abs(steps.frames[k][y0:y1, x0:x1] - P).max(axis=2) < 40)[ink].mean() >= 0.85), c - 1)
            el["gone"] = None          # the cover hides it (it lies above in the drawing order)
        if covered_out: print(f"  slide {s}: {covered_out} objects are covered from the start, left out")
        # by hand: {"force": [{"bbox": [x0, y0, x1, y1], "step": k, "gone": j}]} for objects the captures cannot explain
        for fo in scfg.get("force", []):
            for u in fig:
                if all(abs(a - b) <= 4 for a, b in zip(u["bbox"], fo["bbox"])):
                    u["step"], u["gone"] = fo["step"], fo.get("gone")
        never = [u for u in fig if u["step"] is None]
        if never: print(f"  slide {s}: {len(never)} figure parts never visible in Keynote, left out")
        lines = [L for L in lines if L["step"] is not None]
        fig = [u for u in fig if u["step"] is not None]

        # clips (in place of dropped posters): z-order and build step of their poster
        clips = []
        for vi, r in enumerate(scfg.get("drop", [])):
            us = [u for u in dropped if inside(u["bbox"], r)]
            if not us: continue
            # build step from the capture log: a movie that starts right after the slide appears belongs to
            # the slide itself; otherwise it comes with the build before its start
            x, y, w, h = r
            stages = [st["stage"] for st in manifest["stops"] if st["slide"] == s and any(
                abs(v["x"] - x) < 0.25 * w and abs(v["y"] - y) < 0.25 * h for v in st["videos"])]
            stp = max(0, min(stages) - 2) if stages else min((steps.step(u["bbox"])[0] or 0) for u in us)
            clips.append({"drop": vi, "z": min(u["i"] for u in us), "step": stp})

        # z-order: figure parts go into as few SVG layers as possible without changing what covers what
        seq = sorted([("line", L["z"], L) for L in lines] + [("fig", u["i"], u) for u in fig] + [("clip", c["z"], c) for c in clips],
                     key=lambda t: t[1])
        dom = []                # ("line", L) | ("layer", layer) | ("clip", c), in drawing order
        open_layer = {}         # (step, gone) -> layer dict
        for kind_, z, obj in seq:
            if kind_ != "fig":
                dom.append((kind_, obj)); continue
            key = (obj["step"], obj["gone"], tuple(obj.get("dim") or ()))
            L = open_layer.get(key)
            if L is not None:
                # everything drawn after this layer started must not overlap the new part
                later = dom[L["pos"] + 1:]
                if any(overlaps(obj["bbox"], o["bbox"]) for k2, o in later if k2 == "line") or \
                   any(overlaps(obj["bbox"], v["bbox"]) for k2, o in later if k2 == "layer" for v in o["units"]) or \
                   any(k2 == "clip" for k2, o in later):
                    L = None
            if L is None:
                L = {"step": key[0], "gone": key[1], "dim": list(key[2]) or None, "units": [], "pos": len(dom)}
                open_layer[key] = L
                dom.append(("layer", L))
            L["units"].append(obj)
        items = []
        for kind_, obj in dom:
            if kind_ == "line": items.append({"line": obj})
            elif kind_ == "clip": items.append({"clip": obj["drop"], "step": obj["step"]})
            else:
                figure_page(figpdf, pdf.pages[s - 1], ops, obj["units"], units)
                items.append({"layer": len(figpdf.pages), "step": obj["step"], "gone": obj["gone"], "dim": obj.get("dim")})
        # strokes that Keynote shows but the PDF export lacks: taken from the final capture (config "raster")
        if scfg.get("raster"):
            # text of the slide only: the patch must not repeat labels that are set natively
            tpdf = pikepdf.new()
            figure_page(tpdf, pdf.pages[s - 1], ops, [], units, keep_text=True)
            tdir = os.path.join(work, "textonly"); os.makedirs(tdir, exist_ok=True)
            tpdf.save(os.path.join(tdir, f"t{s:02d}.pdf"))
            subprocess.run(["pdftoppm", "-r", "72", "-png", "-singlefile", os.path.join(tdir, f"t{s:02d}.pdf"), os.path.join(tdir, f"t{s:02d}")], check=True)
            reftext = np.asarray(Image.open(os.path.join(tdir, f"t{s:02d}.png")).convert("RGB"))
        for ri, r in enumerate(scfg.get("raster", [])):
            stp = [st for st in manifest["stops"] if st["slide"] == s]
            capfile = os.path.join(capdir, stp[len(steps.frames) - 1]["file"] if steps.frames else stp[-1]["file"])
            rgba, step_r = raster_patch(capfile, reftext, r, steps)
            name = f"raster-s{s:02d}-{ri}.png"
            rgba.save(os.path.join(work, name))
            items.insert(0, {"raster": name, "rect": r, "step": step_r})
            print(f"  slide {s}: strokes missing in the PDF taken from the capture at {r}, step {step_r}")
        n = len(steps.frames) if steps.frames else 1
        out["slides"].append({"n": s, "steps": n, "items": items, "lines": lines})
        print(f"slide {s}: {len(lines)} lines, {len(eqs)} formulas, {len(fig)} figure parts in "
              f"{sum(1 for it in items if 'layer' in it)} layers, {len(clips)} clips, {n} build states")
    downscale_images(figpdf)
    figpdf.save(os.path.join(work, "figures.pdf"))
    json.dump(out, open(os.path.join(work, "extract.json"), "w"), ensure_ascii=False)
    for s, seq, r in unmatched: print("UNMATCHED formula on slide", s, repr(seq), r)

if __name__ == "__main__":
    main()
