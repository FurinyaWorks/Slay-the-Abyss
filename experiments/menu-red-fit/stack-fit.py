"""VTracer stacking -> bounded native triangle geometry, never SVG at runtime."""
import argparse,json,hashlib,re,time,xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np,shapely
import cv2
from shapely.geometry import Polygon,GeometryCollection,box
from PIL import Image,ImageDraw
import vtracer
from shapely.affinity import translate

def parts(g):
    if g.geom_type=='Polygon':yield g
    elif hasattr(g,'geoms'):
        for p in g.geoms:yield from parts(p)

def polygons(svg):
    result=[]
    for path in ET.parse(svg).getroot():
        if not path.tag.endswith('path'):continue
        tx,ty=map(float,re.findall(r'[-+]?\d+(?:\.\d+)?',path.get('transform','translate(0,0)')))
        data=path.get('d');assert not re.search('[ACHQSVachqsv]',data),'Polygon paths only'
        for sub in re.findall(r'M([^MZ]+)Z',data):
            pts=np.array(list(map(float,re.findall(r'[-+]?\d+(?:\.\d+)?',sub)))).reshape(-1,2)+[tx,ty]
            if len(pts)<3:continue
            for p in parts(shapely.make_valid(Polygon(pts))):
                if p.area>=.05:result.append((p,path.get('fill')))
    return result

def simplify_local(poly,epsilon,w,h,protect_face=True):
    def ring(coords):
        points=np.array(coords[:-1]);x,y=points[:,0],points[:,1]
        face=(x>.44*w)&(x<.56*w)&(y>.20*h)&(y<.36*h)
        knot=(((x>.36*w)&(x<.46*w))|((x>.57*w)&(x<.67*w)))&(y>.71*h)&(y<.92*h)
        head=(x>.39*w)&(x<.62*w)&(y<.38*h)
        tolerance=epsilon/np.where(face&protect_face,5,np.where(knot,2.5,np.where(head,1.6,1)))
        split=int(np.square(points-points[0]).sum(axis=1).argmax())
        if split==0:return points
        def rdp(indices):
            keep={int(indices[0]),int(indices[-1])};todo=[indices]
            while todo:
                ids=todo.pop()
                if len(ids)<=2:continue
                a,b=points[ids[0]],points[ids[-1]];d=b-a
                if np.dot(d,d)<1e-10:distance=np.linalg.norm(points[ids]-a,axis=1)
                else:
                    t=np.clip((points[ids]-a)@d/np.dot(d,d),0,1)
                    distance=np.linalg.norm(points[ids]-(a+t[:,None]*d),axis=1)
                ratios=distance/tolerance[ids];i=int(ratios.argmax())
                if ratios[i]>1 and 0<i<len(ids)-1:
                    keep.add(int(ids[i]));todo.extend([ids[:i+1],ids[i:]])
            return keep
        keep=rdp(np.arange(split+1))|rdp(np.r_[np.arange(split,len(points)),0])
        return points[sorted(keep)]
    exterior=ring(list(poly.exterior.coords));holes=[ring(list(r.coords)) for r in poly.interiors]
    if len(exterior)<3:return poly.simplify(epsilon,preserve_topology=True)
    result=Polygon(exterior,[r for r in holes if len(r)>=3])
    return result if result.is_valid else poly.simplify(epsilon/5,preserve_topology=True)

def triangles(polys,epsilon,w,h,prune=False,occlude_face=False):
    shapes=[];simplified=[]
    for layer,(p,color) in enumerate(polys):
        x,y=p.centroid.coords[0]
        ornament=(.36*w<x<.46*w or .57*w<x<.67*w) and .71*h<y<.92*h
        important=5 if (.44*w<x<.56*w and .20*h<y<.36*h) or ornament else 1.6 if .39*w<x<.62*w and y<.38*h else 1
        p=simplify_local(p,epsilon,w,h,not occlude_face)
        for poly in parts(p):
            if poly.area<.05:continue
            simplified.append((poly,color,layer))
    covered=box(round(.445*w),round(.211*h),round(.560*w),round(.355*h)) if occlude_face else GeometryCollection()
    for poly,color,layer in reversed(simplified):
            visible=poly.difference(covered) if prune else poly
            if prune:covered=covered.union(poly)
            if visible.is_empty:continue
            if len(poly.exterior.coords)==5 and not poly.interiors and abs(poly.area-poly.envelope.area)<.01:
                x0,y0,x1,y1=poly.bounds;shapes.append({'type':'rect','box':[x0,y0,x1-x0,y1-y0],'colour':color,'layer':layer});continue
            for t in shapely.constrained_delaunay_triangles(poly).geoms:
                if prune and t.intersection(visible).area<1e-7:continue
                shapes.append({'type':'polygon','points':[list(p) for p in list(t.exterior.coords)[:-1]],'colour':color,'layer':layer})
    return sorted(shapes,key=lambda s:s['layer'])

def semantic_face(w,h,markers=False):
    data=json.loads(Path(__file__).with_name('source-details.json').read_text());sx,sy=w/data['sourceSize'][0],h/data['sourceSize'][1];shapes=[]
    for s in data['shapes']:
        if 'ellipse' in s:
            x,y,bw,bh=s['ellipse'];shapes.append({'type':'ellipse','box':[x*sx,y*sy,bw*sx,bh*sy],'colour':s['colour']})
        else:
            poly=Polygon([(x*sx,y*sy) for x,y in s['points']]);assert poly.is_valid
            for t in shapely.constrained_delaunay_triangles(poly).geoms:
                shapes.append({'type':'polygon','points':[list(p) for p in list(t.exterior.coords)[:-1]],'colour':s['colour']})
    return shapes

