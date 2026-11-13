"""TASK-94 contour adapter; existing V25 exporter places the native shapes.

No stochastic ellipse overlays or texture payload. Budget counts two native
half-triangles per arbitrary facet, matching scripts/v25-battle-scene.mjs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import time
import importlib.util

import cv2
import numpy as np
from PIL import Image
import shapely
from shapely.geometry import Polygon, LineString


def polygons(geometry):
    if geometry.geom_type == 'Polygon':
        yield geometry
    elif hasattr(geometry, 'geoms'):
        for child in geometry.geoms:
            yield from polygons(child)


def regions(image, colors, minimum_area=16, spatial=10, color_range=24):
    original=image.copy()
    image = cv2.pyrMeanShiftFiltering(image, spatial, color_range, maxLevel=1)
    pal = Image.fromarray(image).quantize(colors=colors, method=Image.Quantize.MEDIANCUT,
                                         dither=Image.Dither.NONE)
    labels = np.asarray(pal)
    palette = np.asarray(pal.getpalette(), dtype=np.uint8).reshape(-1, 3)
    result = []
    for label in np.unique(labels):
        contours, hierarchy = cv2.findContours((labels == label).astype('uint8'),
                                               cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if hierarchy is None:
            continue
        for i, contour in enumerate(contours):
            if hierarchy[0][i][3] != -1 or len(contour) < 3:
                continue
            points = contour[:, 0, :].astype(float)
            holes, child = [], hierarchy[0][i][2]
            while child != -1:
                if len(contours[child]) >= 3:
                    holes.append(contours[child][:, 0, :].astype(float))
                child = hierarchy[0][child][0]
            polygon = shapely.make_valid(Polygon(points, holes))
            for part in polygons(polygon):
                if part.geom_type == 'Polygon' and part.area >= minimum_area:
                    # A shared palette label can cover skin, white cloth and lilac
                    # petals in different places. Preserve each connected block's
                    # own source colour instead of assigning their global average.
                    x0,y0,x1,y1=part.bounds
                    x0,y0=max(0,int(x0)),max(0,int(y0))
                    x1,y1=min(image.shape[1],int(x1)+1),min(image.shape[0],int(y1)+1)
                    coverage=np.zeros((y1-y0,x1-x0),dtype='uint8')
                    cv2.fillPoly(coverage,[np.rint(np.asarray(part.exterior.coords)-[x0,y0]).astype('int32')],1)
                    for ring in part.interiors:
                        cv2.fillPoly(coverage,[np.rint(np.asarray(ring.coords)-[x0,y0]).astype('int32')],0)
                    selected=(coverage!=0)&(labels[y0:y1,x0:x1]==label)
                    colour=np.rint(original[y0:y1,x0:x1][selected].mean(axis=0)).astype(int).tolist() if selected.any() else palette[label].tolist()
                    result.append((part, colour))
    return result


def geometry(parts, epsilon, width, height, placement=None, keep_holes=False,character_priority=False):
    items = []
    # Paint containing regions first; enclosed eye/flower regions then restore holes.
    # This uses layered opaque native shapes rather than tessellating tiny holes.
    for polygon, colour in sorted(parts, key=lambda part: part[0].area, reverse=True):
        x, y = polygon.centroid.coords[0]
        face = .32*width < x < .66*width and .28*height < y < .77*height
        flower = .20*width < x < .43*width and y < .36*height
        importance = 3 if face else 1.6 if flower else 1
        if character_priority and not keep_holes:
            r,g,b=colour
            warm=r>g*1.04 and g>b*1.06
            pale=max(colour)-min(colour)<65 and min(colour)>155 and .14*width<x<.85*width
            importance=3 if face else 2.3 if flower else 1.8 if warm or pale else .45
        if polygon.area < max(2,epsilon*epsilon*.15/importance):
            continue
        # Tiny anti-alias holes must not force four vertices each forever.
        polygon = Polygon(polygon.exterior,[ring for ring in polygon.interiors if Polygon(ring).area>=2] if keep_holes else [])
        simple = polygon.simplify(epsilon/importance, preserve_topology=True)
        if simple.geom_type != 'Polygon':
            continue
        if simple.is_empty or simple.area < 1:
            continue
        coords = np.asarray(simple.exterior.coords[:-1])
        rgb = '#'+''.join(f'{v:02X}' for v in colour)
        if len(coords) == 4 and not simple.interiors and abs(simple.area-simple.envelope.area) < .01:
            x0, y0, x1, y1 = simple.bounds
            items.append({'type':'rect', 'box':[x0, y0, x1-x0, y1-y0], 'colour':rgb, 'cost':1})
        else:
            for triangle in shapely.constrained_delaunay_triangles(simple).geoms:
                points = list(triangle.exterior.coords)[:-1]
                if placement is None:
                    items.append({'type':'polygon', 'points':points, 'colour':rgb, 'cost':2})
                else:
                    try:
                        placed=placement(points,height)
                    except ValueError as error:
                        if not isinstance(error,placement.Unavailable):
                            raise
                        items.append({'type':'polygon','points':points,'colour':rgb,'cost':2})
                    else:
                        for vertices,transform in placed:
                            items.append({'type':'nativeTriangle','points':vertices,'placement':transform,'colour':rgb,'cost':1})
    return items


def fit(source, output, budgets, colors=80, width=836, triangle_mode='masked',spatial=10,color_range=24,minimum_area=16,face_fraction=.23,character_priority=False,features_source=None):
    started = time.perf_counter()
    raw = source.read_bytes()
    placement=None
    if triangle_mode=='single-axis':
        spec=importlib.util.spec_from_file_location('native_triangle_placement',Path(__file__).with_name('native-triangle-placement.py'))
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);placement=module.place
    im = Image.open(source).convert('RGB')
    height = round(im.height*width/im.width)
    image = np.asarray(im.resize((width,height), Image.Resampling.LANCZOS))
    feature_image=image
    if features_source:
        feature_original=Image.open(features_source).convert('RGB')
        assert feature_original.size==im.size, 'Facial reference must use the same registered canvas'
        feature_image=np.asarray(feature_original.resize((width,height),Image.Resampling.LANCZOS))
    parts = regions(image, colors,minimum_area=minimum_area,spatial=spatial,color_range=color_range)
    feature_parts=[]
    mouth_parts=[]
    from shapely.affinity import translate
    # Same-source local face budget: both eyes/highlights, nose and lip line.
    face_rois=[(.34,.35,.46,.50),(.55,.35,.66,.50),(.465,.61,.54,.65),(.48,.495,.515,.56)]
    if features_source:
        face_rois=[(.343,.36,.46,.50),(.552,.36,.663,.50),(.465,.61,.54,.65),(.475,.48,.52,.58),
                   (.41,.275,.46,.318),(.552,.28,.615,.32)]
    for roi_index,(x0,y0,x1,y1) in enumerate(face_rois):
        left,top,right,bottom=int(x0*width),int(y0*height),int(x1*width),int(y1*height)
        for p,c in regions(feature_image[top:bottom,left:right],16,minimum_area=2,spatial=3):
            if features_source and roi_index>=4 and c[0]>210 and c[1]>170 and c[2]<180:
                continue  # Keep the new hair; transfer the old brow/skin, not old blonde fringe.
            feature_parts.append((translate(p,xoff=left,yoff=top),c))
    # The source lip is subpixel-thin at half resolution: a contour area filter
    # would discard it. Trace the actual dark source line and retain its width.
    x0,y0,x1,y1=int(.47*width),int(.615*height),int(.535*width),int(.645*height)
    crop=feature_image[y0:y1,x0:x1]
    dark=((crop[:,:,0]<205)&(crop[:,:,1]<175)&(crop[:,:,2]<150)).astype('uint8')
    contours,_=cv2.findContours(dark,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    for contour in contours:
        if len(contour)<2:
            continue
        points=contour[:,0,:].astype(float)+[x0,y0]
        line=LineString(points).buffer(.4,cap_style='square',join_style='mitre').simplify(.25)
        colour=np.median(crop[dark.astype(bool)],axis=0).astype(int).tolist()
        mouth_parts.extend((p,colour) for p in polygons(line))
    base = '#'+''.join(f'{int(v):02X}' for v in np.median(image.reshape(-1,3),axis=0))
    output.mkdir(parents=True, exist_ok=True)
    common = {'sourceSha256':hashlib.sha256(raw).hexdigest(), 'sourceSize':list(im.size),
              'width':width, 'height':height, 'colors':colors, 'regions':len(parts),
              'algorithm':'Pillow median-cut / OpenCV CCOMP / Shapely constrained triangulation / V25 half-triangles',
              'fitterSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'triangleMode':triangle_mode,
              'componentColour':'mean of original source pixels within each connected palette block',
              'featuresSourceSha256':hashlib.sha256(features_source.read_bytes()).hexdigest() if features_source else None,
              'characterPriority':character_priority,
              'segmentation':{'meanShiftSpatial':spatial,'meanShiftColor':color_range,'minimumRegionArea':minimum_area,
                              'facePalette':16,'faceSpatial':3,'faceMinimumArea':2,'faceFraction':face_fraction},
              'versions':{'opencv':cv2.__version__,'shapely':shapely.__version__,'numpy':np.__version__}}
    results = []
    def choose(region_parts, allowance, keep_holes=False):
        lo, hi = .08, 400.
        for _ in range(17):
            mid = (lo+hi)/2
            items = geometry(region_parts,mid,width,height,placement,keep_holes,character_priority)
            if sum(item['cost'] for item in items) > allowance:
                lo=mid
            else:
                hi=mid
        return geometry(region_parts,hi,width,height,placement,keep_holes,character_priority),hi
    for budget in budgets:
        mouth_items=geometry(mouth_parts,.08,width,height,placement)
        local_allowance=round(budget*face_fraction)
        feature_items,feature_epsilon=choose(feature_parts,local_allowance,keep_holes=True)
        bases=[{'type':'rect','box':[0,0,width,height],'colour':base}]
        if character_priority:
            sky=np.concatenate([image[:int(.18*height),:int(.13*width)].reshape(-1,3),image[:int(.18*height),int(.87*width):].reshape(-1,3)])
            greens=image[(image[:,:,1]>image[:,:,0]*1.08)&(image[:,:,1]>image[:,:,2]*1.2)]
            rgb=lambda values:'#'+''.join(f'{int(v):02X}' for v in np.median(values,axis=0))
            bases=[{'type':'rect','box':[0,0,width,height],'colour':rgb(sky)},
                   {'type':'rect','box':[0,height*.28,width,height*.72],'colour':rgb(greens)}]
        items,hi=choose(parts,budget-len(bases)-sum(s['cost'] for s in feature_items+mouth_items))
        items.extend(feature_items)
        items.extend(mouth_items)
        count = len(bases)+sum(item.pop('cost') for item in items)
        assert count<=budget, 'Cannot satisfy actual native-image budget'
        pack = {**common,'budget':budget,'nativeImages':count,'epsilon':hi,
                'faceRois':face_rois,'faceAllowance':local_allowance,'faceEpsilon':feature_epsilon,
                'shapes':[*bases,*items]}
        (output/f'budget-{budget}.json').write_text(json.dumps(pack,separators=(',',':'))+'\n',encoding='utf8')
        results.append({key:pack[key] for key in ['budget','nativeImages','epsilon']})
        print(json.dumps(results[-1]),flush=True)
    (output/'fit-receipt.json').write_text(json.dumps({**common,'results':results,'fitSeconds':time.perf_counter()-started},indent=2)+'\n')


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('source',type=Path)
    parser.add_argument('output',type=Path)
    parser.add_argument('--budgets',type=int,nargs='+',default=[400,800,1600,3200])
    parser.add_argument('--colors',type=int,default=80)
    parser.add_argument('--width',type=int,default=836)
    parser.add_argument('--triangle-mode',choices=['masked','single-axis'],default='masked')
    parser.add_argument('--spatial',type=int,default=10)
    parser.add_argument('--range',type=int,default=24,dest='color_range')
    parser.add_argument('--minimum-area',type=int,default=16)
    parser.add_argument('--face-fraction',type=float,default=.23)
    parser.add_argument('--character-priority',action='store_true')
    parser.add_argument('--features-source',type=Path)
    args=parser.parse_args()
    fit(args.source,args.output,args.budgets,args.colors,args.width,args.triangle_mode,args.spatial,args.color_range,args.minimum_area,args.face_fraction,args.character_priority,args.features_source)
