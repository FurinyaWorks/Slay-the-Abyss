// Cheap evidence gate. SDK replay is opt-in; this module never starts the SDK or a client.
import assert from 'node:assert/strict';
import {readFileSync,realpathSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {supportedSdkSha256} from './replay-ui-outcome.mjs';

const digest=value=>createHash('sha256').update(value).digest('hex');
const sha=value=>/^[a-f0-9]{64}$/.test(value??'');
const finite=value=>Number.isFinite(value)&&value>=0;
const count=value=>Number.isSafeInteger(value)&&value>=0;
const layers=['officialImport','officialReady','officialCapacity','pcPerformance','androidPerformance','v25Visual'];
const unverified=()=>Object.fromEntries(layers.map(key=>[key,'UNVERIFIED']));
// Nearest-rank P50, matching TASK-100 and the original #565 comparison.
const median=values=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*.5)-1];

export function evaluateReplay(report,{maxStepMs=100,maxWarmControlGrowth=0}={}) {
 const errors=[],blockers=[];
 const result={offlineStatus:'UNVERIFIED',productStatus:'UNVERIFIED',external:unverified(),errors,blockers};
 if(!report)return result;
 try{
  assert(finite(maxStepMs)&&maxStepMs<=100&&count(maxWarmControlGrowth)&&maxWarmControlGrowth===0,'Evidence cannot relax the fixed 100ms/zero warm-growth contract');
  assert(!report.error,'Replay execution failed');
  assert.equal(report.schemaVersion,1);assert.equal(report.kind,'sdk-ui-outcome');
  for(const key of ['gilSha256','saveSha256','sdkSha256','runnerSha256','receiptSha256','luaInventorySha256','mountedValuesSha256'])assert(sha(report.identity?.[key]),`Missing identity ${key}`);
  assert.equal(report.identity.sdkSha256,supportedSdkSha256,'Unsupported SDK capture');
  assert.equal(report.inputsUnchanged,true,'Capture did not verify unchanged inputs');
  assert(report.environment&&['platform','arch','node','cpu'].every(key=>typeof report.environment[key]==='string'&&report.environment[key].length),'Missing replay environment');
  assert(['visualSha256','loadSha256'].every(key=>sha(report.conditions?.[key])),'Missing controlled-input fingerprints');
  assert.deepEqual(report.scenario,{id:'menu-character-roundtrip-v1',roundTrips:20,dt:1/60,frameLimit:180},'Unsupported/truncated scenario');
  assert(Array.isArray(report.events)&&report.events.length>=41,'Missing runtime events');
  let previous=0;
  for(const [index,event]of report.events.entries()){
   assert(typeof event.phase==='string'&&event.phase.length&&finite(event.wallMs)&&!event.error,'Invalid event/time');
   for(const key of ['created','destroyed','countBefore','countAfter'])assert(count(event[key]),`Invalid ${key}`);
   assert.equal(event.countAfter,event.countBefore+event.created-event.destroyed,'Registration balance mismatch');
   assert.equal(event.countBefore,previous,'Missing/reordered registration events');previous=event.countAfter;
   if(index===0)assert.equal(event.phase,'initialize','Missing startup event');
  }
  const expectedPages=[{name:'menu',cycle:0}];
  for(let cycle=1;cycle<=20;cycle++)expectedPages.push({name:'character',cycle},{name:'menu',cycle});
  assert.deepEqual(report.pages?.map(({name,cycle})=>({name,cycle})),expectedPages,'Missing/reordered page observations');
  let cursor=0;
  for(const [index,page]of report.pages.entries()){
   assert(typeof page.scriptReady==='boolean'&&typeof page.structureReady==='boolean'&&typeof page.complete==='boolean','Missing page readiness observations');
   assert(count(page.frames)&&page.frames<=180&&finite(page.elapsedMs),'Invalid readiness window');
   assert(page.requiredChecks&&['controls','templates','text'].every(key=>typeof page.requiredChecks[key]==='boolean'),'Missing page checks');
   assert(Array.isArray(page.checkDetails)&&page.checkDetails.length>=3,'Missing raw readiness checks');
   assert.equal(new Set(page.checkDetails.map(check=>check.id)).size,page.checkDetails.length,'Duplicate readiness checks');
   for(const category of ['controls','templates','text']){
    const checks=page.checkDetails.filter(check=>check.category===category);
    assert(checks.length>0&&checks.every(check=>typeof check.passed==='boolean'),'Incomplete readiness categories');
    assert.equal(page.requiredChecks[category],checks.every(check=>check.passed),'Forged readiness category');
   }
   const checked=Object.values(page.requiredChecks).every(value=>value===true);
   assert.equal(page.structureReady,checked,'Forged structure-ready summary');
   assert.equal(page.complete,page.scriptReady&&page.structureReady,'Script ready is not page ready');
   const initial=page.initialReadiness;
   assert(initial&&typeof initial.scriptReady==='boolean'&&typeof initial.structureReady==='boolean'&&typeof initial.complete==='boolean'&&initial.requiredChecks,'Missing initial page observation');
   assert.equal(initial.complete,initial.scriptReady&&initial.structureReady);
   if(initial.scriptReady&&!initial.complete&&initial.requiredChecks.controls)blockers.push(`${page.cycle}/${page.name}: visible before complete SDK structure`);
   const expectedPhase=index===0?'initialize':page.name==='character'?'open-character':'close-character';
   assert.equal(page.firstEventIndex,cursor,'Page is detached from its input/startup event');
   assert.equal(report.events[cursor]?.phase,expectedPhase,'Missing/replaced page input event');
   assert.equal(report.events[cursor]?.cycle,page.cycle,'Wrong page event cycle');cursor++;
   for(let frame=0;frame<page.frames;frame++,cursor++){
    assert.equal(report.events[cursor]?.phase,page.name+'-prepare','Missing/replaced page preparation');
    assert.equal(report.events[cursor]?.cycle,page.cycle);
   }
   assert.equal(page.lastEventIndex,cursor-1,'Page event coverage mismatch');
   if(!page.complete)blockers.push(`${page.cycle}/${page.name}: incomplete SDK model`);
  }
  assert.equal(cursor,report.events.length,'Unbound/truncated runtime events');
  assert.equal(report.inputs?.length,40,'Missing input coverage');
  for(const [index,input]of report.inputs.entries()){
   const open=index%2===0,action=open?'open-character':'close-character',panel=open?'characterPanel':'menuPanel';
   assert.equal(input.cycle,Math.floor(index/2)+1);assert.equal(input.action,action);assert.equal(input.expectedPanel,panel);
   assert.equal(input.eventIndex,report.pages[index+1].firstEventIndex,'Input is detached from raw event');
   assert(count(input.expectedHit)&&input.expectedHit>0,'Missing expected hit');
   const passed=input.hit===input.expectedHit&&input.observedPanel===panel;
   assert.equal(input.passed,passed,'Forged input summary');if(!passed)blockers.push(`${input.cycle}/${action}: input failed`);
  }
  assert.equal(report.roundTrips?.length,20,'Missing 20-cycle resource coverage');
  for(const [index,row]of report.roundTrips.entries()){
   assert.equal(row.cycle,index+1);assert(count(row.countBefore)&&count(row.countAfter));
   assert.equal(row.firstEventIndex,report.pages[index*2+1].firstEventIndex);
   assert.equal(row.lastEventIndex,report.pages[index*2+2].lastEventIndex);
   assert.equal(row.countBefore,report.events[row.firstEventIndex].countBefore,'Resource snapshot does not match raw registrations');
   assert.equal(row.countAfter,report.events[row.lastEventIndex].countAfter,'Resource snapshot does not match raw registrations');
   if(index>0)assert.equal(row.countBefore,report.roundTrips[index-1].countAfter,'Discontinuous resource observations');
   // The first trip may build a cache. Later trips must reuse/release it.
   if(index>0&&row.countAfter-report.roundTrips[0].countAfter>maxWarmControlGrowth)blockers.push(`${row.cycle}: warm control growth`);
  }
  assert.equal(report.roundTrips.at(-1).countAfter,previous,'Final resource/event count mismatch');
  assert(Array.isArray(report.faults)&&Array.isArray(report.mountErrors),'Missing fault observations');
  assert(Array.isArray(report.logs)&&report.logs.some(row=>row.text==='ABYSS_UI ready'),'Missing actual startup log');
  const logFaults=report.logs.filter(row=>row.level==='lua-error'||/ABYSS_UI failed|prepare_failed|command_failed|ABYSS_RUN seed=/.test(row.text));
  assert.deepEqual(report.faults,logFaults,'Fault summary disagrees with raw logs');
  if(report.faults.length||report.mountErrors.length)blockers.push('Runtime/mount faults');
  const updates=report.events.filter(event=>event.phase!=='initialize');
  result.maxStepMs=Math.max(...updates.map(event=>event.wallMs));
  result.startupMs=report.events[0].wallMs;
  result.longBlocks=report.events.filter(event=>event.wallMs>100).map(({phase,wallMs})=>({phase,wallMs}));
  result.roundTrips=20;
  result.warmControlGrowth=report.roundTrips.at(-1).countAfter-report.roundTrips[0].countAfter;
  if(result.maxStepMs>maxStepMs)blockers.push(`SDK synchronous operation exceeds ${maxStepMs}ms`);
  result.offlineStatus=blockers.length?'FAIL':'PASS';
 }catch(error){errors.push(error.message);result.offlineStatus='INVALID';}
 return result;
}

