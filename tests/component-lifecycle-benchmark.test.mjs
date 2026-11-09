import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {summarizeSteps,verifyCycles,verifySameVisualPair,comparableScripts,comparableUi,evaluatePair} from '../scripts/benchmark-component-lifecycle.mjs';
test('SDK nearest-rank timing keeps tail and rejects absent/invalid samples',()=>{
 assert.deepEqual(summarizeSteps([1,9,2,3].map(wallMs=>({wallMs}))),{samples:4,p50Ms:2,p95Ms:9,p99Ms:9,maxMs:9});
 for(const rows of [[],[{wallMs:NaN}],[{wallMs:-1}]])assert.throws(()=>summarizeSteps(rows));
});
test('SDK projection sourceFile normalization requires the actual package path',()=>{
 const a={meta:{sourceFile:'a.gil'},root:{x:1}},b={meta:{sourceFile:'b.gil'},root:{x:1}};
 assert.deepEqual(comparableUi(a,'a.gil'),comparableUi(b,'b.gil'));
 assert.throws(()=>comparableUi(a,'b.gil'));
 assert.notDeepEqual(comparableUi(a,'a.gil'),comparableUi({...b,root:{x:2}},'b.gil'));
});
test('baseline-derived deterministic count fences reject regressions and report timing separately',()=>{
 const run={cycles:Array.from({length:20},()=>({menuVisible:true,characterVisible:true,countAfter:100})),phases:[{name:'initialize',created:100},...['menu-step','character-step','menu-return-step'].map(name=>({name,wallMs:1}))]};
 const identity=Object.fromEntries(['sdkExportSha256','serverUiSha256','templatesSha256','exactScriptsSha256','workerSha256'].map(key=>[key,'a'.repeat(64)]));
 const before={identity:{...identity,gilSha256:'a'},status:'SDK_MENU_CHARACTER_CYCLES_PASS',runs:[run,run,run]};
 const after={...before,identity:{...identity,gilSha256:'b'}};
 assert.equal(evaluatePair(before,after).hardBudgets.baselineInitializationCeiling,100);
 assert.throws(()=>evaluatePair(before,{...after,identity:{...after.identity,workerSha256:'b'.repeat(64)}}),/measurement worker/);
 assert.throws(()=>evaluatePair({...before,identity:{...before.identity,workerSha256:undefined}},after),/measurement worker/);
 assert.throws(()=>evaluatePair(before,{...after,runs:after.runs.slice(1)}));
 assert.throws(()=>evaluatePair(before,{...after,runs:after.runs.map(r=>({...r,phases:r.phases.map(p=>p.name==='initialize'?{...p,created:101}:p)}))}));
 assert.throws(()=>evaluatePair(before,{...after,runs:after.runs.map(r=>({...r,cycles:r.cycles.map(c=>({...c,countAfter:101}))}))}));
 const slow={...after,runs:after.runs.map(r=>({...r,phases:r.phases.map(p=>p.wallMs?{...p,wallMs:2}:p)}))};
 assert(evaluatePair(before,slow).timing.every(t=>t.exceedsObservation));
});
test('pair comparison removes only the exact builder UUID first line',()=>{
 const original={path:'abyss_ui.lua',source:'print("ABYSS_BUILD a8851ec4-36cb-40cc-8071-96c31aa8fbce")\nreturn 1'};
 const other={...original,source:original.source.replace('a8851ec4','b8851ec4')};
 assert.deepEqual(comparableScripts([original]),comparableScripts([other]));
 assert.notDeepEqual(comparableScripts([original]),comparableScripts([{...other,source:other.source.replace('return 1','return 2')}]));
 for(const scripts of [[],[original,original],[{...original,source:'return 1'}]])assert.throws(()=>comparableScripts(scripts));
});
test('controlled eager flag normalization preserves all other generated binding bytes',()=>{
 const ui={path:'abyss_ui.lua',source:'print("ABYSS_BUILD a8851ec4-36cb-40cc-8071-96c31aa8fbce")\nreturn 1'};
 const binding={path:'abyss_component_binding.lua',source:'return {["eagerPages"]=true,["placements"]={}}'};
 assert.deepEqual(comparableScripts([ui,binding]),comparableScripts([ui,{...binding,source:binding.source.replace('=true','=false')}]));
 assert.notDeepEqual(comparableScripts([ui,binding]),comparableScripts([ui,{...binding,source:binding.source.replace('placements','other')}]));
 assert.throws(()=>comparableScripts([ui,{...binding,source:'return {["eagerPages"]=true,["eagerPages"]=false}'}]));
});
test('same-visual pairing rejects a changed scene, template, Lua or SDK export',()=>{
 const identity={sdkExportSha256:'a'.repeat(64),serverUiSha256:'b'.repeat(64),templatesSha256:'c'.repeat(64),exactScriptsSha256:'d'.repeat(64),gilSha256:'a'};
 assert.equal(verifySameVisualPair({identity},{identity:{...identity,gilSha256:'b'}}),true);
 for(const field of ['sdkExportSha256','serverUiSha256','templatesSha256','exactScriptsSha256'])
  assert.throws(()=>verifySameVisualPair({identity},{identity:{...identity,[field]:'changed',gilSha256:'b'}}));
 assert.throws(()=>verifySameVisualPair({identity},{identity}));
 assert.throws(()=>verifySameVisualPair({identity:{}},{identity:{}}));
});
test('twenty page cycles reject hidden destinations and growing native-model inventory',()=>{
 const cycles=Array.from({length:20},(_,i)=>({characterVisible:true,menuVisible:true,countAfter:i?100:90}));
 assert.deepEqual(verifyCycles(cycles),{warmControlCount:100,netResidual:0});
 assert.throws(()=>verifyCycles(cycles.slice(1)));
 assert.throws(()=>verifyCycles(cycles.map((c,i)=>({...c,countAfter:100+i}))));
 assert.throws(()=>verifyCycles(cycles.map((c,i)=>({...c,menuVisible:i!==8}))));
});

