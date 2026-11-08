// Current cost and provenance checks stay outside the pure historical projection.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {rewardQueryPlanningProof as proof,preRewardQueryPlanningSource} from './reward-query-planning-source-inverse.mjs';
import {discoverJs,partition,timings,jsShard,jsPlanningWeights} from '../../scripts/ci-shards.mjs';
import {shardLuaScripts} from '../../scripts/test-lua.mjs';
import {qualityShardMatrices} from '../../scripts/ci-quality-shape.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const file='tests/reward-query-boundary.test.mjs';
const expectedKills={
 'managed-bowl':'[REWARD_BOUNDARY] Bowl owns is not Prayer Wheel: false ~= true',
 'preview-flag':'[REWARD_BOUNDARY] preview preserves skip-upgraded flag: false ~= true',
 'pending-bowl':'[REWARD_BOUNDARY] every reward owner retains Bowl option: 0 ~= bowl',
};
function embedded(row){assert.equal(hash(row.source),row.sha256,row.path);assert.equal(Buffer.byteLength(row.source),row.bytes,row.path);return row.source;}
function forecast(source,js,lua,platform,count){
 const weights=Object.fromEntries(js.map(f=>[f,Math.max(source.js[platform][f]??source.unknownJsMs,source.jsPlanning.localLowerBounds[f]?.durationMs??0)]));
 const loads=partition(js,`1/${count}`,weights,source.unknownJsMs,Array.from({length:count},(_,i)=>i===0?source.initialMs[platform][0]:0)).loads;
 if(platform==='linux')return {weights,jsLoads:loads,combinedLoads:loads,maxPlusReserveMs:Math.max(...loads)+60000};
 const planning={...source,windowsJsShardMs:loads};
 const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,planning,2));
 assert.deepEqual(bins.flat().sort(),lua);assert.equal(new Set(bins.flat()).size,lua.length);
 const cost=f=>source.luaShard[f]??source.lua[f]??source.unknownLuaMs,safety=f=>source.lua[f]??source.unknownLuaMs;
 const combined=bins.map((bin,i)=>{
  const pool=[0,0];
  for(const f of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(f);
  return loads[i]+bin.filter(f=>safety(f)>=10000).reduce((sum,f)=>sum+cost(f),0)+Math.max(...pool);
 });
 return {weights,jsLoads:loads,combinedLoads:combined,maxPlusReserveMs:Math.max(...combined)+60000};
}
const liveContext={read,readFileSync,readdirSync,timings,discoverJs,jsShard,jsPlanningWeights};
export function assertRewardQueryPlanningReceipt({epoch}={}){
 const {read,readFileSync,readdirSync,timings,discoverJs,jsShard,jsPlanningWeights}=epoch??liveContext;
 const bytes=readFileSync(proof.receipt.path);assert.equal(hash(bytes),proof.receipt.sha256);
 assert.equal(hash(bytes),'040106c48fb3cd7c6ae9fcde72d09a5ac9c0f57b8c97036e37a682bb9525becf');
 const receipt=JSON.parse(gunzipSync(bytes)),observation=receipt.observation;
 assert.equal(receipt.schemaVersion,1);assert.equal(receipt.kind,'local-complete-file-planning-floor');assert.equal(receipt.file,file);
 assert.equal(receipt.revision,proof.revision);assert.equal(receipt.beforeTimingsLfSha256,proof.beforeSha256);
 assert.equal(receipt.environment,'local Linux execution workspace');
 assert.deepEqual(observation.command,['node','--test','--test-concurrency=1',file]);
 assert.equal(observation.status,0);assert.equal(observation.wholeFile,true);assert.equal(observation.hostedMeasurement,false);assert.equal(observation.actualFullPassClaim,false);
 const timing=JSON.parse(embedded(observation.timing)),raw=embedded(observation.rawLog);
 assert.deepEqual(timing,{command:observation.command,status:0,wallMs:50215.198307996616});
 assert.equal(observation.wallMs,timing.wallMs);assert.equal(observation.nodeDurationMs,50154.478871);
 assert.equal(Number(raw.match(/ℹ duration_ms ([\d.]+)/)[1]),observation.nodeDurationMs);
 assert.equal((raw.match(/^✔ /gm)||[]).length,9);
 for(const [key,value]of Object.entries({tests:9,suites:0,pass:9,fail:0,cancelled:0,skipped:0,todo:0}))assert.match(raw,new RegExp(`^ℹ ${key} ${value}$`,'m'));
 assert.equal(receipt.durationMs,Math.ceil(Math.max(observation.wallMs,observation.nodeDurationMs)));assert.equal(receipt.durationMs,50216);

 // The exact observed whole-file source is immutable. A later stronger assertion
 // has a separate filtered receipt and must never relabel the old timing sample.
 const measured=embedded(receipt.measuredBehavior),later=receipt.subsequentValidation;
 assert.equal(hash(measured),'f4d5383d1218deb404e97b03544450bda3a9b60110a5430a6f25988a7c834bed');
 assert.equal(later.file,file);assert.equal(later.beforeSource,measured);assert.equal(later.beforeSha256,hash(measured));
 assert.equal(later.afterSha256,'0824001ce11509f49114030f6ad62c53fc17ee31fd314abaa0fdbf7c11c6e49d');
 assert.equal(hash(later.afterSource),later.afterSha256);assert.equal(read(file),later.afterSource);assert.equal(later.wholeFileRemeasured,false);
 const oldLoop="for(const mutation of ['managed-bowl','preview-flag','pending-bowl'])test(`real ${mutation} semantic mutation is rejected by named boundary assertion`,()=>{";
 const newLoop="const expectedKills={\n 'managed-bowl':'[REWARD_BOUNDARY] Bowl owns is not Prayer Wheel: false ~= true',\n 'preview-flag':'[REWARD_BOUNDARY] preview preserves skip-upgraded flag: false ~= true',\n 'pending-bowl':'[REWARD_BOUNDARY] every reward owner retains Bowl option: 0 ~= bowl',\n};\nfor(const [mutation,message]of Object.entries(expectedKills))test(`real ${mutation} semantic mutation is rejected by named boundary assertion`,()=>{";
 const oldCheck=" assert.match(result.stderr,/\\[REWARD_BOUNDARY\\]/,'a parse/load/infrastructure failure is not a semantic kill');";
 const newCheck=" assert.ok(result.stderr.includes(message),'only this mutant-specific semantic assertion counts as a kill: '+message);";
 assert.equal(measured.split(oldLoop).length,2);assert.equal(measured.split(oldCheck).length,2);
 assert.equal(measured.replace(oldLoop,newLoop).replace(oldCheck,newCheck),later.afterSource,'only the exact stronger result assertions differ from the measured file');
 const laterTiming=JSON.parse(embedded(later.timing)),laterRaw=embedded(later.rawLog);
 assert.deepEqual(laterTiming.command,['node','--test','--test-concurrency=1','--test-name-pattern=semantic mutation',file]);
 assert.equal(laterTiming.status,0);assert.equal(laterTiming.wallMs,4030.175759049598);
 assert.match(laterRaw,/ℹ tests 3\nℹ suites 0\nℹ pass 3\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\n/);

 const inputs=receipt.sourceInputs.files;assert.equal(Object.keys(inputs).length,384);
 assert.equal(hash(JSON.stringify(inputs)),'cd5c2595ef50f3407b1a14b7148c996591a04634670b4d6148312a57621005ae');
 for(const [p,row]of Object.entries(inputs)){
  const source=p===file?measured:read(p);
  assert.equal(hash(source),row.sha256,'unchanged measured input '+p);assert.equal(Buffer.byteLength(source),row.bytes,p);
 }
 for(const p of ['tests/helpers/reward-query-boundary-vm.mjs','tests/helpers/lua-graph-observer.mjs','tests/lua/support/reward_query_boundary.lua','tests/lua/relic_card_rewards.lua','tests/lua/shop_relics_acquisition.lua','tests/helpers/reward-query-boundary-before.json','config/architecture.json'])assert.ok(inputs[p]);
 const production=Object.fromEntries(Object.entries(inputs).filter(([p])=>p.startsWith('src/lua/')));
 assert.equal(Object.keys(production).length,333);
 assert.deepEqual(readdirSync('src/lua').filter(n=>n.endsWith('.lua')).map(n=>'src/lua/'+n).sort(),Object.keys(production));
 assert.equal(hash(JSON.stringify(production)),receipt.sourceInputs.productionManifestSha256);
 const historical=JSON.parse(read('tests/helpers/reward-query-boundary-before.json'));
 assert.equal(receipt.processes.length,11);const pairs=new Map(),seen=new Set();
 for(const process of receipt.processes){
  const manifest=JSON.parse(embedded(process.sourceManifest)),status=JSON.parse(embedded(process.process));
  const stdout=embedded(process.stdout),stderr=embedded(process.stderr),key=[manifest.group,manifest.variant,manifest.mutation].join(':');
  assert.ok(!seen.has(key));seen.add(key);assert.equal(status.signal,null);assert.equal(status.error,undefined);
  assert.deepEqual(Object.keys(manifest.files),Object.keys(production));
  for(const [p,row]of Object.entries(manifest.files)){
   const original=manifest.variant==='old'?historical.files[p]:undefined;
   assert.equal(row.sha256,original?.beforeSha256??production[p].sha256,p);
   assert.equal(row.bytes,original?Buffer.byteLength(original.beforeSource):production[p].bytes,p);
  }
  if(manifest.mutation==='none'){
   assert.equal(status.status,0);assert.equal(stderr,'');const result=JSON.parse(stdout);
   assert.equal(result.variant,manifest.variant);assert.equal(result.group,manifest.group);assert.equal(result.mutation,'none');
   assert.equal(result.sha256,process.graph.sha256);assert.equal(result.bytes,process.graph.bytes);assert.ok(result.checkpoints>0);
   const pair=pairs.get(result.group)??[];pair.push(result);pairs.set(result.group,pair);
  }else{
   assert.equal(status.status,1);assert.equal(stdout,'');assert.equal(manifest.variant,'current');assert.equal(manifest.group,'dynamic');
   assert.ok(stderr.includes(expectedKills[manifest.mutation]),'original whole-file mutant failed at its precise semantic assertion');
   assert.equal(Object.values(manifest.files).filter(row=>row.mutatedSha256).length,1);
  }
 }
 assert.deepEqual([...pairs.keys()],['cold','dynamic','cards','shop']);
 for(const pair of pairs.values()){
  assert.deepEqual(pair.map(row=>row.variant),['old','current']);
  for(const key of ['checkpoints','bytes','sha256','printed'])assert.deepEqual(pair[0][key],pair[1][key]);
 }
 assert.deepEqual([...seen].filter(key=>!key.endsWith(':none')).sort(),Object.keys(expectedKills).map(key=>'dynamic:current:'+key).sort());

 const before=JSON.parse(proof.beforeSource),expected=structuredClone(before);
 assert.equal(Object.keys(before.jsPlanning.localLowerBounds).length,9);
 const entry={durationMs:50216,environment:receipt.environment,coverage:receipt.coverage,
  kind:'Planning-only local lower bound from a complete successful same-file run; not a hosted measurement.',
  sourceLog:observation.rawLog.path,sourceLogSha256:observation.rawLog.sha256,sourceReceipt:proof.receipt.path,sourceReceiptSha256:hash(bytes),sourceInputsSha256:hash(JSON.stringify(inputs))};
 expected.jsPlanning.localLowerBounds[file]=entry;
 assert.equal(JSON.stringify(expected,null,2)+'\n',proof.afterSource,'one sourced local floor is the entire timing change');
 assert.equal(read(proof.file),proof.afterSource);assert.deepEqual(timings,expected);assert.equal(Object.keys(timings.jsPlanning.localLowerBounds).length,10);
 const priorFloors=structuredClone(timings.jsPlanning.localLowerBounds);delete priorFloors[file];
 assert.deepEqual(priorFloors,before.jsPlanning.localLowerBounds,'all nine historical floor metadata records are unchanged');
 const restored=structuredClone(timings);delete restored.jsPlanning.localLowerBounds[file];
 assert.equal(JSON.stringify(restored,null,2)+'\n',proof.beforeSource,'all original timing bytes, including every old floor, remain reconstructable verbatim');
 for(const key of Object.keys(before).filter(key=>key!=='jsPlanning'))assert.deepEqual(timings[key],before[key],key+' retains the exact complete historical value');
 assert.equal(timings.unknownJsMs,10000);assert.equal(timings.unknownLuaMs,10000);
 assert.deepEqual(qualityShardMatrices.windows,Array.from({length:17},(_,i)=>i+1));assert.deepEqual(qualityShardMatrices.posix,Array.from({length:13},(_,i)=>i+1));
 const effect=receipt.planningEffect;assert.deepEqual(effect.inventory,{js:748,lua:1402});assert.equal(effect.newFloorMs,50216);assert.equal(effect.reserveMs,60000);assert.equal(effect.workers,2);assert.equal(effect.concurrency,12);
 const js=discoverJs().sort(),lua=readdirSync('tests/lua').filter(f=>f.endsWith('.lua')).map(f=>'tests/lua/'+f).sort();
 assert.equal(js.length,748);assert.equal(lua.length,1402);
 for(const [platform,count,budget]of [['win32',17,1800000],['linux',13,1200000]]){
  assert.equal(timings.js[platform][file],undefined);assert.equal(jsPlanningWeights([file],platform)[file],50216);
  const current=forecast(timings,js,lua,platform,count),prior=forecast(before,js,lua,platform,count);
  assert.deepEqual(current.weights,jsPlanningWeights(js,platform));assert.deepEqual(current.jsLoads,jsShard(js,`1/${count}`,platform).loads,'current planner uses the unprojected full costs');
  const bins=Array.from({length:count},(_,i)=>jsShard(js,`${i+1}/${count}`,platform).files);
  assert.deepEqual(bins.flat().sort(),js);assert.equal(new Set(bins.flat()).size,748);
  assert.equal(Object.values(current.weights).reduce((a,b)=>a+b,0)-Object.values(prior.weights).reduce((a,b)=>a+b,0),40216);
  for(const [epoch,actual]of [['before',prior],['after',current]]){
   const saved=effect.forecasts[epoch][platform];assert.equal(saved.count,count);assert.equal(saved.budget,budget);
   for(const key of ['jsLoads','combinedLoads','maxPlusReserveMs'])assert.deepEqual(saved[key],actual[key]);
   assert.equal(saved.pass,actual.maxPlusReserveMs<budget);assert.ok(actual.maxPlusReserveMs<budget);
  }
 }
 assert.equal(effect.forecasts.after.win32.maxPlusReserveMs,1714675);assert.equal(effect.forecasts.after.linux.maxPlusReserveMs,1195761);
 const workflow=read('.github/workflows/quality.yml');assert.match(workflow,/max-parallel: 12/);assert.match(workflow,/timeout-minutes: 20/);assert.match(workflow,/local-special' && 75 \|\| 30/);
}
export function assertRewardQueryPlanningProjection({project,preCurrentCiPlacementSource,preIntegrationSource,epoch}){
 const {read}=epoch??liveContext;
 const path=proof.file,source=read(path);assert.equal(source,proof.afterSource);assert.equal(hash(source),proof.afterSha256);
 for(const input of [source,source.replaceAll('\n','\r\n')]){
  assert.equal(preRewardQueryPlanningSource(path,input),proof.beforeSource);
  assert.equal(preCurrentCiPlacementSource(path,input),preCurrentCiPlacementSource(path,proof.beforeSource));
  assert.equal(project(path,input),project(path,proof.beforeSource));
  const options={readSource(){assert.fail('timing projection must not read current owners');}};
  assert.equal(preIntegrationSource(path,input,'base',options),preIntegrationSource(path,proof.beforeSource,'base',options));
 }
 for(const input of [proof.beforeSource,undefined,null,{},17])assert.equal(preRewardQueryPlanningSource(path,input),input);
 for(const p of ['foreign','scripts/ci-quality-shape.mjs',file])assert.equal(preRewardQueryPlanningSource(p,source),source);
 const mutants=[source+'\n',source.slice(1),source.replaceAll('\n','\n '),
  source.replace('"durationMs": 50216','"durationMs": 10000'),source.replace('"durationMs": 50216','"durationMs": 50216.0'),
  source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 10000,\n  "unknownJsMs": 10000'),
  source.replace('"durationMs": 889638','"durationMs": 629181'),source.replace('"conclusion": "failure"','"conclusion": "success"'),
  source.replace(proof.receipt.sha256,'f'.repeat(64)),source.replace('not a hosted measurement.','a hosted measurement.'),
  source.replace('"tests/reward-query-boundary.test.mjs": {','"tests/reward-query-boundary-source.test.mjs": {')];
 for(const mutant of mutants){
  assert.notEqual(mutant,source);assert.equal(preRewardQueryPlanningSource(path,mutant),mutant);
  assert.equal(preCurrentCiPlacementSource(path,mutant),mutant);assert.equal(project(path,mutant),mutant);
 }
 assert.ok(Object.isFrozen(proof));assert.ok(Object.isFrozen(proof.receipt));
}
