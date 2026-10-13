# Content-stream scanner for Keynote PDF exports: paint units with bounding boxes, equation frames, text blocks.
import pikepdf, math, collections

PAINT = {"S", "s", "f", "F", "f*", "B", "B*", "b", "b*"}
PATH = {"m", "l", "c", "v", "y", "re", "h"}

def mul(a, b):  # affine matrices [a b c d e f], result = a then b
    return [a[0]*b[0] + a[1]*b[2], a[0]*b[1] + a[1]*b[3], a[2]*b[0] + a[3]*b[2], a[2]*b[1] + a[3]*b[3],
            a[4]*b[0] + a[5]*b[2] + b[4], a[4]*b[1] + a[5]*b[3] + b[5]]

def apply(m, x, y):
    return m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]

def scan(pdf, pno, H=1080):
    """Returns ops, units, eqframes. Coordinates are top-down (y from the top of the slide)."""
    pg = pdf.pages[pno - 1]
    fonts = {str(k): str(v.get("/BaseFont", "")) for k, v in pg.Resources.get("/Font", {}).items()}
    xobjs = {str(k): v for k, v in pg.Resources.get("/XObject", {}).items()}
    ops = list(pikepdf.parse_content_stream(pg))
    ctm = [1, 0, 0, 1, 0, 0]; lw = 1.0
    stack = []          # saved (ctm, lw, clip, block)
    clip = None         # current clip bbox (x0, y0, x1, y1) top-down
    blocks = []         # clip blocks: dict(start, end, rect, stix, text)
    block = None        # innermost clip block
    path = []; pending_clip = False
    units = []          # dict(i, kind, bbox, block)
    intext = False; text_start = None
    fill = (0.0, 0.0, 0.0); stroke = None
    text_colors = collections.Counter()
    tc = 0.0; tm = [1, 0, 0, 1, 0, 0]; cur_font = ""; text_fill = None
    for i, (a, op) in enumerate(ops):
        o = str(op)
        if o == "q":
            stack.append((ctm[:], lw, clip, block, tc))
            # a clip block starts with q re W n
            if i + 3 < len(ops) and str(ops[i+1][1]) == "re" and str(ops[i+2][1]) in ("W", "W*") and str(ops[i+3][1]) == "n":
                block = {"start": i, "end": None, "rect": None, "stix": False, "text": False, "parent": block}
                blocks.append(block)
        elif o == "Q":
            if stack:
                prev_block = block
                ctm, lw, clip, block, tc = stack.pop()
                if prev_block is not block and prev_block is not None and prev_block["end"] is None and prev_block["start"] >= 0:
                    prev_block["end"] = i
        elif o == "cm":
            ctm = mul([float(x) for x in a], ctm)
        elif o == "w":
            lw = float(a[0])
        elif o in PATH:
            v = [float(x) for x in a]
            if o == "re":
                x, y, w, h = v
                path += [apply(ctm, x, y), apply(ctm, x + w, y), apply(ctm, x, y + h), apply(ctm, x + w, y + h)]
            else:
                for k in range(0, len(v), 2):
                    path.append(apply(ctm, v[k], v[k+1]))
        elif o in ("W", "W*"):
            pending_clip = True
        elif o == "n":
            if pending_clip and path:
                xs = [p[0] for p in path]; ys = [H - p[1] for p in path]
                r = (min(xs), min(ys), max(xs), max(ys))
                clip = r if clip is None else (max(clip[0], r[0]), max(clip[1], r[1]), min(clip[2], r[2]), min(clip[3], r[3]))
                if block is not None and block["rect"] is None and block["start"] >= i - 3:
                    block["rect"] = r
            path = []; pending_clip = False
        elif o in PAINT:
            if path:
                xs = [p[0] for p in path]; ys = [H - p[1] for p in path]
                pad = lw * math.sqrt(abs(ctm[0]*ctm[3] - ctm[1]*ctm[2])) / 2 if o in ("S", "s", "B", "B*", "b", "b*") else 0
                bb = [min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad]
                if clip: bb = [max(bb[0], clip[0]), max(bb[1], clip[1]), min(bb[2], clip[2]), min(bb[3], clip[3])]
                units.append({"i": i, "kind": "path:" + o, "bbox": bb, "block": block, "stroke": o in ("S","s","B","B*","b","b*"), "fill": fill})
            path = []
        elif o == "Do":
            name = str(a[0]); x = xobjs.get(name)
            st = str(x.get("/Subtype")) if x is not None else "?"
            if st == "/Form":
                bx = [float(v) for v in x.get("/BBox", [0, 0, 1, 1])]
                fm = [float(v) for v in x.get("/Matrix", [1, 0, 0, 1, 0, 0])]
                m2 = mul(fm, ctm)
                pts = [apply(m2, bx[0], bx[1]), apply(m2, bx[2], bx[1]), apply(m2, bx[0], bx[3]), apply(m2, bx[2], bx[3])]
            else:
                pts = [apply(ctm, 0, 0), apply(ctm, 1, 0), apply(ctm, 0, 1), apply(ctm, 1, 1)]
            xs = [p[0] for p in pts]; ys = [H - p[1] for p in pts]
            bb = [min(xs), min(ys), max(xs), max(ys)]
            if clip: bb = [max(bb[0], clip[0]), max(bb[1], clip[1]), min(bb[2], clip[2]), min(bb[3], clip[3])]
            # displayed size of the whole image (before clipping), in slide px
            dsize = (math.hypot(ctm[0], ctm[1]), math.hypot(ctm[2], ctm[3]))
            units.append({"i": i, "kind": "Do:" + st, "bbox": bb, "block": block, "name": name, "dsize": dsize,
                          "smask": x is not None and ("/SMask" in x or "/Mask" in x)})
        elif o == "sh":
            units.append({"i": i, "kind": "sh", "bbox": list(clip) if clip else [0, 0, 1920, 1080], "block": block})
        elif o in ("sc", "scn", "rg"):
            try: fill = tuple(round(float(x), 3) for x in a[:3]) if len(a) >= 3 else (float(a[0]),) * 3
            except Exception: pass
        elif o == "g":
            fill = (float(a[0]),) * 3
        elif o == "BT":
            intext = True; text_start = i; text_colors[fill] += 1; text_fill = None
            if block is not None: block.setdefault("colors", set()).add(fill)
        elif o == "Tc":
            tc = float(a[0])
        elif o == "Tm":
            tm = [float(x) for x in a]
        elif o == "ET":
            intext = False
            m2 = mul(tm, ctm)
            ox, oy = m2[4], H - m2[5]
            units.append({"i": text_start, "end": i, "kind": "text", "bbox": None, "block": block,
                          "origin": (ox, oy), "fsize": math.hypot(m2[0], m2[1]), "tc": tc, "fill": text_fill or fill})
        elif o == "Tf":
            cur_font = fonts.get(str(a[0]), "")
            if block is not None and "STIX" in cur_font: block["stix"] = True
        elif o in ("Tj", "TJ", "'", '"'):
            if text_fill is None: text_fill = fill
            # a block holds text (not only a formula) if a non-math font shows something other than spaces
            if block is not None and "STIX" not in cur_font:
                parts = a[0] if o == "TJ" else [a[-1]]
                if any(isinstance(x, pikepdf.String) and bytes(x).strip(b" \x00") for x in parts):
                    block["text"] = True
    for b in blocks:
        if b["end"] is None: b["end"] = len(ops) - 1
    return ops, units, blocks, fonts, text_colors

def eq_block(unit):
    """The equation frame (innermost clip block with STIX text) a unit belongs to, or None."""
    b = unit["block"]
    if b is not None and b["stix"] and not b["text"]:
        return b
    return None
