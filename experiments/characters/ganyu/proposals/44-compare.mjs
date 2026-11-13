import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {initial,play,endTurn,catalogue} from '../engine.mjs';
const plan=JSON.parse(readFileSync(new URL('44-guard.json',import.meta.url))),card=catalogue.cards.find(c=>c.id==='ganyu-44'),before=structuredClone(card);
const rows=[];
for(const upgraded of [false,true])for(const charge of [0,1,2]){
 const level=upgraded?'upgrade':'base'; const output={upgraded,charge};
 for(const mode of ['04','19','44-old','44-candidate']){
  const id='ganyu-'+mode.slice(0,2); if(mode==='44-candidate')Object.assign(card[level].effects[0],plan.candidate[level]);
  try{const s={...initial([{hp:100,block:0,intent:12}]),charge,hand:[{id,upgraded},{id:'ganyu-03',upgraded}]};const a=play(s,0),b=play(a,0,0),c=endTurn(b);output[mode]={shield:a.block,immediateDamage:100-a.enemies[0].hp,charge:a.charge,energy:a.energy,withCoreDamage:100-b.enemies[0].hp,withCoreCharge:b.charge,hpAfterEnemy:c.hp};}
  finally{card[level].effects=structuredClone(before[level].effects);}
 }
 const proposed=output['44-candidate'],old=output['44-old'];assert.equal(proposed.shield,charge===2?(upgraded?12:9):(upgraded?4:3));assert.equal(proposed.charge,charge);assert.equal(proposed.withCoreDamage,old.withCoreDamage);assert.equal(proposed.energy,old.energy);
 if(charge===2){assert.ok(proposed.shield>output['04'].shield);assert.ok(proposed.immediateDamage<output['04'].immediateDamage);assert.ok(proposed.shield<output['19'].shield);assert.ok(proposed.withCoreDamage>output['19'].withCoreDamage);}else assert.deepEqual(proposed,old);
 rows.push(output);
}
assert.deepEqual(card,before);
const files=['proposals/44-guard.json','proposals/44-compare.mjs','cards.json','engine.mjs','relic.json','deck.mjs'];const hashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL('../'+f,import.meta.url))).digest('hex')]));
writeFileSync(new URL('44-comparison.json',import.meta.url),JSON.stringify({status:'PROPOSAL_NOT_APPROVED',planCommit:'5030a6bdbf3c041d52a77f70ddd47ae9e2d723da',inputs:hashes,rows,catalogueUnchanged:true},null,2)+'\n');console.log('6 base/up-resource comparisons; current catalogue unchanged');
