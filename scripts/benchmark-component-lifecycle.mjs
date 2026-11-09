// Opt-in actual-GIL SDK probe. Reuses TASK-100's nearest-rank statistics.
// Private SDK exports/assets are inputs; no SDK or third-party art is published.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {percentile} from './benchmark-runtime-path.mjs';

const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function comparableUi(project,gil) {
 assert.equal(path.resolve(project.meta.sourceFile),path.resolve(gil),'SDK UI metadata points at another GIL');
 return {...project,meta:{...project.meta,sourceFile:'<separately-packaged-candidate>'}};
}
export function comparableScripts(scripts) {
 let markers=0;
 const normalized=scripts.map(script=>{
  if(script.path==='abyss_component_binding.lua') {
   const flags=[...script.source.matchAll(/\["eagerPages"\]=(true|false)(?=[,}])/g)];
   // Older historical candidates have no experiment flag and remain usable as
   // diagnostic probes, but their source cannot pair with a flagged candidate.
   assert(flags.length<=1,'ambiguous eagerPages binding');
   return {...script,source:script.source.replace(/\["eagerPages"\]=(true|false)(?=[,}])/,'["eagerPages"]=<experiment-flag>')};
  }
  if(script.path!=='abyss_ui.lua')return script;
  const match=/^print\("ABYSS_BUILD ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"\)\n/.exec(script.source);
  assert(match,'missing exact candidate build identity marker');markers++;
  return {...script,source:'print("ABYSS_BUILD <candidate-identity>")\n'+script.source.slice(match[0].length)};
 });
 assert.equal(markers,1,'ambiguous/missing abyss_ui source');return normalized;
}
export function verifySameVisualPair(before,after) {
 for(const field of ['sdkExportSha256','serverUiSha256','templatesSha256','exactScriptsSha256'])
  {assert(/^[0-9a-f]{64}$/.test(before.identity[field]),'missing/invalid pair identity '+field);assert.equal(before.identity[field],after.identity[field],'controlled pair changed '+field);}
 assert.notEqual(before.identity.gilSha256,after.identity.gilSha256,'pair must identify separate GIL packages');
 return true;
}
export function evaluatePair(before,after,{observedTimeRatio=1.25}={}) {
 verifySameVisualPair(before,after);
 assert(Number.isFinite(observedTimeRatio)&&observedTimeRatio>=1,'invalid observation ratio');
 for(const report of [before,after]){
  assert.equal(report.status,'SDK_MENU_CHARACTER_CYCLES_PASS','incomplete SDK probe');
  assert.equal(report.runs.length,3,'three fresh runtime samples required');
  for(const run of report.runs)verifyCycles(run.cycles);
 }
 const baselineInitializationCeiling=Math.max(...before.runs.map(r=>r.phases.find(p=>p.name==='initialize').created));
 const baselineWarmControlCeiling=Math.max(...before.runs.flatMap(r=>r.cycles.map(c=>c.countAfter)));
 for(const run of after.runs){
  assert(run.phases.find(p=>p.name==='initialize').created<=baselineInitializationCeiling,'initialization control creation regressed');
  assert(run.cycles.every(c=>c.countAfter<=baselineWarmControlCeiling),'warm native-model inventory regressed');
 }
 const timing=[];
 for(const phase of ['menu-step','character-step','menu-return-step']){
  const a=summarizeSteps(before.runs.flatMap(r=>r.phases.filter(p=>p.name===phase)));
  const b=summarizeSteps(after.runs.flatMap(r=>r.phases.filter(p=>p.name===phase)));
  timing.push({phase,before:a,after:b,observationP95CeilingMs:a.p95Ms*observedTimeRatio,exceedsObservation:b.p95Ms>a.p95Ms*observedTimeRatio});
 }
 return {schemaVersion:1,status:'DETERMINISTIC_SDK_COUNT_FENCES_PASS',baseline:before.identity,current:after.identity,
  hardBudgets:{baselineInitializationCeiling,baselineWarmControlCeiling,netResidual:0,cycles:20},
  timingPolicy:'REPORT_ONLY: nearest-rank SDK script wall-time observations; no device/frame-time or stable-tail certification.',observedTimeRatio,timing};
}
export function summarizeSteps(rows) {
 assert(rows.length>0,'no measured steps');
 const times=rows.map(r=>r.wallMs);
 assert(times.every(n=>Number.isFinite(n)&&n>=0),'invalid SDK wall time');
 return {samples:times.length,p50Ms:percentile(times,.5),p95Ms:percentile(times,.95),p99Ms:percentile(times,.99),maxMs:Math.max(...times)};
}
export function verifyCycles(cycles) {
 assert.equal(cycles.length,20,'20 complete return cycles required');
 assert(cycles.every(c=>c.menuVisible&&c.characterVisible),'page did not become visible');
 const settled=cycles.slice(1).map(c=>c.countAfter);
 assert(settled.every(c=>c===settled[0]),'controls accumulated after warm return');
 return {warmControlCount:settled[0],netResidual:settled.at(-1)-settled[0]};
}

