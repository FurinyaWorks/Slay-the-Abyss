import test from 'node:test';
import assert from 'node:assert/strict';
import {cards,initialState,play,endTurn,textFor} from './model.mjs';
const run = (id,s=initialState(),upgraded=false) => play({...s, instances:{...s.instances,[s.hand[0]]:{id,upgraded}}},{id,instance:s.hand[0],upgraded,target:'enemy'});
const expected = [[6,9],[5,8],[12,16],[14,18],[24,32],[4,6],[5,7],[4,6],[5,7],[20,26],[5,7],[3,4],[2,3],[13,18],[8,11],[16,21],[4,6],[0,5],[6,8],[9,12],[3,4],[0,0],[12,16],[3,4],[0,0],[10,14],[24,32],[5,7],[4,6],[0,0],[2,3],[6,8],[4,5],[1,2],[5,8],[4,5],[10,14],[2,3],[6,8],[12,16],[4,6],[3,4],[4,6],[8,12],[3,5],[24,30],[2,4],[3,4],[2,3],[0,0],[3,5],[4,5],[0,0],[1,2],[1,2],[9,12],[3,4],[5,8],[1,2],[10,14],[4,6],[6,8],[6,9],[4,5],[0,0],[5,7],[4,6],[1,2],[2,3],[8,11],[5,7],[0,0],[1,2],[0,3],[9,12]];
for (const [i,c] of cards.entries()) for (const upgrade of [false,true]) {
  test(`${c.id} ${upgrade?'upgrade':'base'} independent effect and payment`,()=>{
    const s=initialState(); if(i===3||i===15||i===59)s.jade=6; if(i===16)s.jade=3; if(i===22||i===26)s.pillar=3; if(i===23||i===31||i===48||i===53||i===56||i===64||i===70||i===72)s.jade=3; if(i===32){s.jade=6;s.pillar=3;} if(i===34||i===38||i===39||i===43)s.jade=3; if(i===35||i===45||i===51||i===60||i===63||i===69||i===72||i===73||i===74)s.pillar=3;
    const r=run(c.id,s,upgrade); assert.equal(r.ok,true);
    assert.equal(r.state.energy,3-c.cost);
    const value=expected[i][Number(upgrade)];
    if([0,3,4,6,7,8,10,13,16,17,21,26,28,29,38,40,43,46,49,52,59,66,69,70,73].includes(i))assert.equal(r.state.enemy.hp,40-value);
    if([1,5,9,11,14,15,34,36,39,42,44,45,50,55,57,60,62].includes(i))assert.equal(r.state.block,value);
    if(i===16)assert.equal(r.state.jade,0);
    if(i===20||i===32||i===47||i===54)assert.equal(r.state.pillar,value);if(i===30){assert.equal(r.state.repair,value);assert.equal(r.state.jade,0);}
    if(i===35){assert.equal(r.state.pillar,0);assert.equal(r.state.pendingDraw,value);assert.equal(r.state.inUse,'a');}if(i===36){assert.equal(r.state.pendingDraw,upgrade?2:1);assert.equal(r.state.inUse,'a');}
    if(i===23||i===48||i===53){assert.equal(r.state.jade,0);assert.equal(r.state.pendingDraw,value);assert.equal(r.state.inUse,'a');}
    if(i===22){assert.equal(r.state.jade,value);assert.equal(r.state.pillar,0);}
    if(i===2||i===18||i===19||i===25||i===27||i===37||i===41)assert.equal(r.state.jade,value);
    if(i===3||i===15)assert.equal(r.state.jade,0);
    if(i===5)assert.equal(r.state.jade,upgrade?4:3);
    if(i===6)assert.equal(r.state.block,upgrade?7:5);
    if(i===31){assert.equal(r.state.counter,value);assert.equal(r.state.jade,0);}
    if(i===14)assert.equal(r.state.counter,upgrade?4:3);
    if(i===74)assert.equal(r.state.counter,value);
    if(i===72)assert.equal(r.state.enemy.weak,value);
    if(i===68)assert.equal(r.state.counter,value);
    if(i===65)assert.equal(r.state.jade,value);
    if(i===61)assert.equal(r.state.jade,value);
    if(i===58||i===63)assert.equal(r.state.enemy.vulnerable,value);
    if(i===12)assert.equal(r.state.enemy.vulnerable,upgrade?3:2);
    if(i===51||i===56)assert.equal(r.state.enemy.weak,value);
    if(i===8||i===33)assert.equal(r.state.enemy.weak,upgrade?2:1);
    if(i===7)assert.equal(r.state.jade,upgrade?4:3);
    assert.equal(r.state.hand.length,5); assert.deepEqual(r.state.discard,[9,11,18,20,23,26,29,30,32,35,36,37,38,39,45,47,48,50,51,53,54,60,61,63,66,67,69,70,72,73,74].includes(i)?[]:['a']); if(i===11||i===18){assert.equal(r.state.pendingDraw,i===18?(upgrade?3:2):(upgrade?2:1));assert.equal(r.state.inUse,'a');} if(i===9||i===26||i===29||i===32||i===37||i===38||i===39||i===45||i===51||i===60||i===63||i===69||i===72||i===73||i===74)assert.deepEqual(r.state.exhaust,['a']); if(i===20||i===30||i===47||i===50||i===54||i===66)assert.deepEqual(r.state.powers,['a']);
    assert.equal(s.energy,3); assert.equal(s.enemy.hp,40);
  });
}
test('cancel and rejected payments/targets are atomic',()=>{
  for(const options of [{id:'zl03',cancel:true},{id:'zl04',target:'enemy'},{id:'zl01',target:'other'},{id:'none'}]){
    const s=initialState(), before=structuredClone(s);
    const r=play(s,{instance:'a',...options}); assert.equal(r.ok,false); assert.equal(r.state,s); assert.deepEqual(s,before);
  }
  const s=initialState(); s.energy=0; assert.equal(run('zl03',s).ok,false);
});
test('saturation, repeated application and jade 0..20 boundary',()=>{
  for(let jade=0;jade<=20;jade++)for(const u of [false,true]){
    const s=initialState(); s.jade=jade;
    assert.equal(run('zl03',s,u).state.jade,Math.min(20,jade+(u?16:12)));
    assert.equal(run('zl04',s,u).ok,jade>=6);
  }
  let s=initialState(); for(let n=0;n<100;n++){s.energy=3;s.hand=[`c${n}`]; s=run('zl03',s).state;} assert.equal(s.jade,20);
});
test('block first then persistent jade, multihit and overkill clamp',()=>{
  const s=initialState(); s.block=4;s.jade=8;
  const r=endTurn(s,[5,6]);assert.equal(r.hp,60);assert.equal(r.jade,1);assert.equal(r.block,0);
  assert.equal(endTurn(r,[100]).hp,0);assert.equal(endTurn(r,[]).jade,1);
});
test('dead target/battle rejects play and enemy cannot act after kill',()=>{
  const s=initialState();s.enemy.hp=6;
  const r=run('zl01',s).state;assert.equal(r.enemy.hp,0);assert.equal(endTurn(r,[100]).hp,60);
  assert.equal(run('zl01',r).ok,false);
});
test('armor and lethal minus/at/plus one',()=>{
  for(const hp of [5,6,7]){const s=initialState();s.enemy.hp=hp;assert.equal(run('zl01',s).state.enemy.hp,Math.max(0,hp-6));}
  const s=initialState();s.enemy.block=8;const r=run('zl01',s).state;assert.equal(r.enemy.hp,40);assert.equal(r.enemy.block,2);
});
test('opposite reachable choices: conversion kills now, preserving shield survives big hit',()=>{
  const s=initialState();s.jade=6;s.enemy.hp=14;
  assert.equal(endTurn(run('zl04',s).state,[15]).hp,60);
  assert.equal(endTurn(run('zl01',s).state,[15]).hp,51);
  s.hp=5;s.enemy.hp=40;s.energy=1; // Last remaining action: defensive follow-up is unaffordable.
  const spent=run('zl04',s).state;assert.equal(run('zl02',spent).ok,false);assert.equal(run('zl06',spent).ok,false);
  assert.equal(endTurn(spent,[10]).hp,0);
  assert.equal(endTurn(run('zl01',s).state,[10]).hp,1);
});
test('source then payoff affordable at 3 energy; reverse order illegal with zero jade',()=>{
  const s=initialState();assert.equal(run('zl04',s).ok,false);
  const r=run('zl04',run('zl03',s).state);assert.equal(r.ok,true);assert.equal(r.state.energy,0);assert.equal(r.state.jade,6);
});
test('played instance cannot be replayed; no zero-cost refund loop',()=>{
  const s=initialState(); const r=run('zl01',s).state;
  assert.equal(play(r,{id:'zl01',instance:'a',target:'enemy'}).ok,false);
  assert.ok(cards.every(c=>Number.isSafeInteger(c.cost)&&c.cost>=0));assert.ok(cards.filter(c=>c.cost===0).every(c=>c.exhaust&&[...c.base,...c.upgraded].every(([op])=>op!=='draw')));assert.ok(cards.every(c=>[...c.base,...c.upgraded].every(([op])=>!['energy','recover'].includes(op))));
});
test('text shares effects, explicit expected upgrade card text',()=>{
  assert.equal(textFor('zl04',true),'1能量；消耗6点玉璋；造成18点伤害。');
  assert.equal(textFor('zl06'),'1能量；获得4点格挡；获得3点玉璋（上限20）。');
});
test('malformed states/hits fail before mutation',()=>{
  const s=initialState();assert.throws(()=>endTurn(s,[-1]));assert.throws(()=>endTurn(s,[NaN]));
  s.jade=21;assert.throws(()=>run('zl03',s));
});

test('card identity cannot be substituted by command',()=>{const s=initialState();assert.equal(play(s,{id:'zl05',instance:'a',target:'enemy'}).ok,false);});

