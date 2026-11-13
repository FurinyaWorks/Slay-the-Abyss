import test from 'node:test';
import assert from 'node:assert/strict';
import { initial, play, endTurn, startTurn, catalogue, cardText } from './engine.mjs';
const hand = (s,id,upgraded=false) => ({...s,hand:[{id,upgraded}]});
test('independent base/upgrade oracles, charge 0/1/2',()=>{
 for (const upgraded of [false,true]) for(const charge of [0,1,2]) {
  const s=hand(initial([{hp:40,block:0,intent:0},{hp:40,block:0,intent:0}]),'ganyu-03',upgraded); s.charge=charge;
  const out=play(s,0,0); const direct=upgraded?9:7,bloom=charge===2?(upgraded?8:6):0;
  assert.deepEqual(out.enemies.map(e=>e.hp),[40-direct-bloom,40-bloom]);
  assert.equal(out.charge,charge===2?0:charge); assert.equal(out.energy,2); assert.equal(out.discard.length,1);
 }
});
test('primary lethal still blooms; armor consumed separately, exact lethal',()=>{
 const s=hand(initial([{hp:7,block:0,intent:99},{hp:6,block:0,intent:99}]),'ganyu-03'); s.charge=2;
 assert.equal(play(s,0,0).phase,'won');
 s.enemies=[{hp:20,block:8,intent:0}]; assert.equal(play(s,0,0).enemies[0].hp,15);
});
test('invalid target/payment/index and cancel cannot mint resources or move cards',()=>{
 const s=hand(initial(),'ganyu-06'); s.energy=0; const before=structuredClone(s);
 assert.throws(()=>play(s,0),/unpayable/); assert.deepEqual(s,before); assert.deepEqual(play(s,0,null,true),s);
 assert.throws(()=>play(s,-1)); s.hand=[{id:'ganyu-03'}]; s.energy=3;
 assert.throws(()=>play(s,0,9),/invalid target/); assert.equal(s.energy,3);
});
test('all other base/upgrade effect contracts',()=>{
 for(const up of [false,true]) {
  assert.equal(play(hand(initial(),'ganyu-01',up),0,0).enemies[0].hp,up?21:24);
  assert.equal(play(hand(initial(),'ganyu-02',up),0).block,up?8:5);
  const e=play(hand(initial(),'ganyu-04',up),0); assert.equal(e.block,up?8:6);assert.equal(e.enemies[0].hp,up?26:27);
  assert.equal(play(hand(initial(),'ganyu-06',up),0).charge,up?2:1);
 }
});
test('bank unused energy at end, saturation, no passive per-card grant',()=>{
 const s=initial();s.energy=3;s.charge=1;const out=endTurn(s);assert.equal(out.charge,2);assert.equal(out.energy,0);
 assert.equal(play(hand(initial(),'ganyu-01'),0,0).charge,0);
 for(let i=0;i<100;i++){const a=hand(initial(),'ganyu-06');a.charge=2;assert.equal(play(a,0).charge,2);}
});
test('storm two ticks, refresh max not sum, dead enemies cannot attack',()=>{
 let s=hand(initial([{hp:4,block:0,intent:99},{hp:40,block:0,intent:3}]),'ganyu-05');
 s=play(s,0);s=endTurn(s);assert.equal(s.hp,57);assert.equal(s.storm.turns,1);
 s=startTurn(s);s=endTurn(s);assert.equal(s.storm,null);assert.equal(s.enemies[1].hp,32);
 let q=hand(initial(),'ganyu-05',true);q=play(q,0);q.energy=2;q.hand=[{id:'ganyu-05'}];q=play(q,0);
 assert.deepEqual(q.storm,{amount:6,turns:2});
});
test('storm cannot be funded by future banking, and no enemy turn after victory',()=>{
 const s=hand(initial([{hp:4,block:0,intent:999}]),'ganyu-05');s.energy=1;assert.throws(()=>play(s,0));
 s.energy=3;const out=endTurn(play(s,0));assert.equal(out.phase,'won');assert.equal(out.hp,60);assert.throws(()=>endTurn(out));
});
test('block persists across enemy multihits then clears next turn; death stops turn',()=>{
 const s=initial([{hp:20,block:0,intent:[3,4]}]);s.block=5;
 const out=endTurn(s);assert.equal(out.hp,58);assert.equal(startTurn(out).block,0);
 s.hp=1;s.block=0;assert.equal(endTurn(s).phase,'lost');assert.throws(()=>startTurn(endTurn(s)));
});
test('no retain/shuffle implied, draw has hand cap and actual availability',()=>{
 const s=initial();s.hand=[{id:'ganyu-03'}];s.draw=Array.from({length:7},()=>({id:'ganyu-01'}));
 const out=startTurn(endTurn(s));assert.equal(out.hand.length,5);assert.equal(out.draw.length,2);assert.equal(out.discard.length,1);
 out.phase='between';out.hand=Array(9).fill({id:'ganyu-01'});assert.equal(startTurn(out).hand.length,10);
});
test('opposite reachable choices: lethal now vs preserve charge economy',()=>{
 const s=hand(initial([{hp:6,block:0,intent:10}]),'ganyu-01');s.hp=8;
 assert.equal(play(s,0,0).phase,'won');assert.equal(endTurn(s).phase,'lost');
 const setup=initial([{hp:35,block:0,intent:0}]);setup.hand=[{id:'ganyu-01'}];setup.draw=[{id:'ganyu-03'}];setup.energy=2;
 const bank=startTurn(endTurn(setup));const spend=startTurn(endTurn(play(setup,0,0)));
 assert.equal(play(bank,0,0).enemies[0].hp,22);assert.equal(play(spend,0,0).enemies[0].hp,22);
 // Single target ties; extra enemy makes saved charge strictly useful.
 setup.enemies.push({hp:20,block:0,intent:0});
 assert.equal(play(startTurn(endTurn(setup)),0,0).enemies[1].hp,14);
 assert.equal(play(startTurn(endTurn(play(setup,0,0))),0,0).enemies[1].hp,20);
});
test('display generated from same structured variants, no false approval',()=>{
 assert.equal(catalogue.cards.length,22);assert.equal(catalogue.production_enabled,false);
 for(const c of catalogue.cards){assert.equal(c.review.human_approved,false);assert.match(c.name,/^待命名·/);for(const up of [false,true]) assert.match(cardText(c.id,up),/能量/);}
 assert.match(cardText('ganyu-03',true),/9点伤害.*8点伤害/);
});

