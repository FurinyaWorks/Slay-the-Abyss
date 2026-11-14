import test from 'node:test';import assert from 'node:assert/strict';
import {applyV25MenuLayout} from '../scripts/v25-menu-layout.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import * as Scene from '../scripts/menu-red-scene.mjs';
const children=n=>n.controls??n.children??[],all=n=>[n,...children(n).flatMap(all)];
test('minimal menu uses the supplied native background, fixed input and two actions',()=>{
 const layout=gameLayout();applyV25MenuLayout(layout,nativeTheme);applyV25MenuLayout(layout,nativeTheme);
 const menu=all(layout).find(n=>n.name==='menuPanel');
 const scene=all(menu).find(n=>n.name==='menuRedBackground');assert(scene,'new reference must be in the actual layout');
 assert.equal(children(menu).filter(n=>n.name==='menuRuinsScene').length,1,'stable scene handle remains idempotent');
 assert.equal(all(scene).filter(n=>n.kind==='image').length<=1600,true);
 assert(all(scene).length<=1800,'Total background controls, including transform holders, must remain inside the user budget');
 for(const n of all(scene)){assert(['container','image'].includes(n.kind));assert(children(n).length<=60);assert(!n.focusable&&!n.scripts);if(n.kind==='image'){assert([100001,100002,100003].includes(n.image));assert(!n.fill&&!n.feather,'static background has no per-triangle stencil/soft masks');}}
 assert.equal(children(menu).find(n=>n.name==='title').visible,false);
 const mark=all(menu).find(n=>n.name==='titleMark');
 assert.equal(all(mark).find(n=>n.name==='subtitle').text.content,'Slay the Heavens');
 assert.equal(all(menu).filter(n=>n.name==='titleMark').length,1,'static title is not duplicated on refresh');
 assert(!all(mark).some(n=>n.kind==='cursorArea'),'title never intercepts input');
 assert(!all(menu).some(n=>['图鉴','游戏记录'].includes(n.text?.content)));
 for(const name of ['start','titleQuit']){
  const b=children(menu).find(n=>n.name===name),label=children(b).find(n=>n.name==='label'),hit=children(b).find(n=>n.name==='hit');
  assert.deepEqual(hit.size,[280,56]);assert.equal(label.text.outline,false);assert.equal(label.text.autoSize,false);
  const face=children(b).find(n=>n.name==='v25MenuFace');
  assert.deepEqual(children(face).map(n=>n.name),['normal','hover','pressed','disabled']);
  assert.equal(new Set(children(face).map(n=>children(n).find(c=>c.name==='plate').colour)).size,4,'all four button states have distinct plates');
 }
});
test('one unmasked native triangle preserves all three vertices under affine placement',()=>{
 const rotate=([x,y],deg)=>{const a=deg*Math.PI/180;return[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)]};
 for(const vertices of [[[0,0],[100,0],[30,80]],[[20,-30],[-100,20],[60,160]],[[0,0],[300,1],[120,3]]]){
  const parent=Scene.nativeMenuTriangle(vertices,'probe','#FFFFFF'),image=parent.children[0];
  assert.equal(image.image,100003);assert(!image.fill&&!image.feather);
  const corners=[[-.5,-.5],[.5,-.5],[0,.5]].map(([x,y])=>{
   const p=rotate([x*image.size[0],y*image.size[1]],image.rotation),q=rotate([p[0]*parent.scale[0],p[1]*parent.scale[1]],parent.rotation);
   return[q[0]+parent.position[0],q[1]+parent.position[1]];
  });
  corners.forEach((p,i)=>assert(Math.hypot(p[0]-vertices[i][0],p[1]-vertices[i][1])<1e-6,'affine placement must retain source silhouette'));
 }
});