test('upgrade comes from instance, invalid flags rollback',()=>{for(const upgraded of [true,'false',1,null]){const s=initialState();const r=play(s,{id:'zl01',instance:'a',target:'enemy',upgraded});assert.equal(r.ok,false);assert.equal(r.state,s);assert.equal(s.energy,3);assert.equal(s.enemy.hp,40);}});

test('unknown or invalid effect after valid damage rolls back entire transaction',()=>{for(const effect of [['unknown',1],['jade',-1],['block',NaN]]){const s=initialState();const before=structuredClone(s);cards[0].base.push(effect);try{const r=play(s,{id:'zl01',instance:'a',target:'enemy'});assert.equal(r.ok,false);assert.equal(r.reason,'invalid effect');assert.equal(r.state,s);assert.deepEqual(s,before);}finally{cards[0].base.pop();}}});

test('new role split: immediate protection vs low-pressure retained defense',()=>{const s=initialState();const immediate=endTurn(run('zl07',s).state,[5]);const persistent=endTurn(run('zl08',s).state,[5]);assert.equal(immediate.hp,60);assert.equal(persistent.hp,58);const quietA=endTurn(run('zl07',s).state,[]);const quietB=endTurn(run('zl08',s).state,[]);assert.equal(quietA.jade,0);assert.equal(quietB.jade,3);assert.equal(quietA.enemy.hp,35);assert.equal(quietB.enemy.hp,36);});
test('weak duration adds, does not compound strength, and decays after every enemy action',()=>{
 let s=run('zl09',initialState(),true).state;assert.equal(s.enemy.weak,2);
 s=endTurn(s,[3,3,3]);assert.equal(s.hp,54);assert.equal(s.enemy.weak,1);
 s=endTurn(s,[18]);assert.equal(s.hp,41);assert.equal(s.enemy.weak,0);
 s=endTurn(s,[4]);assert.equal(s.hp,37);
 const stacked=initialState();stacked.enemy.weak=2;const r=run('zl09',stacked).state;
 assert.equal(r.enemy.weak,3);assert.equal(endTurn(r,[8]).hp,54);
 assert.equal(endTurn(r,[]).enemy.weak,2);
});
test('weak suppression reduces heavy-hit HP loss but quiet turn favors direct attack',()=>{
 const s=initialState();s.jade=6;
 const suppressed=endTurn(run('zl09',s).state,[18]);assert.equal(suppressed.hp,53);assert.equal(suppressed.jade,0);
 const plain=endTurn(run('zl01',s).state,[18]);assert.equal(plain.hp,48);
 const quiet=endTurn(run('zl09',s).state,[]);assert.equal(quiet.enemy.hp,35);assert.equal(quiet.enemy.weak,0);
 assert.equal(endTurn(run('zl01',s).state,[]).enemy.hp,34);
});
test('weak invalid target, payment, cancel, overflow rollback and lethal does not debuff corpse',()=>{
 for(const options of [{target:'wrong'},{cancel:true}]){const s=initialState();s.instances.a={id:'zl09',upgraded:false};const before=structuredClone(s);const r=play(s,{id:'zl09',instance:'a',target:'enemy',...options});assert.equal(r.ok,false);assert.equal(r.state,s);assert.deepEqual(s,before);}
 const poor=initialState();poor.energy=0;assert.equal(run('zl09',poor).ok,false);
 const overflow=initialState();overflow.enemy.weak=Number.MAX_SAFE_INTEGER;const before=structuredClone(overflow);assert.equal(run('zl09',overflow).ok,false);assert.deepEqual(overflow,before);
 const dying=initialState();dying.enemy.hp=5;const killed=run('zl09',dying).state;assert.equal(killed.enemy.hp,0);assert.equal(killed.enemy.weak,0);assert.equal(endTurn(killed,[99]).hp,60);
});
test('guarded payoff threshold minus/at/plus, both versions, armor and no shield spend',()=>{
 for(const u of [false,true])for(const jade of [0,5,6,7,20]){
  const s=initialState();s.jade=jade;s.enemy.block=3;
  const r=run('zl11',s,u).state;assert.equal(r.enemy.hp,40-(u?7:5)-(jade>=6?(u?8:6):0)+3);assert.equal(r.jade,jade);
 }
 const unguarded=run('zl11').state;assert.equal(unguarded.enemy.hp,35);
 const basic=run('zl01').state;assert.equal(basic.enemy.hp,34);
});
test('one-shot block trades persistent resource for stronger immediate defense',()=>{
 const s=initialState();const burst=run('zl10',s).state,wall=run('zl03',s).state;
 assert.equal(endTurn(burst,[20]).hp,60);assert.equal(endTurn(wall,[20]).hp,52);
 assert.equal(endTurn(burst,[]).jade,0);assert.equal(endTurn(wall,[]).jade,12);
 assert.equal(burst.energy,1);assert.deepEqual(burst.exhaust,['a']);
 assert.equal(play(burst,{id:'zl10',instance:'a'}).ok,false);
});
test('new cards reject cancellation, wrong enemy target and insufficient payment atomically',()=>{
 for(const id of ['zl10','zl11'])for(const u of [false,true]){
  const s=initialState();s.instances.a={id,upgraded:u};const before=structuredClone(s);
  const cancelled=play(s,{id,instance:'a',upgraded:u,cancel:true,target:'enemy'});assert.equal(cancelled.state,s);assert.deepEqual(s,before);
  s.energy=0;const poor=structuredClone(s);assert.equal(play(s,{id,instance:'a',upgraded:u,target:'enemy'}).ok,false);assert.deepEqual(s,poor);
 }
 const s=initialState();s.instances.a={id:'zl11',upgraded:false};assert.equal(play(s,{id:'zl11',instance:'a',target:'self'}).ok,false);
});
test('pending draw kernel is not a resolved turn and cannot replay in-use card',()=>{
 const s=initialState();const r=run('zl12',s).state;
 assert.throws(()=>endTurn(r,[]),/unresolved draw/);assert.equal(play(r,{id:'zl01',instance:'b',target:'enemy'}).ok,false);
 const bad=structuredClone(r);bad.hand.push('a');assert.throws(()=>play(bad,{id:'zl12',instance:'a'}));
});
test('draw payload range/order errors and cancellations rollback before costs',()=>{
 const c=cards.find(c=>c.id==='zl12'),old=c.base;
 try{for(const effects of [[['block',3],['draw',11]],[['draw',1],['block',3]]]){
  c.base=effects;const s=initialState();s.instances.a={id:'zl12',upgraded:false};const before=structuredClone(s);
  const r=play(s,{id:'zl12',instance:'a'});assert.equal(r.ok,false);assert.equal(r.state,s);assert.deepEqual(s,before);
 }}finally{c.base=old;}
 const s=initialState();s.instances.a={id:'zl12',upgraded:false};const before=structuredClone(s);
 assert.equal(play(s,{id:'zl12',instance:'a',cancel:true}).state,s);assert.deepEqual(s,before);
 s.energy=0;assert.equal(play(s,{id:'zl12',instance:'a'}).ok,false);
});
test('vulnerability setup sacrifices immediate damage but helps remaining attacks; durations add and decay',()=>{
 const s=initialState();const setup=run('zl13',s).state;assert.equal(setup.energy,2);assert.equal(setup.enemy.hp,40);assert.equal(setup.enemy.vulnerable,2);
 const hit=run('zl01',setup).state;assert.equal(hit.enemy.hp,31);assert.equal(hit.energy,1);
 const stacked=run('zl13',setup,true).state;assert.equal(stacked.enemy.vulnerable,5);
 let later=endTurn(setup,[]);assert.equal(later.enemy.vulnerable,1);later=endTurn(later,[]);assert.equal(later.enemy.vulnerable,0);
});
test('vulnerability floors each damage effect before armor; it does not amplify incoming damage',()=>{
 const s=initialState();s.enemy.vulnerable=2;s.jade=6;s.enemy.block=4;
 const r=run('zl11',s).state;assert.equal(r.enemy.hp,28);assert.equal(r.jade,6); // floor5*1.5=7 + floor6*1.5=9 - armor4
 assert.equal(endTurn(r,[8]).hp,58);
});
test('setup loses the last-energy lethal race; control cancel/target/overflow remain atomic',()=>{
 const s=initialState();s.energy=1;s.enemy.hp=6;assert.equal(run('zl01',s).state.enemy.hp,0);assert.equal(run('zl13',s).state.enemy.hp,6);
 for(const o of [{cancel:true},{target:'self'}]){const state=initialState();state.instances.a={id:'zl13',upgraded:false};const before=structuredClone(state);assert.equal(play(state,{id:'zl13',instance:'a',target:'enemy',...o}).ok,false);assert.deepEqual(state,before);}
 const max=initialState();max.enemy.vulnerable=Number.MAX_SAFE_INTEGER;const before=structuredClone(max);assert.equal(run('zl13',max).ok,false);assert.deepEqual(max,before);
 const none=initialState();none.energy=0;assert.equal(run('zl13',none).ok,false);
});
test('retained attack never discounts, duplicates or grants free resources; upgrade independently persists',()=>{
 for(const u of [false,true]){
  let s=initialState(['a']);s.instances.a={id:'zl14',upgraded:u};s=endTurn(s,[]);assert.deepEqual(s.hand,['a']);assert.equal(s.jade,0);assert.equal(s.block,0);assert.equal(s.energy,3);
  const before=structuredClone(s);assert.equal(play(s,{id:'zl14',instance:'a',upgraded:u,target:'enemy',cancel:true}).state,s);assert.deepEqual(s,before);
  s.energy=1;assert.equal(play(s,{id:'zl14',instance:'a',upgraded:u,target:'enemy'}).ok,false);assert.deepEqual(s.hand,['a']);
 }
});
test('last-energy setup forces retained attack to wait and never stops enemy action',()=>{
 let s=initialState(['a','b']);s.instances={a:{id:'zl14',upgraded:false},b:{id:'zl13',upgraded:false}};s.energy=1;
 s=play(s,{id:'zl13',instance:'b',target:'enemy'}).state;s=endTurn(s,[8]);assert.equal(s.hp,52);assert.deepEqual(s.hand,['a']);assert.equal(s.enemy.vulnerable,1);
 const r=play(s,{id:'zl14',instance:'a',target:'enemy'});assert.equal(r.state.enemy.hp,21);assert.equal(r.state.energy,1);
});
test('counter triggers on zero/fully blocked hits and is fixed despite enemy vulnerability',()=>{
 const s=initialState();s.enemy.vulnerable=2;s.enemy.block=4;const r=run('zl15',s).state;
 const multi=endTurn(r,[3,3,3]);assert.equal(multi.hp,59);assert.equal(multi.enemy.hp,35);assert.equal(multi.enemy.block,0);assert.equal(multi.counter,0);
 const zero=endTurn(run('zl15').state,[0]);assert.equal(zero.enemy.hp,37);assert.equal(zero.hp,60);
 const idle=endTurn(run('zl15').state,[]);assert.equal(idle.enemy.hp,40);assert.equal(idle.counter,0);
});
test('counter lethal interrupts remaining hits; lethal incoming still retaliates and both-dead remains terminal',()=>{
 const s=initialState();s.enemy.hp=3;const r=endTurn(run('zl15',s).state,[3,99]);assert.equal(r.hp,60);assert.equal(r.enemy.hp,0);
 const simultaneous=initialState();simultaneous.hp=1;simultaneous.enemy.hp=3;simultaneous.counter=3;
 const dead=endTurn(simultaneous,[99,99]);assert.equal(dead.hp,0);assert.equal(dead.enemy.hp,0);assert.deepEqual(endTurn(dead,[99]),dead);
 const lethal=initialState();lethal.hp=1;lethal.counter=3;const retaliated=endTurn(lethal,[99,99]);assert.equal(retaliated.enemy.hp,37);assert.equal(retaliated.hp,0);
});
test('counter intensity adds without recursion, overflow and cancellation reject atomically',()=>{
 const s=initialState();s.counter=2;const r=run('zl15',s,true).state;assert.equal(r.counter,6);assert.equal(endTurn(r,[0,0]).enemy.hp,28);
 const max=initialState();max.counter=Number.MAX_SAFE_INTEGER;const before=structuredClone(max);assert.equal(run('zl15',max).ok,false);assert.deepEqual(max,before);
 const cancel=initialState();cancel.instances.a={id:'zl15',upgraded:false};const saved=structuredClone(cancel);assert.equal(play(cancel,{id:'zl15',instance:'a',cancel:true}).state,cancel);assert.deepEqual(cancel,saved);
 cancel.energy=1;assert.equal(play(cancel,{id:'zl15',instance:'a'}).ok,false);assert.equal(cancel.counter,0);
});