test('upgrade flag must be boolean; string false never grants upgrade',()=>{
 const s=hand(initial(),'ganyu-01');s.hand[0].upgraded='false';assert.throws(()=>play(s,0,0),/invalid upgrade/);assert.equal(s.energy,3);
});

test('storm independent base/upgraded costs, every tick and expiry',()=>{
 for(const up of [false,true]) {
  let s=play(hand(initial([{hp:50,block:0,intent:0}]),'ganyu-05',up),0);
  assert.equal(s.energy,1);assert.equal(s.enemies[0].hp,50);
  s=endTurn(s);assert.equal(s.enemies[0].hp,up?44:46);assert.equal(s.storm.turns,1);
  s=endTurn(startTurn(s));assert.equal(s.enemies[0].hp,up?38:42);assert.equal(s.storm,null);
  s=endTurn(startTurn(s));assert.equal(s.enemies[0].hp,up?38:42);
 }
});
test('unknown effect after payment rolls back caller; text follows duration data',()=>{
 const c=catalogue.cards.find(c=>c.id==='ganyu-05');const spec=c.base.effects[0];
 const s=hand(initial(),'ganyu-05'),before=structuredClone(s);const previous=structuredClone(spec);
 try {spec.turns=3;assert.match(cardText(c.id),/连续3个回合/);spec.op='unsupported';assert.throws(()=>play(s,0),/unknown effect/);assert.deepEqual(s,before);}
 finally {Object.assign(spec,previous);}
});

test('reject malformed numeric/terminal inputs atomically at every boundary',()=>{
 assert.throws(()=>initial([{hp:30,block:0,intent:-10}]),/invalid intent/);
 const mutations=[s=>s.energy=NaN,s=>s.hp=0,s=>s.block=-1,s=>s.charge=3,s=>s.charge=0.5,s=>s.enemies[0].hp=Infinity,s=>s.enemies[0].block=-2,s=>s.enemies[0].intent=[3,-1],s=>s.storm={amount:4,turns:0},s=>s.storm={amount:-1,turns:2}];
 for(const mutate of mutations) for(const fn of [s=>play(s,0,0),endTurn,startTurn]) {
  const s=hand(initial(),'ganyu-01');mutate(s);const before=structuredClone(s);assert.throws(()=>fn(s));assert.deepEqual(s,before);
 }
});

