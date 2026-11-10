import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readdirSync} from 'node:fs';
import {emeraldCostRegistration as registration,emeraldCostBeforeSource,preEmeraldCostSource} from './map-emerald-cost-source-inverse.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const path='scripts/ci-test-timings.json';
const oldPath='docs/evidence/m7-map-emerald-20261109/ci-cost-observations.json';
const newPath='docs/evidence/m7-map-emerald-cost-20261110/complete-file-observations.json';
export function registerEmeraldCostContracts({test,assert,readFileSync,discoverJs,partition,jsShard,jsPlanningWeights,timings,shardLuaScripts}){
 const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
 test('complete-process registration preserves every old timing and independently authenticates all seven observations',()=>{
  const prior=JSON.parse(emeraldCostBeforeSource),expected=structuredClone(prior),floors={};
  const current=JSON.parse(read(path)),old=JSON.parse(read(oldPath)),rows=JSON.parse(read(newPath));
  const checkedLog=(entry)=>{const bytes=readFileSync(entry.path);assert.equal(hash(bytes),entry.sha256);const raw=gunzipSync(bytes);assert.equal(hash(raw),entry.uncompressedSha256);return raw.toString('utf8');};
  const oldLog=(original)=>checkedLog(old.persistedEvidence[original]);
  for(const row of rows){
   assert.deepEqual([row.returncode,row.signal,row.error,row.fail,row.cancelled,row.skipped],[0,null,null,0,0,0]);
   assert.equal(row.tests,row.pass);assert.equal(row.inputsMatched,true);assert.deepEqual(row.changedInputs,[]);
   assert.deepEqual(row.command.slice(1,3),['--test','--test-concurrency=1']);assert.equal(row.command.at(-1),row.testFile);
   assert.ok(!row.command.some(arg=>/test-name-pattern|test-skip-pattern/.test(arg)));
   const logPath='docs/evidence/m7-map-emerald-cost-20261110/'+row.log.path.split('/').at(-1);
   const log=checkedLog({...row.log,path:logPath});
   for(const [label,value]of [['tests',row.tests],['pass',row.pass],['fail',0],['cancelled',0],['skipped',0],['duration_ms',row.nodeTotalDurationMs]])assert.ok(log.includes('ℹ '+label+' '+value));
   assert.ok(row.processWallMs>=row.nodeTotalDurationMs);assert.ok(row.nodeTotalDurationMs>row.nativeSummary.durationMs);
   assert.equal(row.before.sha256,row.after.sha256);assert.equal(row.before.uncompressedSha256,row.after.uncompressedSha256);
   const snapshot=readFileSync('docs/evidence/m7-map-emerald-cost-20261110/tracked-inputs.json.gz');
   assert.equal(hash(snapshot),row.before.sha256);const inputs=gunzipSync(snapshot);assert.equal(hash(inputs),row.before.uncompressedSha256);
   assert.equal(Object.keys(JSON.parse(inputs)).length,row.before.files);

   floors[row.testFile]=Math.ceil(Math.max(row.processWallMs,row.nodeTotalDurationMs));
  }
  for(const [file,row]of Object.entries(old.completeStandaloneObservations)){
   const log=oldLog(row.path);assert.equal(hash(log),row.sha256);assert.ok(log.includes('ℹ duration_ms '+row.durationMs));
   assert.match(log,/ℹ fail 0\r?\n/);assert.match(log,/ℹ cancelled 0\r?\n/);assert.match(log,/ℹ skipped 0\r?\n/);
   floors[file]=Math.max(floors[file]??0,Math.ceil(row.durationMs));
   assert.match(registration.floors[file].inputBinding,/without a pre-run snapshot/);
  }
  for(const row of old.pairedWholeProcessObservations){
   assert.equal(row.returncode,0);assert.equal(row.inputsMatched,true);
   const log=oldLog(row.logPath);assert.equal(hash(log),row.logSha256);assert.ok(log.includes('ℹ duration_ms '+row.nodeTotalDurationMs));
   assert.equal(oldLog(row.beforePath),oldLog(row.afterPath));
   floors[row.testFile]=Math.max(floors[row.testFile]??0,Math.ceil(Math.max(row.processWallMs,row.nodeTotalDurationMs)));
  }
  for(const [file,floor]of Object.entries(registration.floors).filter(([,f])=>f.additionalObservationReceipt)){
   assert.equal(floor.historicalObservationFloorMs,floors[file],'retain the earlier complete observation independently');
   const bytes=readFileSync(floor.additionalObservationReceipt);assert.equal(hash(bytes),floor.additionalObservationReceiptSha256);
   const rows=JSON.parse(bytes).rows.filter(row=>row.testFile===file);assert.equal(rows.length,1);const row=rows[0];
   assert.deepEqual([row.returncode,row.signal,row.error,row.fail,row.cancelled,row.skipped],[0,null,null,0,0,0]);assert.equal(row.tests,row.pass);
   const log=checkedLog({...row.log,path:row.log.publishedPath});assert.ok(log.includes('ℹ duration_ms '+row.nodeTotalDurationMs));
   const before=checkedLog({...row.before,path:row.before.publishedPath}),after=checkedLog({...row.after,path:row.after.publishedPath});assert.equal(before,after);assert.equal(row.inputsMatched,true);assert.deepEqual(row.changedInputs,[]);
   floors[file]=Math.max(floors[file],Math.ceil(Math.max(row.processWallMs,row.nodeTotalDurationMs)));
  }
  assert.deepEqual(Object.fromEntries(Object.entries(registration.floors).map(([file,row])=>[file,row.durationMs])),floors);
  assert.equal(Object.keys(floors).length,7);assert.equal(Object.keys(prior.jsPlanning.localLowerBounds).length,33);
  for(const [file,floor]of Object.entries(registration.floors)){
   assert.equal(prior.jsPlanning.localLowerBounds[file],undefined);assert.equal(hash(readFileSync(floor.sourceReceipt)),floor.sourceReceiptSha256);
   assert.match(floor.kind,/not a Hosted measurement/);assert.match(floor.kind,/not .*current-code performance certificate/);
   expected.jsPlanning.localLowerBounds[file]=floor;
   for(const platform of ['win32','linux'])assert.equal(jsPlanningWeights([file],platform)[file],Math.max(prior.js[platform][file]??prior.unknownJsMs,floor.durationMs));
  }
  assert.equal(read(path),JSON.stringify(expected,null,2)+'\n');assert.deepEqual(current,expected);assert.deepEqual(timings,current);
  assert.equal(Object.keys(current.jsPlanning.localLowerBounds).length,40);
  for(const [file,value]of Object.entries(prior.jsPlanning.localLowerBounds))assert.deepEqual(current.jsPlanning.localLowerBounds[file],value);
  assert.equal(hash(emeraldCostBeforeSource),registration.beforeTimingSha256);assert.equal(hash(read(path)),registration.afterTimingSha256);
 });
 test('registration inverse accepts only complete LF or CRLF timing bytes and never hides drift',()=>{
  const source=read(path);
  for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(preEmeraldCostSource(path,input),emeraldCostBeforeSource);
  const mutations=[source+'\n',source.slice(1),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 10000,\n  "unknownJsMs": 10000')];
  for(const [file,floor]of Object.entries(registration.floors)){
   const key=JSON.stringify(file)+': {\n        "durationMs": '+floor.durationMs;assert.ok(source.includes(key),file);
   mutations.push(source.replace(key,key.slice(0,-String(floor.durationMs).length)+'1'));
  }
  for(const input of [null,undefined,{},17,emeraldCostBeforeSource,...mutations]){assert.notEqual(input,source);assert.equal(preEmeraldCostSource(path,input),input);}
  for(const foreign of ['foreign','__proto__','constructor','tests/ci-complete-calibration.test.mjs'])assert.equal(preEmeraldCostSource(foreign,source),source);
 });
 test('registered complete cost retains full inventory and the unchanged Windows capacity block',t=>{
  const js=discoverJs(),lua=readdirSync('tests/lua').filter(f=>f.endsWith('.lua')).map(f=>'tests/lua/'+f).sort();
  assert.equal(js.length,800);assert.equal(lua.length,1410);
  const cost=f=>timings.luaShard[f]??timings.lua[f]??timings.unknownLuaMs,safety=f=>timings.lua[f]??timings.unknownLuaMs;
  let windowsTotal;
  for(const [platform,count,budget,forecast]of [['win32',17,1800000,1801345],['linux',15,1200000,1137425]]){
   const bins=Array.from({length:count},(_,i)=>jsShard(js,`${i+1}/${count}`,platform));
   assert.deepEqual(bins.flatMap(b=>b.files).sort(),[...js].sort());assert.equal(new Set(bins.flatMap(b=>b.files)).size,800);
   const loads=bins[0].loads;let maximum=Math.max(...loads);
   if(platform==='win32'){
    windowsTotal=loads.reduce((a,b)=>a+b,0);
    const luaBins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...timings,windowsJsShardMs:loads},2));
    assert.deepEqual(luaBins.flat().sort(),lua);
    maximum=Math.max(...luaBins.map((bin,i)=>{const pool=[0,0];for(const f of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(f);return loads[i]+bin.filter(f=>safety(f)>=10000).reduce((n,f)=>n+cost(f),0)+Math.max(...pool);}));
   }
   assert.equal(maximum+60000,forecast);assert.equal(forecast<budget,platform==='linux');
   t.diagnostic(`${platform}: ${forecast} ms, original target ${budget} ms; planning evidence only, no current Hosted pass or admission.`);
  }
  const exclusive=lua.filter(f=>safety(f)>=10000).reduce((n,f)=>n+cost(f),0),short=lua.filter(f=>safety(f)<10000).reduce((n,f)=>n+cost(f),0);
  assert.deepEqual([windowsTotal,exclusive,short],[19075853,7852637,5325660]);
  assert.equal(windowsTotal+exclusive+short/2-17*(1800000-60000),11320,'even ideal balancing is short of 11,320 ms of normalized capacity');
  assert.ok(60000+(windowsTotal+exclusive+short/2)/17>1800000,'redistribution cannot remove this block');
 });
}
