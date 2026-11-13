import test from 'node:test';import assert from 'node:assert/strict';
import {cards,initialState,play,endTurn} from './model.mjs';
import {battleStart,playInstance,nextTurn} from './battle.mjs';
import {journeyStart,fightRoom,takeReward,rewardView,selectReward,offers} from './journey.mjs';
function state(id,u=false){const s=initialState(['a']);s.instances.a={id,upgraded:u};s.jade=6;s.pillar=3;return s;}
function cast(s){return play(s,{id:s.instances.a.id,instance:'a',upgraded:s.instances.a.upgraded,target:'enemy'});}
test('double thrust independently resolves two ordinary hits and pays exactly three reserve',()=>{
 for(const u of [false,true])for(const vuln of [0,2])for(const armor of [0,5,99])for(const hp of [4,40]){
  const s=state('zl44',u);s.enemy={...s.enemy,vulnerable:vuln,block:armor,hp};const before=structuredClone(s),r=cast(s);assert.equal(r.ok,true);
  const each=(u?6:4)*(vuln?1.5:1),total=2*each;assert.equal(r.state.enemy.hp,Math.max(0,hp-Math.max(0,total-armor)));assert.equal(r.state.enemy.block,Math.max(0,armor-total));assert.equal(r.state.jade,3);assert.equal(r.state.energy,2);assert.deepEqual(s,before);
 }
 const s=state('zl44');s.jade=2;assert.equal(cast(s).ok,false);
});
test('dual control independent duration and block gains plus actual decay no attacks of its own',()=>{
 for(const u of [false,true])for(const existing of [0,2]){
  const s=state('zl45',u);s.enemy.weak=existing;s.enemy.vulnerable=existing;const r=cast(s).state;
  assert.equal(r.enemy.hp,40);assert.equal(r.enemy.weak,existing+(u?2:1));assert.equal(r.enemy.vulnerable,existing+(u?2:1));assert.equal(r.block,u?5:3);assert.equal(r.energy,1);
  const n=endTurn({...r,pillar:0},[]);assert.equal(n.enemy.weak,existing+(u?2:1)-1);assert.equal(n.enemy.vulnerable,existing+(u?2:1)-1);assert.equal(n.block,0);
 }
});
test('pillar shelter converts pillar to temporary block, full idle wastes it but no future pulse',()=>{
 for(const u of [false,true]){
  const s=state('zl46',u),r=cast(s).state;assert.equal(r.pillar,0);assert.equal(r.block,u?30:24);assert.equal(r.jade,6);assert.equal(r.energy,2);assert.deepEqual(r.exhaust,['a']);
  const idle=endTurn(r,[]);assert.equal(idle.block,0);assert.equal(idle.enemy.hp,40);assert.equal(idle.jade,6);
  const defended=endTurn(r,[30]);assert.equal(defended.hp,60);assert.equal(defended.jade,u?6:0);
 }
 const no=state('zl46');no.pillar=0;const before=structuredClone(no);assert.equal(cast(no).ok,false);assert.deepEqual(no,before);
});
test('batch six cancellation, terminal, costs and malformed effects leave original state unchanged',()=>{
 for(const id of ['zl44','zl45','zl46']){
  const s=state(id),before=structuredClone(s);assert.equal(play(s,{id,instance:'a',target:'enemy',cancel:true}).state,s);assert.deepEqual(s,before);
  for(const patch of [{hp:0},{energy:0},{enemy:{...s.enemy,hp:0}}]){const t={...s,...patch},copy=structuredClone(t);assert.equal(cast(t).state,t);assert.deepEqual(t,copy);}
  const c=cards.find(c=>c.id===id),old=c.base;try{c.base=[...old.slice(0,-1),[old.at(-1)[0],NaN]];assert.equal(cast(s).state,s);assert.deepEqual(s,before);}finally{c.base=old;}
 }
 for(const field of ['weak','vulnerable']){const s=state('zl45');s.enemy[field]=Number.MAX_SAFE_INTEGER;const before=structuredClone(s);assert.equal(cast(s).state,s);assert.deepEqual(s,before);}
});
test('pillar shelter original Power stays out and one-shot cover cannot be drawn again',()=>{
 let s=battleStart({deck:['zl21','zl46']});const p=s.hand.find(k=>s.instances[k].id==='zl21'),g=s.hand.find(k=>s.instances[k].id==='zl46');s=playInstance(s,p).state;s=playInstance(s,g).state;
 assert.deepEqual(s.powers,[p]);assert.deepEqual(s.exhaust,[g]);assert.equal(s.energy,0);assert.equal(s.pillar,0);
 s=nextTurn(s,[]);assert.equal(s.hand.length,0);assert.equal(s.enemy.hp,40);assert.equal(s.block,0);
});
test('batch six actual v28 reward lifecycle and previous pool exclusion',()=>{
 for(const [id,policy] of [['zl44','doubleThrust'],['zl45','dualControl'],['zl46','pillarShelter']]){
  let seed=1;while(seed<=10000&&!(policy==='pillarShelter'?offers(seed,1,'v28').includes('zl21')&&offers(seed,2,'v28').includes(id):offers(seed,1,'v28').includes(id)))seed++;assert.ok(seed<=10000);
  let s=journeyStart(seed,{poolVersion:'v28'});for(let room=1;room<=(policy==='pillarShelter'?2:1);room++){s.battle.enemy.hp=1;s=fightRoom(s,'offense','low');s=takeReward(s,selectReward(rewardView(s),policy));}assert.ok(s.deck.includes(id));
  for(let i=1;i<=100;i++)assert.ok(!offers(i,1,'v27').includes(id));
 }
});

test('batch six opportunity costs:44 saves jade versus04,45 saves one card but loses damage,46 loses persistent reserve versus23',()=>{
 const a=state('zl44'),b=state('zl04');a.pillar=b.pillar=0;const x=cast(a).state,y=cast(b).state;assert.equal(x.enemy.hp,32);assert.equal(y.enemy.hp,26);assert.equal(x.jade,3);assert.equal(y.jade,0);
 const combo=initialState(['a','b']);combo.instances={a:{id:'zl13',upgraded:false},b:{id:'zl09',upgraded:false}};
 const pair=play(play(combo,{id:'zl13',instance:'a',target:'enemy'}).state,{id:'zl09',instance:'b',target:'enemy'}).state;
 const single=cast(state('zl45')).state;assert.equal(pair.energy,single.energy);assert.equal(pair.enemy.hp,33);assert.equal(single.enemy.hp,40);assert.equal(pair.block,0);assert.equal(single.block,3);assert.equal(pair.enemy.vulnerable,2);assert.equal(single.enemy.vulnerable,1);
 const shelter=cast(state('zl46')).state,reserve=cast(state('zl23')).state;
 assert.equal(endTurn(shelter,[30]).hp,60);assert.equal(endTurn(reserve,[30]).hp,48);
 assert.equal(endTurn(shelter,[]).jade,6);assert.equal(endTurn(reserve,[]).jade,18);
});
