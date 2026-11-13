import test from 'node:test';import assert from 'node:assert/strict';
import {battleStart,applyRelic,draw,nextTurn,playInstance,visibleState,RELIC} from './battle.mjs';
const zones=s=>[...s.hand,...s.draw,...s.discard];
test('starter is ten instances, draw five, starting relic adds exactly three',()=>{const s=battleStart();assert.equal(s.hand.length,5);assert.equal(s.draw.length,5);assert.equal(s.jade,3);assert.equal(new Set(zones(s)).size,10);assert.equal(Object.keys(s.instances).length,10);});
test('relic is once per battle, not once per turn nor repeatable by cancel',()=>{let s=battleStart();for(let i=0;i<100;i++)s=applyRelic(s);assert.equal(s.jade,3);s=nextTurn(s,[3]);assert.equal(s.jade,0);assert.equal(applyRelic(s).jade,0);assert.equal(battleStart().jade,3);assert.equal(battleStart({relic:false}).jade,0);assert.equal(applyRelic(battleStart({relic:false})).jade,0);});
test('deck shuffle is seeded and independent of caller input',()=>{const deck=['zl01','zl02','zl03'];const before=[...deck];assert.deepEqual(battleStart({seed:77,deck}),battleStart({seed:77,deck}));assert.deepEqual(deck,before);});
test('draw/reshuffle never creates cards across 100 turns',()=>{let s=battleStart();for(let i=0;i<100;i++){s=nextTurn(s,[]);assert.equal(zones(s).length,10);assert.equal(new Set(zones(s)).size,10);assert.equal(s.hand.length,5);}});
test('full hand retains deck and small decks draw only available instances',()=>{let s=draw(battleStart(),10);assert.equal(s.hand.length,10);assert.deepEqual(draw(s,5),s);assert.equal(battleStart({deck:['zl01']}).hand.length,1);});
test('played cards enter discard, cannot play same instance twice, can draw later',()=>{const s=battleStart({deck:['zl01']});const key=s.hand[0];const r=playInstance(s,key);assert.equal(r.ok,true);assert.deepEqual(r.state.discard,[key]);assert.equal(playInstance(r.state,key).ok,false);assert.deepEqual(nextTurn(r.state,[]).hand,[key]);});
test('dead player/target never gets new hand or relic from turn advance',()=>{const s=battleStart();s.hp=1;const r=nextTurn(s,[100]);assert.equal(r.hp,0);assert.equal(r.hand.length,0);const won=battleStart({deck:['zl01'],enemyHp:6});const w=playInstance(won,won.hand[0]).state;assert.equal(nextTurn(w,[100]).hp,60);assert.equal(nextTurn(w,[100]).hand.length,0);});
test('visible policy input hides seed, draw order and discard contents',()=>{const s=battleStart();const v=visibleState(s,[10]);for(const key of ['rng','draw','discard','instances'])assert.equal(key in v,false);assert.equal(v.hand.length,5);});
test('invalid initialization rejected; relic name remains unapproved',()=>{for(const setup of [{seed:-1},{hp:61},{deck:[]},{deck:['bad']},{relic:'true'}])assert.throws(()=>battleStart(setup));assert.throws(()=>draw(battleStart(),-1));assert.equal(RELIC.status,'HOLD');});
test('resource and HP boundaries hold under seeded 30-turn stress',()=>{for(let seed=0;seed<20;seed++){let s=battleStart({seed,enemyHp:1000});for(let t=0;t<30&&s.hp;t++){for(const key of [...s.hand]){const r=playInstance(s,key);if(r.ok)s=r.state;}s=nextTurn(s,[t%3]);assert.ok(s.hp>=0&&s.hp<=60);assert.ok(s.jade>=0&&s.jade<=20);assert.ok(s.energy>=0&&s.energy<=3);assert.equal(new Set(zones(s)).size,10);}}});
test('terminal battles cannot draw or gain relic resources',()=>{
  for(const field of ['hp','enemy']){
    const s=battleStart();if(field==='hp')s.hp=0;else s.enemy.hp=0;
    const before=structuredClone(s);
    assert.strictEqual(draw(s,5),s);assert.strictEqual(applyRelic(s),s);
    assert.equal(playInstance(s,s.hand[0]).ok,false);assert.deepEqual(s,before);
  }
});
test('every public boundary rejects malformed battle atomically',()=>{
  const mutations=[
    s=>s.rng=NaN,s=>s.rng=-1,s=>s.rng=4294967296,
    s=>s.draw.push(s.hand[0]),s=>s.draw.pop(),
    s=>s.instances[s.hand[0]].upgraded='false',
    s=>s.instances[s.hand[0]].id='unknown',s=>s.hp=Infinity,
    s=>s.relicApplied=1,s=>s.turn=0
  ];
  for(const mutate of mutations){
    const s=battleStart();mutate(s);const before=structuredClone(s);
    for(const invoke of [()=>draw(s),()=>applyRelic(s),()=>playInstance(s,s.hand[0]),()=>nextTurn(s,[]),()=>visibleState(s,[])]){
      assert.throws(invoke,/invalid battle/);assert.deepEqual(s,before);
    }
  }
});
test('exhausted card remains owned but never reshuffles into battle hand',()=>{
 let s=battleStart({deck:['zl10','zl01']});const key=s.hand.find(k=>s.instances[k].id==='zl10');s=playInstance(s,key).state;
 assert.deepEqual(s.exhaust,[key]);assert.equal(Object.keys(s.instances).length,2);
 for(let i=0;i<10;i++){s=nextTurn(s,[]);assert.equal(s.hand.length,1);assert.equal(s.hand.includes(key),false);}
 const broken=structuredClone(s);broken.draw.push(key);const before=structuredClone(broken);assert.throws(()=>draw(broken),/invalid battle/);assert.deepEqual(broken,before);
 assert.equal(battleStart({deck:['zl10','zl01']}).exhaust.length,0);
});
test('draw card cannot reshuffle itself and upgrades draw exact independent amounts',()=>{
 const solo=battleStart({deck:['zl12']});const only=solo.hand[0];const r=playInstance(solo,only).state;
 assert.equal(r.energy,2);assert.equal(r.block,3);assert.equal(r.hand.length,0);assert.deepEqual(r.discard,[only]);assert.equal(r.inUse,null);assert.equal(r.pendingDraw,0);
 for(const upgraded of [false,true]){
  const s=battleStart({deck:['zl12','zl01','zl02','zl03','zl06','zl07','zl08'],seed:7});
  const key=Object.keys(s.instances).find(k=>s.instances[k].id==='zl12');
  s.hand=[key];s.draw=[];s.discard=Object.keys(s.instances).filter(k=>k!==key);s.instances[key].upgraded=upgraded;
  const before=structuredClone(s);const n=playInstance(s,key).state;
  assert.equal(n.hand.length,upgraded?2:1);assert.equal(n.block,upgraded?4:3);assert.equal(n.hand.includes(key),false);assert.deepEqual(n.discard,[key]);assert.deepEqual(s,before);
 }
});
test('draw full hand respects ten after in-use removal, and invalid RNG pays nothing',()=>{
 const s=draw(battleStart({deck:['zl12',...Array(11).fill('zl01')]}),10);
 const key=Object.keys(s.instances).find(k=>s.instances[k].id==='zl12');
 if(!s.hand.includes(key)){const old=s.hand.pop();s.draw.splice(s.draw.indexOf(key),1);s.draw.push(old);s.hand.push(key);}
 s.instances[key].upgraded=true;const next=playInstance(s,key).state;
 assert.equal(next.hand.length,10);assert.equal(next.draw.length,1);assert.equal(next.discard.length,1);
 const bad=structuredClone(s);bad.rng=NaN;const before=structuredClone(bad);assert.throws(()=>playInstance(bad,key));assert.deepEqual(bad,before);
});
test('self-retained attack survives normal end turn and pays full cost when finally played',()=>{
 let s=battleStart({deck:['zl14','zl02']});const key=s.hand.find(k=>s.instances[k].id==='zl14');
 const before=structuredClone(s);s=nextTurn(s,[0]);assert.equal(s.hand.filter(k=>k===key).length,1);assert.equal(s.energy,3);assert.deepEqual(before,battleStart({deck:['zl14','zl02']}));
 s=playInstance(s,key).state;assert.equal(s.energy,1);assert.equal(s.enemy.hp,27);assert.ok(s.discard.includes(key));assert.equal(s.hand.includes(key),false);
});
test('ten retained cards impose real hand-slot cost and full-hand draw does not remove deck',()=>{
 let s=battleStart({deck:[...Array(10).fill('zl14'),'zl01','zl02']});const retain=Object.keys(s.instances).filter(k=>s.instances[k].id==='zl14'),rest=Object.keys(s.instances).filter(k=>s.instances[k].id!=='zl14');
 s.hand=retain;s.draw=rest;s.discard=[];
 for(let i=0;i<4;i++){s=nextTurn(s,[]);assert.deepEqual(s.hand,retain);assert.deepEqual(s.draw,rest);assert.equal(s.energy,3);}
 const played=playInstance(s,retain[0]).state;const next=nextTurn(played,[]);assert.equal(next.hand.length,10);assert.equal(next.draw.length,1);assert.equal(new Set([...next.hand,...next.draw,...next.discard]).size,12);
});
test('retained terminal states do not revive, draw or discount; duplicate zones reject before cost',()=>{
 const s=battleStart({deck:['zl14','zl01']});const key=s.hand.find(k=>s.instances[k].id==='zl14');
 const invalid=structuredClone(s);invalid.discard.push(key);const before=structuredClone(invalid);assert.throws(()=>playInstance(invalid,key),/invalid battle/);assert.deepEqual(invalid,before);
 for(const dead of ['player','enemy']){const t=structuredClone(s);if(dead==='player')t.hp=0;else t.enemy.hp=0;const saved=structuredClone(t);assert.equal(playInstance(t,key).ok,false);assert.deepEqual(nextTurn(t,[99]),saved);}
 const doomed=structuredClone(s);doomed.hp=1;doomed.jade=0;const ended=nextTurn(doomed,[99]);assert.equal(ended.hp,0);assert.equal(ended.hand.length,0);assert.ok(ended.discard.includes(key));
});

