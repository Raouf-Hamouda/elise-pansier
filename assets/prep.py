# Mail files -> web assets. Strips (PDFs) -> assets/strips/<slug>/NNN.webp tiles 1200w x <=1800h. Images -> assets/img/<slug>-{2400,1200}.webp
import pymupdf, re, unicodedata, pathlib, json
import numpy as np
from PIL import Image
SRC = pathlib.Path.home()/"Desktop/ELISE_PANSIER/mail_03nov"; OUT = pathlib.Path.home()/"Desktop/ELISE_PANSIER/SITE/assets"
def slug(s): return re.sub(r"[^a-z0-9]+","-",unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode().lower()).strip("-")
W, TILE = 1200, 1800
CROP_TOP = {"drunker": 200}   # px at 1200 w: a chat screenshot pasted above the drawing, cut on request (3 Nov 2026)
manifest = {"strips":{}, "images":{}}
for f in sorted(SRC.glob("*.pdf")):
    d = pymupdf.open(f); name = slug(f.stem); tiles = []
    (OUT/"strips"/name).mkdir(parents=True, exist_ok=True)
    for p in d:
        pix = p.get_pixmap(matrix=pymupdf.Matrix(W/p.rect.width, W/p.rect.width), alpha=False)
        im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        if p.number == 0 and name in CROP_TOP: im = im.crop((0, CROP_TOP[name], im.width, im.height))
        for y in range(0, im.height, TILE):
            t = im.crop((0, y, im.width, min(y+TILE, im.height)))
            fn = f"{len(tiles):03d}.webp"; t.save(OUT/"strips"/name/fn, "WEBP", quality=92, method=6)
            tiles.append({"src": f"assets/strips/{name}/{fn}", "w": t.width, "h": t.height})
    # the strip's own paper colour = median of the light pixels of the first tile (reader background takes it)
    import numpy as np
    first = np.asarray(Image.open(OUT/"strips"/name/"000.webp").convert("RGB")).reshape(-1, 3)
    light = first[first.min(axis=1) > 200]
    bg = "#%02x%02x%02x" % tuple(int(v) for v in np.median(light if len(light) else first, axis=0))
    # accent = the title's ink: median of the saturated pixels of the first tile (fallback: the darkest ink)
    mx, mn = first.max(axis=1), first.min(axis=1); sat = (mx - mn) / np.maximum(mx, 1)
    inked = first[(sat > .35) & (mx > 60) & (mn < 200)]
    if len(inked) < 200: inked = first[mx < 90]
    acc = tuple(int(v) for v in np.median(inked, axis=0)) if len(inked) else (20, 20, 20)
    accent = "#%02x%02x%02x" % acc
    dark = (0.2126 * acc[0] + 0.7152 * acc[1] + 0.0722 * acc[2]) / 255 < .55
    manifest["strips"][name] = {"title": f.stem, "tiles": tiles, "height": sum(t["h"] for t in tiles), "bg": bg, "accent": accent, "dark": bool(dark)}
    print("   accent", accent, "dark", dark)
    print(name, len(tiles), "tiles, total h", manifest["strips"][name]["height"])
# Instagram carousels: ig/<strip>/NN.png (already upscaled) -> one tile per page
IG = pathlib.Path.home()/"Desktop/ELISE_PANSIER/ig"
# ig/about/*: loose sheets for the about deck -> assets/img/about-NN-{1200,2400}.webp
for i, f in enumerate(sorted((IG/"about").glob("*"))):
    im = Image.open(f).convert("RGB")
    for S in (2400, 1200):
        r = im if im.width <= S else im.resize((S, round(im.height*S/im.width)), Image.LANCZOS)
        (OUT/"img").mkdir(exist_ok=True); r.save(OUT/"img"/f"about-{i:02d}-{S}.webp", "WEBP", quality=88, method=6)
    manifest["images"][f"about-{i:02d}"] = {"title": f"about {i}", "w": im.width, "h": im.height, "src": f"assets/img/about-{i:02d}-1200.webp", "src2x": f"assets/img/about-{i:02d}-2400.webp"}
for d in sorted(x for x in IG.iterdir() if x.is_dir() and x.name not in ("upscaled", "about")):
    name = slug(d.name); tiles = []; (OUT/"strips"/name).mkdir(parents=True, exist_ok=True)
    for i, f in enumerate(sorted(d.glob("*.png"))):
        im = Image.open(f).convert("RGB"); im = im.resize((W, round(im.height*W/im.width)), Image.LANCZOS)
        fn = f"{i:03d}.webp"; im.save(OUT/"strips"/name/fn, "WEBP", quality=92, method=6)
        tiles.append({"src": f"assets/strips/{name}/{fn}", "w": im.width, "h": im.height})
    first = np.asarray(Image.open(OUT/"strips"/name/"000.webp").convert("RGB")).reshape(-1, 3)
    light = first[first.min(axis=1) > 200]; bg = "#%02x%02x%02x" % tuple(int(v) for v in np.median(light if len(light) else first, axis=0))
    mx, mn = first.max(axis=1), first.min(axis=1); sat = (mx - mn) / np.maximum(mx, 1)
    inked = first[(sat > .35) & (mx > 60) & (mn < 200)]
    if len(inked) < 200: inked = first[mx < 90]
    acc = tuple(int(v) for v in np.median(inked, axis=0)) if len(inked) else (20, 20, 20)
    dark = (0.2126*acc[0] + 0.7152*acc[1] + 0.0722*acc[2]) / 255 < .55
    manifest["strips"][name] = {"title": d.name, "tiles": tiles, "height": sum(t["h"] for t in tiles), "bg": bg, "accent": "#%02x%02x%02x" % acc, "dark": bool(dark), "pages": True}
    print(name, len(tiles), "pages, accent", manifest["strips"][name]["accent"], "dark", dark)
(OUT/"img").mkdir(exist_ok=True)
for f in sorted(SRC.iterdir()):
    if f.suffix.lower() not in (".png",".jpg",".jpeg"): continue
    im = Image.open(f); im.load(); name = slug(f.stem)
    if im.mode=="RGBA":
        bg = Image.new("RGB", im.size, "white"); bg.paste(im, mask=im.split()[3]); im = bg
    im = im.convert("RGB"); sizes = {}
    for S in (2400, 1200):
        r = im if max(im.size)<=S else (im.resize((S, round(im.height*S/im.width))) if im.width>=im.height else im.resize((round(im.width*S/im.height), S)))
        r.save(OUT/"img"/f"{name}-{S}.webp", "WEBP", quality=85, method=6); sizes[S] = r.size
    manifest["images"][name] = {"title": f.stem, "w": im.width, "h": im.height, "src": f"assets/img/{name}-1200.webp", "src2x": f"assets/img/{name}-2400.webp"}
    print(name, im.size, sizes)
json.dump(manifest, open(OUT/"manifest.json","w"), indent=1, ensure_ascii=False)