// Consume the original #565 measurements, not its hand-written comparison summary.
export function diagnoseComparison(oldCapture,newCapture) {
 function summarize(raw){
  assert.equal(raw.schemaVersion,1);assert(sha(raw.gilSha256)&&sha(raw.sdkExportSourceSha256));
  assert.equal(raw.runs?.length,3,'Expected the complete three-instance observation');
  const startup=[],menu=[],character=[];let dynamic=0,scriptReadyBeforePageReady=false;
  for(const run of raw.runs){
   assert(!run.error&&run.readyAtInitialization===true,'Runtime did not start');
   assert.deepEqual(run.faults,[]);assert.deepEqual(run.mountErrors,[]);
   assert.equal(run.phases.filter(p=>p.name==='menu-step').length,120);
   assert.equal(run.phases.filter(p=>p.name==='character-step').length,120);
   assert.equal(run.phases[0].name,'initialize');let previous=0;
   for(const p of run.phases){
    assert(!p.error&&finite(p.wallMs));
    for(const key of ['created','destroyed','countBefore','countAfter'])assert(count(p[key]));
    assert.equal(p.countBefore,previous);assert.equal(p.countAfter,p.countBefore+p.created-p.destroyed);previous=p.countAfter;
    if(p.name==='initialize')startup.push(p.wallMs);
    else dynamic+=p.created;
    if(p.name==='menu-step')menu.push(p.wallMs);
    if(p.name==='character-step')character.push(p.wallMs);
   }
   assert.equal(previous,run.finalControlCount);
   if(run.logs.some(log=>/ABYSS_PORTRAIT menuScene phase=building/.test(log.text)&&log.time===0))scriptReadyBeforePageReady=true;
  }
  return {gilSha256:raw.gilSha256,startupMs:median(startup),menuStepMs:median(menu),characterStepMs:median(character),dynamicCreates:dynamic,scriptReadyBeforePageReady};
 }
 const old=summarize(oldCapture),current=summarize(newCapture);
 assert.equal(oldCapture.sdkExportSourceSha256,newCapture.sdkExportSourceSha256,'Different SDK');
 assert.deepEqual(oldCapture.device,newCapture.device,'Different environment');
 assert.notEqual(old.gilSha256,current.gilSha256,'Reused same candidate');
 return {old,new:current,controlled:false,interpretation:current.dynamicCreates<old.dynamicCreates?'PARTIAL_IMPROVEMENT':'NO_OBSERVED_IMPROVEMENT',
  limitations:['Different visual resources and template counts: not a causal same-quality A/B.','SDK wall time excludes renderer/GPU; no FPS or device inference.','Historical runs have no 20-cycle cleanup or page-completeness oracle.'],
  regressions:[...(current.startupMs>old.startupMs?['startup']:[]),...(current.menuStepMs>old.menuStepMs?['menu-step']:[])]};
}