export async function benchmarkComponentLifecycle({receiptFile,sdkExport,output,samples=3}) {
 assert(Number.isInteger(samples)&&samples>=1&&samples<=3,'one to three fresh runtimes');
 for(const p of [receiptFile,sdkExport])assert(fs.existsSync(p),'missing private input '+p);
 output=path.resolve(output);assert(!fs.existsSync(output),'use a new output directory');fs.mkdirSync(output,{recursive:true});
 const receipt=JSON.parse(fs.readFileSync(receiptFile));
 const candidateFile=path.join(path.dirname(receipt.gil),'candidate.json');
 const candidate=JSON.parse(fs.readFileSync(candidateFile));
 assert.equal(candidate.candidate.sha256,receipt.gilSha256,'candidate/source receipt does not identify this GIL');
 assert.equal(sha(receipt.gil),receipt.gilSha256,'GIL identity drift');
 assert.equal(sha(receipt.output),receipt.saveSha256,'SDK projection identity drift');
 assert(receipt.luaExact===true,'exact Lua projection required');
 const save=JSON.parse(fs.readFileSync(receipt.output));
 const exportFile=path.join(output,'sdk-probe.private.mjs');
 fs.writeFileSync(exportFile,fs.readFileSync(sdkExport,'utf8')+'\nexport {Gr,vi,dn,wi,pa,Me};\n');
 const {Qi,Gr,vi,dn,wi,pa,Me,d}=await import(pathToFileURL(exportFile));
 const rawMount=Qi.prototype.mountScript,rawAdd=Qi.prototype.addRoot;
 let counters;
 Qi.prototype.mountScript=function(o){
  const id=Number(String(o.control?.authoringId??'').replace(/^n/,'')),name=path.basename(o.path,'.lua');
  const found=receipt.mountedValues.filter(v=>v.controlId===id&&v.script===name);assert(found.length<=1);
  return rawMount.call(this,{...o,params:found[0]?.values??o.params??{}});
 };
 Qi.prototype.addRoot=function(o){
  if(!this.controlsById.__componentMeasured){
   const map=this.controlsById,set=map.set,del=map.delete;
   Object.defineProperty(map,'__componentMeasured',{value:true});
   map.set=function(k,v){if(!this.has(k)||this.get(k)!==v)counters.created++;return set.call(this,k,v)};
   map.delete=function(k){const removed=del.call(this,k);if(removed)counters.destroyed++;return removed};
  }
  return rawAdd.call(this,o);
 };
 const report={schemaVersion:1,status:'SDK_PROBE_INCOMPLETE',createdAt:new Date().toISOString(),
  identity:{gilSha256:receipt.gilSha256,luaInventorySha256:receipt.luaInventorySha256,saveSha256:receipt.saveSha256,sdkExportSha256:sha(sdkExport),workerSha256:sha(fileURLToPath(import.meta.url)),serverUiSha256:digest(comparableUi(save.assets.server,receipt.gil)),templatesSha256:digest(comparableUi(save.assets.client,receipt.gil)),rawScriptsSha256:digest(save.assets.scripts),exactScriptsSha256:digest(comparableScripts(save.assets.scripts)),scriptNormalization:'Only the exact builder-injected ABYSS_BUILD UUID first line in abyss_ui.lua and the single eagerPages boolean in generated abyss_component_binding.lua; all remaining source and script metadata remain byte-identical.',uiNormalization:'Only project.meta.sourceFile, verified to equal the actual candidate GIL path; all visual records and runtime fields remain exact.'},
  source:{commit:candidate.sourceCommit,dirty:candidate.sourceDirty,payloadDigest:candidate.payloadDigest,buildId:candidate.buildId,artFeatures:candidate.artFeatures,uiProfile:candidate.uiProfile,candidateReceiptSha256:sha(candidateFile),projectionReceiptSha256:sha(receiptFile)},
  mountedValues:receipt.mountedValues,
  environment:{node:process.version,platform:process.platform,arch:process.arch},steadyFramesPerVisit:30,
  scope:'Actual SDK Gr/vi/dn with exact GIL Lua, templates and mounted params; native-model map registrations/deletions; SDK script wall time, not device FPS.',
  limitations:['No official client, GPU, capacity, PC/Android frame-time or input certification.','Three fresh runtimes share imported SDK and OS caches; no forced GC; Node RSS/heap includes SDK and observer.','Menu/character cycles do not start a run. Full battle RNG/input and original V25 visual approval are separate requirements.','Map registration/deletion counters are SDK model controls, not official native calls. GetChild/setter attribution remains in Lua contract probes.'],runs:[]};
 const flush=()=>fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 try {
  for(let sample=0;sample<samples;sample++){
   counters={created:0,destroyed:0};let session;
   const run={sample:sample+1,phases:[],cycles:[]};report.runs.push(run);
   run.pageReadiness=[];
   function phase(name,fn){
    const before={...counters},time=performance.now();let result,error;
    try{result=fn()}catch(e){error=String(e.stack??e)}
    run.phases.push({name,wallMs:performance.now()-time,created:counters.created-before.created,destroyed:counters.destroyed-before.destroyed,countAfter:session?.runtime.controlsById.size??0,memory:process.memoryUsage(),error});
    if(error)throw Error(error);return result;
   }
   function rows(){const result=[];function walk(n,trail=[],visible=true){trail=[...trail,n.name];visible=visible&&n.visible!==false&&n.active!==false;result.push({node:n,path:trail.join('/'),visible});for(const c of n.children??[])walk(c,trail,visible)}session.runtime.roots.forEach(n=>walk(n));return result;}
   const visible=p=>rows().some(r=>r.path.endsWith(p)&&r.visible);
   function step(name,frames=1){for(let i=0;i<frames;i++)phase(name,()=>dn(session,1/60));}
   function awaitPage(name,p){
    const start=performance.now(),from=session.runtime.clock.frame;
    while(!visible(p)&&session.runtime.clock.frame-from<240)step(name+'-prepare-step');
    assert(visible(p),'page never became completely visible '+p);
    run.pageReadiness.push({page:name,firstCompleteVisibleSdkFrame:session.runtime.clock.frame,waitFrames:session.runtime.clock.frame-from,waitWallMs:performance.now()-start});
   }
   function tap(p){
    const found=rows().filter(r=>r.path.endsWith(p)&&r.visible);assert.equal(found.length,1,'missing/ambiguous visible target '+p);
    const n=found[0].node,boxes=wi(session),box=boxes.get(n.Id),matrix=pa(session,boxes).get(n.Id);assert(box&&matrix);
    const point=Me(matrix,box.centerX,box.centerY);
    phase('pointer-move',()=>vi(session,'move',point.x,point.y));phase('pointer-down',()=>vi(session,'down',point.x,point.y));step('pointer-between');phase('pointer-up',()=>vi(session,'up',point.x,point.y));step('pointer-after');
   }
   try{
    phase('initialize',()=>{session=Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});});
    assert(session.runtime.logs.some(r=>r.text==='ABYSS_UI ready'),'Host did not report ready');
    awaitPage('menu','stage/menuPanel/start/hit');step('menu-step',30);
    for(let cycle=0;cycle<20;cycle++){
     tap('stage/menuPanel/start/hit');awaitPage('character','stage/characterPanel/confirm/hit');step('character-step',30);
     const characterVisible=visible('stage/characterPanel/confirm/hit');
     tap('stage/characterPanel/cancel/hit');awaitPage('menu-return','stage/menuPanel/start/hit');step('menu-return-step',30);
     run.cycles.push({cycle:cycle+1,characterVisible,menuVisible:visible('stage/menuPanel/start/hit'),countAfter:session.runtime.controlsById.size,created:counters.created,destroyed:counters.destroyed});flush();
    }
    run.lifecycle=verifyCycles(run.cycles);
    run.faults=session.runtime.logs.filter(r=>r.level==='lua-error'||/ABYSS_UI failed|prepare_failed|command_failed/.test(r.text));assert.equal(run.faults.length,0,'runtime fault');
    run.logs=session.runtime.logs;run.summaries={};for(const name of ['menu-step','character-step','menu-return-step'])run.summaries[name]=summarizeSteps(run.phases.filter(p=>p.name===name));
   } finally {
    if(session)for(const runtime of session.runtimes)for(const state of runtime.luaStates??[])try{d.lua_close(state)}catch{}
   }
   flush();
  }
  assert.equal(sha(receipt.gil),receipt.gilSha256,'GIL changed while measuring');
  assert.equal(sha(receipt.output),receipt.saveSha256,'projection changed while measuring');
  assert.equal(sha(candidateFile),report.source.candidateReceiptSha256,'candidate source receipt changed while measuring');
  assert.equal(sha(receiptFile),report.source.projectionReceiptSha256,'projection receipt changed while measuring');
  assert.equal(sha(fileURLToPath(import.meta.url)),report.identity.workerSha256,'probe source changed while measuring');
  report.status='SDK_MENU_CHARACTER_CYCLES_PASS';flush();return report;
 }catch(error){report.error=String(error.stack??error);flush();throw error}
 finally{Qi.prototype.mountScript=rawMount;Qi.prototype.addRoot=rawAdd;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv[2]==='--compare'){
  try{const [a,b,out]=process.argv.slice(3);assert(a&&b&&out,'--compare before.json after.json output.json');const result=evaluatePair(JSON.parse(fs.readFileSync(a)),JSON.parse(fs.readFileSync(b)));fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,output:out}));}catch(error){console.error(error.stack);process.exitCode=1;}
 }else{
 const [receiptFile,sdkExport,output,samples]=process.argv.slice(2);
 try{const result=await benchmarkComponentLifecycle({receiptFile,sdkExport,output,samples:samples?Number(samples):3});console.log(JSON.stringify({status:result.status,output,runs:result.runs.length}));}
 catch(error){console.error(error.stack);process.exitCode=1;}
 }
}
