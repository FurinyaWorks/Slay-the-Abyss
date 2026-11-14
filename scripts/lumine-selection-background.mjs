// Reuse the owner-approved 1600 facets and the existing portrait lifecycle.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {nativeShape} from './v25-battle-scene.mjs';
export const lumineSelectionPath='experiments/lumine-native-fit/fit-hybrid-final/budget-1600.json';
export const selectionHalfTemplate='AbyssSelectionHalfTriangle';
export const selectionHalfImage=()=>({name:selectionHalfTemplate,kind:'image',size:[1,1],image:100003,colour:'#FFFFFF',visible:false,
 fill:{shape:'horizontal',from:'right',amount:.5}});
export function lumineSelectionBackground(root=process.cwd()){
 const bytes=readFileSync(join(root,lumineSelectionPath)),pack=JSON.parse(bytes);
 if(createHash('sha256').update(bytes).digest('hex')!=='6cfbdd774300b85addd63beb9a0ec208ac779afc9b9a033014f8633c86243a62')throw Error('Approved selection facets changed');
 if(pack.sourceSha256!=='29c47e50581951d1f3cf509eb39b1a73bf8d6ae4934a5b0606a3c76f9857c050'||pack.budget!==1600)throw Error('Unexpected approved selection background');
 const k=1280/pack.width,ky=720/pack.height;
 const images=pack.shapes.flatMap((shape,i)=>{
  if(shape.type==='nativeTriangle'){
   const p=shape.placement;
   return [{image:100003,colour:shape.colour,position:[p.cx*k-640,p.cy*ky-360],size:[p.w*k,p.h*k],rotation:p.rz,rx:p.rx,ry:p.ry}];
  }
  const scaled={...shape,name:'facet'+i,opacity:1,...(shape.box?{box:shape.box.map((v,i)=>v*(i%2?ky:k))}:{points:shape.points.map(([x,y])=>[x*k,y*ky])})};
  return nativeShape(scaled,{image:{rect:100001}}).map(n=>({...n,colour:shape.colour,position:[n.position[0],n.position[1]+22]}));
 });
 if(images.length!==1600)throw Error('Approved background must remain exactly 1600 primitives');
 const rows=images.map(n=>[n.image,...n.position,...n.size,...(n.pivot??[.5,.5]),.5,.5,.5,.5,...(n.scale??[1,1]),n.rotation??0,
  ...[1,3,5].map(i=>parseInt(n.colour.slice(i,i+2),16)),255,n.rx??0,n.ry??0,n.fill?1:0]);
 return {width:1280,height:720,count:rows.length,rows,root:[0,0,1280,1280,.5,.5,.5,.5,.5,.5,1,1,0],
  renderProfile:'lowpoly-v1',cache:true,runtimeV2:true,jsonSha256:createHash('sha256').update(bytes).digest('hex'),sourceSha256:pack.sourceSha256};
}