test('reserve access draws before exhaust and never shuffles its in-use instance',()=>{
 for(const u of [false,true]){
  const s=battleStart({deck:['zl19','zl01','zl02','zl03','zl04'],relic:false});const key=Object.keys(s.instances).find(k=>s.instances[k].id==='zl19');
  s.hand=[key];s.draw=[];s.discard=Object.keys(s.instances).filter(k=>k!==key);s.instances[key].upgraded=u;const before=structuredClone(s);
  const r=playInstance(s,key);assert.equal(r.ok,true);assert.equal(r.state.hand.length,u?3:2);assert.equal(r.state.jade,u?8:6);assert.equal(r.state.energy,1);assert.deepEqual(r.state.exhaust,[key]);assert.equal(r.state.inUse,null);assert.equal(r.state.pendingDraw,0);assert.equal(r.state.hand.includes(key),false);assert.deepEqual(s,before);
  let later=r.state;for(let i=0;i<30;i++){later=nextTurn(later,[]);const all=[...zones(later),...later.exhaust];assert.equal(all.length,5);assert.equal(new Set(all).size,5);assert.equal(later.hand.includes(key),false);assert.deepEqual(later.exhaust,[key]);}
 }
});
test('reserve access handles only-card, full-hand and invalid boundary without free draw or resources',()=>{
 const alone=battleStart({deck:['zl19'],relic:false}),key=alone.hand[0];const used=playInstance(alone,key).state;assert.equal(used.hand.length,0);assert.deepEqual(used.exhaust,[key]);assert.equal(nextTurn(used,[]).hand.length,0);
 const s=battleStart({deck:['zl19',...Array(11).fill('zl01')],relic:false});const k=Object.keys(s.instances).find(x=>s.instances[x].id==='zl19'),others=Object.keys(s.instances).filter(x=>x!==k);s.hand=[k,...others.slice(0,9)];s.draw=others.slice(9);s.instances[k].upgraded=true;
 const r=playInstance(s,k).state;assert.equal(r.hand.length,10);assert.equal(r.draw.length,1);assert.deepEqual(r.exhaust,[k]);assert.equal(r.jade,8);assert.equal(r.energy,1);
 for(const bad of [{...s,rng:NaN},{...s,draw:[...s.draw,k]}]){const before=structuredClone(bad);assert.throws(()=>playInstance(bad,k));assert.deepEqual(bad,before);}
 for(const terminal of ['hp','enemy']){const t=structuredClone(s);if(terminal==='hp')t.hp=0;else t.enemy.hp=0;const before=structuredClone(t);assert.equal(playInstance(t,k).ok,false);assert.deepEqual(t,before);}
});
test('rebuild window is reachable through real starter relic, setup, spending and incoming depletion',()=>{
 let s=battleStart({deck:['zl03','zl04','zl20']});const key=id=>Object.keys(s.instances).find(k=>s.instances[k].id===id);
 assert.equal(s.jade,3);s=playInstance(s,key('zl03')).state;assert.equal(s.jade,15);s=playInstance(s,key('zl04')).state;assert.equal(s.jade,9);s=nextTurn(s,[9]);assert.equal(s.jade,0);assert.ok(s.hand.includes(key('zl20')));
 s=playInstance(s,key('zl20')).state;assert.equal(s.jade,9);assert.equal(s.energy,2);assert.equal(s.hp,60);
});
test('Power leaves draw/discard/exhaust, persists through reshuffle and resets next battle',()=>{
 for(const u of [false,true]){let s=battleStart({deck:['zl21','zl02'],enemyHp:10000});const key=s.hand.find(k=>s.instances[k].id==='zl21');s.instances[key].upgraded=u;const input=s,before=structuredClone(s);s=playInstance(s,key).state;assert.deepEqual(input,before);assert.deepEqual(s.powers,[key]);assert.deepEqual(s.exhaust,[]);assert.deepEqual(s.discard,[]);
  for(let i=0;i<30;i++){s=nextTurn(s,[]);const all=[...zones(s),...s.exhaust,...s.powers];assert.equal(all.length,2);assert.equal(new Set(all).size,2);assert.equal(s.hand.includes(key),false);assert.equal(s.pillar,u?4:3);}
  const fresh=battleStart({deck:['zl21','zl02']});assert.equal(fresh.pillar,0);assert.deepEqual(fresh.powers,[]);assert.ok(fresh.hand.some(k=>fresh.instances[k].id==='zl21'));
 }
});
test('Power boundary rejects duplicate or nonpower installed cards and invalid pillar before payment',()=>{
 const s=battleStart({deck:['zl21','zl02']});const key=s.hand.find(k=>s.instances[k].id==='zl21'),other=s.hand.find(k=>k!==key);
 for(const change of [{powers:[key]},{powers:[other]},{pillar:NaN}]){const bad={...s,...change},before=structuredClone(bad);assert.throws(()=>playInstance(bad,key));assert.deepEqual(bad,before);}
 s.energy=1;const saved=structuredClone(s);assert.equal(playInstance(s,key).ok,false);assert.deepEqual(s,saved);
});
test('pillar then accelerator consumes all three energy and keeps Power outside future reshuffles',()=>{
 let s=battleStart({deck:['zl21','zl22','zl02']});const idKey=id=>Object.keys(s.instances).find(k=>s.instances[k].id===id);s=playInstance(s,idKey('zl21')).state;s=playInstance(s,idKey('zl22')).state;
 assert.equal(s.energy,0);assert.equal(s.enemy.hp,31);assert.deepEqual(s.powers,[idKey('zl21')]);assert.ok(s.discard.includes(idKey('zl22')));
 s=nextTurn(s,[]);assert.equal(s.enemy.hp,28);assert.equal(s.pillar,3);assert.equal(s.hand.includes(idKey('zl21')),false);assert.ok(s.hand.includes(idKey('zl22')));
});

