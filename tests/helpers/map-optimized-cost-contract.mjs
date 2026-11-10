import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {optimizedCostRegistration as registration,optimizedCostBeforeSource,preOptimizedEmeraldCostSource} from './map-optimized-cost-source-inverse.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const timingPath='scripts/ci-test-timings.json',fixturePath='tests/helpers/map-emerald-cases.lua';
const normalize=b=>b.toString('utf8').replaceAll('\r\n','\n');
const sourceText=path=>path==='.luacheckrc'||/\.(?:lua|mjs|json|py|ps1|md|txt|cjs|tsv|csv)$/.test(path);

export function assertCalibrationCostEvidence(assert,readBytes=readFileSync){
 const entry=registration.calibrationEntry,bytes=readBytes(entry.completeCurrentObservationReceipt);
 assert.equal(hash(bytes),entry.completeCurrentObservationReceiptSha256,'calibration receipt identity');
 const rows=JSON.parse(bytes).rows;assert.equal(rows.length,3);let maximum=0;
 const unpack=e=>{const bytes=readBytes(e.path);assert.equal(hash(bytes),e.sha256,'calibration compressed identity');const raw=gunzipSync(bytes);assert.equal(hash(raw),e.uncompressedSha256,'calibration raw identity');return raw;};
 for(const row of rows){
  assert.equal(row.testFile,'tests/ci-complete-calibration.test.mjs');
  assert.deepEqual([row.returncode,row.error,row.inputsMatched,row.changedInputs],[0,null,true,[]]);
  assert.deepEqual([row.summary.tests,row.summary.pass,row.summary.fail,row.summary.cancelled,row.summary.skipped],[53,53,0,0,0]);
  assert.deepEqual(row.command.slice(1,3),['--test','--test-concurrency=1']);assert.equal(row.command.at(-1),row.testFile);
  assert.ok(!row.command.some(a=>/test-name-pattern|test-skip-pattern/.test(a)));
  const log=unpack(row.log).toString('utf8');for(const [key,value]of Object.entries(row.summary))assert.ok(log.includes('ℹ '+key+' '+value));
  assert.deepEqual(unpack(row.before),unpack(row.after));assert.equal(Object.keys(JSON.parse(unpack(row.before))).length,row.before.files);
  assert.ok(Number.isFinite(row.processWallMs)&&row.processWallMs>=row.summary.duration_ms);
  maximum=Math.max(maximum,row.processWallMs,row.summary.duration_ms);
 }
 assert.equal(maximum,entry.maximumObservedCompleteProcessMs);assert.equal(entry.headroomMultiplier,1.1);
 assert.equal(entry.priorRegisteredFloorMs,17544);assert.equal(entry.durationMs,Math.max(17544,Math.ceil(maximum*1.1)));
 return rows;
}