test('shield conversion pays before defending: all jade levels, base/upgrade, and no free block',()=>{
 for(let jade=0;jade<=20;jade++)for(const u of [false,true]){
  const s=initialState();s.jade=jade;const before=structuredClone(s);const r=run('zl16',s,u);
  assert.equal(r.ok,jade>=6);assert.deepEqual(s,before);
  if(r.ok){assert.equal(r.state.jade,jade-6);assert.equal(r.state.block,u?21:16);assert.equal(r.state.energy,2);assert.deepEqual(r.state.discard,['a']);assert.deepEqual(r.state.exhaust,[]);}
  else assert.equal(r.state.jade,jade);
 }
});
test('shield conversion is not free persistent protection: constrained full action and idle opportunity cost',()=>{
 for(const u of [false,true]){
  const s=initialState(['a']);s.instances.a={id:'zl16',upgraded:u};s.jade=6;s.energy=1;
  const used=play(s,{id:'zl16',instance:'a',upgraded:u}).state;
  // Only one action and one energy: no omitted affordable follow-up.
  assert.equal(endTurn(used,[18]).hp,u?60:58);assert.equal(endTurn(s,[18]).hp,48);
  assert.equal(endTurn(used,[6,6,6]).hp,u?60:58);
  const idle=endTurn(used,[]),saved=endTurn(s,[]);assert.equal(idle.jade,0);assert.equal(saved.jade,6);
  assert.equal(endTurn(idle,[6]).hp,54);assert.equal(endTurn(saved,[6]).hp,60);
  assert.equal(endTurn(used,[3]).jade,0);assert.equal(endTurn(s,[3]).jade,3);
 }
});
test('shield conversion cancellation, no energy, dead battle and invalid effect preserve input',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl16',upgraded:false};s.jade=6;
 for(const change of [{},{energy:0},{hp:0}]){const state={...s,...change};const before=structuredClone(state);const r=play(state,{id:'zl16',instance:'a',cancel:!Object.keys(change).length});assert.equal(r.ok,false);assert.equal(r.state,state);assert.deepEqual(state,before);}
 const c=cards.find(c=>c.id==='zl16'),old=c.base;try{c.base=[['spendJade',6],['block',NaN]];const before=structuredClone(s);const r=play(s,{id:'zl16',instance:'a'});assert.equal(r.state,s);assert.equal(r.ok,false);assert.deepEqual(s,before);}finally{c.base=old;}
});

test('armor removal precedes attack, is not damage, and vulnerability amplifies attack only',()=>{
 for(const u of [false,true])for(const armor of [0,1,5,12,Number.MAX_SAFE_INTEGER])for(const vulnerable of [0,2]){
  const s=initialState();s.jade=3;s.enemy.block=armor;s.enemy.vulnerable=vulnerable;const before=structuredClone(s);const r=run('zl17',s,u);
  assert.equal(r.state.enemy.block,0);assert.equal(r.state.enemy.hp,40-(u?(vulnerable?9:6):(vulnerable?6:4)));assert.equal(r.state.energy,2);assert.deepEqual(s,before);
 }
});
test('antiarmor trades away naked-target damage and cannot undo lethal battle or failed action',()=>{
 const plain=initialState();plain.jade=3;assert.equal(run('zl17',plain).state.enemy.hp,36);assert.equal(run('zl01',plain).state.enemy.hp,34);
 const armored=initialState();armored.jade=3;armored.enemy.block=12;assert.equal(run('zl17',armored).state.enemy.hp,36);assert.equal(run('zl01',armored).state.enemy.hp,40);
 const s=initialState(['a']);s.instances.a={id:'zl17',upgraded:false};s.enemy.block=12;s.jade=3;
 for(const patch of [{energy:0},{hp:0},{enemy:{...s.enemy,hp:0}}]){const state={...s,...patch};const before=structuredClone(state);assert.equal(play(state,{id:'zl17',instance:'a',target:'enemy'}).ok,false);assert.deepEqual(state,before);}
 for(const opts of [{cancel:true},{target:'self'}]){const before=structuredClone(s);assert.equal(play(s,{id:'zl17',instance:'a',target:'enemy',...opts}).state,s);assert.deepEqual(s,before);}
 const c=cards.find(c=>c.id==='zl17'),old=c.base;try{for(const n of [0,2,NaN]){c.base=[['removeBlock',n],['damage',4]];const before=structuredClone(s);assert.equal(play(s,{id:'zl17',instance:'a',target:'enemy'}).ok,false);assert.deepEqual(s,before);}}finally{c.base=old;}
});

test('antiarmor requires actual jade payment and gives up future protection at every boundary',()=>{
 for(let jade=0;jade<=20;jade++)for(const u of [false,true]){const s=initialState();s.jade=jade;s.enemy.block=12;const before=structuredClone(s);const r=run('zl17',s,u);assert.equal(r.ok,jade>=3);assert.deepEqual(s,before);if(r.ok)assert.equal(r.state.jade,jade-3);}
 const s=initialState();s.jade=3;const used=run('zl17',s).state;assert.equal(endTurn(used,[3]).hp,57);assert.equal(endTurn(s,[3]).hp,60);
});

test('jade payoff samples current jade, not block or a consumed payment; every base/upgrade boundary',()=>{
 for(let jade=0;jade<=20;jade++)for(const u of [false,true])for(const vuln of [0,1]){
  const s=initialState();s.jade=jade;s.block=99;s.enemy.block=3;s.enemy.vulnerable=vuln;const before=structuredClone(s);
  const r=run('zl18',s,u);const raw=jade+(u?5:0),damage=vuln?Number(BigInt(raw)*3n/2n):raw;
  assert.equal(r.ok,true);assert.equal(r.state.enemy.hp,40-Math.max(0,damage-3));assert.equal(r.state.enemy.block,Math.max(0,3-damage));assert.equal(r.state.jade,jade);assert.equal(r.state.block,99);assert.equal(r.state.energy,1);assert.deepEqual(s,before);
 }
});
test('jade payoff observes prior spending and incoming depletion; no free energy or low-reserve damage',()=>{
 const s=initialState();s.jade=12;const spent=run('zl04',s).state;const r=run('zl18',spent).state;assert.equal(r.enemy.hp,20);assert.equal(r.jade,6);assert.equal(r.energy,0);
 const hit=endTurn(s,[7]);assert.equal(hit.jade,5);hit.hand=['next'];hit.instances.next={id:'zl18',upgraded:false};assert.equal(run('zl18',hit).state.enemy.hp,35);
 const empty=run('zl18').state;assert.equal(empty.enemy.hp,40);assert.equal(empty.energy,1);
 const cap=initialState();cap.jade=20;assert.equal(run('zl18',cap,true).state.enemy.hp,15);
});
test('jade payoff cancel, target, insufficient energy and unsafe effect reject before payment',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl18',upgraded:false};s.jade=20;
 for(const opts of [{cancel:true},{target:'self'}]){const before=structuredClone(s);const r=play(s,{id:'zl18',instance:'a',target:'enemy',...opts});assert.equal(r.ok,false);assert.equal(r.state,s);assert.deepEqual(s,before);}
 const low={...s,energy:1};assert.equal(play(low,{id:'zl18',instance:'a',target:'enemy'}).state,low);
 const c=cards.find(c=>c.id==='zl18'),old=c.base;try{c.base=[['jadeDamage',Number.MAX_SAFE_INTEGER]];const before=structuredClone(s);assert.equal(play(s,{id:'zl18',instance:'a',target:'enemy'}).ok,false);assert.deepEqual(s,before);}finally{c.base=old;}
});