test('dismantling never recycles Power instance and only a new copy can rebuild this battle',()=>{
 let s=battleStart({deck:['zl21','zl21','zl23'],relic:false});const pillars=s.hand.filter(k=>s.instances[k].id==='zl21'),key=s.hand.find(k=>s.instances[k].id==='zl23');
 s=playInstance(s,pillars[0]).state;s=playInstance(s,key).state;assert.equal(s.energy,0);assert.equal(s.pillar,0);assert.equal(s.jade,12);assert.deepEqual(s.powers,[pillars[0]]);assert.deepEqual(s.exhaust,[]);
 s=nextTurn(s,[]);assert.equal(s.enemy.hp,40);assert.equal(s.hand.includes(pillars[0]),false);assert.equal(playInstance(s,key).ok,false);s=playInstance(s,pillars[1]).state;assert.equal(s.pillar,3);assert.deepEqual(s.powers,pillars);assert.equal(endlessCount(s),3);
 function endlessCount(x){return new Set([...x.hand,...x.draw,...x.discard,...x.exhaust,...x.powers]).size;}
});

test('reserve search draws independently specified count, cannot self-draw and exhausts with conserved zones',()=>{
 for(const upgraded of [false,true])for(const full of [false,true]){
  let s=battleStart({deck:['zl24',...Array(12).fill('zl02')]});const key=Object.keys(s.instances).find(k=>s.instances[k].id==='zl24');
  const all=Object.keys(s.instances);s.hand=[key,...all.filter(k=>k!==key).slice(0,full?9:3)];s.draw=all.filter(k=>!s.hand.includes(k));s.discard=[];s.instances[key].upgraded=upgraded;
  const before=structuredClone(s),r=playInstance(s,key);assert.equal(r.ok,true);const n=r.state;
  assert.equal(n.hand.length,full?10:(upgraded?7:6));assert.equal(n.jade,0);assert.equal(n.energy,2);assert.deepEqual(n.exhaust,[key]);assert.equal(n.inUse,null);assert.equal(n.pendingDraw,0);
  const zones=[...n.hand,...n.draw,...n.discard,...n.exhaust,...n.powers];assert.equal(zones.length,13);assert.equal(new Set(zones).size,13);assert.deepEqual(s,before);
 }
});
test('reserve search singleton pays for no cards and cannot return through reshuffle',()=>{
 let s=battleStart({deck:['zl24']});const key=s.hand[0];s=playInstance(s,key).state;assert.equal(s.hand.length,0);assert.equal(s.jade,0);assert.equal(s.energy,2);assert.deepEqual(s.exhaust,[key]);
 for(let i=0;i<10;i++){s=nextTurn(s,[]);assert.equal(s.hand.length,0);assert.deepEqual(s.exhaust,[key]);}
});