export function experimentDirection(experiments) {
 assert(Array.isArray(experiments));const ids=new Set();let consecutive=[],uncontrolled=false;
 for(const experiment of experiments){
  assert(typeof experiment.id==='string'&&!ids.has(experiment.id),'Duplicate/missing experiment id');ids.add(experiment.id);
  assert(typeof experiment.hypothesis==='string'&&experiment.hypothesis.length);
  assert(['startupMs','maxStepMs','warmControlGrowth'].includes(experiment.metric),'Unsupported symptom metric');
  assert(finite(experiment.before)&&finite(experiment.after));
  assert(sha(experiment.baselineSha256)&&sha(experiment.candidateSha256)&&experiment.baselineSha256!==experiment.candidateSha256,'Missing/distinct experiment inputs');
  if(experiment.controlled!==true){uncontrolled=true;consecutive=[];continue;}
  uncontrolled=false;
  if(experiment.after<experiment.before)consecutive=[];
  else{
   if(consecutive.at(-1)?.hypothesis!==experiment.hypothesis||consecutive.at(-1)?.metric!==experiment.metric)consecutive=[];
   consecutive.push(experiment);
  }
 }
 if(uncontrolled)return {action:'REVIEW_EXPERIMENT',reason:'Uncontrolled variables; cannot infer symptom improvement'};
 return consecutive.length>=2?{action:'REVISIT_HYPOTHESIS',hypothesis:consecutive.at(-1).hypothesis,reason:'Two controlled attempts did not improve the original symptom'}
  :{action:'CONTINUE_MEASUREMENT',reason:'Retain gaps and test the next falsifiable prediction'};
}