test('starter relic explicitly owns bank hook; removal, cap and active alternative',()=>{
 const s=initial();s.energy=3;s.charge=1;s.relics=[];
 assert.equal(endTurn(s).charge,1);assert.equal(endTurn(s).energy,0);
 s.hand=[{id:'ganyu-06'}];assert.equal(play(s,0).charge,2);
 s.relics=['ganyu-starter-01','ganyu-starter-01'];assert.throws(()=>endTurn(s),/invalid relics/);
});

test('draw card uses base/upgraded counts, pays first, cannot shuffle itself back',()=>{
 for(const up of [false,true]) {
  const s=hand(initial(),'ganyu-07',up);s.draw=Array.from({length:4},()=>({id:'ganyu-01'}));
  const r=play(s,0);assert.equal(r.hand.length,up?3:2);assert.equal(r.energy,2);assert.equal(r.discard.length,1);
 }
 const s=hand(initial(),'ganyu-07');s.discard=[{id:'ganyu-02'}];const r=play(s,0);
 assert.deepEqual(r.hand,[{id:'ganyu-02'}]);assert.deepEqual(r.discard,[{id:'ganyu-07',upgraded:false}]);
});
test('draw stops at hand limit without losing cards or spending extra RNG',()=>{
 const s=initial();s.hand=[{id:'ganyu-07'},...Array(9).fill({id:'ganyu-01'})];s.draw=Array(5).fill({id:'ganyu-02'});
 const r=play(s,0);assert.equal(r.hand.length,10);assert.equal(r.draw.length,4);assert.equal(r.drawSeed,s.drawSeed);
});

test('defensive draw settles block then exact draw without refund or starting-deck change',()=>{
 for(const up of [false,true]){const s=hand(initial(),'ganyu-08',up);s.draw=[{id:'ganyu-03'}];const r=play(s,0);assert.equal(r.block,up?8:5);assert.equal(r.energy,2);assert.deepEqual(r.hand,[{id:'ganyu-03'}]);assert.equal(r.discard[0].id,'ganyu-08');}
 assert.equal(catalogue.starting_deck.includes('ganyu-08'),false);
});

test('resolved discard instance never aliases caller hand',()=>{
 const s=hand(initial(),'ganyu-01');const before=structuredClone(s);const out=play(s,0,0);out.discard[0].upgraded=true;assert.deepEqual(s,before);assert.equal(s.hand[0].upgraded,false);
});

test('all-dead enemy arrays cannot start or continue resource generation',()=>{
 assert.throws(()=>initial([{hp:0,block:0,intent:0}]),/living enemies/);
 for(const phase of ['player','between']){const s=hand(initial(),'ganyu-06');s.phase=phase;s.enemies[0].hp=0;const before=structuredClone(s);for(const fn of [x=>play(x,0),endTurn,startTurn]){assert.throws(()=>fn(s),/living enemies/);assert.deepEqual(s,before);}}
});

test('two-cost guard charge plus arrow is payable in initial three energy',()=>{
 for(const up of [false,true]){let s=initial();s.hand=[{id:'ganyu-09',upgraded:up},{id:'ganyu-03'}];s=play(s,0);assert.equal(s.energy,1);assert.equal(s.block,up?11:8);assert.equal(s.charge,2);s=play(s,0,0);assert.equal(s.energy,0);assert.equal(s.enemies[0].hp,17);assert.equal(s.charge,0);}
});
test('seek base/upgrade pays real cost, preserves order/RNG and instance upgrade',()=>{
 for(const up of [false,true]){const s=hand(initial(),'ganyu-10',up);s.draw=[{id:'ganyu-02'},{id:'ganyu-03',upgraded:true},{id:'ganyu-01'}];const r=play(s,0);assert.equal(r.energy,up?3:2);assert.deepEqual(r.hand,[{id:'ganyu-03',upgraded:true}]);assert.deepEqual(r.draw,[{id:'ganyu-02'},{id:'ganyu-01'}]);assert.equal(r.drawSeed,s.drawSeed);assert.equal(r.discard[0].id,'ganyu-10');}
});
test('seek cannot recover discarded core or refund on a miss',()=>{
 const s=hand(initial(),'ganyu-10');s.discard=[{id:'ganyu-03'}];const r=play(s,0);assert.equal(r.hand.length,0);assert.equal(r.energy,2);assert.deepEqual(r.discard.map(c=>c.id),['ganyu-03','ganyu-10']);assert.deepEqual(s.hand,[{id:'ganyu-10',upgraded:false}]);
});