test('held reserve survives unplayed rounds, caps a full hand and pays lower immediate reserve for timing',()=>{
 let s=battleStart({deck:[...Array(10).fill('zl26'),...Array(5).fill('zl02')]});
 const reserve=Object.keys(s.instances).filter(k=>s.instances[k].id==='zl26'),others=Object.keys(s.instances).filter(k=>s.instances[k].id!=='zl26');
 s.hand=reserve;s.draw=others;s.discard=[];s.jade=20;
 const next=nextTurn(s,[6]);assert.equal(next.jade,14);assert.deepEqual(next.hand,reserve);assert.deepEqual(next.draw,others);assert.equal(next.hand.length,10);
 const key=next.hand[0],r=playInstance(next,key);assert.equal(r.ok,true);assert.equal(r.state.jade,20);assert.equal(r.state.energy,1);assert.ok(r.state.discard.includes(key));assert.ok(!r.state.hand.includes(key));
 const zones=[...r.state.hand,...r.state.draw,...r.state.discard,...r.state.exhaust,...r.state.powers];assert.equal(zones.length,15);assert.equal(new Set(zones).size,15);
});
test('held reserve may wait for depletion but retained cards are not free shield or extra draws',()=>{
 let s=battleStart({deck:['zl26','zl02']});const key=s.hand.find(k=>s.instances[k].id==='zl26');const before=structuredClone(s);
 const waited=nextTurn(s,[5]);assert.equal(waited.hp,58);assert.equal(waited.jade,0);assert.ok(waited.hand.includes(key));assert.deepEqual(s,before);
 const r=playInstance(waited,key);assert.equal(r.state.jade,10);assert.equal(r.state.energy,1);
 const dead={...s,hp:0};assert.equal(playInstance(dead,key).ok,false);
});

