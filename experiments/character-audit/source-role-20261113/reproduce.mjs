// Fixed-snapshot audit, not a balance oracle. Imports only reviewed cached modules.
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(process.argv[2]??'inputs');
const manifest=JSON.parse(readFileSync(new URL('./input-manifest.json',import.meta.url)));
function verify(){
 for(const [file,record]of Object.entries(manifest)){
  const bytes=readFileSync(join(root,file));
  const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(blob,record.blob,'wrong pinned input '+file);
 }
}
verify();
const read=(c,f)=>JSON.parse(readFileSync(join(root,c,f)));
const mod=(c,f)=>import(pathToFileURL(join(root,c,f)).href);
const g=await mod('ganyu','engine.mjs'),x=await mod('xiao','model.mjs'),k=await mod('keqing','mechanics.mjs'),z=await mod('zhongli','model.mjs');
const specs={
 ganyu:g.catalogue.cards.map(c=>({id:c.id,cost:c.base.cost,rarity:c.rarity,base:c.base,upgrade:c.upgrade})),
 xiao:x.catalog.cards.map(c=>({id:c.id,cost:c.cost,rarity:c.rarity,base:c.base,upgrade:c.upgrade})),
 keqing:Object.entries(k.cards).map(([id,c])=>({id,cost:c.cost,rarity:c.rarity,base:c.effects.base,upgrade:c.effects.upgraded})),
 zhongli:z.cards.map(c=>({id:c.id,cost:c.cost,rarity:c.rarity,base:c.base,upgrade:c.upgraded}))
};
function differences(a,b,path='$'){
 if(JSON.stringify(a)===JSON.stringify(b))return [];
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return [{path,before:a??null,after:b??null}];
 return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(key=>differences(a[key],b[key],path+'.'+key));
}
const inventory={};
for(const [name,cards]of Object.entries(specs)){
 const sources=read(name,'sources.json');
 const explicit=sources.records??sources.cards;
 const listed=explicit?.map(r=>r.card_id)??sources.cardIds??null;
 const ids=cards.map(c=>c.id);assert.equal(new Set(ids).size,ids.length);
 inventory[name]={commit:manifest[name+'/'+(name==='ganyu'||name==='xiao'?'cards.json':name==='keqing'?'mechanics.mjs':'model.mjs')].sha,
  implemented:ids.length,sourceRecordSchema:explicit?'per-card records':sources.cardIds?'cardIds index only':'shared anchors only',
  missingFromExplicitRecordsOrIndex:listed?ids.filter(id=>!listed.includes(id)):null,
  extraSourceIds:listed?listed.filter(id=>!ids.includes(id)):null,
  rows:cards.map(c=>({id:c.id,cost:c.cost,rarity:c.rarity,
   upgradeChanges:differences(c.base,c.upgrade),upgradeMeaningfulness:'REQUIRES_CONTEXT_REVIEW',
   exactOfficialVerified:explicit?.find(r=>r.card_id===c.id)?.source_verified===true,
   explicitSourceRecord:Boolean(explicit?.some(r=>r.card_id===c.id)),
   note:'Different structure does not prove beneficial upgrade; source boolean is only a recorded claim.'}))};
}
// Ganyu: all legal charge values, both levels; one non-retaliating healthy enemy.
function gp(id,charge=0,upgraded=false){let s=g.initial([{hp:100,block:0,intent:0}]);s.energy=1;s.charge=charge;s.hand=[{id,upgraded}];return g.play(s,0,0);}
const gDefense=[];
for(const upgraded of [false,true])for(let q=0;q<=g.rules.maxCharge;q++){
 const a=gp('ganyu-04',q,upgraded),b=gp('ganyu-44',q,upgraded);
 assert.ok(a.block>=b.block);assert.ok(a.enemies[0].hp<b.enemies[0].hp);assert.equal(a.charge,b.charge);assert.equal(a.energy,b.energy);
 gDefense.push({upgraded,charge:q,a04:{block:a.block,enemyHp:a.enemies[0].hp},b44:{block:b.block,enemyHp:b.enemies[0].hp}});
}
const gSupply=[];
for(const upgraded of [false,true]){
 const a=gp('ganyu-06',0,upgraded),b=gp('ganyu-16',0,upgraded);
 gSupply.push({upgraded,a06:{charge:a.charge,enemyHp:a.enemies[0].hp},b16:{charge:b.charge,enemyHp:b.enemies[0].hp}});
}
assert.equal(gSupply[0].a06.charge,gSupply[0].b16.charge);
assert.ok(gSupply[1].a06.charge>gSupply[1].b16.charge);
let rain=g.initial([{hp:100,block:0,intent:0}]);rain.hand=[{id:'ganyu-31'}];rain=g.play(rain,0);rain=g.startTurn(g.endTurn(rain));rain.hand=[{id:'ganyu-18'}];const refreshed=g.play(rain,0);
assert.deepEqual(refreshed.storm,{amount:6,turns:3});
// Xiao: independent expected HP values expose non-monotonic duration upgrade.
const xDuration=[];
for(const upgraded of [false,true]){
 let s=x.state({hp:8,hand:['x04'],enemies:[{hp:100,block:0}]});
 const r=x.play(s,{index:0,target:0,upgraded});assert.equal(r.ok,true);s=r.state;
 for(let n=0;n<3;n++){s=x.endTurn(s);if(n<2)s=x.startTurn(s);}
 xDuration.push({upgraded,hp:s.hp,mask:s.mask});
}
assert.equal(xDuration[0].hp,2);assert.equal(xDuration[1].hp,0);
let exit=x.state({hand:['x16'],enemies:[{hp:100,block:0}]});exit.mask=1;exit.discard=['x27'];
const recovered=x.play(exit,{index:0,target:0});assert.equal(recovered.ok,true);assert.ok(recovered.state.discard.includes('x27'));assert.ok(!recovered.state.hand.includes('x27'));
// Zhongli: capped persistence reverses the apparently better hybrid defense.
function zp(id,jade){let s=z.initialState(['a']);s.instances.a={id,upgraded:false};s.jade=jade;const r=z.play(s,{id,instance:'a',target:'enemy'});assert.equal(r.ok,true);return z.endTurn(r.state,[5]);}
const zDefense=[0,20].map(jade=>({jade,a06:zp('zl06',jade).jade,b02:zp('zl02',jade).jade}));
assert.deepEqual(zDefense,[{jade:0,a06:2,b02:0},{jade:20,a06:19,b02:20}]);
// Keqing: same base hit totals do not imply same infused or target-count payoff.
const kAttack=[];
for(const infusion of [0,1])for(const id of ['KQ001','KQ004','KQ052','KQ054']){
 let s=k.initial([{instance:'a',id,upgraded:false}],[{hp:100,block:0},{hp:100,block:0}]);s.infusion=infusion;
 const after=k.play(s,'a',0);kAttack.push({infusion,id,damage:after.enemies.map(e=>100-e.hp)});
}
assert.deepEqual(kAttack.find(r=>r.infusion===0&&r.id==='KQ004').damage,[8,0]);
assert.deepEqual(kAttack.find(r=>r.infusion===1&&r.id==='KQ054').damage,[12,0]);
assert.deepEqual(kAttack.find(r=>r.infusion===0&&r.id==='KQ052').damage,[6,6]);
assert.deepEqual(kAttack.find(r=>r.infusion===1&&r.id==='KQ052').damage,[8,8]);
verify();
console.log(JSON.stringify({schemaVersion:1,status:'REVIEW_EVIDENCE_ONLY',inventory,
 probes:{ganyuDefense:gDefense,ganyuSupply:gSupply,ganyuRainRefresh:refreshed.storm,xiaoDuration:xDuration,
 xiaoRecoverExit:{hand:recovered.state.hand,discard:recovered.state.discard,block:recovered.state.block},
 zhongliCappedDefense:zDefense,keqingAttack:kAttack},
 limitations:['Constructed local states, not natural acquisition frequencies.','No full-state dominance solver; every strict statement is restricted to the current modeled effect contract.','Source boolean claims are not independent official verification.','No Full, browser, native, human naming or balance approval.']},null,2));
