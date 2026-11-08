import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {beforeSource,aiVm,errorLocations} from './helpers/act3-ai-responsibilities.mjs';
const before=beforeSource(),current=readFileSync('src/lua/abyss_act3_ai.lua','utf8');
for(const mode of ['matrix','contracts'])test(`Act3 AI frozen full-graph differential: ${mode}`,()=>{
 const old=aiVm(before,mode),actual=aiVm(current,mode);
 assert.equal(old.status,0,old.error);assert.equal(actual.status,0,actual.error);
 assert.equal(old.graphs.length,mode==='matrix'?1680:52,'complete fixture observations');
 assert.deepEqual({...actual,rawErrors:undefined},{...old,rawErrors:undefined});
 assert.equal(actual.rawErrors.length,old.rawErrors.length);
 if(process.env.ACT3_AI_EVIDENCE){
  const dir=process.env.ACT3_AI_EVIDENCE;mkdirSync(dir,{recursive:true});const json=JSON.stringify(old.graphs);
  writeFileSync(`${dir}/${mode}-equal-graphs.json.gz`,gzipSync(json));
  writeFileSync(`${dir}/${mode}-manifest.json`,JSON.stringify({mode,checkpoints:old.graphs.length,bytes:Buffer.byteLength(json),sha256:createHash('sha256').update(json).digest('hex'),beforeSourceSha256:createHash('sha256').update(before).digest('hex'),afterSourceSha256:createHash('sha256').update(current).digest('hex'),exactAllowedErrors:{before:errorLocations(before),after:errorLocations(current)},rawErrorLocationMap:old.rawErrors.map((error,i)=>({before:error,after:actual.rawErrors[i]})),errorComparison:'Only the complete unsupported-policy assertion maps to canonical coordinates; all other errors remain raw.'},null,2)+'\n');
 }
});
const mutations=[
 ['maw-historical-frame',s=>s.replace('move=Copy(move);',''),'historical frame unchanged','matrix'],
 ['orb-third-repeat',s=>s.replace("enemy.act3Last==preferred and enemy.act3Previous==preferred","false"),'Orb Walker third repeat prevented','matrix'],
 ['spike-limit',s=>s.replace('enemy.spikeCount>5','enemy.spikeCount>6'),'Spike cap selects attack','matrix'],
 ['transient-roll',s=>s.replace("if enemy.ai.policy=='transient'then return end -- takeTurn uses SetMove, never RollMove.",''),'Transient afterAction does not roll','contracts'],
 ['primary-rng-boundary',s=>s.replace('local n=random(state,100)-1','local n=random(state,99)-1'),'advance returns no values','matrix'],
];
for(const [variant,original]of [['before',before],['current',current]])for(const [name,mutate,diagnostic,mode]of mutations)test(`Act3 AI semantic negative control: ${variant}/${name}`,()=>{
 const source=mutate(original);assert.notEqual(source,original);
 const result=aiVm(source,mode);assert.notEqual(result.status,0);assert.ok(result.error.includes(diagnostic),result.error);
});
