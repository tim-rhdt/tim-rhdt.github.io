"""Turns a PDF export of a talk into a capture for gen_deck.py: one PNG per page plus manifest.json.

python3 pdf2cap.py SLIDES.pdf OUT_DIR [--pages 1-9] [--width 2560]
"""
import argparse
import json
import os
import re
import subprocess

ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("pdf")
ap.add_argument("out")
ap.add_argument("--pages", help="pages to use, e.g. 1-9 (default: all)")
ap.add_argument("--width", type=int, default=2560, help="width of the page images in pixels")
args = ap.parse_args()

info = subprocess.run(["pdfinfo", args.pdf], capture_output=True, text=True, check=True).stdout
count = int(re.search(r"Pages:\s+(\d+)", info).group(1))
pages = set()
for part in filter(None, (args.pages or f"1-{count}").split(",")):
    a, _, b = part.partition("-")
    pages.update(range(int(a), int(b or a) + 1))

os.makedirs(args.out, exist_ok=True)
stops, slides = [], []
for i, p in enumerate(sorted(pages), start=1):
    prefix = os.path.join(args.out, f"page-{p}")
    subprocess.run(["pdftoppm", "-png", "-f", str(p), "-l", str(p), "-scale-to-x", str(args.width),
                    "-scale-to-y", "-1", "-singlefile", args.pdf, prefix], check=True)
    file = f"s{i:02d}-01.png"
    os.replace(prefix + ".png", os.path.join(args.out, file))
    # Ghostscript keeps glyphs that pdftotext drops (alternate letter forms without a Unicode mapping)
    text = subprocess.run(["gs", "-q", "-dNOPAUSE", "-dBATCH", "-sDEVICE=txtwrite", f"-dFirstPage={p}",
                           f"-dLastPage={p}", "-sOutputFile=-", args.pdf], capture_output=True, text=True).stdout
    lines = [" ".join(line.split()) for line in text.splitlines()]
    lines = [line for line in lines if line and not re.fullmatch(r"\d{1,2}", line)]  # drop stray exponents
    slides.append({"text": lines, "events": 1, "movies": {}})
    stops.append({"slide": i, "stage": 1, "file": file, "textures": [], "videos": []})

manifest = {"title": os.path.basename(args.pdf), "slideCount": len(slides), "slides": slides, "stops": stops, "warnings": []}
json.dump(manifest, open(os.path.join(args.out, "manifest.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"{len(stops)} pages -> {args.out}")