test('reserve payoff does not strictly dominate fixed threshold or sacrifice payoff',()=>{
 const low=initialState();low.jade=6;
 assert.equal(run('zl18',low).state.enemy.hp,34);assert.equal(run('zl11',low).state.enemy.hp,29);assert.equal(run('zl04',low).state.enemy.hp,26);
 assert.equal(run('zl18',low).state.energy,1);assert.equal(run('zl11',low).state.energy,2);assert.equal(run('zl04',low).state.jade,0);
 const high=initialState();high.jade=20;assert.equal(run('zl18',high).state.enemy.hp,20);assert.equal(run('zl11',high).state.enemy.hp,29);assert.equal(run('zl04',high).state.enemy.hp,26);assert.equal(run('zl18',high).state.jade,20);
 high.energy=1;assert.equal(run('zl18',high).ok,false);assert.equal(run('zl11',high).ok,true);assert.equal(run('zl04',high).ok,true);
 // One instance alternative, not a proof that full arbitrary hands favor any card.
});

test('one-shot reserve access saturates without refund and stays pending until draw disposal',()=>{
 for(let jade=0;jade<=20;jade++)for(const u of [false,true]){const s=initialState();s.jade=jade;const before=structuredClone(s);const r=run('zl19',s,u);assert.equal(r.ok,true);assert.equal(r.state.jade,Math.min(20,jade+(u?8:6)));assert.equal(r.state.energy,1);assert.equal(r.state.pendingDraw,u?3:2);assert.equal(r.state.inUse,'a');assert.deepEqual(r.state.exhaust,[]);assert.deepEqual(s,before);assert.throws(()=>endTurn(r.state,[]),/unresolved/);}
 const s=initialState(['a']);s.instances.a={id:'zl19',upgraded:false};const before=structuredClone(s);assert.equal(play(s,{id:'zl19',instance:'a',cancel:true}).state,s);assert.deepEqual(s,before);s.energy=1;assert.equal(play(s,{id:'zl19',instance:'a'}).state,s);
});
test('one-shot access does not dominate pure jade or cheaper repeatable access; invalid draw rolls back jade',()=>{
 const pure=run('zl03').state,access=run('zl19').state;assert.equal(pure.jade,12);assert.equal(access.jade,6);assert.equal(pure.energy,1);assert.equal(access.energy,1);assert.equal(access.pendingDraw,2);
 const cheap=initialState();cheap.energy=1;assert.equal(run('zl19',cheap).ok,false);assert.equal(run('zl12',cheap).ok,true);
 const c=cards.find(c=>c.id==='zl19'),old=c.base;try{c.base=[['jade',6],['draw',Number.MAX_SAFE_INTEGER]];const s=initialState(['a']);s.instances.a={id:'zl19',upgraded:false};const before=structuredClone(s);assert.equal(play(s,{id:'zl19',instance:'a'}).state,s);assert.deepEqual(s,before);}finally{c.base=old;}
});

test('empty-jade rebuild tests only persistent resource, all levels and both versions',()=>{
 for(let jade=0;jade<=20;jade++)for(const u of [false,true])for(const block of [0,99]){const s=initialState();s.jade=jade;s.block=block;const before=structuredClone(s);const r=run('zl20',s,u);assert.equal(r.ok,true);assert.equal(r.state.jade,jade===0?(u?12:9):jade);assert.equal(r.state.block,block);assert.equal(r.state.energy,2);assert.deepEqual(s,before);}
});
test('depletion opens rebuild; residual jade and repeated rebuild waste cost without stacking',()=>{
 const s=initialState();s.jade=6;const spent=run('zl04',s).state;const rebuilt=run('zl20',spent).state;assert.equal(rebuilt.jade,9);assert.equal(rebuilt.energy,1);assert.equal(rebuilt.enemy.hp,26);
 const again=run('zl20',rebuilt,true).state;assert.equal(again.jade,9);assert.equal(again.energy,0);
 const residual=initialState();residual.jade=1;assert.equal(run('zl20',residual).state.jade,1);assert.equal(run('zl03',residual).state.jade,13);
 const hit=endTurn({...initialState(),jade:3},[3]);hit.hand=['next'];hit.instances.next={id:'zl20',upgraded:false};assert.equal(run('zl20',hit).state.jade,9);
 const notBroken=endTurn({...initialState(),jade:3},[2]);notBroken.hand=['next'];notBroken.instances.next={id:'zl20',upgraded:false};assert.equal(run('zl20',notBroken).state.jade,1);
});
test('rebuild cancellation, no energy, terminal and invalid gain preserve input',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl20',upgraded:false};
 for(const patch of [{energy:0},{hp:0},{enemy:{...s.enemy,hp:0}}]){const t={...s,...patch},before=structuredClone(t);assert.equal(play(t,{id:'zl20',instance:'a'}).state,t);assert.deepEqual(t,before);}
 const before=structuredClone(s);assert.equal(play(s,{id:'zl20',instance:'a',cancel:true}).state,s);assert.deepEqual(s,before);
 const c=cards.find(c=>c.id==='zl20'),old=c.base;try{c.base=[['emptyJade',NaN]];assert.equal(play(s,{id:'zl20',instance:'a'}).state,s);assert.deepEqual(s,before);}finally{c.base=old;}
});

test('pillar starts at owner end, repeats once each turn and is fixed against vulnerability',()=>{
 for(const u of [false,true]){const s=initialState();s.enemy.vulnerable=3;s.enemy.block=2;const placed=run('zl21',s,u).state;assert.equal(placed.enemy.hp,40);assert.equal(placed.energy,1);assert.equal(placed.pillar,u?4:3);
 const a=endTurn(placed,[]);assert.equal(a.enemy.hp,u?38:39);const b=endTurn(a,[]);assert.equal(b.enemy.hp,u?34:36);assert.equal(b.pillar,u?4:3);}
});
test('pillar lethal stops enemy turn, while preexisting terminal does not tick',()=>{
 const s=initialState();s.enemy.hp=3;s.hp=1;const placed=run('zl21',s).state;const end=endTurn(placed,[99,99]);assert.equal(end.enemy.hp,0);assert.equal(end.hp,1);
 for(const t of [{...placed,hp:0},{...placed,enemy:{...placed.enemy,hp:0}}])assert.deepEqual(endTurn(t,[99]),t);
});
test('one pillar uses strongest intensity, not summing copies; duplicate investment still costs',()=>{
 let s=initialState();s.energy=6;s=run('zl21',s).state;s=run('zl21',s,true).state;s=run('zl21',s).state;assert.equal(s.pillar,4);assert.equal(s.energy,0);assert.equal(s.powers.length,3);assert.equal(endTurn(s,[]).enemy.hp,36);
});
test('Power cancellation and invalid intensity reject before spending; invalid turn never ticks',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl21',upgraded:false};const before=structuredClone(s);assert.equal(play(s,{id:'zl21',instance:'a',cancel:true}).state,s);assert.deepEqual(s,before);
 const c=cards.find(c=>c.id==='zl21'),old=c.base;try{for(const n of [NaN,-1,Number.MAX_SAFE_INTEGER+1]){c.base=[['pillar',n]];assert.equal(play(s,{id:'zl21',instance:'a'}).state,s);assert.deepEqual(s,before);}}finally{c.base=old;}
 const placed=run('zl21',s).state,copy=structuredClone(placed);assert.throws(()=>endTurn(placed,[NaN]));assert.deepEqual(placed,copy);
});

test('pulse repeats fixed current pillar independently of vulnerability and keeps installed intensity',()=>{
 for(const pillar of [0,3,4])for(const u of [false,true])for(const armor of [0,5,12,20])for(const vuln of [0,5]){
  const s=initialState();s.pillar=pillar;s.enemy.block=armor;s.enemy.vulnerable=vuln;const before=structuredClone(s);const r=run('zl22',s,u);const total=pillar*(u?4:3);
  assert.equal(r.ok,true);assert.equal(r.state.enemy.hp,40-Math.max(0,total-armor));assert.equal(r.state.enemy.block,Math.max(0,armor-total));assert.equal(r.state.pillar,pillar);assert.equal(r.state.energy,2);assert.deepEqual(s,before);
 }
});
test('pulse empty setup costs a full action; established pulse lethal stops and still has owner-end role',()=>{
 const empty=run('zl22').state;assert.equal(empty.enemy.hp,40);assert.equal(empty.energy,2);
 const setup=run('zl21').state;const burst=run('zl22',setup).state;assert.equal(burst.enemy.hp,31);assert.equal(burst.energy,0);assert.equal(endTurn(burst,[]).enemy.hp,28);
 const lethal=initialState();lethal.enemy.hp=5;lethal.pillar=3;const done=run('zl22',lethal).state;assert.equal(done.enemy.hp,0);assert.equal(endTurn(done,[99]).hp,60);
});
test('pulse bounded count and cumulative damage overflow reject atomically, including cancelled or bad target',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl22',upgraded:false};s.pillar=3;const before=structuredClone(s);
 for(const opts of [{cancel:true},{target:'self'}]){assert.equal(play(s,{id:'zl22',instance:'a',target:'enemy',...opts}).state,s);assert.deepEqual(s,before);}
 const huge={...s,pillar:Number.MAX_SAFE_INTEGER};const h=structuredClone(huge);assert.equal(play(huge,{id:'zl22',instance:'a',target:'enemy'}).state,huge);assert.deepEqual(huge,h);
 const c=cards.find(c=>c.id==='zl22'),old=c.base;try{for(const n of [0,5,NaN,Number.MAX_SAFE_INTEGER]){c.base=[['pulse',n]];assert.equal(play(s,{id:'zl22',instance:'a',target:'enemy'}).state,s);assert.deepEqual(s,before);}}finally{c.base=old;}
 const poor={...s,energy:0};assert.equal(play(poor,{id:'zl22',instance:'a',target:'enemy'}).state,poor);
});
test('pulse mixed-effect lists are unsupported and reject before earlier effects mutate state',()=>{
 const c=cards.find(c=>c.id==='zl22'),old=c.base,s=initialState(['a']);s.instances.a={id:'zl22',upgraded:false};s.pillar=3;const before=structuredClone(s);
 try{for(const effects of [[['pulse',3],['pulse',3]],[['pillar',Number.MAX_SAFE_INTEGER],['pulse',3]],[['damage',1],['pulse',3]]]){c.base=effects;assert.equal(play(s,{id:'zl22',instance:'a',target:'enemy'}).state,s);assert.deepEqual(s,before);}}finally{c.base=old;}
});

