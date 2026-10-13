# Index Keynote equation PDFs: TeX source (from the XMP packet), page size and glyph sequence.
import sys, os, re, json, subprocess, html, glob
import pikepdf
eqdir, out = sys.argv[1], sys.argv[2]
res = {}
for f in sorted(glob.glob(os.path.join(eqdir, "*.pdf"))):
    raw = open(f, "rb").read()
    m = re.search(rb"<equation><!\[CDATA\[(.*?)\]\]></equation>", raw, re.S)
    tex = m.group(1).decode("utf-8") if m else None
    if tex is None:
        # the XMP packet may be inside a compressed metadata stream
        try:
            p = pikepdf.open(f)
            md = p.Root.get("/Metadata")
            if md is not None:
                x = md.read_bytes()
                m = re.search(rb"<equation><!\[CDATA\[(.*?)\]\]></equation>", x, re.S)
                tex = m.group(1).decode("utf-8") if m else None
        except Exception as e:
            pass
    p = pikepdf.open(f)
    mb = [float(v) for v in p.pages[0].MediaBox]
    xml = subprocess.run(["gs", "-q", "-dNOPAUSE", "-dBATCH", "-sDEVICE=txtwrite", "-dTextFormat=0", "-o", "-", f], capture_output=True, text=True).stdout
    glyphs = []
    for sm in re.finditer(r'<span bbox="[^"]*" font="[A-Z]+\+([^"]+)" size="([\d.]+)">(.*?)</span>', xml, re.S):
        font, size = sm.group(1), float(sm.group(2))
        for c in re.finditer(r'<char bbox="(-?\d+) (-?\d+) (-?\d+) (-?\d+)" c="([^"]*)"/>', sm.group(3)):
            ch = html.unescape(c.group(5))
            glyphs.append([ch, font, size, int(c.group(1)), int(c.group(2)), int(c.group(3))])
    res[os.path.basename(f)] = {"tex": tex, "w": mb[2] - mb[0], "h": mb[3] - mb[1], "glyphs": glyphs}
json.dump(res, open(out, "w"), ensure_ascii=False)
print(out, len(res), "equations;", sum(1 for v in res.values() if v["tex"]), "with TeX")