// Read and authenticate the raw evidence afresh. The injected reader is used
// only by negative controls; normal validation uses unprojected disk bytes.
export function assertOptimizedCostEvidence(assert,readBytes=readFileSync){
 const entry=registration.entry,bytes=readBytes(entry.sourceReceipt);
 assert.equal(hash(bytes),entry.sourceReceiptSha256,'measurement receipt identity');
 const receipt=JSON.parse(bytes),rows=receipt.rows;
 assert.deepEqual(rows.map(r=>r.name),['published-optimized','optimized-first','original-second','optimized-dependency-bound']);
 const unpack=record=>{const packed=readBytes(record.path);assert.equal(hash(packed),record.sha256,'compressed evidence identity');const raw=gunzipSync(packed);assert.equal(hash(raw),record.uncompressedSha256,'raw evidence identity');return raw;};
 let maximum=0,bound;
 for(const row of rows){
  assert.deepEqual([row.returncode,row.error,row.inputsMatched,row.changedInputs],[0,null,true,[]]);
  assert.deepEqual([row.summary.tests,row.summary.pass,row.summary.fail,row.summary.cancelled,row.summary.skipped],[10,10,0,0,0]);
  assert.equal(row.testFile,registration.planningKey);
  assert.deepEqual(row.command.slice(1,3),['--test','--test-concurrency=1']);assert.equal(row.command.at(-1),registration.planningKey);
  assert.ok(!row.command.some(a=>/test-name-pattern|test-skip-pattern/.test(a)));
  const log=unpack(row.log).toString('utf8');
  for(const [key,value]of Object.entries(row.summary))assert.ok(log.includes('ℹ '+key+' '+value),'complete '+key);
  assert.ok(Number.isFinite(row.processWallMs)&&row.processWallMs>=row.summary.duration_ms);
  const before=unpack(row.before),after=unpack(row.after);assert.deepEqual(before,after);
  const inputs=JSON.parse(before);assert.equal(Object.keys(inputs).length,row.before.files);
  assert.equal(inputs[fixturePath],row.fixtureSha256);
  if(row.name==='original-second')assert.equal(row.fixtureSha256,'afd3fc85fdd4dff15d71d7a94f3a4fb178fffd39ab8f7362852f0f016d3b87b9');
  else{assert.equal(row.fixtureSha256,entry.fixtureSha256);maximum=Math.max(maximum,row.processWallMs,row.summary.duration_ms);}
  if(row.name==='optimized-dependency-bound')bound=inputs;
 }
 assert.equal(maximum,entry.maximumObservedCompleteProcessMs);
 assert.equal(entry.headroomMultiplier,1.1);assert.equal(entry.durationMs,Math.ceil(maximum*1.1));
 assert.equal(entry.historicalFloorMs,87638);
 assert.equal(Object.keys(bound).filter(p=>p.startsWith('node_modules/')).length,receipt.environment.dependencyFiles);
 assert.equal(receipt.environment.dependencyFiles,678);assert.equal(receipt.environment.nodeVersion,'v24.22.1');
 assert.match(receipt.environment.nodeExecutableSha256,/^[a-f0-9]{64}$/);
 assert.ok(Object.keys(bound).some(p=>p.startsWith('build/tools/')&&bound[p]));
 // Preserve measured environment identity without requiring Linux installed
 // package or executable bytes to equal those of a Windows CI host.
 const sourcePaths=Object.keys(bound).filter(p=>bound[p]!==null&&(
  /^(src\/|build\/lua\/|tests\/helpers\/|tests\/fixtures\/|config\/|data\/)/.test(p)||
  p.startsWith('scripts/')&&p!==timingPath||
  [registration.planningKey,'tests/lua/emerald_map.lua','package.json','package-lock.json','.luacheckrc'].includes(p)));
 assert.ok(sourcePaths.includes(fixturePath)&&sourcePaths.includes('build/lua/abyss_data.lua'));
 for(const path of sourcePaths){const current=readBytes(path);assert.ok(hash(current)===bound[path]||sourceText(path)&&hash(normalize(current))===bound[path],'measured source identity: '+path);}
 return {receipt,sourcePaths};
}

