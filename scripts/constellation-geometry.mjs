import {readFileSync} from 'node:fs';
const geometry=JSON.parse(readFileSync(new URL('../data/presentation/constellation-geometry.json',import.meta.url),'utf8'));
export function constellationGeometry(theme){
 const k=118/512;
 const images=geometry.segments.map(([x1,y1,x2,y2,width],i)=>({
  name:'stroke'+i,kind:'image',image:theme.image.rect,colour:'#FFE0A2',opacity:geometry.opacity,
  position:[((x1+x2)/2-256)*k,(256-(y1+y2)/2)*k],
  size:[Math.hypot(x2-x1,y2-y1)*k+.12,width*k],rotation:-Math.atan2(y2-y1,x2-x1)*180/Math.PI,
  focusable:false,raycastTarget:false,
 }));
 for(const [i,[cx,cy,radius,start,sweep,width]]of (geometry.arcs??[]).entries()){
  // Native ring uses a 7-unit stroke. Local scaling gives an icon-sized arc;
  // keep the unscaled image within the existing 900-unit image height budget.
  const idealScale=width*k/7,diameter=Math.min(900,2*(radius*k/idealScale+3.5));
  const scale=radius*k/(diameter/2-3.5);
  images.push({name:'arc'+i,kind:'image',image:100006,colour:'#FFE0A2',opacity:geometry.opacity*Math.min(1,idealScale/scale),
   position:[(cx-256)*k,(256-cy)*k],size:[diameter,diameter],scale:[scale,scale],rotation:-(start+sweep/2)*180/Math.PI,
   // A circular stroke cropped by a chord is the same symmetric arc. This
   // uses the existing horizontal mask supported by both native and Simulator,
   // without relying on the Simulator's unimplemented radial fill.
   fill:{shape:'horizontal',from:'right',amount:(diameter/2-(diameter/2-3.5)*Math.cos(Math.abs(sweep)/2))/diameter},focusable:false,raycastTarget:false});
 }
 return {name:'v25Constellation',kind:'container',position:[0,0],size:[118,118],visible:true,
  children:Array.from({length:Math.ceil(images.length/60)},(_,i)=>({name:'part'+i,kind:'container',size:[118,118],children:images.slice(i*60,i*60+60)}))};
}
