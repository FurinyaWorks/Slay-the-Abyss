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
