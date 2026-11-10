// Current Colorless inventory and costs stay separate from frozen Formation800 receipts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {preColorlessDescriptionCiSource,colorlessDescriptionCiProof as proof} from './colorless-description-ci-source-inverse.mjs';
import {originalPlanningSource,preCombinedPlanningSource,preCurrentCiPlacementSource,preCiCompleteCalibrationSource} from './ci-complete-calibration-source-inverse.mjs';
import {discoverJs,timings,jsPlanningWeights,jsShard} from '../../scripts/ci-shards.mjs';
import {shardLuaScripts} from '../../scripts/test-lua.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),path='scripts/ci-test-timings.json';
const previous=JSON.parse(proof.files[path].beforeSource);
const added=['tests/colorless-description-source-epoch.test.mjs','tests/colorless-description-complexity.test.mjs'];
const changed=[...added,'tests/encounter-formation-source-epoch.test.mjs','tests/ci-complete-calibration.test.mjs','tests/ci-host-timing-calibration.test.mjs','tests/ci-windows-shape-expansion.test.mjs','tests/ci-runtime.test.mjs'];
const root='docs/evidence/m7-colorless-description-ci-20261110';

test('Colorless CI exact predecessor preserves historical costs and rejects partial, foreign and duplicate-key bytes',()=>{
 // Exercise public planning entry points with raw disk bytes, before any reader projection.
 const livePlanning=readFileSync(path,'utf8').replaceAll('\r\n','\n'),priorPlanning=proof.files[path].beforeSource;
 const planningEntries=[...['develop','seven'].map(epoch=>[epoch,(p,s)=>originalPlanningSource(p,s,epoch)]),...['base','flow','silent','effects'].map(epoch=>[epoch,(p,s)=>preCombinedPlanningSource(p,s,epoch)]),['placement',preCurrentCiPlacementSource],['calibration',preCiCompleteCalibrationSource]];
 const partialPlanning=JSON.parse(livePlanning);delete partialPlanning.jsPlanning.localLowerBounds['tests/colorless-description-source-epoch.test.mjs'];
 const planningMutants=[livePlanning+'\n',livePlanning.slice(1),livePlanning+livePlanning,JSON.stringify(partialPlanning,null,2)+'\n',livePlanning.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),livePlanning.replace('"unknownJsMs": 10000','"unknownJsMs": 10000,\n  "unknownJsMs": 10000'),null,undefined,{},42];
 for(const [epoch,project]of planningEntries){
  const expected=project(path,priorPlanning);assert.notEqual(expected,priorPlanning,epoch);
  for(const source of [livePlanning,livePlanning.replaceAll('\n','\r\n')])assert.equal(project(path,source),expected,epoch);
  for(const source of planningMutants)assert.equal(project(path,source),source,epoch);
  for(const foreign of ['foreign','__proto__','scripts/check-lua-static.mjs'])assert.equal(project(foreign,livePlanning),livePlanning,epoch);
 }
 for(const [file,binding]of Object.entries(proof.files)){
  const source=readFileSync(file,'utf8').replaceAll('\r\n','\n');assert.equal(source,binding.afterSource,file);
  for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(preColorlessDescriptionCiSource(file,input),binding.beforeSource,file);
  for(const input of [source+'\n',source.slice(1),null,undefined,{},17])assert.equal(preColorlessDescriptionCiSource(file,input),input,file);
  for(const foreign of ['unknown','__proto__','constructor'])assert.equal(preColorlessDescriptionCiSource(foreign,source),source);
 }
 const current=structuredClone(timings);current.jsPlanning.localLowerBounds=previous.jsPlanning.localLowerBounds;
 assert.deepEqual(current,previous,'hosted measurements, deadlines, worker safety, budgets and shape unchanged');
 for(const [file,floor]of Object.entries(previous.jsPlanning.localLowerBounds))assert.deepEqual(timings.jsPlanning.localLowerBounds[file],floor,'whole prior floor retained: '+file);
 const additions=Object.keys(timings.jsPlanning.localLowerBounds).filter(file=>!Object.hasOwn(previous.jsPlanning.localLowerBounds,file));
 for(const file of additions)assert(changed.includes(file),'only measured Colorless or changed CI files gain new floors');
 const source=readFileSync(path,'utf8');
 for(const altered of [source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 10000,\n  "unknownJsMs": 10000')]){
  assert.notEqual(altered,source);assert.equal(preColorlessDescriptionCiSource(path,altered),altered);
 }
 const report=JSON.parse(readFileSync(`${root}/complete-process-observations.json`));
 assert.deepEqual(report.observations.map(row=>row.file).sort(),proof.measurementFiles);
 for(const file of added)assert.equal(report.observations.filter(row=>row.file===file).length,1,'new recurring files have complete local observations');
 for(const row of report.observations){
  assert(changed.includes(row.file));assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert(row.tests>0);assert.equal(row.pass,row.tests);assert.equal(row.fail+row.skipped+row.cancelled,0);assert.equal(row.inputFilesUnchanged,true);
  const receiptBytes=readFileSync(row.receiptPath);assert.equal(hash(receiptBytes),row.receiptSha256);const receipt=JSON.parse(receiptBytes);const {receiptPath,receiptSha256,...record}=row;assert.deepEqual(receipt,record);
  const logBytes=readFileSync(row.logPath),inputBytes=readFileSync(row.inputPath),log=gunzipSync(logBytes).toString('utf8');assert.equal(hash(logBytes),row.logSha256);assert.equal(hash(log),row.logUncompressedSha256);assert.equal(hash(inputBytes),row.inputSha256);
  const inputs=JSON.parse(gunzipSync(inputBytes));assert.deepEqual(inputs.before.files,inputs.after.files);assert.equal(inputs.before.files[row.file].sha256,row.testSha256);assert.equal(hash(readFileSync(row.file)),row.testSha256);
  for(const name of ['tests','pass','fail','skipped','cancelled'])assert.equal(Number(log.match(new RegExp(`^# ${name} ([0-9.]+)$`,'m'))?.[1]),row[name]);
  assert.equal(Number(log.match(/^# duration_ms ([0-9.]+)$/m)?.[1]),row.nodeReportedDurationMs);
  for(const required of ['src/lua/abyss_colorless_cards.lua','tests/helpers/combined-epoch/source-epoch.mjs','tests/helpers/copy-integration-source-closure.mjs',row.command[0]])assert(inputs.before.files[required],required);
  assert.match(inputs.before.nodeVersion,/^v\d/);assert(Number.isFinite(row.wallMs)&&row.wallMs>0);assert(Number.isFinite(row.nodeReportedDurationMs)&&row.nodeReportedDurationMs>0);
  for(const platform of ['linux','win32'])assert(jsPlanningWeights([row.file],platform)[row.file]>=Math.ceil(Math.max(row.wallMs,row.nodeReportedDurationMs)),row.file);
 }
 for(const file of additions){
  const floor=timings.jsPlanning.localLowerBounds[file],row=report.observations.find(row=>row.file===file);assert(row);
  assert.equal(floor.sourceReceipt,row.receiptPath);assert.equal(floor.sourceReceiptSha256,row.receiptSha256);assert.equal(floor.durationMs,Math.ceil(Math.max(row.wallMs,row.nodeReportedDurationMs)));
  assert.match(floor.kind,/not .*hosted/);
 }
});

test('Colorless802 current inventory preserves Windows17 POSIX15 budgets, every old file and Lua safety',()=>{
 const js=discoverJs();assert.deepEqual([...js].sort(),proof.inventory.js);assert.equal(js.length,802);for(const file of added)assert.equal(js.filter(f=>f===file).length,1);
 assert.deepEqual(js.filter(file=>!added.includes(file)).sort(),proof.inventory.previousJs);
 const linux=Array.from({length:15},(_,i)=>jsShard(js,`${i+1}/15`,'linux'));assert.deepEqual(linux.flatMap(bin=>bin.files).sort(),[...js].sort());
 assert(Math.max(...linux[0].loads)+60000<1200000,'all measured costs fit unchanged POSIX15 budget');
 const lua=readdirSync('tests/lua').filter(f=>f.endsWith('.lua')).map(f=>'tests/lua/'+f).sort();assert.equal(lua.length,1410);assert.deepEqual(lua,Object.keys(proof.inventory.luaSha256));for(const file of lua)assert.equal(hash(readFileSync(file,'utf8').replaceAll('\r\n','\n')),proof.inventory.luaSha256[file]);
 const windows=Array.from({length:17},(_,i)=>jsShard(js,`${i+1}/17`,'win32'));assert.deepEqual(windows.flatMap(bin=>bin.files).sort(),[...js].sort());
 const bins=Array.from({length:17},(_,i)=>shardLuaScripts(lua,`${i+1}/17`,{...timings,windowsJsShardMs:windows[0].loads},2));assert.deepEqual(bins.flat().sort(),lua);
 const cost=f=>timings.luaShard[f]??timings.lua[f]??timings.unknownLuaMs,safety=f=>timings.lua[f]??timings.unknownLuaMs;
 const totals=bins.map((bin,i)=>{const pool=[0,0];for(const f of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(f);return windows[0].loads[i]+bin.filter(f=>safety(f)>=10000).reduce((sum,f)=>sum+cost(f),0)+Math.max(...pool);});
 assert(Math.max(...totals)+60000<1800000,'all measured costs fit unchanged Windows17 budget');assert.equal(timings.unknownJsMs,10000);
 for(const platform of ['linux','win32'])for(const file of added)assert.equal(timings.js[platform][file],undefined,'local runs never become fabricated hosted observations');
});
