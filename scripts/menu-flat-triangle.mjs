// Single-axis orthographic placement, derived from the project's existing
// PR390 solve() in scripts/art/native-triangle-placement.py (TASK-94 worktree).
// Each facet is one ordinary native image, with no transform-holder control.
export function flatTriangle(points,name,colour){
 let best;
 for(let apex=0;apex<3;apex++)for(const flip of [false,true]){
  const tip=points[apex],left=points[(apex+(flip?2:1))%3],right=points[(apex+(flip?1:2))%3];
  const mx=(left[0]+right[0])/2,my=(left[1]+right[1])/2;
  const [p,q,r,s]=[right[0]-left[0],right[1]-left[1],tip[0]-mx,tip[1]-my];
  for(const axis of ['x','y']){
   const numerator=axis==='x'?-q*s:-p*r,denominator=axis==='x'?p*r:q*s;
   let k2;if(Math.abs(p*r+q*s)<1e-9)k2=1;else if(Math.abs(denominator)<1e-12)continue;else k2=numerator/denominator;
   if(!(k2>0&&k2<=1.0000001))continue;
   for(const k of [Math.sqrt(Math.min(k2,1)),-Math.sqrt(Math.min(k2,1))]){
    const dx=axis==='y'?1/k:1,dy=axis==='x'?1/k:1;
    const w=Math.hypot(p*dx,q*dy),z=Math.atan2(q*dy,p*dx),h=-(r*dx)*Math.sin(z)+(s*dy)*Math.cos(z);
    if(!(h>1e-8&&w>1e-8&&w<=3200&&h<=1800))continue;
    const angle=Math.acos(Math.max(-1,Math.min(1,k)))*180/Math.PI;
    if(!best||angle<best.angle)best={angle,rotation3d:[axis==='x'?angle:0,axis==='y'?angle:0,z*180/Math.PI],position:[(tip[0]+mx)/2,(tip[1]+my)/2],size:[w,h]};
   }
  }
 }
 if(!best)return null;
 const {angle,rotation3d,...pose}=best;
 return{name,kind:'image',image:100003,colour,...pose,rotation:rotation3d};
}