function boundJson(record,root){
 assert(record&&typeof record.path==='string'&&sha(record.sha256),'Missing artifact identity');
 const base=realpathSync(root),file=realpathSync(resolve(base,record.path)),rel=relative(base,file);
 assert(rel&&!rel.startsWith('..')&&!isAbsolute(rel),'Evidence path escapes root');
 const bytes=readFileSync(file);assert.equal(digest(bytes),record.sha256,`Evidence hash mismatch: ${record.path}`);
 return JSON.parse((record.path.endsWith('.gz')?gunzipSync(bytes):bytes).toString('utf8'));
}

export function verifyOutcome(file,{root=process.cwd()}={}) {
 const result={status:'UNVERIFIED',productStatus:'UNVERIFIED',external:unverified(),errors:[]};
 if(!existsSync(resolve(root,file))){result.errors.push('Missing product outcome evidence');return result;}
 try{
  const manifest=JSON.parse(readFileSync(resolve(root,file),'utf8'));
  assert.equal(manifest.schemaVersion,1);assert(/^TASK-\d+(?:\.\d+)*$/.test(manifest.taskId));result.taskId=manifest.taskId;
  assert(Number.isSafeInteger(manifest.ownerPr)&&manifest.ownerPr>0,'Missing existing PR owner');
  result.ownerPr=manifest.ownerPr;result.scope=manifest.scope;
  assert.equal(manifest.scope,'diagnosis','This gate certifies diagnosis only; use official UI/load acceptance for product completion');
  assert.equal(manifest.claim,'diagnosed','Local metrics cannot certify resolved product acceptance');
  assert(typeof manifest.symptom==='string'&&manifest.symptom.length);
  assert(Array.isArray(manifest.facts)&&manifest.facts.length>0);
  assert(manifest.hypotheses?.length>0&&manifest.hypotheses.every(h=>h.id&&h.prediction&&h.falsifier),'Missing falsifiable hypothesis');
  assert.equal(manifest.approvedVisual?.revision,'7e40d2d361fff6b9c89d9f409db29a9d8ac44352','V25 approved source changed');
  assert(manifest.gaps?.length>0&&manifest.gaps.every(g=>g.layer&&/^TASK-/.test(g.owner)),'Unverified layers need an existing owner');
  result.gaps=manifest.gaps;
  if(manifest.historical){
   result.comparison=diagnoseComparison(boundJson(manifest.historical.old,root),boundJson(manifest.historical.new,root));
  }
  if(manifest.replay){
   const raw=boundJson(manifest.replay,root);
   assert.equal(raw.identity?.gilSha256,manifest.expectedCandidateSha256,'Stale/wrong replay candidate');
   assert.equal(raw.identity?.runnerSha256,digest(readFileSync(new URL('./replay-ui-outcome.mjs',import.meta.url))),'Replay belongs to a different runner contract');
   result.replay=evaluateReplay(raw,manifest.budget);
   assert.notEqual(result.replay.offlineStatus,'INVALID',result.replay.errors.join('; '));
  }
  if(manifest.reproduction){
   const raw=boundJson(manifest.reproduction,root);
   assert.equal(raw.identity?.gilSha256,manifest.expectedBaselineSha256,'Stale/wrong reproduction candidate');
   assert.equal(raw.identity?.runnerSha256,digest(readFileSync(new URL('./replay-ui-outcome.mjs',import.meta.url))),'Reproduction belongs to a different runner contract');
   result.reproduction=evaluateReplay(raw);
   assert.equal(result.reproduction.offlineStatus,'FAIL','Baseline did not reproduce the blocked experience');
   assert(result.reproduction.blockers.some(blocker=>blocker.includes('visible before complete')),'Baseline did not reproduce progressive model assembly');
   if(manifest.replay){const candidate=boundJson(manifest.replay,root);result.sameVisualComparison=raw.conditions.visualSha256===candidate.conditions.visualSha256&&raw.conditions.loadSha256===candidate.conditions.loadSha256;}
  }
  assert(result.comparison||result.replay,'No executable observation');
  // Experiment summaries are derived from bound raw replays. Never trust
  // caller-supplied controlled/improved/before/after flags.
  const pairs=new Set();
  const experiments=(manifest.experiments??[]).map(experiment=>{
   assert(manifest.hypotheses.some(h=>h.id===experiment.hypothesis),'Unknown experiment hypothesis');
   const before=boundJson(experiment.baseline,root),after=boundJson(experiment.candidate,root);
   const pair=experiment.baseline.sha256+':'+experiment.candidate.sha256;assert(!pairs.has(pair),'Reused experiment observation');pairs.add(pair);
   const a=evaluateReplay(before),b=evaluateReplay(after);
   assert(!['INVALID','UNVERIFIED'].includes(a.offlineStatus)&&!['INVALID','UNVERIFIED'].includes(b.offlineStatus),'Experiment lacks valid replay observations');
   const controlled=['visualSha256','loadSha256'].every(key=>sha(before.conditions?.[key])&&before.conditions[key]===after.conditions?.[key])
    &&before.identity.sdkSha256===after.identity.sdkSha256&&JSON.stringify(before.environment)===JSON.stringify(after.environment)
    &&JSON.stringify(before.scenario)===JSON.stringify(after.scenario);
   return {id:experiment.id,hypothesis:experiment.hypothesis,metric:experiment.metric,before:a[experiment.metric],after:b[experiment.metric],controlled,
    baselineSha256:experiment.baseline.sha256,candidateSha256:experiment.candidate.sha256};
  });
  result.direction=experimentDirection(experiments);
  result.status='DIAGNOSED';
 }catch(error){result.status='INVALID';result.errors.push(error.message);}
 return result;
}

