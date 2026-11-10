// Current RunHealing inventory and receipts are independent of the frozen Formation800 contracts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {preRunHealingCiSource,runHealingCiProof as proof} from './run-healing-ci-source-inverse.mjs';
import {discoverJs,timings,jsPlanningWeights,jsShard} from '../../scripts/ci-shards.mjs';
import {shardLuaScripts} from '../../scripts/test-lua.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),path='scripts/ci-test-timings.json';
const previous=JSON.parse(proof.files[path].beforeSource);
const added=['tests/run-healing-owner.test.mjs','tests/run-healing-source-epoch.test.mjs'];
const changed=[...added,'tests/defect-final-source-epoch.test.mjs','tests/silent-final-source-epoch.test.mjs','tests/seven-refactor-source-epoch.test.mjs','tests/encounter-formation-source-epoch.test.mjs','tests/ci-complete-calibration.test.mjs','tests/ci-host-timing-calibration.test.mjs','tests/ci-windows-shape-expansion.test.mjs','tests/ci-runtime.test.mjs'];
const root='docs/evidence/m7-run-healing-contracts-20261110';
test('RunHealing CI exact predecessor projection preserves historical values and rejects partial or foreign bytes',()=>{
 for(const [file,binding]of Object.entries(proof.files)){
  const source=readFileSync(file,'utf8').replaceAll('\r\n','\n');assert.equal(source,binding.afterSource,file);
  for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(preRunHealingCiSource(file,input),binding.beforeSource,file);
  for(const input of [source+'\n',source.slice(1),null,undefined,{},17])assert.equal(preRunHealingCiSource(file,input),input,file);
  for(const foreign of ['unknown','__proto__','constructor'])assert.equal(preRunHealingCiSource(foreign,source),source);
 }
 for(const [file,sha]of Object.entries(proof.addedSha256))assert.equal(hash(file.endsWith('.gz')?readFileSync(file):readFileSync(file,'utf8').replaceAll('\r\n','\n')),sha,file);
 const current=structuredClone(timings);current.jsPlanning.localLowerBounds=previous.jsPlanning.localLowerBounds;
 assert.deepEqual(current,previous,'hosted costs, deadlines, workers, budgets and shape unchanged');
 for(const [file,floor]of Object.entries(previous.jsPlanning.localLowerBounds))assert(timings.jsPlanning.localLowerBounds[file].durationMs>=floor.durationMs,'prior floor never reduced: '+file);
 const report=JSON.parse(readFileSync(`${root}/ci-complete-process-observations.json`));
 assert.deepEqual(Object.keys(timings.jsPlanning.localLowerBounds).sort(),[...Object.keys(previous.jsPlanning.localLowerBounds),...report.observations.map(row=>row.file).filter(file=>!Object.hasOwn(previous.jsPlanning.localLowerBounds,file))].sort());
 assert.deepEqual(report.observations.map(row=>row.file).sort(),changed.toSorted(),'all ten changed or new complete files have cost evidence');
 for(const row of report.observations){
  assert.equal(row.exitCode,0);assert.equal(row.pass,row.tests);assert.equal(row.fail+row.skipped+row.cancelled,0);assert(row.inputFilesUnchanged);
  const logBytes=readFileSync(row.logPath),inputBytes=readFileSync(row.inputPath);assert.equal(hash(logBytes),row.logSha256);assert.equal(hash(gunzipSync(logBytes)),row.logUncompressedSha256);assert.equal(hash(inputBytes),row.inputSha256);
  const inputs=JSON.parse(gunzipSync(inputBytes));assert.deepEqual(inputs.before.files,inputs.after.files);assert.equal(inputs.before.files[row.file].sha256,row.testSha256);assert.equal(hash(readFileSync(row.file,'utf8').replaceAll('\r\n','\n')),inputs.before.files[row.file].lfSha256);
  for(const required of ['src/lua/abyss_run_health.lua','tests/helpers/run-healing-source-epoch.mjs','tests/helpers/combined-epoch/source-epoch.mjs','tests/helpers/copy-integration-source-closure.mjs',row.command[0]])assert(inputs.before.files[required],required);
  const log=gunzipSync(logBytes).toString('utf8');for(const key of ['tests','pass','fail','cancelled','skipped'])assert(log.includes('# '+key+' '+row[key]),key);
  const floor=timings.jsPlanning.localLowerBounds[row.file];assert.equal(floor.durationMs,Math.ceil(Math.max(row.wallMs,row.nodeReportedDurationMs,previous.jsPlanning.localLowerBounds[row.file]?.durationMs??0,...report.unstableObservations.filter(other=>other.file===row.file).map(other=>other.wallMs))),'only complete observed maxima become floors');
  assert.match(inputs.before.nodeVersion,/^v\d/);
  for(const platform of ['linux','win32'])assert(jsPlanningWeights([row.file],platform)[row.file]>=Math.ceil(Math.max(row.wallMs,row.nodeReportedDurationMs)),row.file);
 }
 for(const row of report.unstableObservations){assert.equal(row.inputFilesUnchanged,false);assert.equal(row.exitCode,0);assert.equal(hash(readFileSync(row.logPath)),row.logSha256);for(const platform of ['linux','win32'])assert(jsPlanningWeights([row.file],platform)[row.file]>=Math.ceil(row.wallMs),'retain slower complete success without claiming stable inputs');}
});
test('RunHealing802 current complete inventory retains original Windows17 POSIX15 budgets and worker safety',()=>{
 const js=discoverJs();assert.deepEqual([...js].sort(),proof.inventory.js);assert.equal(js.length,802);for(const file of added)assert.equal(js.filter(f=>f===file).length,1);
 const loads=jsShard(js,'1/15','linux').loads;assert(Math.max(...loads)+60000<1200000,'all measured costs fit original POSIX15 budget');
 const lua=readdirSync('tests/lua').filter(f=>f.endsWith('.lua')).map(f=>'tests/lua/'+f).sort();assert.equal(lua.length,1412);assert.deepEqual(lua,Object.keys(proof.inventory.luaSha256));for(const file of lua)assert.equal(hash(readFileSync(file,'utf8').replaceAll('\r\n','\n')),proof.inventory.luaSha256[file]);
 const windows=jsShard(js,'1/17','win32').loads;
 const bins=Array.from({length:17},(_,i)=>shardLuaScripts(lua,`${i+1}/17`,{...timings,windowsJsShardMs:windows},2));assert.deepEqual(bins.flat().sort(),lua);
 const cost=f=>timings.luaShard[f]??timings.lua[f]??timings.unknownLuaMs,safety=f=>timings.lua[f]??timings.unknownLuaMs;
 const totals=bins.map((bin,i)=>{const pool=[0,0];for(const f of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(f);return windows[i]+bin.filter(f=>safety(f)>=10000).reduce((sum,f)=>sum+cost(f),0)+Math.max(...pool);});
 assert(Math.max(...totals)+60000<1800000,'all measured costs fit original Windows17 budget');assert.equal(timings.unknownJsMs,10000);
});