def refit_colours(shapes,image):
    w,h=image.size;labels=np.full((h,w),-1,np.int32)
    for layer,s in enumerate(shapes):
        if s['type']=='rect':x,y,bw,bh=s['box'];pts=np.array([[x,y],[x+bw,y],[x+bw,y+bh],[x,y+bh]])
        else:pts=np.array(s['points'])
        cv2.fillConvexPoly(labels,np.rint(pts).astype(np.int32),layer)
    pixels=np.asarray(image);valid=labels>=0;ids=labels[valid];count=np.bincount(ids)
    colours=np.zeros((len(count),3),float)
    for c in range(3):colours[:,c]=np.bincount(ids,weights=pixels[:,:,c][valid],minlength=len(count))/np.maximum(count,1)
    for layer,s in enumerate(shapes):
        if layer<len(count) and count[layer]>0:s['colour']='#'+''.join(f'{v:02X}' for v in np.rint(colours[layer]).astype(int))

def run(source,out,budgets,difference,speckle,features=False,semantic=False,prune=False,refit=False):
    out.mkdir(parents=True);start=time.perf_counter();im=Image.open(source).convert('RGB');w=1254;h=round(im.height*w/im.width)
    image=im.resize((w,h),Image.Resampling.LANCZOS);image.save(out/'input.png')
    cfg=dict(colormode='color',hierarchical='stacked',mode='polygon',filter_speckle=speckle,color_precision=6,layer_difference=difference,corner_threshold=60,length_threshold=4,max_iterations=10,path_precision=2)
    vtracer.convert_image_to_svg_py(str(out/'input.png'),str(out/'paths.svg'),**cfg)
    traced=polygons(out/'paths.svg');print('paths',len(traced),flush=True)
    details=[]
    if semantic:details=semantic_face(w,h)
    if features:
        for name,roi in [('face',(.445,.211,.560,.355))]:
            x0,y0,x1,y1=map(round,[roi[0]*w,roi[1]*h,roi[2]*w,roi[3]*h]);image.crop((x0,y0,x1,y1)).save(out/(name+'.png'))
            vtracer.convert_image_to_svg_py(str(out/(name+'.png')),str(out/(name+'.svg')),**{**cfg,'filter_speckle':1,'layer_difference':16,'length_threshold':3.5})
            local=[(translate(p,xoff=x0,yoff=y0),c) for p,c in polygons(out/(name+'.svg'))]
            lo,hi=.01,30
            for _ in range(14):
                mid=(lo+hi)/2
                if len(triangles(local,mid,w,h,True))>300:lo=mid
                else:hi=mid
            fine=triangles(local,hi,w,h,True)
            refit_colours(fine,image)
            for s in fine:s.pop('layer',None)
            details.extend(fine)
        print('featureTriangles',len(details),flush=True)
        details.extend(semantic_face(w,h,markers=True))
    results=[]
    for budget in budgets:
        lo,hi=.02,250
        for _ in range(16):
            mid=(lo+hi)/2;s=triangles(traced,mid,w,h,prune,features)
            if len(s)+len(details)>budget:lo=mid
            else:hi=mid
        shapes=triangles(traced,hi,w,h,prune,features)
        if refit:refit_colours(shapes,image)
        for s in shapes:s.pop('layer',None)
        shapes+=details;render=Image.new('RGB',(w,h));draw=ImageDraw.Draw(render)
        for s in shapes:
            if s['type'] in ('rect','ellipse'):
                x,y,bw,bh=s['box'];getattr(draw,'ellipse' if s['type']=='ellipse' else 'rectangle')((x,y,x+bw,y+bh),fill=s['colour'])
            else:draw.polygon([tuple(p) for p in s['points']],fill=s['colour'])
        diff=np.abs(np.asarray(render).astype(float)-np.asarray(image))
        metrics={'images':len(shapes),'mae':float(diff.mean()),'faceMAE':float(diff[int(.20*h):int(.36*h),int(.44*w):int(.56*w)].mean()),'epsilon':hi}
        pack={'width':w,'height':h,'sourceSize':list(im.size),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'algorithm':'VTracer stacked polygon layers -> constrained native triangles','nativeMode':'single-axis-static-xyz','nativeImages':len(shapes),'vtracerVersion':'0.6.15','config':cfg,'occlusionPruned':prune,'visibleColourRefit':refit,'semanticFace':semantic,'featureTriangles':len(details),'detailSourceSha256':hashlib.sha256(Path(__file__).with_name('source-details.json').read_bytes()).hexdigest(),'metrics':metrics,'shapes':shapes}
        (out/f'budget-{budget}.json').write_text(json.dumps(pack,separators=(',',':')));render.resize((836,round(h*836/w)),Image.Resampling.LANCZOS).save(out/f'budget-{budget}.png');results.append(metrics);print(json.dumps(metrics),flush=True)
    (out/'receipt.json').write_text(json.dumps({'fitterSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'results':results,'seconds':time.perf_counter()-start},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('out',type=Path);p.add_argument('--budgets',type=int,nargs='+',default=[1500,1600]);p.add_argument('--difference',type=int,default=32);p.add_argument('--speckle',type=int,default=12);p.add_argument('--features',action='store_true');p.add_argument('--semantic',action='store_true');p.add_argument('--prune',action='store_true');p.add_argument('--refit',action='store_true');a=p.parse_args();run(a.source,a.out,a.budgets,a.difference,a.speckle,a.features,a.semantic,a.prune,a.refit)
