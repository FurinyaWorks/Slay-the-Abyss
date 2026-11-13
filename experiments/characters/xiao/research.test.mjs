import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from './model.mjs';
import {newBattle,advance} from './battle.mjs';
import {observe,choose,runCampaign} from './research.mjs';
test('policy sees no hidden deck, RNG or future intents and breaks current armor',()=>{
  const a=newBattle({seed:1,encounter:'armor'});a.hand=['x01'];a.enemies[0].intent=[4,10000];
  const b=structuredClone(a);b.draw.reverse();b.rng=999;b.enemies[0].intent[1]=0;
  assert.deepEqual(observe(a),observe(b));assert.deepEqual(choose(observe(a),'guard'),choose(observe(b),'guard'));assert.equal(choose(observe(a),'guard').index,0);
});
test('campaign carries remaining life with no hidden full heal, exact replay',()=>{
  const config={seed:1001,policy:'guard',exit:true,upgradeMask:true};const a=runCampaign(config);assert.deepEqual(a,runCampaign(config));
  for(let i=1;i<a.fights.length;i++)assert.equal(a.fights[i].initialHp,a.fights[i-1].remainingHp);
  assert.equal(a.fights[0].initialHp,70);assert.ok(a.fights.every(f=>f.failedActions===0&&!f.truncated));
});
test('exit accessibility is actual deck size not guaranteed by relic or retention',()=>{
  let seen=0;for(let seed=1;seed<=100;seed++){const s=newBattle({seed,deck:[...catalog.starter,'x06']});if(s.hand.includes('x06'))seen++;}
  assert.ok(seen>20&&seen<80);assert.ok(!newBattle().hand.includes('x06'));
  const s=newBattle({deck:['x06',...Array(10).fill('x01')],seed:1});assert.equal(s.hand.length+s.draw.length,11);
});
test('custom deck and starting life validated, real shuffle keeps inventory',()=>{
  assert.throws(()=>newBattle({hp:0}));assert.throws(()=>newBattle({hp:NaN}));assert.throws(()=>newBattle({deck:['unknown']}));assert.throws(()=>newBattle({deck:['x08']}));
  let s=newBattle({hp:17,deck:['x06',...catalog.starter]});s.enemies[0].intent=[0];
  for(let i=0;i<10;i++){s=advance(s);assert.equal(s.hp,17);assert.equal(s.hand.length+s.draw.length+s.discard.length,11);}
});

test('seed23 relic draw records exit availability in the same turn',()=>{
  const r=runCampaign({seed:23,policy:'guard',exit:true,upgradeMask:false});
  assert.equal(r.fights[0].firstMask,1);assert.equal(r.fights[0].firstExitSeen,1);
});
