"""Source-locked candidate; reuses the existing native rectangle merger."""
import hashlib
import importlib.util
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.artifacts/lumine-idle/converted'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / 'art/characters/traveler-geo/idle-approved-v1/lumine_static_approved.png'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == '32830a9ab3f0b181202205bba59447efe660ce3225ab26f32943c54753a105de'
spec = importlib.util.spec_from_file_location('merger', ROOT / 'scripts/art/build-performance-pack.py')
merger = importlib.util.module_from_spec(spec)
spec.loader.exec_module(merger)
source = Image.open(SOURCE).convert('RGBA')
report = []
sheet = Image.new('RGB', (1560, 550), '#18202b')
draw = ImageDraw.Draw(sheet)
for index, (width, colors) in enumerate([(64,48),(96,48),(133,48),(210,48),(210,24),(210,16)]):
    key = str(width) if colors == 48 else f'{width}-{colors}'
    height = round(width * 585 / 640)
    small = source.resize((width, height), Image.Resampling.LANCZOS)
    alpha = small.getchannel('A').point(lambda a: min(255, round(a / 32) * 32))
    small = small.convert('RGB').quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert('RGBA')
    small.putalpha(alpha)
    # Existing merger only, canvas aspect ratio is retained inside a square133 slot.
    rows, _ = merger.rectangles(small, (width, height), (width, height), True)
    preview = Image.new('RGBA', (width, height))
    for row in rows:
        x, y, w, h = row[1:5]
        left, top = round(x + width / 2 - w / 2), round(height / 2 - y - h / 2)
        ImageDraw.Draw(preview).rectangle((left, top, left + w - 1, top + h - 1), fill=tuple(row[14:18]))
    preview.save(OUT / f'preview-{key}.png')
    shown = preview.resize((210, 192), Image.Resampling.NEAREST)
    sheet.paste(shown, (index * 260 + 20, 45), shown)
    draw.text((index * 260 + 20, 15), f'{width}px {colors} colors / {len(rows)} images', fill='white')
    thumb = preview.resize((133, 122), Image.Resampling.NEAREST)
    sheet.paste(thumb, (index * 260 + 20, 280), thumb)
    draw.text((index * 260 + 20, 420), 'above:210px below:133px', fill='white')
    asset = {'width': width, 'height': height, 'count': len(rows), 'rows': rows,
             'root': [0, 0, width, width, .5, .5, .5, .5, .5, .5, 1, 1, 0],
             'renderProfile': 'compact-v1', 'cache': True, 'runtimeV2': True, 'rectanglesOnly': True,
             'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
             'jsonSha256': hashlib.sha256(json.dumps(rows).encode()).hexdigest()}
    (OUT / f'asset-{key}.json').write_text(json.dumps(asset, separators=(',', ':')))
    if width in (133, 210):
        # Split static spans only at fixed band boundaries. No frame-sized drawings.
        # Full-opacity interior overlaps by .08px to prevent subpixel seams.
        bounds = sorted(set([0, height] + list(range(0, round(height * 490 / 585), max(1, round(height / 20)))) + [round(height * 490 / 585)]))
        bands, band_rows, indices = [], [], []
        for band, (top, bottom) in enumerate(zip(bounds, bounds[1:]), 1):
            bands.append((top + bottom) / 2 / height * 585)
            for row in rows:
                r = list(row)
                rt = height/2-r[2]-r[4]/2
                rb = rt+r[4]
                lo, hi = max(top, rt), min(bottom, rb)
                if hi <= lo:
                    continue
                r[2], r[4] = height/2-(lo+hi)/2, hi-lo
                if r[17] == 255:
                    r[4] += .08
                band_rows.append(r)
                indices.append(band)
        asset.update(renderProfile='approved-idle-v1', rows=band_rows, count=len(band_rows),
                     bands=bands, bandByRow=indices, period=2.2,
                     jsonSha256=hashlib.sha256(json.dumps(band_rows).encode()).hexdigest())
        (OUT / f'idle-{key}.json').write_text(json.dumps(asset, separators=(',', ':')))
    report.append({'grid': [width, height], 'colors': colors, 'images': len(rows), 'groups': (len(rows)+59)//60, 'source': asset['sourceSha256']})
reference = source.resize((210, 192), Image.Resampling.LANCZOS)
sheet.paste(reference, (1300, 350), reference)
sheet.save(OUT / 'comparison.png')
(OUT / 'metrics.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report))