test('dismantle consumes all pillar, saturates jade, and forfeits future pulse on both versions',()=>{
 for(const pillar of [3,4])for(let jade=0;jade<=20;jade++)for(const u of [false,true]){
  const s=initialState();s.pillar=pillar;s.jade=jade;const before=structuredClone(s);const r=run('zl23',s,u);assert.equal(r.ok,true);assert.equal(r.state.pillar,0);assert.equal(r.state.jade,Math.min(20,jade+(u?16:12)));assert.equal(r.state.energy,2);assert.equal(endTurn(r.state,[]).enemy.hp,40);assert.equal(endTurn(s,[]).enemy.hp,40-pillar);assert.deepEqual(s,before);
 }
});
test('dismantle requires actual installed strength and cannot pay twice, cancel or malformed marker',()=>{
 assert.equal(run('zl23').ok,false);const s=initialState(['a']);s.instances.a={id:'zl23',upgraded:false};s.pillar=3;const before=structuredClone(s);assert.equal(play(s,{id:'zl23',instance:'a',cancel:true}).state,s);assert.deepEqual(s,before);
 const low={...s,energy:0};assert.equal(play(low,{id:'zl23',instance:'a'}).state,low);
 const c=cards.find(c=>c.id==='zl23'),old=c.base;try{for(const effects of [[['spendPillar',0],['jade',12]],[['spendPillar',1],['jade',NaN]],[['spendPillar',1],['spendPillar',1],['jade',12]]]){c.base=effects;assert.equal(play(s,{id:'zl23',instance:'a'}).state,s);assert.deepEqual(s,before);}}finally{c.base=old;}
 const r=run('zl23',{...initialState(),pillar:3}).state;assert.equal(run('zl23',r).ok,false);
});

test('reserve search base and upgrade spend jade before pending draw, cancellation and errors are atomic',()=>{
 for(const u of [false,true])for(const jade of [0,2,3,20]){
  const s=initialState(['a']);s.instances.a={id:'zl24',upgraded:u};s.jade=jade;const before=structuredClone(s);
  const r=play(s,{id:'zl24',instance:'a',upgraded:u});assert.equal(r.ok,jade>=3);
  if(r.ok){assert.equal(r.state.jade,jade-3);assert.equal(r.state.pendingDraw,u?4:3);assert.equal(r.state.energy,2);assert.equal(r.state.inUse,'a');}else assert.equal(r.state,s);
  assert.deepEqual(s,before);assert.equal(play(s,{id:'zl24',instance:'a',upgraded:u,cancel:true}).state,s);
 }
 const s=initialState(['a']);s.instances.a={id:'zl24',upgraded:false};s.jade=3;const before=structuredClone(s),c=cards.find(c=>c.id==='zl24'),old=c.base;
 try{c.base=[['spendJade',3],['draw',NaN]];assert.equal(play(s,{id:'zl24',instance:'a'}).state,s);assert.deepEqual(s,before);}finally{c.base=old;}
 for(const change of [{energy:0},{hp:0},{enemy:{...s.enemy,hp:0}}]){const t={...s,...change};assert.equal(play(t,{id:'zl24',instance:'a'}).state,t);}
});

test('pillar defense base and upgrade sample existing intensity without consuming pillar or jade',()=>{
 for(const u of [false,true])for(const pillar of [0,3,4])for(const block of [0,7])for(const jade of [0,20]){
  const s=initialState();s.pillar=pillar;s.block=block;s.jade=jade;const before=structuredClone(s),r=run('zl25',s,u);
  assert.equal(r.ok,true);assert.equal(r.state.block,block+pillar*(u?5:4));assert.equal(r.state.pillar,pillar);assert.equal(r.state.jade,jade);assert.equal(r.state.energy,2);assert.deepEqual(s,before);
 }
});
test('pillar defense setup costs three energy; dismantle removes payoff and empty turn loses temporary guard',()=>{
 const placed=run('zl21').state,guarded=run('zl25',placed).state;assert.equal(guarded.energy,0);assert.equal(guarded.block,12);
 const waiting=endTurn(guarded,[]);assert.equal(waiting.block,0);assert.equal(waiting.enemy.hp,37);assert.equal(waiting.pillar,3);
 const broken=run('zl23',{...initialState(),pillar:3}).state;const empty=run('zl25',broken).state;assert.equal(empty.block,0);assert.equal(empty.jade,12);assert.equal(empty.energy,1);
 const protectedState=endTurn(guarded,[12]);assert.equal(protectedState.hp,60);assert.equal(protectedState.pillar,3);
});
test('pillar defense rejects multiplication and sum overflow, mixed unsupported effects, invalid coefficients atomically',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl25',upgraded:false};s.pillar=3;const before=structuredClone(s);
 for(const patch of [{pillar:Number.MAX_SAFE_INTEGER},{block:Number.MAX_SAFE_INTEGER},{energy:0},{hp:0}]){const t={...s,...patch},copy=structuredClone(t);assert.equal(play(t,{id:'zl25',instance:'a'}).state,t);assert.deepEqual(t,copy);}
 assert.equal(play(s,{id:'zl25',instance:'a',cancel:true}).state,s);assert.deepEqual(s,before);
 const c=cards.find(c=>c.id==='zl25'),old=c.base;try{for(const effects of [[['pillarBlock',0]],[['pillarBlock',6]],[['pillarBlock',NaN]],[['pillarBlock',3],['pillarBlock',3]],[['pillar',4],['pillarBlock',3]]]){c.base=effects;assert.equal(play(s,{id:'zl25',instance:'a'}).state,s);assert.deepEqual(s,before);}}finally{c.base=old;}
});

test('held reserve uses independently specified base/upgrade capped gains and preserves all invalid inputs',()=>{
 for(const u of [false,true])for(const jade of [0,1,10,19,20]){
  const s=initialState(['a']);s.instances.a={id:'zl26',upgraded:u};s.jade=jade;const before=structuredClone(s),r=play(s,{id:'zl26',instance:'a',upgraded:u});
  assert.equal(r.ok,true);assert.equal(r.state.jade,Math.min(20,jade+(u?14:10)));assert.equal(r.state.energy,1);assert.deepEqual(r.state.discard,['a']);assert.deepEqual(s,before);
  assert.equal(play(s,{id:'zl26',instance:'a',upgraded:u,cancel:true}).state,s);
  const poor={...s,energy:1};assert.equal(play(poor,{id:'zl26',instance:'a',upgraded:u}).state,poor);
 }
 const s=initialState(['a']);s.instances.a={id:'zl26',upgraded:false};const before=structuredClone(s),c=cards.find(c=>c.id==='zl26'),old=c.base;
 try{c.base=[['jade',NaN]];assert.equal(play(s,{id:'zl26',instance:'a'}).state,s);assert.deepEqual(s,before);}finally{c.base=old;}
});
test('held reserve is weaker immediate protection than standard reserve but works with residual jade unlike rebuild',()=>{
 for(const u of [false,true]){
  const s=initialState();assert.equal(run('zl03',s,u).state.jade-run('zl26',s,u).state.jade,2);
  s.jade=1;assert.equal(run('zl20',s,u).state.jade,1);assert.equal(run('zl26',s,u).state.jade,u?15:11);
 }
});

test('collapse base/upgrade pays pillar before ordinary attack, unlike fixed pulse vulnerable changes damage',()=>{
 for(const u of [false,true])for(const pillar of [3,4])for(const armor of [0,7,99])for(const vulnerable of [0,2]){
  const s=initialState();s.pillar=pillar;s.enemy.hp=100;s.enemy.block=armor;s.enemy.vulnerable=vulnerable;const before=structuredClone(s),r=run('zl27',s,u);
  const damage=(u?32:24)*(vulnerable?1.5:1);assert.equal(r.ok,true);assert.equal(r.state.enemy.hp,100-Math.max(0,damage-armor));assert.equal(r.state.enemy.block,Math.max(0,armor-damage));assert.equal(r.state.pillar,0);assert.equal(r.state.energy,2);assert.equal(r.state.exhaust.length,1);assert.deepEqual(s,before);
 }
});
test('collapse missing pillar or illegal target/cancel refuses all costs and lethal cannot cause another pulse',()=>{
 assert.equal(run('zl27').ok,false);const s=initialState(['a']);s.instances.a={id:'zl27',upgraded:false};s.pillar=3;const before=structuredClone(s);
 for(const options of [{cancel:true},{target:'self'}]){assert.equal(play(s,{id:'zl27',instance:'a',target:'enemy',...options}).state,s);assert.deepEqual(s,before);}
 s.enemy.hp=24;const r=play(s,{id:'zl27',instance:'a',target:'enemy'}).state;assert.equal(r.enemy.hp,0);assert.equal(r.pillar,0);assert.equal(endTurn(r,[99]).hp,60);
 const c=cards.find(c=>c.id==='zl27'),old=c.base,copy=structuredClone(s);try{c.base=[['spendPillar',1],['damage',NaN]];assert.equal(play(s,{id:'zl27',instance:'a',target:'enemy'}).state,s);assert.deepEqual(s,copy);}finally{c.base=old;}
});
test('collapse same-turn setup matches costly finisher damage at two cards and forfeits future pillar',()=>{
 for(const u of [false,true]){
  const s=initialState();s.energy=3;const direct=run('zl05',s,u).state;const placed=run('zl21',s).state;const collapsed=run('zl27',placed,u).state;
  assert.equal(collapsed.enemy.hp,direct.enemy.hp);assert.equal(collapsed.energy,0);assert.equal(collapsed.pillar,0);assert.equal(collapsed.powers.length,1);assert.equal(collapsed.exhaust.length,1);
  assert.equal(endTurn(collapsed,[]).enemy.hp,collapsed.enemy.hp);
 }
});