export function auditOutcomeTasks(tasks,root=process.cwd()) {
 const errors=[];
 const registryFile=resolve(root,'config/product-outcomes.json');
 let registry={};
 if(!existsSync(registryFile)&&!tasks.some(task=>task.labels?.some(label=>['product-diagnosis','product-acceptance'].includes(label))))return errors;
 try{registry=JSON.parse(readFileSync(registryFile,'utf8'));}catch(error){return ['产品诊断合同缺失/损坏: '+error.message];}
 for(const task of tasks.filter(t=>t.labels?.some(label=>['product-diagnosis','product-acceptance'].includes(label))||Object.hasOwn(registry,t.id))){
  const contract=registry[task.id];
  if(!contract||contract.scope!=='diagnosis'||!task.labels?.includes('product-diagnosis')||task.labels?.includes('product-acceptance')){errors.push(`${task.id}: 诊断与产品验收类型不匹配，DIAGNOSED不得认证产品Done`);continue;}
  const paths=(task.documentation??[]).filter(path=>/^docs\/evidence\/product-outcomes\/TASK-[\d.]+\.json$/.test(path));
  if(paths.length!==1){errors.push(`${task.id}: 缺少唯一产品诊断证据；保持 UNVERIFIED`);continue;}
  const result=verifyOutcome(paths[0],{root});
  if(result.taskId!==task.id||result.ownerPr!==contract.ownerPr||result.scope!==contract.scope||result.status==='INVALID'||task.status==='Done'&&(result.status!=='DIAGNOSED'||!result.replay||!result.reproduction||result.direction.action!=='CONTINUE_MEASUREMENT'||!layers.every(layer=>result.gaps?.some(g=>g.layer===layer))))errors.push(`${task.id}: 产品诊断 ${result.status}: ${result.errors.join('; ')}；Done须含真实回放、症状复现、纠偏处置和全部未验层归口`);
 }
 return errors;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const result=verifyOutcome(process.argv[2]??'docs/evidence/product-outcomes/TASK-104.json');
 console.log(JSON.stringify(result,null,2));
 if(result.status!=='DIAGNOSED'||process.argv.includes('--require-offline-pass')&&result.replay?.offlineStatus!=='PASS')process.exitCode=1;
}