export function registerOptimizedCostContracts({test,assert,discoverJs,jsShard,jsPlanningWeights,timings,shardLuaScripts}){
 test('optimized Emerald cost retains every sample, authenticates raw inputs and rejects evidence drift',()=>{
  const {receipt,sourcePaths}=assertOptimizedCostEvidence(assert);
  const sourceSet=new Set(sourcePaths);
  const crlf=p=>sourceSet.has(p)&&sourceText(p)?Buffer.from(normalize(readFileSync(p)).replaceAll('\n','\r\n')):readFileSync(p);
  assert.deepEqual(assertOptimizedCostEvidence(assert,crlf).sourcePaths,sourcePaths,'all source identities also hold on CRLF checkouts; binary evidence is untouched');
  for(const path of [fixturePath,'.luacheckrc','scripts/art/prepare-card-capacity.py'])assert.throws(()=>assertOptimizedCostEvidence(assert,p=>p===path?Buffer.from(crlf(p).toString('utf8').replace(/[A-Za-z]/,c=>c==='z'?'y':'z')):crlf(p)),/measured source identity/);
  const paths=[registration.entry.sourceReceipt,receipt.rows[1].log.path,receipt.rows[3].before.path,fixturePath];
  for(const path of paths)assert.throws(()=>assertOptimizedCostEvidence(assert,p=>p===path?Buffer.concat([readFileSync(p),Buffer.from('\n')]):readFileSync(p)),/identity/);
  const calibration=assertCalibrationCostEvidence(assert);
  for(const path of [registration.calibrationEntry.completeCurrentObservationReceipt,calibration[2].log.path,calibration[2].before.path])assert.throws(()=>assertCalibrationCostEvidence(assert,p=>p===path?Buffer.concat([readFileSync(p),Buffer.from('\n')]):readFileSync(p)),/identity/);
 });
 test('optimized costs change only the two measured entries and preserve exact historical domains',()=>{
  const source=normalize(readFileSync(timingPath)),before=JSON.parse(optimizedCostBeforeSource),expected=structuredClone(before);
  assert.equal(before.jsPlanning.localLowerBounds[registration.planningKey].durationMs,87638);
  expected.jsPlanning.localLowerBounds[registration.planningKey]=registration.entry;
  expected.jsPlanning.localLowerBounds['tests/ci-complete-calibration.test.mjs']=registration.calibrationEntry;
  assert.equal(source,JSON.stringify(expected,null,2)+'\n');assert.deepEqual(timings,expected);
  assert.equal(Object.keys(timings.jsPlanning.localLowerBounds).length,40);
  for(const [file,floor]of Object.entries(before.jsPlanning.localLowerBounds))if(![registration.planningKey,'tests/ci-complete-calibration.test.mjs'].includes(file))assert.deepEqual(timings.jsPlanning.localLowerBounds[file],floor);
  for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(preOptimizedEmeraldCostSource(timingPath,input),optimizedCostBeforeSource);
  for(const input of [null,undefined,{},0,optimizedCostBeforeSource,source+'\n',source.slice(1),source.replace('"durationMs": 71588','"durationMs": 1'),source.replace('"durationMs": 20296','"durationMs": 1'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 1')])assert.equal(preOptimizedEmeraldCostSource(timingPath,input),input);
  for(const path of ['unknown','__proto__',fixturePath])assert.equal(preOptimizedEmeraldCostSource(path,source),source);
  for(const platform of ['win32','linux'])assert.equal(jsPlanningWeights([registration.planningKey],platform)[registration.planningKey],71588);
  for(const platform of ['win32','linux'])assert.equal(jsPlanningWeights(['tests/ci-complete-calibration.test.mjs'],platform)['tests/ci-complete-calibration.test.mjs'],20296);
 });
 test('live optimized planner retains complete inventories, budgets and the remaining Windows block',t=>{
  const js=discoverJs(),lua=readdirSync('tests/lua').filter(p=>p.endsWith('.lua')).map(p=>'tests/lua/'+p).sort();
  assert.equal(js.length,800);assert.equal(lua.length,1410);
  const cost=f=>timings.luaShard[f]??timings.lua[f]??timings.unknownLuaMs,safety=f=>timings.lua[f]??timings.unknownLuaMs;
  for(const [platform,count,budget]of [['win32',17,1800000],['linux',15,1200000]]){
   const bins=Array.from({length:count},(_,i)=>jsShard(js,`${i+1}/${count}`,platform));assert.deepEqual(bins.flatMap(b=>b.files).sort(),[...js].sort());
   const loads=bins[0].loads;let maximum=Math.max(...loads);
   if(platform==='win32'){
    const luaBins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...timings,windowsJsShardMs:loads},2));assert.deepEqual(luaBins.flat().sort(),lua);
    maximum=Math.max(...luaBins.map((bin,i)=>{const pool=[0,0];for(const f of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(f);return loads[i]+bin.filter(f=>safety(f)>=10000).reduce((n,f)=>n+cost(f),0)+Math.max(...pool);}));
   }
   assert.equal(maximum+60000,registration.forecasts[platform]);assert.equal(maximum+60000<budget,platform==='linux');
   t.diagnostic(`${platform}: live optimized forecast ${maximum+60000}ms; unchanged budget ${budget}ms; local planning only, admission remains BLOCKED.`);
  }
 });
}