test('recorded actual-GIL pair reproduces all count fences and timing observations from immutable raw samples',()=>{
 const evidence=new URL('../docs/evidence/',import.meta.url);
 const summary=JSON.parse(readFileSync(new URL('task-100-1-sdk-comparison-20261109.json',evidence),'utf8'));
 const hashes=['efae8f92eeaf49f03e569fdec1229eae7f9f8c0c280149a00a61e7d371544e18',
  '51b8b28f7d18ee2a4ca30c2fd427afc45ffdb045d89deeef42edfb65304f43c3'];
 assert.equal(summary.rawReports.length,2);
 const reports=summary.rawReports.map((binding,index)=>{
  const bytes=readFileSync(new URL(binding.path,evidence));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),hashes[index]);
  assert.equal(binding.sha256,hashes[index]);assert.equal(bytes.length,binding.bytes);
  return JSON.parse(gunzipSync(bytes));
 });
 const actual=evaluatePair(...reports,{observedTimeRatio:1.25});
 for(const key of Object.keys(actual))assert.deepEqual(summary[key],actual[key],key);
 assert(actual.timing.every(row=>!row.exceedsObservation));
 // Preserve adverse individual maxima; a passing P95 observation is no tail/FPS claim.
 for(const phase of ['character-step','menu-return-step']){
  const row=actual.timing.find(value=>value.phase===phase);
  assert(row.after.maxMs>row.before.maxMs);
 }
});

test('final clean integrated actual-GIL pair preserves exact protocol and unfavorable warm timing observations',()=>{
 const evidence=new URL('../docs/evidence/',import.meta.url);
 const summary=JSON.parse(readFileSync(new URL('task-100-1-sdk-final-comparison-20261109.json',evidence),'utf8'));
 const hashes=['8dd4da9c30fbd88b901f35c90bdae54208ca03402e42e867f64767e515130734',
  'b9a49851cbc3b10c245ad8e3409f9e57600abaaf72fcb1210f672dfb9283042a'];
 assert.equal(summary.rawReports.length,2);
 const reports=summary.rawReports.map((binding,index)=>{
  const bytes=readFileSync(new URL(binding.path,evidence));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),hashes[index]);
  assert.equal(binding.sha256,hashes[index]);assert.equal(bytes.length,binding.bytes);
  const raw=gunzipSync(bytes);assert.equal(raw.length,binding.uncompressedBytes);
  assert.equal(createHash('sha256').update(raw).digest('hex'),binding.uncompressedSha256);
  return JSON.parse(raw);
 });
 const actual=evaluatePair(...reports,{observedTimeRatio:1.25});
 for(const key of Object.keys(actual))assert.deepEqual(summary[key],actual[key],key);
 for(const report of reports){
  assert.equal(report.source.commit,'aced9718e213c09e2e72aa6e05525bc9bf90d0ce');
  assert.equal(report.source.dirty,false);assert.equal(report.steadyFramesPerVisit,30);
 }
 assert.deepEqual(reports[0].environment,reports[1].environment);
 assert.deepEqual(reports[0].mountedValues,reports[1].mountedValues);
 for(const key of ['payloadDigest','artFeatures','uiProfile'])assert.deepEqual(reports[0].source[key],reports[1].source[key],key);
 assert(actual.timing.every(row=>row.after.p95Ms>row.before.p95Ms&&!row.exceedsObservation),
  'all measured warm P95 regressions stay reported within the original observation line');
 assert.equal(summary.protocolEquality.workerSha256,actual.current.workerSha256);
});