test('paired visible reserve window: standard gains two more now, held reserve alone remains accessible after waiting',()=>{
 const states=['zl03','zl26'].map(id=>{
  const s=battleStart({deck:[id,...Array(5).fill('zl02')]});const key=Object.keys(s.instances).find(k=>s.instances[k].id===id);
  s.hand=[key];s.draw=Object.keys(s.instances).filter(k=>k!==key);s.discard=[];s.jade=20;
  return {key,s,next:nextTurn(s,[10])};
 });
 assert.equal(states[0].next.jade,10);assert.equal(states[1].next.jade,10);
 assert.ok(!states[0].next.hand.includes(states[0].key));assert.ok(states[0].next.discard.includes(states[0].key));
 assert.ok(states[1].next.hand.includes(states[1].key));assert.equal(playInstance(states[1].next,states[1].key).state.jade,20);
 // Deliberately controlled piles establish a timing counterexample, not a natural-run frequency.
});

test('collapse does not return Power to circulation, exhausts once and new battle resets both cards',()=>{
 let s=battleStart({deck:['zl21','zl27']});const pillar=s.hand.find(k=>s.instances[k].id==='zl21'),finisher=s.hand.find(k=>s.instances[k].id==='zl27');
 s=playInstance(s,pillar).state;s=playInstance(s,finisher).state;assert.deepEqual(s.powers,[pillar]);assert.deepEqual(s.exhaust,[finisher]);assert.equal(s.pillar,0);assert.equal(s.enemy.hp,16);
 for(let i=0;i<10;i++){s=nextTurn(s,[]);assert.equal(s.hand.length,0);assert.equal(s.enemy.hp,16);}
 const reset=battleStart({deck:['zl21','zl27']});assert.equal(reset.hand.length,2);assert.equal(reset.pillar,0);assert.equal(reset.exhaust.length,0);assert.equal(reset.powers.length,0);
});

test('guarded exposure survives one real turn to enable subsequent expensive finisher unlike direct guarded hit',()=>{
 const outcomes=['zl29','zl11'].map(id=>{
  let s=battleStart({deck:[id,'zl05']});s.jade=6;s=playInstance(s,s.hand.find(k=>s.instances[k].id===id)).state;
  s=nextTurn(s,[]);assert.equal(s.energy,3);const key=s.hand.find(k=>s.instances[k].id==='zl05');assert.ok(key);
  const r=playInstance(s,key);assert.equal(r.ok,true);return r.state.enemy.hp;
 });assert.deepEqual(outcomes,[0,5]);
});
