import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {evaluateReplay,diagnoseComparison,experimentDirection,verifyOutcome,auditOutcomeTasks} from '../../scripts/product-outcome.mjs';
import {supportedSdkSha256,inspectPage} from '../../scripts/replay-ui-outcome.mjs';
import {outcomeConditions} from '../../scripts/ui-outcome-identity.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
test('the producer ignores only build provenance while real Lua, native resources and mount changes prevent pairing',()=>{
 const marker=id=>`print("ABYSS_BUILD ${id}")\n`;
 const save={serverLogic:{rules:[]},assets:{server:{meta:{sourceFile:'/old/a.gil',sourceFormat:'actual'},root:{name:'stage',imageId:1}},client:{meta:{sourceFile:'/old/a.gil'},root:{children:[]}},scripts:[{path:'abyss_ui.lua',source:marker('11111111-1111-1111-1111-111111111111')+'return 1'},{path:'abyss_combat.lua',source:'return 2'},{path:'abyss_component_bridge.lua',source:'return 3'}]}};
 const params=[{controlId:1,values:{nativeComponentControls:true}}],baseline=outcomeConditions(save,params),rebuilt=structuredClone(save);
 rebuilt.assets.server.meta.sourceFile='/new/b.gil';rebuilt.assets.client.meta.sourceFile='/new/b.gil';rebuilt.assets.scripts[0].source=marker('22222222-2222-2222-2222-222222222222')+'return 1';
 assert.deepEqual(outcomeConditions(rebuilt,params),baseline,'a new directory/buildId is still a real same-content control');
 for(const mutate of [s=>s.assets.scripts[0].source+='\nreturn 4',s=>s.assets.scripts[1].source='return 0',s=>s.assets.server.root.imageId=2,s=>s.assets.server.meta.sourceFormat='other',s=>s.serverLogic.rules.push('less-work')]){
  const changed=structuredClone(rebuilt);mutate(changed);assert.notEqual(outcomeConditions(changed,params).loadSha256,baseline.loadSha256);
 }
 assert.notEqual(outcomeConditions(rebuilt,[]).loadSha256,baseline.loadSha256);
 rebuilt.assets.scripts[2].source='return 4';const bridge=outcomeConditions(rebuilt,params);assert.equal(bridge.loadSha256,baseline.loadSha256);assert.equal(bridge.visualSha256,baseline.visualSha256);assert.notEqual(bridge.interventionSha256,baseline.interventionSha256);
});
test('the replay oracle checks expected component hosts, full children and inherited visibility rather than script ready',()=>{
 const node=(name,children=[],extra={})=>({name,kind:'container',children,...extra});
 const template=node('art',[node('leaf')]),host=()=>node('__kitOriginal',[{...structuredClone(template),prefabIndex:1}]);
 const stage=node('stage',[node('menuPanel',[host(),node('start',[node('label',[],{text:'开始'}),node('hit'),host()])]),node('characterPanel',[],{visible:false})]);
 const staticRoots=[structuredClone(stage)],session={runtime:{roots:[stage],logs:[{text:'ABYSS_UI ready'}]}},options={componentMode:true,templates:new Map([[1,template]]),staticRoots};
 assert.equal(inspectPage(session,'menu',options).complete,true);
 const original=stage.children[0].children[0];stage.children[0].children.shift();
 assert.equal(inspectPage(session,'menu',options).complete,false,'whole-host deletion cannot hide missing art');
 stage.children[0].children.unshift(original);original.visible=false;
 assert.equal(inspectPage(session,'menu',options).complete,false,'hidden required host cannot certify page complete');
 original.visible=true;original.children[0].children=[];
 assert.equal(inspectPage(session,'menu',options).complete,false,'partial subtree cannot certify page complete');
 session.runtime.logs.push({text:'ABYSS_PORTRAIT menuScene phase=ready owned=0 reason=nil'});
 assert.equal(inspectPage(session,'menu',{...options,componentMode:false}).complete,false,'legacy ready log cannot replace an actual asset tree');
 const image=node('image',[],{kind:'image',prefabIndex:1,imageId:100001,anchoredPositionX:0,anchoredPositionY:0,sizeDeltaX:10,sizeDeltaY:10});
 const group=node('group',[image],{prefabIndex:2}),scene=node('lowpolyScene',[node('page',[group],{prefabIndex:2})]);
 const legacyOracle={supported:true,imagePrefabId:1,containerPrefabId:2,roles:{menuScene:{path:'stage/menuPanel/lowpolyScene',images:1,pages:1,groups:1,inheritedVisible:true,data:{rows:[[100001,0,0,10,10,...Array(13).fill(0)]]}}}};
 const legacy={...options,componentMode:false,legacyOracle};
 assert.equal(inspectPage(session,'menu',legacy).complete,false,'even a supported oracle rejects an absent actual art host');
 stage.children[0].children.push(scene);assert.equal(inspectPage(session,'menu',legacy).complete,true,'actual complete legacy tree passes independent of owned log value');
 image.imageId=99;assert.equal(inspectPage(session,'menu',legacy).complete,false,'wrong runtime art is rejected');image.imageId=100001;
 group.children=[];assert.equal(inspectPage(session,'menu',legacy).complete,false,'ready log cannot hide missing primitive rows');
});
function replay(){
 const events=[{phase:'initialize',cycle:0,wallMs:10,created:100,destroyed:0,countBefore:0,countAfter:100}];
 const pages=[{name:'menu',cycle:0,scriptReady:true,structureReady:true,complete:true,frames:0,elapsedMs:0,requiredChecks:{controls:true,templates:true,text:true},firstEventIndex:0,lastEventIndex:0}],inputs=[],roundTrips=[];
 for(let cycle=1;cycle<=20;cycle++){
  for(const [name,action,panel,id] of [['character','open-character','characterPanel',1],['menu','close-character','menuPanel',2]]){
   const eventIndex=events.length;
   events.push({phase:action,cycle,wallMs:1,created:0,destroyed:0,countBefore:100,countAfter:100});
   pages.push({name,cycle,scriptReady:true,structureReady:true,complete:true,frames:0,elapsedMs:0,requiredChecks:{controls:true,templates:true,text:true},firstEventIndex:eventIndex,lastEventIndex:eventIndex});
   inputs.push({cycle,action,hit:id,expectedHit:id,observedPanel:panel,expectedPanel:panel,passed:true,eventIndex});
  }
  roundTrips.push({cycle,countBefore:100,countAfter:100,firstEventIndex:cycle*2-1,lastEventIndex:cycle*2});
 }
 for(const page of pages){page.oracleVerified=true;page.checkDetails=['controls','templates','text'].map(category=>({category,id:category,passed:true}));page.initialReadiness={scriptReady:true,structureReady:true,complete:true,requiredChecks:{...page.requiredChecks}};}
 return {schemaVersion:1,kind:'sdk-ui-outcome',identity:{...Object.fromEntries(['gilSha256','saveSha256','receiptSha256','luaInventorySha256','mountedValuesSha256'].map(k=>[k,'a'.repeat(64)])),sdkSha256:supportedSdkSha256,runnerSha256:hash(readFileSync('scripts/replay-ui-outcome.mjs')),conditionsProducerSha256:hash(readFileSync('scripts/ui-outcome-identity.mjs'))},environment:{platform:'test',arch:'x64',node:'test',cpu:'test'},conditions:{visualSha256:'b'.repeat(64),loadSha256:'c'.repeat(64),interventionSha256:'d'.repeat(64)},inputsUnchanged:true,scenario:{id:'menu-character-roundtrip-v1',roundTrips:20,dt:1/60,frameLimit:180},events,pages,inputs,roundTrips,faults:[],mountErrors:[],logs:[{text:'ABYSS_UI ready'}]};
}
test('normal model passes its bounded offline gate, while all device and V25 layers stay UNVERIFIED',()=>{
 const r=evaluateReplay(replay());assert.equal(r.offlineStatus,'PASS');assert.equal(r.productStatus,'UNVERIFIED');assert.deepEqual(r.errors,[]);
 assert.equal(r.roundTrips,20);assert.equal(r.maxStepMs,1);
});
test('missing data, false script-ready, wrong input and resource growth cannot certify a model',()=>{
 assert.equal(evaluateReplay(null).offlineStatus,'UNVERIFIED');
 for(const mutate of [r=>{r.pages[1].structureReady=false;r.pages[1].complete=false;r.pages[1].requiredChecks.templates=false;},r=>r.inputs[0].hit=999,r=>r.roundTrips[19].countAfter++,r=>r.events[1].wallMs=101,r=>r.faults.push('lua-error')]){
  const r=replay();mutate(r);assert.notEqual(evaluateReplay(r).offlineStatus,'PASS');
 }
});
test('forged summaries, missing page coverage, NaN, truncated events and inconsistent balances fail closed',()=>{
 for(const mutate of [r=>r.pages.pop(),r=>r.inputs.pop(),r=>r.roundTrips.pop(),r=>r.events[0].created=0,r=>r.events[0].wallMs=NaN,r=>r.identity.gilSha256='wrong',r=>r.pages[1].requiredChecks={},r=>r.pages[1].complete=true&&delete r.pages[1].structureReady]){
  const r=replay();mutate(r);r.offlineStatus='PASS';r.productStatus='PASS';assert.notEqual(evaluateReplay(r).offlineStatus,'PASS');
 }
});
test('two comparable experiments without symptom improvement require a different hypothesis; confounding is not improvement',()=>{
 const attempt=(n)=>({id:'e'+n,hypothesis:'eager',metric:'maxStepMs',before:10,after:10,controlled:true,baselineSha256:String(n).repeat(64),candidateSha256:String(n+1).repeat(64)});
 assert.equal(experimentDirection([attempt(1),attempt(2)]).action,'REVISIT_HYPOTHESIS');
 assert.equal(experimentDirection([{...attempt(1),controlled:false}]).action,'REVIEW_EXPERIMENT');
 assert.throws(()=>experimentDirection([attempt(1),attempt(1)]),/duplicate/i);
 assert.throws(()=>experimentDirection([{...attempt(1),controlled:false},attempt(1)]),/duplicate/i);
});
test('unbound phase coverage, replay exceptions and relaxed budgets never produce offline PASS',()=>{
 const fake=replay();for(const event of fake.events.slice(1))event.phase='unrelated-no-input';assert.equal(evaluateReplay(fake).offlineStatus,'INVALID');
 for(const budget of [{maxStepMs:Infinity},{maxStepMs:100000},{maxStepMs:NaN},{maxWarmControlGrowth:1}])assert.equal(evaluateReplay(replay(),budget).offlineStatus,'INVALID');
 const error=replay();error.error='SDK failed';assert.equal(evaluateReplay(error).offlineStatus,'INVALID');
 const detached=replay();detached.inputs[0].eventIndex=2;assert.equal(evaluateReplay(detached).offlineStatus,'INVALID');
 const initial=replay();initial.pages[1].initialReadiness.requiredChecks={};assert.equal(evaluateReplay(initial).offlineStatus,'INVALID');
});
test('the frozen PR565 actual SDK records derive partial improvement, startup regression and confounded comparison',()=>{
 for(const [variant,expected]of [['old','8abae690e1a51f731c9f515093848b16fb500b22a300ee4d0803a5ef942f90ee'],['new','aea2181c938563abecd45082dbfa504703e0c7c06810b89e1ba1a015f1d5f28a']])assert.equal(hash(gunzipSync(readFileSync(`docs/evidence/product-outcomes/pr565-${variant}-sdk.json.gz`))),expected,'original six-instance records must not be rewritten');
 const result=verifyOutcome('docs/evidence/product-outcomes/TASK-104.json');
 assert.equal(result.status,'DIAGNOSED');assert.equal(result.productStatus,'UNVERIFIED');
 assert.equal(result.comparison.interpretation,'PARTIAL_IMPROVEMENT');
 assert.equal(result.comparison.controlled,false);
 assert.ok(result.comparison.new.startupMs>result.comparison.old.startupMs);
 assert.ok(result.comparison.new.menuStepMs>result.comparison.old.menuStepMs);
 assert.equal(result.comparison.new.dynamicCreates,0);assert.ok(result.comparison.old.dynamicCreates>0);
 assert.ok(result.comparison.old.scriptReadyBeforePageReady);
 assert.equal(result.replay.roundTrips,20);assert.equal(result.replay.offlineStatus,'FAIL');
 assert.equal(result.replay.warmControlGrowth,0);assert.equal(result.sameVisualComparison,false);
 assert.ok(result.reproduction.blockers.some(reason=>reason.includes('visible before complete')));
});
test('experiment decisions derive from bound measurements and visual/load identity, ignoring inline success assertions',()=>{
 const dir=mkdtempSync(join(tmpdir(),'outcome-experiments-'));
 try{
  const capture=(name,change=()=>{})=>{const r=replay();r.captureId=name;change(r);const raw=JSON.stringify(r);writeFileSync(join(dir,name+'.json'),raw);return {path:name+'.json',sha256:hash(raw)};};
  const a=capture('a'),b=capture('b'),c=capture('c');
  const m={schemaVersion:1,taskId:'TASK-1',ownerPr:565,scope:'diagnosis',claim:'diagnosed',symptom:'stall',facts:['source'],hypotheses:[{id:'h',prediction:'less blocking',falsifier:'unchanged'}],approvedVisual:{revision:'7e40d2d361fff6b9c89d9f409db29a9d8ac44352'},replay:c,expectedCandidateSha256:'a'.repeat(64),gaps:[{layer:'pcPerformance',owner:'TASK-103'}],experiments:[{id:'1',hypothesis:'h',metric:'maxStepMs',baseline:a,candidate:b,controlled:true,before:100,after:0},{id:'2',hypothesis:'h',metric:'maxStepMs',baseline:b,candidate:c,controlled:true,before:100,after:0}]};
  const run=()=>{writeFileSync(join(dir,'m.json'),JSON.stringify(m));return verifyOutcome('m.json',{root:dir});};
  assert.equal(run().direction.action,'REVISIT_HYPOTHESIS','inline fake improvement has no effect');
  const cli=spawnSync(process.execPath,[join(process.cwd(),'scripts/product-outcome.mjs'),'m.json'],{cwd:dir,encoding:'utf8'});
  assert.equal(cli.status,1);assert.match(cli.stdout,/REVISIT_HYPOTHESIS/,'CLI actively stops ineffective experiments');
  m.experiments[1].candidate=capture('confounded',r=>r.conditions.visualSha256='d'.repeat(64));
  assert.equal(run().direction.action,'REVIEW_EXPERIMENT','inline controlled=true has no effect');
  m.experiments[1].candidate=capture('changed-params',r=>r.identity.mountedValuesSha256='d'.repeat(64));
  assert.equal(run().direction.action,'REVIEW_EXPERIMENT','mount parameters cannot silently change experimental load');
  m.experiments[1].candidate=capture('wrong-observer',r=>r.identity.runnerSha256='d'.repeat(64));
  assert.equal(run().status,'INVALID','different observer contracts cannot certify an experiment');
  m.experiments[1]={...m.experiments[0],id:'another'};assert.equal(run().status,'INVALID','reusing a capture pair is not another experiment');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('bound artifacts reject tampering, stale candidate identity, escaping paths and false resolved claims',()=>{
 const dir=mkdtempSync(join(tmpdir(),'outcome-'));
 try{
  const raw=JSON.stringify(replay());writeFileSync(join(dir,'replay.json'),raw);
  const manifest={schemaVersion:1,taskId:'TASK-1',ownerPr:565,scope:'diagnosis',claim:'diagnosed',symptom:'progressive-loading',facts:['source:1'],hypotheses:[{id:'eager',prediction:'less startup work',falsifier:'startup unchanged'}],approvedVisual:{revision:'7e40d2d361fff6b9c89d9f409db29a9d8ac44352'},replay:{path:'replay.json',sha256:hash(raw)},expectedCandidateSha256:'a'.repeat(64),gaps:[{layer:'officialImport',owner:'TASK-103'}],experiments:[]};
  const run=()=>{writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest));return verifyOutcome('manifest.json',{root:dir});};
  assert.equal(run().status,'DIAGNOSED');
  const positive=spawnSync(process.execPath,[join(process.cwd(),'scripts/product-outcome.mjs'),'manifest.json','--require-offline-pass'],{cwd:dir,encoding:'utf8'});
  assert.equal(positive.status,0,positive.stdout+positive.stderr);
  manifest.claim='resolved';assert.equal(run().status,'INVALID');manifest.claim='diagnosed';
  manifest.expectedCandidateSha256='b'.repeat(64);assert.equal(run().status,'INVALID');manifest.expectedCandidateSha256='a'.repeat(64);
  manifest.replay.path='../outside.json';assert.equal(run().status,'INVALID');manifest.replay.path='replay.json';
  writeFileSync(join(dir,'replay.json'),raw+' ');assert.equal(run().status,'INVALID');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('Backlog Done needs a real diagnostic outcome; local performance PASS cannot close product acceptance',()=>{
 const base={id:'TASK-104',labels:['product-diagnosis'],documentation:['docs/evidence/product-outcomes/TASK-104.json'],status:'Done'};
 assert.deepEqual(auditOutcomeTasks([base]),[]);
 assert.ok(auditOutcomeTasks([{...base,documentation:[]}]).length);
 assert.ok(auditOutcomeTasks([{...base,id:'TASK-103'}]).length);
 assert.ok(auditOutcomeTasks([{...base,labels:['product-acceptance'],status:'Done'}]).length);
});
test('CLI prints UNVERIFIED and exits nonzero for absent evidence',()=>{
 const result=spawnSync(process.execPath,['scripts/product-outcome.mjs','missing-outcome.json'],{encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stdout,/UNVERIFIED/);
});
