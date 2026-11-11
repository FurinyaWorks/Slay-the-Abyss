// Archive measured cases without replacing screenshots or manufacturing acceptance.
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='.artifacts/lumine-convergence-20261111';
const output='docs/evidence/lumine-convergence-20261111';
fs.mkdirSync(output,{recursive:true});
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const quantile=(values,p)=>{
 const a=values.filter(Number.isFinite).sort((a,b)=>a-b);
 if(!a.length)return null;
 const at=(a.length-1)*p,lo=Math.floor(at),hi=Math.ceil(at);
 return a[lo]+(a[hi]-a[lo])*(at-lo);
};
const stats=a=>({n:a.length,p50:quantile(a,.5),p95:quantile(a,.95),max:Math.max(...a)});
const reports=[],failures=[];
for(const name of fs.readdirSync(root).sort()){
 const dir=path.join(root,name);
 if(!fs.existsSync(dir+'/case.json'))continue;
 const record=read(dir+'/case.json');
 if(record.status!=='measured'){
  failures.push(record);
  const target=output+'/'+name;fs.mkdirSync(target,{recursive:true});
  for(const file of ['case.json','browser/report.json','browser/browser.mjs','browser.log']){
   if(fs.existsSync(dir+'/'+file))fs.writeFileSync(target+'/'+file.replaceAll('/','--')+'.gz',gzipSync(fs.readFileSync(dir+'/'+file)));
  }
  continue;
 }
 const sdk=read(dir+'/sdk.json'),browser=read(dir+'/browser/report.json');
 const candidate=read(dir+'/gil/candidate.json'),visual=read(dir+'/visual/receipt.json');
 assert.equal(hash(dir+'/gil/candidate.gil'),record.gilSha256);
 assert.equal(candidate.candidate.sha256,record.gilSha256);
 assert.equal(hash(dir+'/preview/hud.save.json'),record.saveSha256);
 assert.equal(sdk.status,'passed');assert.deepEqual(sdk.faults,[]);assert.equal(sdk.sourceStable,true);
 assert.equal(sdk.saveSha256,record.saveSha256);assert.equal(browser.saveSha,record.saveSha256);
 assert.equal(browser.buildId,candidate.buildId);assert.equal(visual.service.buildId,candidate.buildId);
 assert.deepEqual(browser.console.filter(x=>x.type==='pageerror'),[]);
 assert.equal(visual.status,'captured-awaiting-visual-review');assert.deepEqual(visual.errors,[]);assert.deepEqual(visual.faults,[]);
 assert.equal(visual.stop.running,false);
 assert.equal(visual.canvas.width,1280);assert.equal(visual.canvas.height,720);
 assert.equal(hash(dir+'/visual/idle-00.png'),visual.shots[0].sha256);
 let asset=null;
 if(record.asset!=='-'){
  const input=candidate.inputs.find(x=>path.resolve(x.path)===path.resolve(record.asset));
  assert(input,'missing asset input');assert.equal(hash(record.asset),input.sha256,'historical asset was overwritten');
  asset=read(record.asset);
 }
 assert.equal(browser.status,'measured');assert.equal(browser.explicitStop.value.running,false);
 const stage=n=>sdk.stages.find(x=>x.name===n);
 assert.equal(stage('engine-root-cleanup').controlsAfter,0);
 const ready=stage('portrait-ready-feedback-idle');
 const native=stage('actual-idle-native-call-census');
 const steady=browser.data.frames.filter(x=>x.phase==='steady-idle');
 const requestStats=(phase,action)=>stats(browser.data.requests.filter(x=>x.phase===phase&&x.action===action&&Number.isFinite(x.headers)).map(x=>x.headers-x.at));
 const row={name,gilSha256:record.gilSha256,saveSha256:record.saveSha256,
  buildId:browser.buildId,images:asset?.count??57,
  runtimeInputHashes:candidate.inputs.filter(x=>x.path.endsWith('.lua')).map(x=>({module:path.basename(x.path),sha256:x.sha256})),
  motion:asset?(asset.motion??'idle'):'legacy',
  samplesPerCycle:asset?.samplesPerCycle??null,
  sampleRateHz:asset?(asset.samplesPerCycle?asset.samplesPerCycle/asset.period:30):null,
  controls:ready.controlsAfter,characterOwned:ready.controlsAfter-ready.controlsBefore,
  readyCpuMs:ready.elapsedMs,readySteps:ready.steps,
  steadySdkStepMs:stage('steady-120-frames').sdkStepMs,nativeIdle:native.state,
  rootControlsAfterCleanup:stage('engine-root-cleanup').controlsAfter,
  inputToDrawMs:stats(browser.isolated.map(x=>x.ms)),stream:browser.stream,
  fixedStream:browser.fixedStream??null,
  fixedDispatchJitterMs:browser.fixedDispatch?stats(browser.fixedDispatch.map(x=>x.sentMs-x.targetMs)):null,
  fixedPointerRoundtripMs:browser.fixedStream?requestStats('fixed-stream','pointer'):null,
  streamPointerRoundtripMs:requestStats('stream','pointer'),
  steadyStepRoundtripMs:requestStats('steady-idle','step'),
  steadyApplyMs:stats(steady.map(x=>x.at-x.begin)),
  steadyRenderMs:stats(browser.data.paints.filter(x=>x.phase==='steady-idle').map(x=>x.end-x.start)),
  flightMs:stats(browser.release.map(x=>x.flightMs)),damageMs:stats(browser.release.map(x=>x.damageMs)),
  flightObservedBeforeDamage:browser.release.every(x=>x.flightMs<=x.damageMs),
  coldFirstPositiveFrameMs:browser.coldReady.gotoToObservedFrameMs,
  figureReadyAfterFirstObservedFrameMs:browser.figureReadyAfterObservedPageMs,
  gpu:browser.gpu,officialImport:'not_run',physicalDevices:'not_run'};
 reports.push(row);
 const target=output+'/'+name;fs.mkdirSync(target,{recursive:true});
 const files=['case.json','sdk.json','sdk-runner.mjs','browser/report.json','browser/browser.mjs',
  'visual/receipt.json',
  'gil/candidate.json','preview/adapter-receipt.json','preview/fixture-receipt.json'];
 const archived=[];
 const transformed=record.asset!=='-'&&fs.existsSync(record.asset+'.receipt.json')?read(record.asset+'.receipt.json'):null;
 if(transformed){
  assert.equal(transformed.outputSha256,hash(record.asset));
  assert.equal(transformed.sourceSha256,hash(transformed.source));
 }
 for(const file of files){
  const src=dir+'/'+file;if(!fs.existsSync(src))continue;
  const dest=file.replaceAll('/','--')+(file.endsWith('.gz')?'':'.gz');
  fs.writeFileSync(target+'/'+dest,file.endsWith('.gz')?fs.readFileSync(src):gzipSync(fs.readFileSync(src)));
  archived.push({source:file,sourceSha256:hash(src),archive:dest,archiveSha256:hash(target+'/'+dest)});
 }
 if(transformed){
  for(const [src,dest] of [[record.asset+'.receipt.json','motion-transform.json.gz'],
   [transformed.source.replace(/\.json$/,'.receipt.json'),'conversion.json.gz']]){
   if(!fs.existsSync(src))continue;
   fs.writeFileSync(target+'/'+dest,gzipSync(fs.readFileSync(src)));
   archived.push({source:src,sourceSha256:hash(src),archive:dest,archiveSha256:hash(target+'/'+dest)});
  }
 }
 if(record.asset!=='-'){
  fs.writeFileSync(target+'/asset.json.gz',gzipSync(fs.readFileSync(record.asset)));
  archived.push({source:record.asset,sourceSha256:hash(record.asset),archive:'asset.json.gz',archiveSha256:hash(target+'/asset.json.gz')});
 }
 fs.copyFileSync(dir+'/visual/idle-00.png',target+'/battle.png');
 fs.writeFileSync(target+'/archives.json',JSON.stringify(archived,null,2)+'\n');
}
fs.writeFileSync(output+'/measurements.json',JSON.stringify({
 scope:'same ten-card two-enemy three-potion fixture; actual headless Simulator; independent fresh backends; performance excludes screenshots',
 uncertainty:'serial, small samples and shared-host drift; render() wall time is not GPU timestamp or device FPS',reports
},null,2)+'\n');
fs.writeFileSync(output+'/failures.json',JSON.stringify(failures,null,2)+'\n');
fs.writeFileSync(output+'/future-scene-budget.json',JSON.stringify({
 scope:'arithmetic planning only; no custom monster implemented, no multi-actor performance or official capacity verified',
 retainedOtherUiControls:13753,
 assumption:'each future actor owns the same geometry/cache hierarchy as the measured hero; existing official fallback controls stay retained',
 projections:reports.filter(x=>x.motion!=='legacy').map(x=>({case:x.name,imagesPerActor:x.images,controlsPerActor:x.characterOwned,
  scenes:[3,4].map(actors=>({actors,visibleArtImages:actors*x.images,actorOwnedControls:actors*x.characterOwned,
   retainedUiPlusActorControls:13753+actors*x.characterOwned,bandSetterCallsPerTwoSeconds:actors*x.nativeIdle.writes}))})),
 performanceExtrapolation:'not available; these counts must not be reported as linear latency/FPS/official load',
 creationScheduling:'future actors require a shared scene creation budget; the current per-controller 64-call/8ms slice must not be multiplied as a scene guarantee'
},null,2)+'\n');
const number=n=>Number.isFinite(n)?n.toFixed(2):'—';
const table=['| case | 图片 | 角色控件 | ready CPU ms | 输入 P50 / P95 ms | 原拖动 变更/48 · 秒 | 固定输入 送达/48 · 变更 · 跨度ms | 2秒setter/新建 |',
 '|---|---:|---:|---:|---:|---:|---:|---:|',
 ...reports.map(x=>`| ${x.name} | ${x.images} | ${x.characterOwned} | ${number(x.readyCpuMs)} | ${number(x.inputToDrawMs.p50)} / ${number(x.inputToDrawMs.p95)} | ${x.stream.changedFrames}/48 · ${number(x.stream.wall)} | ${x.fixedStream?`${x.fixedStream.receivedEvents}/48 · ${x.fixedStream.changedFrames} · ${number(x.fixedStream.receivedSpanMs)}`:'—'} | ${x.nativeIdle.writes}/${x.nativeIdle.creates} |`),
 '\n原拖动由await鼠标回执驱动，wall变化，不只比较计数。固定输入目标60Hz，实际跨度与发出抖动见measurements.json。ready为SDK创建至完整显示墙钟，不是官方客户端首显。每档battle.png为真实1280×720截图。'];
fs.writeFileSync(output+'/table.md',table.join('\n')+'\n');
console.log(JSON.stringify(reports.map(x=>({case:x.name,images:x.images,input:x.inputToDrawMs.p50,drag:x.stream.changedFrames+'/'+x.stream.events,ready:x.readyCpuMs}))));
