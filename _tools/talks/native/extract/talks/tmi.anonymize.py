# Makes the people in the M×I 2026 talk unrecognizable (user, 2026-10-14: "Bitte mache alle abgebildeten
# Personen unkenntlich!"): blurs every head in the two photos that show people, inside a copy of the PDF export,
# before convert.sh sees it. Found with Apple Vision face/person detection on all images and video frames;
# the videos show only hands. Keys are the PDF object numbers of the photos in that export; regions are ellipses
# (cx, cy, rx, ry) in the upright photo (as shown on the slide, 3024×4032).
#
# python3 tmi.anonymize.py <export.pdf> <anonymized.pdf> <preview dir>
import sys, io, zlib
import pikepdf
import numpy as np
from PIL import Image, ImageFilter

src, dst, prev = sys.argv[1:4]
HEADS = {
    (49, 0): [(1355, 990, 270, 330),      # slide 3, woman in the middle
              (2330, 1035, 290, 340),     # slide 3, woman on the right
              (470, 1450, 560, 640)],     # slide 3, man in front (seen from behind)
    (100, 0): [(1345, 1390, 500, 760),    # slide 5, face
               (990, 840, 240, 240)],      # slide 5, hair bun
}
# regions that stay sharp although they touch a head (the particle disk held up on slide 5)
KEEP = {(100, 0): [(1835, 2228, 470, 425)]}

def blur_heads(im, heads, keep=()):
    up = im.rotate(270, expand=True)                   # stored sideways; the slide turns it upright
    w, h = up.size
    yy, xx = np.mgrid[0:h, 0:w]
    mask = np.zeros((h, w), np.float32)
    for cx, cy, rx, ry in heads:
        r = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
        mask = np.maximum(mask, np.clip((1.15 - r) / 0.15, 0, 1))   # solid inside, soft 15 % rim
    for cx, cy, rx, ry in keep:
        r = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
        mask = np.minimum(mask, np.clip((r - 0.97) / 0.06, 0, 1))
    # very strong blur: a coarse mosaic, smoothed, so neither features nor outlines survive
    small = up.resize((max(1, w // 90), max(1, h // 90)), Image.BILINEAR)
    blurred = small.resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(60))
    m = Image.fromarray((mask * 255).astype(np.uint8))
    up = Image.composite(blurred, up, m)
    return up.rotate(90, expand=True)

pdf = pikepdf.open(src)
for objgen, heads in HEADS.items():
    obj = pdf.get_object(objgen)
    assert obj.get("/Subtype") == "/Image"
    im = pikepdf.PdfImage(obj).as_pil_image().convert("RGB")
    assert im.size == (int(obj.Width), int(obj.Height)) == (4032, 3024), im.size
    out = blur_heads(im, heads, KEEP.get(objgen, ()))
    if str(obj.get("/Filter")) == "/DCTDecode":
        buf = io.BytesIO(); out.save(buf, "JPEG", quality=92); obj.write(buf.getvalue(), filter=pikepdf.Name.DCTDecode)
    else:
        obj.write(zlib.compress(out.tobytes(), 6), filter=pikepdf.Name.FlateDecode)
    if "/DecodeParms" in obj: del obj["/DecodeParms"]
    pv = out.rotate(270, expand=True); pv.thumbnail((900, 1200)); pv.save(f"{prev}/obj{objgen[0]}.jpg", quality=85)
    print("anonymized", objgen, "colorspace", obj.get("/ColorSpace") if not isinstance(obj.get("/ColorSpace"), pikepdf.Array) else obj.ColorSpace[0])
pdf.save(dst)
