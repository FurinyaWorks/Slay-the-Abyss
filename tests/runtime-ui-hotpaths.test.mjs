import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {runLua} from '../scripts/test-lua.mjs';
import {luaString} from '../scripts/build-lua-data.mjs';
for(const name of ['runtime_ui_hotpaths','hand_geometry_cache','potion_drag_hotpath'])test(`runtime UI: ${name}`,()=>{
 const result=runLua(`tests/lua/${name}.lua`);
 assert.equal(result.status,0,result.stdout+result.stderr);
});
function assertLaneTrajectory(stdout){
 const lines=text=>text.split(/\r?\n/).filter(line=>line.startsWith('RUNTIME_TRAJECTORY '));
 const actual=lines(stdout),before=lines(readFileSync('docs/evidence/m9-runtime-20261103/baseline-trajectory.txt','utf8'));
 assert.equal(actual.length,before.length);
 const settled=before[0].split('|').slice(10).map(s=>Number(s.split(',')[1]));
 const settledLane=Math.min(...settled.slice(1).map((x,j)=>Math.abs(x-settled[j])));
 for(let i=0;i<actual.length;i++){
  const a=actual[i].split('|'),b=before[i].split('|');assert.equal(a.length,b.length);
  assert.deepEqual(a.slice(0,10),b.slice(0,10),'game state and event order');
  const cards=b.slice(10).map(s=>s.split(','));
  for(let k=10;k<a.length;k++){
   const fields=a[k].split(','),prior=b[k].split(',');assert.equal(fields.length,prior.length);
   // #621 intentionally capped overlapping hit rectangles to adjacent card
   // lanes. Derive the lane independently from the immutable card positions;
   // every other old transform/value must still match byte-for-byte.
   const lane=cards.length>1?settledLane:Infinity;
   const settledWidth=Number(before[0].split('|')[k].split(',')[7]);
   // Drag frames retain the last painted hand hit rectangle while the carried
   // card scales independently. Preserve that cached geometry's old ratio.
   const width=Number(prior[7])*Math.min(1,lane/settledWidth);
   assert(Math.abs(Number(fields[7])-width)<1e-8,'hand hit width must fill exactly one non-overlapping lane');
   for(let f=0;f<fields.length;f++)if(f!==7)assert.equal(fields[f],prior[f],`trajectory ${i} card ${k-10} field ${f}`);
  }
 }
}
test('real Host ordered trajectory preserves the frozen values with disjoint hand hit lanes',()=>{
 const result=runLua('tests/lua/runtime_ui_trajectory.lua');assert.equal(result.status,0,result.stdout+result.stderr);
 assertLaneTrajectory(result.stdout);
});
test('real trajectory rejects removal of the disjoint hand lane cap',()=>{
 const module='abyss_battle_card_view',source=readFileSync(`src/lua/${module}.lua`,'utf8');
 const anchor='math.min(width,target.hitWidth or width)';assert.equal(source.split(anchor).length,2);
 const file=join(tmpdir(),`hand-lane-mutant-${randomUUID()}.lua`);
 writeFileSync(file,`package.preload[${luaString(module)}]=assert(load(${luaString(source.replace(anchor,'width'))},'@lane-mutant'))\ndofile('tests/lua/runtime_ui_trajectory.lua')\n`);
 try{const result=runLua(file);assert.equal(result.status,0,result.stdout+result.stderr);assert.throws(()=>assertLaneTrajectory(result.stdout),/hand hit width must fill exactly one non-overlapping lane/);}finally{unlinkSync(file);}
});
const mutations=[
 ['owner','painted.owner==owner and ','','shared native owner was ignored'],
 ['new hit','painted.hit[1]==hit and ','','new hit was not initialized'],
 ['dead hit','and hit.alive~=false ','','dead native guard was bypassed'],
 ['failed write','if accepted and current and ','if current and ','failed hand geometry promise survived'],
 ['reentry','if accepted and current and ','if accepted and ','overlapping hand write was incorrectly cached'],
 ['throw cleanup',
  'handGeometry[box]=nil\n    if not ok then error(accepted,0) end',
  'if not ok then error(accepted,0) end\n    handGeometry[box]=nil',
  'overlapping hand write was incorrectly cached'],
 ['layout writer',
  'handGeometry[box]=nil\n        local point=placeCard',
  'local point=placeCard',
  'layout overwrote cached hand angle'],
];
for(const [name,anchor,replacement,failure]of mutations)test(`runtime UI negative control: ${name}`,()=>{
 const module='abyss_battle_card_view',path=`src/lua/${module}.lua`;
 const source=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 assert.equal(source.split(anchor).length-1,1,'mutation must hit exactly one boundary');
 const entry=join(tmpdir(),`hand-geometry-mutant-${randomUUID()}.lua`);
 writeFileSync(entry,`package.preload[${luaString(module)}]=assert(load(${luaString(source.replace(anchor,replacement))},'@${module}-mutant'))\ndofile('tests/lua/hand_geometry_cache.lua')\n`);
 try{
  const result=runLua(entry);assert.notEqual(result.status,0,'mutant must fail');
  assert.ok((result.stdout+result.stderr).includes(failure),result.stdout+result.stderr);
 }finally{unlinkSync(entry);}
});
test('runtime UI negative control: deferred activation violates render ordering',()=>{
 const module='abyss_game_ui_view',source=readFileSync(`src/lua/${module}.lua`,'utf8');
 const anchor='suspendBattle(run,deckOpen,potionOpen))';assert.equal(source.split(anchor).length-1,1);
 const entry=join(tmpdir(),`gameui-render-mutant-${randomUUID()}.lua`);
 writeFileSync(entry,`package.preload[${luaString(module)}]=assert(load(${luaString(source.replace(anchor,'suspendBattle(run,deckOpen,potionOpen),true)'))},'@${module}-mutant'))\ndofile('tests/lua/runtime_ui_hotpaths.lua')\n`);
 try{const result=runLua(entry);assert.notEqual(result.status,0);assert.match(result.stdout+result.stderr,/GameUI refresh must preserve both observable render boundaries/);}finally{unlinkSync(entry);}
});
test('runtime UI negative control: early paint misses a native reentrant command',()=>{
 const module='abyss_game_ui_view';let source=readFileSync(`src/lua/${module}.lua`,'utf8').replaceAll('\r\n','\n');
 const anchor='suspendBattle(run,deckOpen,potionOpen))';assert.equal(source.split(anchor).length-1,1);
 const final='        self.battleUI:render()\n';assert.equal(source.split(final).length-1,1);
 source=source.replace(final,'');
 const entry=join(tmpdir(),`gameui-early-paint-${randomUUID()}.lua`);
 writeFileSync(entry,`ABYSS_RUNTIME_BASELINE=true;package.preload[${luaString(module)}]=assert(load(${luaString(source)},'@${module}-mutant'))\ndofile('tests/lua/runtime_ui_hotpaths.lua')\n`);
 try{const result=runLua(entry);assert.notEqual(result.status,0);assert.match(result.stdout+result.stderr,/GameUI final paint missed reentrant Run.play/);}finally{unlinkSync(entry);}
});
test('runtime UI negative control: a cached potion preflight misses in-place rule changes',()=>{
 const module='abyss_battle_potion_bindings',source=readFileSync(`src/lua/${module}.lua`,'utf8');
 const anchor='local item=Run.potionSlotView(owner.run,held.slot)';assert.equal(source.split(anchor).length-1,1);
 const mutant=source.replace(anchor,'local item=held.cachedItem or Run.potionSlotView(owner.run,held.slot);held.cachedItem=item');
 const entry=join(tmpdir(),`potion-preflight-cache-${randomUUID()}.lua`);
 writeFileSync(entry,`ABYSS_RUNTIME_BASELINE=true;package.preload[${luaString(module)}]=assert(load(${luaString(mutant)},'@${module}-mutant'))\ndofile('tests/lua/potion_drag_hotpath.lua')\n`);
 try{const result=runLua(entry);assert.notEqual(result.status,0);assert.match(result.stdout+result.stderr,/stale drag candidate accepted an in-place rule change/);}finally{unlinkSync(entry);}
});
