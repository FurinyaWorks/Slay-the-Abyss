import test from 'node:test';import assert from 'node:assert/strict';import {initial,play,nextTurn,endTurn} from './mechanics.mjs';import {createBattle,starterIds,useCard,finishTurn,playerView,previewVisible} from './battle.mjs';
for(const up of [false,true]){
 test('batch10 last charge independent conditional '+up,()=>{for(const n of [0,1,2]){const s=initial([{id:'KQ020',instance:'x',upgraded:up}],[{hp:100,block:0}]);s.infusion=n;const r=play(s,'x',0);assert.equal(r.block,n===1?4:0);assert.equal(r.enemies[0].hp,100-(up?10:7)-(n?2:0));assert.equal(r.infusion,Math.max(0,n-1));}});
 test('batch10 kill condition preserves wedge on failure and only hits others '+up,()=>{for(const hp of [1,100])for(const wedge of [null,2]){const s=initial([{id:'KQ030',instance:'x',upgraded:up}],[{hp,block:0},{hp:100,block:0}]);s.wedgeUntil=wedge;const r=play(s,'x',0);assert.equal(r.wedgeUntil,hp===1?null:wedge);assert.equal(r.enemies[1].hp,hp===1&&wedge!==null?95:100);assert.deepEqual(play(s,'x',0,{cancel:true}),s);}});
 for(const id of ['KQ014','KQ039'])test('batch10 actual deferred defense after reset '+id+' '+up,()=>{
  const s=createBattle({deckIds:[...starterIds,id],order:[10,0,1,2,3,4,5,6,7,8,9],relic:false,enemies:[{hp:100,block:0,intent:12}]});s.hand[0].upgraded=up;
  const r=useCard(s,'starter-10',0),p=previewVisible(playerView(s),'starter-10',0);assert.equal(r.nextBlock,p.nextBlock);
  const now=id==='KQ039'?(up?6:4):0,future=id==='KQ039'?(up?6:4):(up?6:3);
  assert.equal(r.block,now);assert.equal(r.nextBlock,future);assert.deepEqual(useCard(s,'starter-10',0,{cancel:true}),s);
  const after=finishTurn(r);assert.equal(after.hp,60-12+now);assert.equal(after.block,future);assert.equal(after.nextBlock,undefined);
  const twice=finishTurn(after);assert.equal(twice.block,0);assert.equal(twice.hp,after.hp-Math.max(0,12-future));
 });
}
test('batch10 deferred block invalid input rejects and does not leak across new battle',()=>{const s=createBattle();s.nextBlock=NaN;assert.throws(()=>finishTurn(s),/deferred/);assert.equal(createBattle().nextBlock,undefined);});
test('resource-consuming card text exposes wedge bounds in both versions',async()=>{
 const {describe}=await import('./mechanics.mjs');for(const id of ['KQ029','KQ030','KQ032'])for(const up of [false,true])assert.match(describe(id,up),/雷楔：上限1枚，下一己方回合结束清除，不叠加/);
});
test('014 deferred block does not suppress immediate first-setup relic',()=>{
 const s=createBattle({deckIds:[...starterIds,'KQ014'],order:[10,0,1,2,3,4,5,6,7,8,9],relic:true});const r=useCard(s,'starter-10',0);assert.equal(r.block,4);assert.equal(r.nextBlock,3);assert.equal(r.relicUsed,true);
});