test('suppression reserve independently gives capped jade and additive base/upgrade Weak without damage',()=>{
 for(const u of [false,true])for(const jade of [0,19,20])for(const weak of [0,3]){
  const s=initialState();s.jade=jade;s.enemy.weak=weak;const before=structuredClone(s),r=run('zl28',s,u);
  assert.equal(r.ok,true);assert.equal(r.state.jade,Math.min(20,jade+(u?7:5)));assert.equal(r.state.enemy.weak,weak+(u?3:2));assert.equal(r.state.enemy.hp,40);assert.equal(r.state.energy,1);assert.deepEqual(s,before);
 }
});
test('suppression reserve weakens each hit and decays once, idle still spends duration and persistent shield remains',()=>{
 for(const u of [false,true])for(const hits of [[],[0],[10],[3,3,3],[30]]){
  let s=run('zl28',initialState(),u).state;const weak=u?3:2,jade=u?7:5,total=hits.reduce((n,h)=>n+Math.floor(h*.75),0);
  s=endTurn(s,hits);assert.equal(s.hp,60-Math.max(0,total-jade));assert.equal(s.jade,Math.max(0,jade-total));assert.equal(s.enemy.weak,weak-1);
 }
});
test('suppression reserve rejects overflow or bad target before granting any jade',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl28',upgraded:false};s.enemy.weak=Number.MAX_SAFE_INTEGER;const before=structuredClone(s);
 const r=play(s,{id:'zl28',instance:'a',target:'enemy'});assert.equal(r.ok,false);assert.equal(r.state,s);assert.deepEqual(s,before);
 s.enemy.weak=0;const clean=structuredClone(s);for(const opts of [{target:'self'},{cancel:true}]){assert.equal(play(s,{id:'zl28',instance:'a',target:'enemy',...opts}).state,s);assert.deepEqual(s,clean);}
 const c=cards.find(c=>c.id==='zl28'),old=c.base;try{c.base=[['jade',5],['weak',NaN]];assert.equal(play(s,{id:'zl28',instance:'a',target:'enemy'}).state,s);assert.deepEqual(s,clean);}finally{c.base=old;}
});
test('suppression reserve differs from equal-cost hybrid plus suppression sequence rather than dominating it',()=>{
 const s=initialState(),combo=run('zl09',run('zl06',s).state).state,combined=run('zl28',s).state;
 assert.equal(combo.energy,combined.energy);assert.equal(combo.enemy.hp,35);assert.equal(combined.enemy.hp,40);
 assert.equal(combo.block,4);assert.equal(combined.block,0);assert.equal(combo.jade,3);assert.equal(combined.jade,5);assert.equal(combo.enemy.weak,1);assert.equal(combined.enemy.weak,2);
 assert.equal(endTurn(combo,[10]).hp,60);assert.equal(endTurn(combined,[10]).hp,58);
 assert.equal(endTurn(combo,[]).enemy.weak,0);assert.equal(endTurn(combined,[]).enemy.weak,1);
});

test('suppression reserve longer window can favor next-turn defense but not instant pressure; terminal and energy reject',()=>{
 const a=endTurn(run('zl09',run('zl06').state).state,[]),b=endTurn(run('zl28').state,[]);
 assert.equal(endTurn(a,[20]).hp,43);assert.equal(endTurn(b,[20]).hp,50);
 const s=initialState(['a']);s.instances.a={id:'zl28',upgraded:false};
 for(const change of [{hp:0},{enemy:{...s.enemy,hp:0}},{energy:1}]){const t={...s,...change},before=structuredClone(t);assert.equal(play(t,{id:'zl28',instance:'a',target:'enemy'}).state,t);assert.deepEqual(t,before);}
});

test('guarded exposure threshold is inclusive and sampled before own ordinary hit without consuming jade',()=>{
 for(const u of [false,true])for(const jade of [0,5,6,20])for(const existing of [0,2])for(const block of [0,5,20]){
  const s=initialState();s.jade=jade;s.enemy.vulnerable=existing;s.enemy.block=block;const before=structuredClone(s),r=run('zl29',s,u);
  const duration=existing+(jade>=6?(u?3:2):0),damage=(u?6:4)*(duration?1.5:1);
  assert.equal(r.ok,true);assert.equal(r.state.enemy.vulnerable,duration);assert.equal(r.state.enemy.hp,40-Math.max(0,damage-block));assert.equal(r.state.enemy.block,Math.max(0,block-damage));assert.equal(r.state.jade,jade);assert.equal(r.state.energy,2);assert.deepEqual(s,before);
 }
});
test('guarded exposure state changes the useful choice versus unconditional debuff and direct guarded damage',()=>{
 const low=initialState();low.jade=5;const conditional=run('zl29',low).state,unconditional=run('zl13',low).state;assert.equal(conditional.enemy.vulnerable,0);assert.equal(unconditional.enemy.vulnerable,2);
 const high=initialState();high.jade=6;const exposed=run('zl29',high).state,direct=run('zl11',high).state;
 assert.equal(exposed.enemy.hp,34);assert.equal(direct.enemy.hp,29);assert.equal(exposed.enemy.vulnerable,2);assert.equal(direct.enemy.vulnerable,0);
});
test('guarded exposure rejects invalid target, payment, malformed duration and potential stacking overflow without changes',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl29',upgraded:false};s.jade=6;const before=structuredClone(s);
 for(const options of [{cancel:true},{target:'self'}]){assert.equal(play(s,{id:'zl29',instance:'a',target:'enemy',...options}).state,s);assert.deepEqual(s,before);}
 for(const patch of [{energy:0},{hp:0},{enemy:{...s.enemy,hp:0}},{enemy:{...s.enemy,vulnerable:Number.MAX_SAFE_INTEGER}}]){const t={...s,...patch},copy=structuredClone(t);assert.equal(play(t,{id:'zl29',instance:'a',target:'enemy'}).state,t);assert.deepEqual(t,copy);}
 const c=cards.find(c=>c.id==='zl29'),old=c.base;try{for(const n of [NaN,-1,Number.MAX_SAFE_INTEGER]){c.base=[['guardedVulnerable',n],['damage',Number.MAX_SAFE_INTEGER]];assert.equal(play(s,{id:'zl29',instance:'a',target:'enemy'}).state,s);assert.deepEqual(s,before);}}finally{c.base=old;}
});

test('guarded exposure versus unconditional debuff plus strike trades setup for one fewer card and energy',()=>{
 const low=initialState(),pair=run('zl01',run('zl13',low).state).state;assert.equal(pair.enemy.hp,31);assert.equal(pair.enemy.vulnerable,2);assert.equal(pair.energy,1);
 const high={...initialState(),jade:6},single=run('zl29',high).state;assert.equal(single.enemy.hp,34);assert.equal(single.enemy.vulnerable,2);assert.equal(single.energy,2);assert.equal(single.jade,6);
 const missing=run('zl29',low).state;assert.equal(missing.enemy.hp,36);assert.equal(missing.enemy.vulnerable,0);
});

test('reserve burst samples all jade before paying, ordinary base/upgrade hit then exhaust',()=>{
 for(const u of [false,true])for(let jade=0;jade<=20;jade++)for(const armor of [0,9,60])for(const vulnerable of [0,3]){
  const s=initialState();s.jade=jade;s.enemy.hp=100;s.enemy.block=armor;s.enemy.vulnerable=vulnerable;const before=structuredClone(s),r=run('zl30',s,u);
  const raw=jade*(u?3:2),damage=vulnerable?Math.floor(raw*1.5):raw;
  assert.equal(r.ok,true);assert.equal(r.state.jade,0);assert.equal(r.state.enemy.hp,100-Math.max(0,damage-armor));assert.equal(r.state.enemy.block,Math.max(0,armor-damage));assert.equal(r.state.energy,2);assert.equal(r.state.exhaust.length,1);assert.deepEqual(s,before);
 }
});
test('reserve burst low-reserve crossover and exposed nonlethal counterexample remain visible',()=>{
 for(const jade of [6,7,8]){
  const s={...initialState(),jade},fixed=run('zl04',s).state,all=run('zl30',s).state;
  assert.equal(40-fixed.enemy.hp,14);assert.equal(40-all.enemy.hp,2*jade);assert.equal(fixed.jade,jade-6);assert.equal(all.jade,0);
 }
 const s={...initialState(),jade:20};s.enemy.hp=100;
 const kept=run('zl18',s).state,spent=run('zl30',s).state;
 assert.equal(kept.enemy.hp,80);assert.equal(spent.enemy.hp,60);assert.equal(endTurn(kept,[20]).hp,60);assert.equal(endTurn(spent,[20]).hp,40);
});
test('reserve burst cancellation, target, terminal and invalid coefficient/mixed list leave resources unchanged',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl30',upgraded:false};s.jade=20;const before=structuredClone(s);
 for(const opts of [{cancel:true},{target:'self'}]){assert.equal(play(s,{id:'zl30',instance:'a',target:'enemy',...opts}).state,s);assert.deepEqual(s,before);}
 for(const patch of [{energy:0},{hp:0},{enemy:{...s.enemy,hp:0}}]){const t={...s,...patch},copy=structuredClone(t);assert.equal(play(t,{id:'zl30',instance:'a',target:'enemy'}).state,t);assert.deepEqual(t,copy);}
 const c=cards.find(c=>c.id==='zl30'),old=c.base;try{for(const effects of [[['jadeBurst',0]],[['jadeBurst',4]],[['jadeBurst',NaN]],[['jadeBurst',Number.MAX_SAFE_INTEGER]],[['jade',20],['jadeBurst',2]]]){c.base=effects;assert.equal(play(s,{id:'zl30',instance:'a',target:'enemy'}).state,s);assert.deepEqual(s,before);}}finally{c.base=old;}
});

