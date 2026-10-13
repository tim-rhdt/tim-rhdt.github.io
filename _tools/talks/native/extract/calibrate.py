# Per-line letter-spacing so that text lines are as long as in the PDF (native widths measured in Chrome).
# python3 calibrate.py <work dir> <native widths json (measure2.js)>
import json, sys, os, collections
work, natpath = sys.argv[1:3]
ex = json.load(open(os.path.join(work, "extract.json")))
nat = json.load(open(natpath))
calp = os.path.join(work, "calib.json")
calib = json.load(open(calp)) if os.path.exists(calp) else {}
LIG = {"ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl"}
lines = {}
for sl in ex["slides"]:
    for L in sl["lines"]:
        if L["msize"] or L["kind"] == "eq": continue
        text = "".join(LIG.get(ch, ch) for ch in "".join(p.get("c", " ") for p in L["parts"]))
        lines[(sl["n"], round(L["x"]), text)] = L
changed = 0
for n in nat:
    L = lines.get((n["s"], round(n["x"]), n["t"]))
    if L is None or len(n["t"]) < 4: continue
    key = f'{n["s"]},{L["x"]:g},{L["y"]:g}'
    old = calib.get(key, L.get("tracking", 0.0))
    pdf_w = L["bbox"][2] - L["bbox"][0]
    new = old + (pdf_w - n["w"]) / (len(n["t"]) * L["size"])
    if abs(new - old) > 0.0025:
        calib[key] = round(new, 4); changed += 1
json.dump(calib, open(calp, "w"), indent=0)
print(f"calibrated {changed} lines ({len(calib)} with own letter-spacing)")
