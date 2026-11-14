"""Future asset draft. Reuses PR650's fitter; never imported by the game.

The region-weighted RDP below adapts stack-fit.py's local simplification to
the supplied character's actual face rather than the menu character's face.
"""
import argparse
import hashlib
import importlib.util
import json
import time
from importlib.metadata import version
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from shapely.affinity import translate
from shapely.geometry import Polygon

FITTER_SHA256 = 'f662fc272ecd4c7d30190b01bda8f7785f54c25e7ea2e6e3c75f6e2de7ebe4fe'
CONFIG = {
    'ganyu': {'file': 'd6b129d8-b188-47fb-85c5-2ba1ba94b065.png', 'name': '甘雨',
              'face': [798, 214, 951, 332], 'mouth': [860, 292, 894, 310], 'detailBudget': 300},
    'keqing': {'file': 'keqing_no_logo.png', 'name': '刻晴',
               'face': [895, 229, 1141, 416], 'mouth': [976, 342, 1037, 369], 'detailBudget': 320},
    'zhongli-detailed': {'file': 'zhongli_detailed_no_logo.png', 'name': '钟离·精细源',
                         'face': [712, 220, 931, 424], 'mouth': [810, 348, 887, 386], 'detailBudget': 300},
    'zhongli-simplified': {'file': 'zhongli_simplified_no_logo.png', 'name': '钟离·简化源',
                           'face': [708, 222, 934, 434], 'mouth': [808, 352, 888, 392], 'detailBudget': 300},
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')


def simplify_region(poly, epsilon, face):
    """Cyclic RDP with tighter tolerance within the actual face rectangle."""
    def ring(coords):
        points = np.array(coords[:-1])
        x, y = points[:, 0], points[:, 1]
        x0, y0, x1, y1 = face
        protected = (x >= x0) & (x <= x1) & (y >= y0) & (y <= y1)
        tolerance = epsilon / np.where(protected, 4, 1)
        split = int(np.square(points - points[0]).sum(axis=1).argmax())
        if split == 0:
            return points
        keep = {0, split}
        todo = [np.arange(split + 1), np.r_[np.arange(split, len(points)), 0]]
        while todo:
            ids = todo.pop()
            if len(ids) <= 2:
                continue
            a, b = points[ids[0]], points[ids[-1]]
            d = b - a
            if np.dot(d, d) < 1e-10:
                distance = np.linalg.norm(points[ids] - a, axis=1)
            else:
                t = np.clip((points[ids] - a) @ d / np.dot(d, d), 0, 1)
                distance = np.linalg.norm(points[ids] - (a + t[:, None] * d), axis=1)
            ratios = distance / tolerance[ids]
            i = int(ratios.argmax())
            if ratios[i] > 1 and 0 < i < len(ids) - 1:
                keep.add(int(ids[i]))
                todo.extend([ids[:i + 1], ids[i:]])
        return points[sorted(keep)]
    exterior = ring(list(poly.exterior.coords))
    holes = [ring(list(r.coords)) for r in poly.interiors]
    if len(exterior) < 3:
        return poly.simplify(epsilon, preserve_topology=True)
    result = Polygon(exterior, [r for r in holes if len(r) >= 3])
    return result if result.is_valid else poly.simplify(epsilon / 5, preserve_topology=True)


def bounded(module, polygons, count, width, height):
    lo, hi = .02, 300.0
    best = None
    for _ in range(18):
        mid = (lo + hi) / 2
        shapes = module.triangles(polygons, mid, width, height, True, False)
        if len(shapes) > count:
            lo = mid
        else:
            hi, best = mid, shapes
    if best is None:
        raise ValueError(f'No geometry fits budget {count}')
    for shape in best:
        shape.pop('layer', None)
    return best, hi


def render(pack):
    image = Image.new('RGB', (pack['width'], pack['height']))
    draw = ImageDraw.Draw(image)
    for s in pack['shapes']:
        if s['type'] == 'rect':
            x, y, w, h = s['box']
            draw.rectangle((x, y, x + w, y + h), fill=s['colour'])
        else:
            draw.polygon([tuple(p) for p in s['points']], fill=s['colour'])
    return image


def fit(key, inputs, fitter, output, budget, source_override=None):
    start = time.perf_counter()
    if sha(fitter) != FITTER_SHA256:
        raise ValueError('Existing fitter identity changed; inspect before regenerating')
    spec = importlib.util.spec_from_file_location('existing_stack_fit', fitter)
    if spec is None or spec.loader is None:
        raise ValueError('Cannot load existing fitter')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    cfg = CONFIG[key]
    source = source_override if source_override is not None else inputs / cfg['file']
    raw = source.read_bytes()
    if not raw.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('Expected actual PNG bytes, not an LFS pointer')
    original = Image.open(source).convert('RGB')
    w, h = 1254, round(original.height * 1254 / original.width)
    image = original.resize((w, h), Image.Resampling.LANCZOS)
    face = [round(v * w / original.width) if i % 2 == 0 else round(v * h / original.height)
            for i, v in enumerate(cfg['face'])]
    setattr(module, 'simplify_local', lambda p, e, _w, _h, _protect=True: simplify_region(p, e, face))
    output.mkdir(parents=True, exist_ok=False)
    (output / 'source.png').write_bytes(raw)
    image.save(output / 'tracing-input.png')
    tracing = dict(colormode='color', hierarchical='stacked', mode='polygon',
                   filter_speckle=18, color_precision=6, layer_difference=40,
                   corner_threshold=60, length_threshold=4, max_iterations=10, path_precision=2)
    module.vtracer.convert_image_to_svg_py(str(output / 'tracing-input.png'), str(output / 'paths.svg'), **tracing)
    polygons = module.polygons(output / 'paths.svg')
    x0, y0, x1, y1 = face
    image.crop(tuple(face)).save(output / 'face-input.png')
    detail_cfg = {**tracing, 'filter_speckle': 2 if key == 'ganyu' else 3,
                  'layer_difference': 20, 'length_threshold': 3.5}
    module.vtracer.convert_image_to_svg_py(str(output / 'face-input.png'), str(output / 'face.svg'), **detail_cfg)
    local = [(translate(p, xoff=x0, yoff=y0), c) for p, c in module.polygons(output / 'face.svg')]
    details, detail_epsilon = bounded(module, local, cfg['detailBudget'], w, h)
    mouth = [round(v * w / original.width) if i % 2 == 0 else round(v * h / original.height)
             for i, v in enumerate(cfg['mouth'])]
    image.crop(tuple(mouth)).save(output / 'mouth-input.png')
    mouth_cfg = {**detail_cfg, 'filter_speckle': 0, 'layer_difference': 8, 'length_threshold': 1}
    module.vtracer.convert_image_to_svg_py(str(output / 'mouth-input.png'), str(output / 'mouth.svg'), **mouth_cfg)
    mouth_polys = [(translate(p, xoff=mouth[0], yoff=mouth[1]), c) for p, c in module.polygons(output / 'mouth.svg')]
    mouth_shapes, _ = bounded(module, mouth_polys, 40, w, h)
    base, epsilon = bounded(module, polygons, budget - len(details) - len(mouth_shapes), w, h)
    module.refit_colours(base, image)
    shapes = base + details + mouth_shapes
    pack = {'schemaVersion': 1, 'character': key, 'purpose': 'future-selection-reserve',
            'runtimeEnabled': False, 'width': w, 'height': h, 'sourceSize': list(original.size),
            'sourceSha256': sha(source), 'algorithm': 'PR650 VTracer stacked contours, regional RDP and constrained triangulation',
            'nativeMode': 'single-axis-static-xyz', 'budget': budget, 'nativeImages': len(shapes),
            'faceBox': face, 'mouthBox': mouth, 'detailImages': len(details) + len(mouth_shapes), 'shapes': shapes}
    native = render(pack)
    native.save(output / 'preview.png')
    diff = np.abs(np.asarray(native).astype(float) - np.asarray(image))
    metrics = {'images': len(shapes), 'baseImages': len(base), 'detailImages': pack['detailImages'],
               'mae': float(diff.mean()), 'faceMAE': float(diff[y0:y1, x0:x1].mean()),
               'epsilon': epsilon, 'detailEpsilon': detail_epsilon}
    pack['metrics'] = metrics
    dump(output / 'native-art.json', pack)
    receipt = {'sourceFile': cfg['file'], 'sourceSha256': sha(source),
               'fitterSha256': sha(fitter), 'adapterSha256': sha(Path(__file__)),
               'nativeSha256': sha(output / 'native-art.json'), 'previewSha256': sha(output / 'preview.png'),
               'tracing': tracing, 'faceTracing': detail_cfg, 'mouthTracing': mouth_cfg, 'detailBudget': cfg['detailBudget'],
               'versions': {p: version(p) for p in ['Pillow', 'numpy', 'opencv-python', 'shapely', 'vtracer']},
               'metrics': metrics, 'generationSeconds': time.perf_counter() - start,
               'officialImport': 'NOT_RUN', 'devicePerformance': 'UNVERIFIED', 'ownerAcceptance': 'PENDING'}
    dump(output / 'receipt.json', receipt)
    print(json.dumps({'character': key, **metrics, 'generationSeconds': receipt['generationSeconds']}), flush=True)


def compare(output):
    font_path = Path('C:/Windows/Fonts/msyh.ttc')
    font = ImageFont.truetype(str(font_path), 24) if font_path.exists() else ImageFont.load_default()
    for key, cfg in CONFIG.items():
        folder = output / key
        pack = json.loads((folder / 'native-art.json').read_text(encoding='utf-8'))
        source = Image.open(folder / 'source.png').convert('RGB').resize((pack['width'], pack['height']), Image.Resampling.LANCZOS)
        native = render(pack)
        # Both columns use the identical crop and scaling; no source texture in reconstruction.
        canvas = Image.new('RGB', (1672, 1080), '#161923')
        draw = ImageDraw.Draw(canvas)
        for col, (title, im) in enumerate([('原图', source), (f"图元拟合 · {pack['nativeImages']} 图元", native)]):
            x = col * 836
            draw.text((x + 16, 12), cfg['name'] + ' / ' + title, font=font, fill='white')
            canvas.paste(im.resize((836, 470), Image.Resampling.LANCZOS), (x, 52))
            crop = im.crop(tuple(pack['faceBox']))
            crop = crop.resize((crop.width * 3, crop.height * 3), Image.Resampling.NEAREST)
            draw.text((x + 16, 538), '同区域面部 · 3倍放大', font=font, fill='white')
            canvas.paste(crop, (x + 16, 578))
        canvas.save(folder / 'comparison.png')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fitter', type=Path)
    parser.add_argument('--inputs', type=Path)
    parser.add_argument('--source', type=Path, help='Use preserved source.png instead of a Downloads folder')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--character', choices=CONFIG)
    parser.add_argument('--budget', type=int, default=1600)
    parser.add_argument('--compare', action='store_true')
    args = parser.parse_args()
    if args.compare:
        compare(args.output)
    else:
        if not args.fitter or not (args.inputs or args.source) or not args.character:
            parser.error('--fitter, --character and either --inputs or --source are required to fit')
        fit(args.character, args.inputs, args.fitter.resolve(), args.output, args.budget, args.source)
