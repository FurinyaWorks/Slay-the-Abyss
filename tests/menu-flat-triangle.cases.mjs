import test from 'node:test';import assert from 'node:assert/strict';import{flatTriangle}from'../scripts/menu-flat-triangle.mjs';
const check=points=>{
 const s=flatTriangle(points,'probe','#FFFFFF');if(!s)return false;
 assert.equal(s.kind,'image');assert(!s.children);assert(s.rotation[0]===0||s.rotation[1]===0);
 const [rx,ry,rz]=s.rotation.map(d=>d*Math.PI/180),[cx,cy]=s.position,[w,h]=s.size;
 const projected=[[-w/2,-h/2],[w/2,-h/2],[0,h/2]].map(([x,y])=>{
  const a=x*Math.cos(rz)-y*Math.sin(rz),b=x*Math.sin(rz)+y*Math.cos(rz);
  return[cx+a*Math.cos(ry),cy+b*Math.cos(rx)];
 });
 for(const p of points)assert(Math.min(...projected.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1])))<1e-6,'Native XYZ projection must retain all source vertices');
 return true;
};
test('one image retains source triangle geometry under native single-axis rotations',()=>{
 for(const p of [[[0,0],[100,0],[30,80]],[[20,-30],[-100,20],[60,160]],[[0,0],[300,1],[120,3]],[[0,0],[40,100],[100,0]]])check(p);
 let seed=37;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32};
 let legal=0;for(let i=0;i<500;i++)legal+=check(Array.from({length:3},()=>[random()*1200-600,random()*700-350]));
 assert(legal>0&&legal<500,'Exercise legal placements and explicitly unsupported geometry, which requires the tested exact fallback');
});
