import test from 'node:test';
import assert from 'node:assert/strict';
import {cards} from './mechanics.mjs';
import {starterIds,createBattle,useCard,previewVisible,playerView} from './battle.mjs';
function setup(id,up=false,systems=false){
 const deck=[id,...(systems?['KQS001','KQS001','KQC001']:[]),...starterIds];
 const s=createBattle({deckIds:deck,order:deck.map((_,i)=>i),enemies:[{hp:100,block:0,intent:0}]});
 s.hand[0].upgraded=up;return s;
}
for(const up of [false,true]){
test('batch23 post-draw discard sees actual drawn card '+up,()=>{
 const s=setup('KQ043',up),before=structuredClone(s),drawn=s.draw[0].instance;
 let seen;
 const r=useCard(s,'starter-0',0,{choose:opts=>{seen=opts;opts[0].id='poison';return drawn;}});
 assert.equal(seen.length,5);assert.equal(r.block,up?7:4);
 assert.equal(r.discard[0].instance,drawn);assert.equal(r.hand.length,4);assert.deepEqual(s,before);
 assert.ok(r.hand.every(c=>c.id!=='poison'));assert.equal(r.energy,2);
});
test('batch23 bounded inspect preserves remainder order '+up,()=>{
 const s=setup('KQ044',up),before=structuredClone(s);let count;
 const selected=s.draw[2].instance;
 const r=useCard(s,'starter-0',0,{choose:opts=>{count=opts.length;return selected;}});
 assert.equal(count,up?4:3);assert.equal(r.hand.at(-1).instance,selected);
 assert.deepEqual(r.draw.map(c=>c.instance),s.draw.filter(c=>c.instance!==selected).map(c=>c.instance));
 assert.equal(r.exhaust[0].id,'KQ044');assert.deepEqual(s,before);
});
test('batch23 statuses only, genuine exhaust power once '+up,()=>{
 const s=setup('KQ060',up,true);s.powers={exhaustDraw:2};
 const r=useCard(s,'starter-0',0,{purge:['starter-1','starter-2']});
 assert.equal(r.block,(up?8:5)+2);assert.equal(r.exhaust.length,2);assert.equal(r.hand.length,3);
 assert.equal(r.exhaustPowerUsed,true);assert.equal(r.hand.some(c=>c.id==='KQC001'),true);
 for(const purge of [['starter-3'],['starter-4'],['starter-1','starter-1'],null]){
 const before=structuredClone(s);assert.throws(()=>useCard(s,'starter-0',0,{purge}));assert.deepEqual(s,before);}
});
}
test('batch23 preview refuses future selection and errors preserve input',()=>{
 for(const id of ['KQ043','KQ044','KQ060']){
 const s=setup(id),before=structuredClone(s);
 assert.throws(()=>previewVisible(playerView(s),'starter-0',0));
 if(id!=='KQ060')for(const choose of [undefined,()=> 'missing',()=>{throw Error('failure');}]){
 assert.throws(()=>useCard(s,'starter-0',0,{choose}));assert.deepEqual(s,before);}
 assert.deepEqual(useCard(s,'starter-0',0,{cancel:true}),s);
 }
});
test('batch23 inspect does not shuffle or override lock',()=>{
 for(const locked of [true,false]){
 const s=setup('KQ044');if(locked)s.drawLocked=true;else{s.discard.push(...s.draw);s.draw=[];}
 const r=useCard(s,'starter-0',0,{choose:()=>{throw Error('must not inspect');}});
 assert.equal(r.hand.length,4);assert.equal(r.rng,s.rng);
 }
});
test('batch23 system objects are not player cards and cannot be played',()=>{
 const s=setup('KQ060',false,true);assert.equal(Object.keys(cards).length,75);
 assert.throws(()=>useCard(s,'starter-1',0),/unplayable/);
});
