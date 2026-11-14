"""Reference-driven local correction, funded only by fully hidden geometry.

The base generation stays frozen. No global colour/face regeneration, textures,
budget increase, or game integration is performed by this tool.
"""
import argparse
import copy
import importlib.util
import json
from pathlib import Path

import numpy as np
import shapely
import fit as fit_tool
from PIL import Image, ImageChops, ImageDraw, ImageFont
from shapely.affinity import scale, translate
from shapely.geometry import GeometryCollection, Polygon, box

from fit import FITTER_SHA256, bounded, dump, render, sha

ROOT = Path(__file__).resolve().parent
REGIONS = {
    'keqing': {'label': '刻晴抬手', 'roi': [1120, 190, 1320, 370], 'target': 210},
    'zhongli-simplified': {'label': '钟离肩鸟', 'roi': [1044, 310, 1234, 424], 'target': 110},
    'zhongli-detailed': {'label': '钟离肩鸟·精细源', 'roi': [1044, 310, 1234, 424], 'target': 90},
}


def poly(shape):
    if shape['type'] == 'rect':
        x, y, w, h = shape['box']
        return box(x, y, x + w, y + h)
    return Polygon(shape['points'])


def remove_hidden(pack):
    """Remove only facets invisible both continuously and in the saved raster."""
    labels = Image.new('I', (pack['width'], pack['height']), 0)
    draw = ImageDraw.Draw(labels)
    for index, s in enumerate(pack['shapes'], 1):
        if s['type'] == 'rect':
            x, y, w, h = s['box']
            draw.rectangle((x, y, x + w, y + h), fill=index)
        else:
            draw.polygon([tuple(p) for p in s['points']], fill=index)
    visible = set(np.unique(np.asarray(labels)).tolist())
    covered = GeometryCollection()
    keep, removed = [], []
    for index in range(len(pack['shapes']) - 1, -1, -1):
        shape = pack['shapes'][index]
        p = poly(shape)
        if index + 1 not in visible and p.difference(covered).area < 1e-7:
            removed.append(index)
        else:
            keep.append(index)
        covered = covered.union(p)
    result = copy.deepcopy(pack)
    result['shapes'] = [pack['shapes'][i] for i in sorted(keep)]
    if ImageChops.difference(render(pack), render(result)).getbbox() is not None:
        raise ValueError('Hidden-facet removal changed the raster')
    return result, sorted(removed)


def board(source, before, after, roi, path, label):
    font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 22)
    crops = [image.crop(tuple(roi)) for image in [source, before, after]]
    factor = 4
    width = max(c.width for c in crops) * factor
    height = max(c.height for c in crops) * factor
    canvas = Image.new('RGB', (width * 3, height + 58), '#161923')
    draw = ImageDraw.Draw(canvas)
    for i, (title, crop) in enumerate(zip(['原图', '修改前', '局部精修'], crops)):
        draw.text((i * width + 12, 12), f'{label} / {title}', font=font, fill='white')
        canvas.paste(crop.resize((crop.width * factor, crop.height * factor), Image.Resampling.NEAREST), (i * width, 58))
    canvas.save(path)


def bird_geometry(width, height, original, background_colour):
    """Small explicit reference polygons, no opaque colour blob or texture."""
    detail = json.loads((ROOT/'bird-details.json').read_text(encoding='utf-8'))
    x0,y0,_,_=detail['referenceBox']
    result = []
    for index,shape in enumerate(detail['shapes']):
        p=Polygon([[(x+x0)*width/original.width,(y+y0)*height/original.height] for x,y in shape['points']])
        if not p.is_valid:
            raise ValueError('Invalid reference bird polygon')
        for triangle in shapely.constrained_delaunay_triangles(p).geoms:
            assert isinstance(triangle, Polygon)
            result.append({'type':'polygon','points':[list(p) for p in list(triangle.exterior.coords)[:-1]],
                           'colour':background_colour if index==0 else shape['colour']})
    return result


