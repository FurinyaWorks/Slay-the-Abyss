import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {buildLuaData} from '../scripts/build-lua-data.mjs';
import {beforeSource,turnVm,errorLocations} from './helpers/shiv-turn-responsibilities.mjs';
const before=beforeSource(),current=readFileSync('src/lua/abyss_shivs.lua','utf8');
// Build only this suite's data; do not depend on or overwrite another worktree's build.
buildLuaData('data','build/shiv-turn-evidence/abyss_data.lua');
for(const mode of ['direct','combat'])test(`Shivs.startTurn frozen full-graph differential: ${mode}`,()=>{
 const old=turnVm(before,mode),actual=turnVm(current,mode);
 assert.equal(old.status,0,old.error);assert.equal(actual.status,0,actual.error);
 assert.ok(old.graphs.length>=(mode==='direct'?130:6),`missing ${mode} observations: ${old.graphs.length}`);
 assert.deepEqual({...actual,rawErrors:undefined},{...old,rawErrors:undefined});
 assert.equal(actual.rawErrors.length,old.rawErrors.length);
 if(process.env.SHIV_TURN_EVIDENCE){
  const dir=process.env.SHIV_TURN_EVIDENCE;mkdirSync(dir,{recursive:true});const json=JSON.stringify(old.graphs);
  writeFileSync(`${dir}/${mode}-equal-graphs.json.gz`,gzipSync(json));
  writeFileSync(`${dir}/${mode}-manifest.json`,JSON.stringify({mode,checkpoints:old.graphs.length,bytes:Buffer.byteLength(json),sha256:createHash('sha256').update(json).digest('hex'),beforeSourceSha256:createHash('sha256').update(before).digest('hex'),afterSourceSha256:createHash('sha256').update(current).digest('hex'),exactAllowedErrors:{before:errorLocations(before),after:errorLocations(current)},rawErrorLocationMap:old.rawErrors.map((error,i)=>({before:error,after:actual.rawErrors[i]})),errorComparison:'Only complete allowlisted assertion error strings map to canonical coordinates; all other errors remain raw.'},null,2)+'\n');
 }
});
const mutations=[
 ['duplicate-uid',s=>s.replace('and not seen[uid] and not before[uid]','and not before[uid]'),'duplicate: must fail'],
 ['existing-uid',s=>s.replace('and not before[uid]',''),'old-draw: must fail'],
 ['historical-frame',s=>s.replaceAll('for i = eventCount + 1, #state.events do','for i = 1, #state.events do'),'historical frame unchanged'],
 ['captured-accuracy',s=>s.replace('byUid[uid].shivAccuracyBonus = bonus','byUid[uid].shivAccuracyBonus = amount(state)'),'captured Accuracy'],
];
for(const [variant,original]of [['before',before],['current',current]])for(const [name,mutate,diagnostic]of mutations)test(`Shivs.startTurn semantic negative control: ${variant}/${name}`,()=>{
 const source=mutate(original);assert.notEqual(source,original);
 const result=turnVm(source);assert.notEqual(result.status,0);assert.ok(result.error.includes(diagnostic),result.error);
});