test('reserve burst is strictly single-target, not a multi-enemy reserve allocation interface',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl30',upgraded:false};s.jade=20;const before=structuredClone(s);
 for(const target of ['enemy2',['enemy'],['enemy','enemy2'],null]){const r=play(s,{id:'zl30',instance:'a',target});assert.equal(r.ok,false);assert.equal(r.state,s);assert.deepEqual(s,before);}
});

test('repair installs without immediate jade, ticks after pillar before enemy and uses strongest intensity',()=>{
 for(const u of [false,true]){
  const s=initialState(),r=run('zl31',s,u).state;assert.equal(r.jade,0);assert.equal(r.repair,u?3:2);assert.equal(r.energy,1);
  const waited=endTurn(r,[]);assert.equal(waited.jade,u?3:2);const attacked=endTurn(r,[5]);assert.equal(attacked.hp,u?58:57);assert.equal(attacked.jade,0);
  const full=endTurn({...r,jade:19},[]);assert.equal(full.jade,20);
 }
 let s={...initialState(),energy:6};s=run('zl31',s).state;s=run('zl31',s,true).state;s=run('zl31',s).state;assert.equal(s.repair,3);assert.equal(s.energy,0);assert.equal(s.powers.length,3);assert.equal(endTurn(s,[]).jade,3);
});
test('repair terminal and pillar lethal stop jade gain, while nonlethal pulse allows repair and enemy absorption',()=>{
 const s=run('zl31').state;s.pillar=3;s.enemy.hp=3;const done=endTurn(s,[99]);assert.equal(done.enemy.hp,0);assert.equal(done.hp,60);assert.equal(done.jade,0);
 for(const patch of [{hp:0},{enemy:{...s.enemy,hp:0}}]){const t={...s,...patch};assert.deepEqual(endTurn(t,[9]),t);}
 s.enemy.hp=4;const live=endTurn(s,[3]);assert.equal(live.enemy.hp,1);assert.equal(live.hp,59);assert.equal(live.jade,0);
});
test('repair has short-window cost versus instantaneous reserve and idle long-window saturation',()=>{
 let slow=run('zl31').state,instant=run('zl03').state;
 assert.equal(endTurn(slow,[12]).hp,50);assert.equal(endTurn(instant,[12]).hp,60);
 for(let i=0;i<10;i++)slow=endTurn(slow,[]);
 assert.equal(slow.jade,20);assert.equal(instant.jade,12);assert.equal(slow.repair,2);
});
test('repair invalid state/intensity and payment cancellation remain atomic',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl31',upgraded:false};const before=structuredClone(s);
 assert.equal(play(s,{id:'zl31',instance:'a',cancel:true}).state,s);assert.deepEqual(s,before);
 const c=cards.find(c=>c.id==='zl31'),old=c.base;try{for(const n of [0,4,NaN,Number.MAX_SAFE_INTEGER]){c.base=[['repair',n]];assert.equal(play(s,{id:'zl31',instance:'a'}).state,s);assert.deepEqual(s,before);}}finally{c.base=old;}
 for(const repair of [4,-1,NaN]){const t={...s,repair},copy=structuredClone(t);assert.throws(()=>endTurn(t,[]));assert.deepEqual(t,copy);}
 const poor={...s,energy:1};assert.equal(play(poor,{id:'zl31',instance:'a'}).state,poor);
});

test('sacrifice counter base/upgrade pays jade for temporary fixed retaliation without block or immediate damage',()=>{
 for(const u of [false,true])for(const jade of [0,2,3,20]){
  const s=initialState();s.jade=jade;const before=structuredClone(s),r=run('zl32',s,u);assert.equal(r.ok,jade>=3);
  if(r.ok){assert.equal(r.state.jade,jade-3);assert.equal(r.state.counter,u?8:6);assert.equal(r.state.block,0);assert.equal(r.state.enemy.hp,40);assert.equal(r.state.energy,2);}
  assert.deepEqual(s,before);
 }
});
test('sacrifice counter idle wastes payment, zero hit triggers, multihit increases retaliation but damage happens first',()=>{
 for(const u of [false,true])for(const hits of [[],[0],[12],[3,3,3]]){
  const s={...initialState(),jade:6};s.enemy.hp=100;s.enemy.vulnerable=3;const r=run('zl32',s,u).state,end=endTurn(r,hits);
  assert.equal(end.hp,60-Math.max(0,hits.reduce((a,b)=>a+b,0)-3));assert.equal(end.enemy.hp,100-hits.length*(u?8:6));assert.equal(end.counter,0);
 }
});
test('sacrifice counter is faster retaliation but loses protection versus15 and simultaneous death remains a loss',()=>{
 const s={...initialState(),jade:6},risk=endTurn(run('zl32',s).state,[3,3,3]),safe=endTurn(run('zl15',s).state,[3,3,3]);
 assert.equal(risk.hp,54);assert.equal(safe.hp,60);assert.equal(risk.enemy.hp,22);assert.equal(safe.enemy.hp,31);
 const fatal={...initialState(),jade:3,hp:3};fatal.enemy.hp=6;const both=endTurn(run('zl32',fatal).state,[4,99]);assert.equal(both.hp,0);assert.equal(both.enemy.hp,0);
});
test('sacrifice counter insufficient shield, overflow, cancellation and later invalid effect are atomic',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl32',upgraded:false};s.jade=3;const before=structuredClone(s);
 assert.equal(play(s,{id:'zl32',instance:'a',cancel:true}).state,s);assert.deepEqual(s,before);
 for(const patch of [{jade:2},{energy:0},{counter:Number.MAX_SAFE_INTEGER},{hp:0}]){const t={...s,...patch},copy=structuredClone(t);assert.equal(play(t,{id:'zl32',instance:'a'}).state,t);assert.deepEqual(t,copy);}
 const c=cards.find(c=>c.id==='zl32'),old=c.base;try{c.base=[['spendJade',3],['counter',NaN]];assert.equal(play(s,{id:'zl32',instance:'a'}).state,s);assert.deepEqual(s,before);}finally{c.base=old;}
});

test('pillar growth base/upgrade spends six jade, saturates at six, does not immediately pulse',()=>{
 for(const u of [false,true])for(const pillar of [3,4,5,6])for(const jade of [5,6,20]){
  const s={...initialState(),pillar,jade},before=structuredClone(s),r=run('zl33',s,u);assert.equal(r.ok,jade>=6);
  if(r.ok){assert.equal(r.state.pillar,Math.min(6,pillar+(u?2:1)));assert.equal(r.state.jade,jade-6);assert.equal(r.state.energy,2);assert.equal(r.state.enemy.hp,40);assert.equal(r.state.exhaust.length,1);}
  assert.deepEqual(s,before);
 }
});
test('pillar growth strengthens pulse and pillar block but preserves defense opportunity cost',()=>{
 const s={...initialState(),pillar:3,jade:6},r=run('zl33',s).state;
 assert.equal(endTurn(r,[]).enemy.hp,36);assert.equal(endTurn(s,[]).enemy.hp,37);
 assert.equal(endTurn(r,[6]).hp,54);assert.equal(endTurn(s,[6]).hp,60);
 assert.equal(run('zl22',r).state.enemy.hp,28);assert.equal(run('zl25',r).state.block,16);
 const full=run('zl33',{...initialState(),pillar:6,jade:6},true).state;assert.equal(full.pillar,6);assert.equal(full.jade,0);assert.equal(full.energy,2);
});
test('pillar growth requires existing setup, no prepay from future effects, and invalid states reject atomically',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl33',upgraded:false};s.pillar=3;s.jade=6;const before=structuredClone(s);
 assert.equal(play(s,{id:'zl33',instance:'a',cancel:true}).state,s);assert.deepEqual(s,before);
 for(const patch of [{pillar:0},{pillar:7},{pillar:Number.MAX_SAFE_INTEGER},{jade:5},{energy:0},{hp:0}]){const t={...s,...patch},copy=structuredClone(t);assert.equal(play(t,{id:'zl33',instance:'a'}).state,t);assert.deepEqual(t,copy);}
 const c=cards.find(c=>c.id==='zl33'),old=c.base;try{for(const n of [0,3,NaN,Number.MAX_SAFE_INTEGER]){c.base=[['spendJade',6],['growPillar',n]];assert.equal(play(s,{id:'zl33',instance:'a'}).state,s);assert.deepEqual(s,before);}}finally{c.base=old;}
});

test('pillar growth only accepts its explicit payment-then-growth contract, not mixed state changes',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl33',upgraded:false};s.pillar=3;s.jade=6;const before=structuredClone(s),c=cards.find(c=>c.id==='zl33'),old=c.base;
 try{for(const effects of [[['growPillar',1]],[['pillar',Number.MAX_SAFE_INTEGER],['growPillar',1]],[['spendJade',3],['growPillar',1]],[['spendJade',6],['growPillar',1],['growPillar',1]]]){c.base=effects;assert.equal(play(s,{id:'zl33',instance:'a'}).state,s);assert.deepEqual(s,before);}}finally{c.base=old;}
});

