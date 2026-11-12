import test from 'node:test';import assert from 'node:assert/strict';
import {menuRuinsScene,sceneInventory} from '../scripts/menu-ruins-scene.mjs';
import {applyV25MenuLayout} from '../scripts/v25-menu-layout.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';import {nativeTheme} from '../scripts/native-ui-theme.mjs';
const nodes=n=>n.children??n.controls??[],all=n=>[n,...nodes(n).flatMap(all)];
test('menu scenery stays static, bounded and outside the input transaction',()=>{
 const scene=menuRuinsScene(),inventory=sceneInventory(scene);
 assert(inventory.images<=150);assert(inventory.maxChildren<=60);
 for(const n of all(scene)){
  assert(['image','container'].includes(n.kind));assert(!n.script&&!n.scripts&&!n.focusable);
  assert(new Set(nodes(n).map(c=>c.name)).size===nodes(n).length);
  if(n.kind==='image'){assert(n.size.every(v=>Number.isFinite(v)&&v>0));assert([100001,100002,100003,100004,100006,106095].includes(n.image));}
 }
 const layout=gameLayout(),menu=all(layout).find(n=>n.name==='menuPanel'),start=nodes(menu).find(n=>n.name==='start'),hit=nodes(start).find(n=>n.name==='hit');
 applyV25MenuLayout(layout,nativeTheme);applyV25MenuLayout(layout,nativeTheme);
 assert.equal(nodes(menu).filter(n=>n.name==='menuRuinsScene').length,1);
 assert.equal(nodes(start).find(n=>n.name==='hit'),hit);
 assert(nodes(menu).indexOf(nodes(menu).find(n=>n.name==='menuRuinsScene'))<nodes(menu).indexOf(start));
});