def run(key, fitter, out, inspect):
    folder = ROOT / 'assets-1600' / key
    cfg = REGIONS[key]
    base = json.loads((folder / 'native-art.json').read_text(encoding='utf-8'))
    original = Image.open(folder / 'source.png').convert('RGB')
    source = original.resize((base['width'], base['height']), Image.Resampling.LANCZOS)
    before = render(base)
    geometry_roi = [v * (base['width'] / original.width if i % 2 == 0 else base['height'] / original.height)
                    for i, v in enumerate(cfg['roi'])]
    # Pillow rasterises fractional polygon coordinates with floor, including
    # right/bottom boundary pixels. Declare that actual pixel envelope explicitly.
    roi = [int(np.floor(v))+(1 if i>=2 else 0) for i,v in enumerate(geometry_roi)]
    pruned, removed = remove_hidden(base)
    available = 1600 - len(pruned['shapes'])
    out.mkdir(parents=True, exist_ok=False)
    board(source, before, before, roi, out / 'region-before.png', cfg['label'])
    print(json.dumps({'character': key, 'baseImages': len(base['shapes']), 'hiddenImages': len(removed),
                      'availableWithin1600': available, 'roi': roi}), flush=True)
    if inspect:
        return
    if sha(fitter) != FITTER_SHA256:
        raise ValueError('Existing fitter changed')
    spec = importlib.util.spec_from_file_location('stack', fitter)
    if spec is None or spec.loader is None:
        raise ValueError('Cannot load existing fitter')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    setattr(module, 'simplify_local', lambda p, epsilon, *_: p.simplify(epsilon, preserve_topology=True))
    # The replacement rectangle will cover old facets inside this exact region.
    region=box(cfg['roi'][0]*base['width']/original.width,cfg['roi'][1]*base['height']/original.height,
               cfg['roi'][2]*base['width']/original.width,cfg['roi'][3]*base['height']/original.height)
    # Only the traced hand replaces its whole rectangle. The bird correction
    # keeps original background/coat facets and erases only its rejected footprint.
    replaced=[i for i,s in enumerate(pruned['shapes']) if key=='keqing' and poly(s).difference(region).area<1e-7]
    pruned['shapes']=[s for i,s in enumerate(pruned['shapes']) if i not in set(replaced)]
    available=1600-len(pruned['shapes'])
    # Trace original-resolution reference so fingers and glove boundaries survive.
    original.crop(tuple(cfg['roi'])).save(out / 'region-input.png')
    settings = dict(colormode='color', hierarchical='stacked', mode='polygon', filter_speckle=4 if key=='keqing' else 2,
                    color_precision=6, layer_difference=24 if key=='keqing' else 16, corner_threshold=60,
                    length_threshold=2, max_iterations=10, path_precision=2)
    module.vtracer.convert_image_to_svg_py(str(out / 'region-input.png'), str(out / 'region.svg'), **settings)
    polygons = [(scale(translate(p, xoff=cfg['roi'][0], yoff=cfg['roi'][1]),
                       xfact=base['width'] / original.width, yfact=base['height'] / original.height,
                       origin=(0, 0)), c) for p, c in module.polygons(out / 'region.svg')]
    if key=='keqing':
        patch, epsilon = bounded(module, polygons, min(available,cfg['target']), base['width'], base['height'])
    else:
        pixels=np.asarray(before.crop((roi[0],roi[1],roi[2],roi[3])))
        border=np.concatenate([pixels[0],pixels[-1],pixels[:,0],pixels[:,-1]])
        greens=border[(border[:,0]<border[:,1]*.9)&(border[:,2]>border[:,0])]
        colours,counts=np.unique(greens,axis=0,return_counts=True)
        if not len(colours):
            raise ValueError('No original background plane found around bird')
        background_colour='#'+''.join(f'{v:02X}' for v in colours[int(counts.argmax())])
        patch,epsilon=bird_geometry(base['width'],base['height'],original,background_colour),None
    if key=='keqing' and len(patch)>available:
        raise ValueError('Local correction exceeds reclaimed budget')
    pruned['shapes'].extend(patch)
    # The new opaque patch can itself hide old facets. Reclaim those as well.
    refined, removed_after = remove_hidden(pruned)
    refined['nativeImages'] = len(refined['shapes'])
    # Old allocated base/detail counts no longer describe the occlusion-pruned tree.
    refined.pop('detailImages', None)
    refined['localRefinement'] = {'regionSourceBox': cfg['roi'], 'roi': roi, 'patchImages': len(patch),
                                 'removedHiddenBefore': len(removed), 'removedHiddenAfter': len(removed_after)}
    after = render(refined)
    # A source-driven local correction must not silently alter the face or scene.
    diff = np.any(np.asarray(before) != np.asarray(after), axis=2)
    outside = diff.copy()
    x0, y0, x1, y1 = roi
    outside[y0:y1, x0:x1] = False
    if outside.any():
        raise ValueError(f'Correction leaked outside ROI: {int(outside.sum())} pixels')
    if refined['nativeImages'] > 1600:
        raise ValueError('Drawing budget exceeded')
    raw_diff = np.abs(np.asarray(after).astype(float) - np.asarray(source))
    face = base['faceBox']
    refined['metrics'] = {**base['metrics'], 'images': refined['nativeImages'],
                          'mae': float(raw_diff.mean()),
                          'faceMAE': float(raw_diff[face[1]:face[3], face[0]:face[2]].mean()),
                          'regionMAE': float(raw_diff[y0:y1, x0:x1].mean())}
    refined['metrics'].pop('baseImages', None)
    refined['metrics'].pop('detailImages', None)
    dump(out / 'native-art.json', refined)
    (out / 'source.png').write_bytes((folder / 'source.png').read_bytes())
    after.save(out / 'preview.png')
    board(source, before, after, roi, out / 'region-comparison.png', cfg['label'])
    old_config=fit_tool.CONFIG
    try:
        fit_tool.CONFIG={key:old_config[key]}
        fit_tool.compare(out.parent)
    finally:
        fit_tool.CONFIG=old_config
    old = json.loads((folder / 'receipt.json').read_text(encoding='utf-8'))
    receipt = {**old, 'nativeSha256': sha(out / 'native-art.json'), 'previewSha256': sha(out / 'preview.png'),
               'metrics': refined['metrics'], 'localRefinement': {
                   'generatorSha256': sha(Path(__file__)), 'baseGeometrySha256': sha(folder / 'native-art.json'),
                   'baseReceiptSha256': sha(folder / 'receipt.json'), 'baseImages': len(base['shapes']),
                   'prunedIndices': removed, 'prunedAfterIndices': removed_after, 'settings': settings,
                   'epsilon': epsilon, 'outsideRegionChangedPixels': int(outside.sum()),
                   'replacedRegionIndices': replaced,
                   'geometryROI': geometry_roi, 'rasterROI':roi,
                   'referenceBirdSha256':sha(ROOT/'bird-details.json') if key!='keqing' else None,
                   'sourceROI': cfg['roi'], 'boardSha256': sha(out / 'region-comparison.png')}}
    dump(out / 'receipt.json', receipt)
    print(json.dumps({'character': key, 'images': refined['nativeImages'], 'patchImages': len(patch),
                      'regionMAEBefore': float(np.abs(np.asarray(before).astype(float)-np.asarray(source))[y0:y1,x0:x1].mean()),
                      'regionMAEAfter': refined['metrics']['regionMAE'], 'epsilon': epsilon}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--character', choices=REGIONS, required=True)
    parser.add_argument('--fitter', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--inspect', action='store_true')
    args = parser.parse_args()
    if not args.inspect and not args.fitter:
        parser.error('--fitter is required')
    run(args.character, args.fitter, args.output, args.inspect)