test('held weak base/upgrade adds only duration without damage and ordinary attacks round per hit',()=>{
 for(const u of [false,true])for(const existing of [0,3])for(const hits of [[],[1],[3,3,3],[20]]){
  const s=initialState();s.enemy.weak=existing;const before=structuredClone(s),r=run('zl34',s,u).state;
  assert.equal(r.enemy.weak,existing+(u?2:1));assert.equal(r.enemy.hp,40);assert.equal(r.energy,2);
  const end=endTurn(r,hits);assert.equal(end.hp,60-hits.reduce((n,h)=>n+Math.floor(h*.75),0));assert.equal(end.enemy.weak,existing+(u?2:1)-1);assert.deepEqual(s,before);
 }
});
test('held weak immediate effect sacrifices09 damage and duration expires on idle rather than pausing intent',()=>{
 for(const u of [false,true]){
  const a=run('zl09',initialState(),u).state,b=run('zl34',initialState(),u).state;
  assert.equal(a.enemy.weak,b.enemy.weak);assert.equal(a.energy,b.energy);assert.equal(a.enemy.hp,u?33:35);assert.equal(b.enemy.hp,40);
 }
 assert.equal(endTurn(run('zl34').state,[]).enemy.weak,0);
});
test('held weak rejection is atomic for target death, cancellation, energy and duration overflow',()=>{
 const s=initialState(['a']);s.instances.a={id:'zl34',upgraded:false};const before=structuredClone(s);
 for(const opts of [{cancel:true},{target:'wrong'}]){assert.equal(play(s,{id:'zl34',instance:'a',target:'enemy',...opts}).state,s);assert.deepEqual(s,before);}
 for(const patch of [{energy:0},{hp:0},{enemy:{...s.enemy,hp:0}},{enemy:{...s.enemy,weak:Number.MAX_SAFE_INTEGER}}]){const t={...s,...patch},copy=structuredClone(t);assert.equal(play(t,{id:'zl34',instance:'a',target:'enemy'}).state,t);assert.deepEqual(t,copy);}
 const c=cards.find(c=>c.id==='zl34'),old=c.base;try{c.base=[['weak',NaN]];assert.equal(play(s,{id:'zl34',instance:'a',target:'enemy'}).state,s);assert.deepEqual(s,before);}finally{c.base=old;}
});

test('breach guard base/upgrade removes armor without damage and converts three jade into temporary cover',()=>{
 for(const u of [false,true])for(const armor of [0,10,Number.MAX_SAFE_INTEGER])for(const jade of [2,3,20]){
  const s={...initialState(),jade};s.enemy.block=armor;const before=structuredClone(s),r=run('zl35',s,u);assert.equal(r.ok,jade>=3);
  if(r.ok){assert.equal(r.state.enemy.block,0);assert.equal(r.state.enemy.hp,40);assert.equal(r.state.jade,jade-3);assert.equal(r.state.block,u?8:5);assert.equal(r.state.energy,2);}assert.deepEqual(s,before);
 }
 const s={...initialState(),jade:3};s.enemy.block=10;const hit=run('zl17',s).state,cover=run('zl35',s).state;assert.equal(hit.enemy.hp,36);assert.equal(cover.enemy.hp,40);assert.equal(endTurn(hit,[5]).hp,55);assert.equal(endTurn(cover,[5]).hp,60);
});
test('batch three cancellation, payment, terminal and post-payment malformed effects keep input unchanged',()=>{
 for(const id of ['zl35','zl36','zl37']){
  const s=initialState(['a']);s.instances.a={id,upgraded:false};s.jade=3;s.pillar=3;const before=structuredClone(s);
  assert.equal(play(s,{id,instance:'a',target:'enemy',cancel:true}).state,s);assert.deepEqual(s,before);
  for(const patch of [{energy:0},{hp:0},{enemy:{...s.enemy,hp:0}}]){const t={...s,...patch},copy=structuredClone(t);assert.equal(play(t,{id,instance:'a',target:'enemy'}).state,t);assert.deepEqual(t,copy);}
  const c=cards.find(c=>c.id===id),old=c.base;try{c.base=[...old.slice(0,-1),[old.at(-1)[0],NaN]];assert.equal(play(s,{id,instance:'a',target:'enemy'}).state,s);assert.deepEqual(s,before);}finally{c.base=old;}
 }
});
test('pillar search must own pillar before pending draw and heavy access buys block not permanent shield',()=>{
 assert.equal(run('zl36').ok,false);
 for(const u of [false,true]){
  const s={...initialState(),pillar:3},a=run('zl36',s,u).state;assert.equal(a.pillar,0);assert.equal(a.pendingDraw,u?5:4);assert.equal(a.energy,2);assert.equal(a.enemy.hp,40);
  const b=run('zl37',initialState(),u).state;assert.equal(b.block,u?14:10);assert.equal(b.pendingDraw,u?2:1);assert.equal(b.jade,0);assert.equal(b.energy,1);
 }
});

test('breach guard only earns its resource cost against armor, while naked-target basic guard preserves reserve',()=>{
 const s={...initialState(),jade:3};s.enemy.block=20;
 assert.equal(run('zl01',run('zl35',s).state).state.enemy.hp,34);assert.equal(run('zl01',run('zl02',s).state).state.enemy.hp,40);
 s.enemy.block=0;const a=run('zl35',s).state,b=run('zl02',s).state;assert.equal(a.block,b.block);assert.equal(a.jade,0);assert.equal(b.jade,3);
});

test('quick reserve and strike work at zero energy without generating energy; strike pays three jade',()=>{
 for(const u of [false,true])for(const jade of [0,2,3,20]){
  const s={...initialState(),jade,energy:0},before=structuredClone(s),shield=run('zl38',s,u);
  assert.equal(shield.ok,true);assert.equal(shield.state.energy,0);assert.equal(shield.state.jade,Math.min(20,jade+(u?3:2)));assert.equal(shield.state.exhaust.length,1);
  const strike=run('zl39',s,u);assert.equal(strike.ok,jade>=3);if(strike.ok){assert.equal(strike.state.energy,0);assert.equal(strike.state.jade,jade-3);assert.equal(strike.state.enemy.hp,u?32:34);assert.equal(strike.state.exhaust.length,1);}assert.deepEqual(s,before);
 }
});
test('held emergency pays half16 reserve but gives less block and cannot serve long-term protection',()=>{
 for(const u of [false,true]){
  const s={...initialState(),jade:6},a=run('zl16',s,u).state,b=run('zl40',s,u).state;
  assert.equal(a.block,u?21:16);assert.equal(b.block,u?16:12);assert.equal(a.jade,0);assert.equal(b.jade,3);assert.equal(a.energy,b.energy);
  const idle=endTurn(b,[]);assert.equal(idle.block,0);assert.equal(idle.jade,3);
 }
});
test('zero-energy batch cancellation and illegal effects never spend reserves, zero costs do not allow dead actions',()=>{
 for(const id of ['zl38','zl39','zl40']){
  const s=initialState(['a']);s.instances.a={id,upgraded:false};s.jade=3;const before=structuredClone(s);
  assert.equal(play(s,{id,instance:'a',target:'enemy',cancel:true}).state,s);assert.deepEqual(s,before);
  for(const patch of [{hp:0},{enemy:{...s.enemy,hp:0}}]){const t={...s,...patch};assert.equal(play(t,{id,instance:'a',target:'enemy'}).state,t);}
  const c=cards.find(c=>c.id===id),old=c.base;try{c.base=[...old.slice(0,-1),[old.at(-1)[0],NaN]];assert.equal(play(s,{id,instance:'a',target:'enemy'}).state,s);assert.deepEqual(s,before);}finally{c.base=old;}
 }
});

test('suppressed payoff base/upgrade has two independently rounded ordinary hits only when Weak exists',()=>{
 for(const u of [false,true])for(const weak of [0,1,5])for(const vulnerable of [0,2])for(const block of [0,5,20]){
  const s=initialState();s.enemy.weak=weak;s.enemy.vulnerable=vulnerable;s.enemy.block=block;const before=structuredClone(s),r=run('zl41',s,u).state;
  const a=u?6:4,b=u?9:7,total=(vulnerable?Math.floor(a*1.5):a)+(weak?(vulnerable?Math.floor(b*1.5):b):0);
  assert.equal(r.enemy.hp,40-Math.max(0,total-block));assert.equal(r.enemy.block,Math.max(0,block-total));assert.equal(r.enemy.weak,weak);assert.equal(r.energy,2);assert.deepEqual(s,before);
 }
 const dead=initialState();dead.enemy.hp=4;dead.enemy.weak=1;assert.equal(run('zl41',dead).state.enemy.hp,0);
});
test('exposed reserve samples debuff at play time, caps jade and does not attack or extend Vulnerable',()=>{
 for(const u of [false,true])for(const vulnerable of [0,1,4])for(const jade of [0,19,20]){
  const s={...initialState(),jade};s.enemy.vulnerable=vulnerable;const before=structuredClone(s),r=run('zl42',s,u).state;
  assert.equal(r.jade,Math.min(20,jade+(u?4:3)+(vulnerable?(u?5:4):0)));assert.equal(r.enemy.hp,40);assert.equal(r.enemy.vulnerable,vulnerable);assert.equal(r.energy,2);assert.deepEqual(s,before);
 }
});
test('batch five state gates create opportunity costs rather than free additional baseline power',()=>{
 const s=initialState(),plain=run('zl01',s).state,conditional=run('zl41',s).state;assert.equal(plain.enemy.hp,34);assert.equal(conditional.enemy.hp,36);
 const gated=run('zl42',s).state,hybrid=run('zl06',s).state;assert.equal(gated.jade,3);assert.equal(hybrid.jade,3);assert.equal(gated.block,0);assert.equal(hybrid.block,4);
 s.enemy.vulnerable=2;assert.equal(run('zl42',s).state.jade,7);
});
test('batch five invalid conditional effects reject before preceding damage/block or jade changes',()=>{
 for(const [id,op,n] of [['zl41','suppressedDamage',Number.MAX_SAFE_INTEGER],['zl42','exposedJade',21],['zl43','pillarDraw',11]]){
  const s=initialState(['a']);s.instances.a={id,upgraded:false};s.pillar=3;s.enemy.weak=1;s.enemy.vulnerable=1;const before=structuredClone(s),c=cards.find(c=>c.id===id),old=c.base;
  try{c.base=[old[0],[op,n]];assert.equal(play(s,{id,instance:'a',target:'enemy'}).state,s);assert.deepEqual(s,before);c.base=[old[0],[op,NaN]];assert.equal(play(s,{id,instance:'a',target:'enemy'}).state,s);assert.deepEqual(s,before);}finally{c.base=old;}
  assert.equal(play(s,{id,instance:'a',target:'enemy',cancel:true}).state,s);assert.deepEqual(s,before);
 }
});
