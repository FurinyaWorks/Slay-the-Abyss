import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sevenRefactorEpoch as epoch} from './helpers/seven-refactor-source-epoch.mjs';
import {componentUiSourceEpoch as componentEpoch} from './helpers/component-ui-source-epoch.mjs';
import {sourceEpoch as currentEpoch,preComponentUiEpoch} from './helpers/combined-epoch/source-epoch.mjs';
import {preOfficialBattleSource,officialBattleSourceProof,officialBattleAlignmentSourceProof as alignment,officialBannerSourceProof as banner} from './helpers/official-battle-source-inverse.mjs';
const proof=epoch.proof,read=p=>proof.current[p]?.source??null;
// Authenticate both the input and every linked owner in the same exact historical view.
const componentRead=path=>preOfficialBattleSource(path,readFileSync(path,'utf8'));
test('seven-refactor exact outer epoch restores every complete predecessor owner',()=>{
 assert.equal(proof.owners.length,11);
 for(const path of proof.owners){
  const source=currentEpoch.preCombinedSource(path,componentRead(path),{target:'watcherFlowPrior',readSource:componentRead}).replaceAll('\r\n','\n');
  assert.equal(source,read(path));
  for(const variant of [source,source.replaceAll('\n','\r\n')])
   assert.equal(epoch.preCombinedSource(path,variant,{target:'prior',readSource:read}),proof.targets.prior.files[path].source);
 }
});

test('component UI outer epoch authenticates its exact committed slice and original predecessor',()=>{
 const current=componentEpoch.proof;
 assert.equal(current.currentCommit,'a0c2dc558b2a37f26678dc104bb98df194b0f2d8');
 assert.equal(current.currentTreeCommitted,true);
 assert.equal(current.owners.length,22);
 const readCurrent=path=>current.current[path]?.source??null;
 for(const path of current.owners){
  assert.equal(componentRead(path).replaceAll('\r\n','\n'),readCurrent(path),path);
  const before=current.targets.componentPrior.files[path];
  const projected=componentEpoch.preCombinedSource(path,readCurrent(path),{target:'componentPrior',readSource:readCurrent});
  // Added UI witnesses are retained; retirement is a separate checked action.
  assert.equal(projected,before?.source??readCurrent(path),path);
 }
 for(const path of Object.keys(preComponentUiEpoch.proof.current))
  assert.deepEqual(current.targets.componentPrior.files[path],preComponentUiEpoch.proof.current[path],path);
 for(const path of proof.owners)
  assert.deepEqual(preComponentUiEpoch.proof.targets.watcherFlowPrior.files[path],proof.current[path],path);
});

test('official battle historical view binds complete committed sources and rejects partial or foreign inputs',()=>{
 assert.equal(officialBattleSourceProof.beforeCommit,componentEpoch.proof.currentCommit);
 assert.equal(officialBattleSourceProof.afterCommit,'5b3e9f11a25211173a3710d570ca8e4c22664d25');
 assert.equal(Object.keys(officialBattleSourceProof.files).length,4);
 assert.equal(banner.beforeCommit,'20a23f0095ed3f82020f0ccfb13bca3de617ac73');
 for(const [path,binding]of Object.entries(banner.files)){
  assert.equal(binding.beforeSource,alignment.files[path].afterSource,path);
  assert.equal(preOfficialBattleSource(path,binding.beforeSource),componentEpoch.proof.current[path].source,path);
 }
 assert.equal(alignment.beforeCommit,officialBattleSourceProof.afterCommit);
 assert.equal(alignment.afterCommit,'94327916e236797ba933096d8490fe04d93a6838');
 for(const [path,binding]of Object.entries(alignment.files)){
  const predecessor=officialBattleSourceProof.files[path]?.afterSource??componentEpoch.proof.current[path].source;
  assert.equal(binding.beforeSource,predecessor,path);
  const actual=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  assert.equal(actual,banner.files[path]?.afterSource??binding.afterSource,path);
  for(const source of [actual,actual.replaceAll('\n','\r\n')])
   assert.equal(preOfficialBattleSource(path,source),componentEpoch.proof.current[path].source,path);
  for(const source of [actual+'\n',actual.slice(1),null,undefined,{},17])
   assert.equal(preOfficialBattleSource(path,source),source,path);
 }
 for(const [path,binding]of Object.entries(officialBattleSourceProof.files)){
  assert.equal(binding.beforeSource,componentEpoch.proof.current[path].source,path);
  assert.equal(alignment.files[path].beforeSource,binding.afterSource,path);
  const actual=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  assert.equal(actual,banner.files[path]?.afterSource??alignment.files[path].afterSource,path);
  assert.equal(preOfficialBattleSource(path,binding.afterSource),binding.beforeSource,path);
  for(const source of [actual,actual.replaceAll('\n','\r\n')])
   assert.equal(preOfficialBattleSource(path,source),binding.beforeSource,path);
  for(const source of [actual+'\n',actual.slice(1),binding.beforeSource,null,undefined,{},17])
   assert.equal(preOfficialBattleSource(path,source),source,path);
  for(const unknown of ['foreign','__proto__','constructor'])
   assert.equal(preOfficialBattleSource(unknown,actual),actual);
 }
});

test('official battle projected live closure rejects every late owner drift and deletion',()=>{
 const path='config/architecture.json',source=componentRead(path);
 for(const owner of currentEpoch.proof.owners){
  let bad=false;
  const reader=key=>{
   const raw=readFileSync(key,'utf8');
   return preOfficialBattleSource(key,bad&&key===owner?raw+'\n':raw);
  };
  currentEpoch.preCombinedSource(path,source,{target:'watcherFlowPrior',readSource:reader});
  bad=true;
  assert.throws(()=>currentEpoch.preCombinedSource(path,source,{target:'watcherFlowPrior',readSource:reader}),/linked owner identity/,owner);
  assert.throws(()=>currentEpoch.preCombinedSource(path,source,{target:'watcherFlowPrior',readSource:key=>key===owner?null:componentRead(key)}),/linked owner identity/,owner);
 }
});

test('component config accepts only input layout while freshly authenticating raw linked owners',()=>{
 const current=componentEpoch.proof,path='config/architecture.json';
 const raw=current.current[path].source,compact=JSON.stringify(JSON.parse(raw));
 const readCurrent=owner=>current.current[owner]?.source??null;
 assert.equal(componentEpoch.preCombinedSource(path,compact,{target:'componentPrior',readSource:readCurrent}),current.targets.componentPrior.files[path].source);
 assert.throws(()=>componentEpoch.preCombinedSource(path,compact,{target:'componentPrior',readSource:owner=>owner===path?compact:readCurrent(owner)}),/linked owner identity/);
 const foreign=compact.replace('"abyss_component_pages":"ui"','"abyss_component_pages":"platform"');
 assert.notEqual(foreign,compact);
 let reads=0;
 assert.equal(componentEpoch.preCombinedSource(path,foreign,{target:'componentPrior',readSource(){reads++;throw Error('unexpected read');}}),foreign);
 assert.equal(reads,0);
});

test('component UI authorization rejects every late owner drift and deletion after warming',()=>{
 const current=componentEpoch.proof,path='config/architecture.json';
 const readCurrent=owner=>current.current[owner]?.source??null;
 for(const owner of current.owners){
  let corrupt=false;
  const reader=key=>corrupt&&key===owner?readCurrent(key)+'\n':readCurrent(key);
  componentEpoch.preCombinedSource(path,readCurrent(path),{target:'componentPrior',readSource:reader});
  corrupt=true;
  assert.throws(()=>componentEpoch.preCombinedSource(path,readCurrent(path),{target:'componentPrior',readSource:reader}),/linked owner identity/,owner);
  assert.throws(()=>componentEpoch.preCombinedSource(path,readCurrent(path),{target:'componentPrior',readSource:key=>key===owner?null:readCurrent(key)}),/linked owner identity/,owner);
 }
});

test('component UI foreign and predecessor inputs stay opaque without linked reads',()=>{
 const current=componentEpoch.proof;
 for(const path of current.owners){
  const before=current.targets.componentPrior.files[path];
  const foreign=path==='config/architecture.json'
   ?JSON.stringify({...JSON.parse(current.current[path].source),componentForeign:true})
   :current.current[path].source+'\n';
  for(const source of [foreign,...(before?[before.source]:[])]){
   let reads=0;
   assert.equal(componentEpoch.preCombinedSource(path,source,{target:'componentPrior',readSource(){reads++;throw Error('unexpected read');}}),source);
   assert.equal(reads,0,path);
  }
 }
});
test('seven-refactor projection freshly rejects drift and missing owners after warming',()=>{
 const path='config/architecture.json';
 for(const owner of proof.owners){
  let bad=false;const reader=p=>bad&&p===owner?read(p)+'\n':read(p);
  epoch.preCombinedSource(path,read(path),{target:'prior',readSource:reader});bad=true;
  assert.throws(()=>epoch.preCombinedSource(path,read(path),{target:'prior',readSource:reader}),/linked owner identity/);
  assert.throws(()=>epoch.preCombinedSource(path,read(path),{target:'prior',readSource:p=>p===owner?null:read(p)}),/linked owner identity/);
 }
});
test('foreign and predecessor inputs remain opaque without linked reads',()=>{
 for(const path of proof.owners)for(const source of [read(path)+'\n',proof.targets.prior.files[path].source]){
  let calls=0;assert.equal(epoch.preCombinedSource(path,source,{target:'prior',readSource(){calls++;throw Error('unexpected');}}),source);assert.equal(calls,0);
 }
});
test('every advertised composed target preserves foreign bytes without linked reads',async()=>{
 const {sourceEpoch}=await import('./helpers/combined-epoch/pre-defect-source-epoch.mjs');
 for(const target of Object.keys(sourceEpoch.proof.targets)){
  const source=read('config/architecture.json')+'\n-- foreign';let calls=0;
  assert.equal(sourceEpoch.preCombinedSource('config/architecture.json',source,{target,readSource(){calls++;throw Error('unexpected');}}),source);
  assert.equal(calls,0,target);
 }
});

test('facades preserve original invalid-reader semantics while public reader factories remain strict',async()=>{
 const cases=[['actor-presence','preActorPresenceSource'],['potion-callback','prePotionCallbackSource'],['reward-query-boundary','preRewardQueryBoundarySource'],['m7-core-final','preM7FinalSource'],['core-lifecycle','preCoreLifecycleSource'],['game-ui-extraction','preGameUiExtractionSource'],['power-shop','prePowerShopSource'],['session-reward','preSessionRewardSource'],['watcher-final-execution','preWatcherExecutionSource'],['inventory-responsibilities','preInventoryResponsibilitiesSource'],['act1-choice','preAct1ChoiceSource'],['defect-plan','preDefectPlanSource'],['colorless-catalog','preColorlessCatalogSource'],['end-turn-responsibilities','preEndTurnResponsibilitiesSource']];
 const targets={'actor-presence':'actor','potion-callback':'potion','reward-query-boundary':'reward','power-shop':'powerShop','session-reward':'sessionReward','watcher-final-execution':'watcher','inventory-responsibilities':'inventory','act1-choice':'act1','defect-plan':'defect','colorless-catalog':'colorless','end-turn-responsibilities':'endTurn'};
 for(const [file,name]of cases){
  const original=(await import(`./helpers/epochs/${targets[file]??'develop'}/tests/helpers/${file}-source-inverse.mjs`))[name];
  const project=(await import(`./helpers/${file}-source-inverse.mjs`))[name];
  for(const source of ['unrecognized bytes',null,{},17])for(const readSource of [null,false,0,{}]){
   let failure;try{assert.equal(original('config/architecture.json',source,{readSource}),source);}catch(error){failure=error;}
   if(failure)assert.throws(()=>project('config/architecture.json',source,{readSource}),error=>error.name===failure.name&&error.message===failure.message,file);
   else assert.equal(project('config/architecture.json',source,{readSource}),source,file);
  }
 }
 const {sourceEpoch}=await import('./helpers/combined-epoch/pre-defect-source-epoch.mjs');
 assert.throws(()=>sourceEpoch.combinedReader(null,'actor'),/reader/);
});

test('configuration layout admission preserves exact tokens and freshly authenticates all 45 raw owners',async()=>{
 const {preEffectsTargetGroupEpoch:sourceEpoch}=await import('./helpers/combined-epoch/pre-defect-source-epoch.mjs');
 const proof=sourceEpoch.proof,path='config/architecture.json',source=proof.current[path].source;
 const raw=p=>proof.current[p]?.source??null,expected=proof.targets.actor.files[path].source;
 assert.equal(proof.owners.length,45);
 const layouts=[JSON.stringify(JSON.parse(source)),JSON.stringify(JSON.parse(source),null,'\t'),source+'\n\t '];
 for(const input of layouts){
  let calls=0;assert.equal(sourceEpoch.preCombinedSource(path,input,{target:'actor',readSource:p=>{calls++;return raw(p);}}),expected);
  assert.equal(calls,45);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,input,{target:'actor',readSource:null}),/reader/);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,input,{target:'actor',readSource:p=>p===path?input:raw(p)}),/linked owner identity/);
 }
 for(const owner of proof.owners){
  let drift=false;const reader=p=>drift&&p===owner?raw(p)+'\n':raw(p);
  sourceEpoch.preCombinedSource(path,layouts[0],{target:'actor',readSource:reader});drift=true;
  assert.throws(()=>sourceEpoch.preCombinedSource(path,layouts[0],{target:'actor',readSource:reader}),/linked owner identity/);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,layouts[0],{target:'actor',readSource:p=>p===owner?null:raw(p)}),/linked owner identity/);
 }
 const variants=[source.replace('"layers"','"layers": {}, "layers"'),source.replace('"layers"','"laye\\u0072s"'),JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(source)).reverse())),'\ufeff'+source,source+'-- invalid',source+'\u00a0'];
 for(const input of variants){let calls=0;assert.equal(sourceEpoch.preCombinedSource(path,input,{target:'actor',readSource(){calls++;throw Error('unexpected');}}),input);assert.equal(calls,0);}
});

test('configuration layout never repairs invalid number or keyword tokens',async()=>{
 const {createSourceEpochProjector}=await import('./helpers/combined-epoch/source-epoch-runtime.mjs');
 const path='config/architecture.json',source='{"count":12,"enabled":true,"offset":-2,"rate":1e2,"empty":null}\n';
 const bind=source=>({source,sha256:createHash('sha256').update(source).digest('hex')});
 const proof={schemaVersion:1,normalization:'LF',currentCommit:'a'.repeat(40),owners:[path],current:{[path]:bind(source)},
  targets:{prior:{commit:'b'.repeat(40),files:{[path]:bind('{}\n')}}}};
 const project=createSourceEpochProjector(proof,{allowConfigLayout:true});
 const layout=source.replaceAll(',',',\n\t').replaceAll(':',': ');
 let reads=0;const raw=()=>{reads++;return source;};
 assert.equal(project.preCombinedSource(path,layout,{target:'prior',readSource:raw}),'{}\n');assert.equal(reads,1);
 assert.throws(()=>project.preCombinedSource(path,layout,{target:'prior',readSource:()=>layout}),/linked owner identity/);
 for(const [before,after]of [['12','1 2'],['true','tr ue'],['-2','- 2'],['1e2','1e 2'],['null','nu ll']]){
  const malformed=source.replace(before,after);assert.throws(()=>JSON.parse(malformed),SyntaxError);
  reads=0;
  for(const readSource of [raw,null])assert.equal(project.preCombinedSource(path,malformed,{target:'prior',readSource}),malformed);
  assert.equal(reads,0,'invalid JSON cannot authorize linked reads: '+after);
 }
 const strict=createSourceEpochProjector(proof);reads=0;
 assert.equal(strict.preCombinedSource(path,layout,{target:'prior',readSource:raw}),layout);assert.equal(reads,0);
});

test('pure source calculations reuse exact strings but every projection freshly reads its owners',async()=>{
 const crypto=(await import('node:crypto')).default,{syncBuiltinESMExports}=await import('node:module');
 const {createSourceEpochProjector}=await import('./helpers/combined-epoch/source-epoch-runtime.mjs');
 const path='config/architecture.json',source='{"cacheFreshness":1}\n';
 const bind=source=>({source,sha256:createHash('sha256').update(source).digest('hex')});
 const proof={schemaVersion:1,normalization:'LF',currentCommit:'a'.repeat(40),owners:[path],current:{[path]:bind(source)},
  targets:{prior:{commit:'b'.repeat(40),files:{[path]:bind('{}\n')}}}};
 const project=createSourceEpochProjector(proof,{allowConfigLayout:true});
 const originalHash=crypto.createHash,originalParse=JSON.parse;let hashes=0,parses=0,reads=0,actual=source;
 try{
  crypto.createHash=(...args)=>{hashes++;return originalHash(...args);};syncBuiltinESMExports();
  JSON.parse=(...args)=>{parses++;return originalParse(...args);};
  const run=input=>project.preCombinedSource(path,input,{target:'prior',readSource:()=>{reads++;return actual;}});
  assert.equal(run(source),'{}\n');assert.equal(hashes,1);assert.equal(reads,1);
  assert.equal(run(source),'{}\n');assert.equal(hashes,1);assert.equal(reads,2);
  const layout='{ "cacheFreshness" : 1 }\n';
  assert.equal(run(layout),'{}\n');assert.equal(parses,1);assert.equal(reads,3);
  assert.equal(run(layout),'{}\n');assert.equal(parses,1);assert.equal(reads,4);
  actual=source.replace('1','2');assert.throws(()=>run(layout),/linked owner identity/);assert.equal(reads,5);
  actual=null;assert.throws(()=>run(layout),/linked owner identity/);assert.equal(reads,6);
  actual=source.replaceAll('\n','\r\n');assert.equal(run(layout),'{}\n');assert.equal(reads,7);
  assert.throws(()=>project.preCombinedSource(path,layout,{target:'prior',readSource:null}),/linked owner reader/);
  const foreign=layout.replace('1','2');assert.equal(run(foreign),foreign);assert.equal(reads,7);
  assert.equal(run(foreign),foreign);assert.equal(reads,7);assert.equal(parses,2);
 }finally{crypto.createHash=originalHash;JSON.parse=originalParse;syncBuiltinESMExports();}
});

test('pure hash memoization evicts by both entry count and retained complete string length',async()=>{
 const crypto=(await import('node:crypto')).default,{syncBuiltinESMExports}=await import('node:module');
 const {createSourceEpochProjector}=await import('./helpers/combined-epoch/source-epoch-runtime.mjs');
 const path='src/lua/cache_bound.lua',source='return "cache-bound-current"\n';
 const bind=source=>({source,sha256:createHash('sha256').update(source).digest('hex')});
 const project=createSourceEpochProjector({schemaVersion:1,normalization:'LF',currentCommit:'a'.repeat(40),owners:[path],current:{[path]:bind(source)},
  targets:{prior:{commit:'b'.repeat(40),files:{[path]:bind('return nil\n')}}}});
 const originalHash=crypto.createHash;let hashes=0,reads=0;
 const run=input=>project.preCombinedSource(path,input,{target:'prior',readSource:()=>{reads++;return source;}});
 try{
  crypto.createHash=(...args)=>{hashes++;return originalHash(...args);};syncBuiltinESMExports();
  const first='cache-entry-bound-0';run(first);run(first);assert.equal(hashes,1);
  for(let i=1;i<=256;i++)run('cache-entry-bound-'+i);
  assert.equal(hashes,257);run(first);assert.equal(hashes,258,'oldest complete input recomputed');
  const large='cache-character-bound-'+'.'.repeat(1024*1024);
  const before=hashes;run(large+'a');run(large+'b');run(large+'a');
  assert.equal(hashes-before,3,'entry limit alone cannot retain over two million code units');
  const oversized='cache-oversized-'+'.'.repeat(2*1024*1024);
  const previous=hashes;run(oversized);run(oversized);assert.equal(hashes-previous,2,'oversized input is not retained');
  assert.equal(reads,0,'foreign source computations never authorize linked reads');
 }finally{crypto.createHash=originalHash;syncBuiltinESMExports();}
});

function reusableProofFixture(){
 const bind=source=>({source,sha256:createHash('sha256').update(source).digest('hex')});
 return {schemaVersion:1,normalization:'LF',currentCommit:'a'.repeat(40),
  owners:['config/architecture.json','src/lua/reuse_probe.lua'],
  current:{'config/architecture.json':bind('{"reuse":"current"}\n'),'src/lua/reuse_probe.lua':bind('return 1\n')},
  targets:{prior:{commit:'b'.repeat(40),files:{'config/architecture.json':bind('{}\n'),'src/lua/reuse_probe.lua':bind('return 0\n')}}}};
}
function freezeProofData(value){
 if(value&&typeof value==='object'){for(const child of Object.values(value))freezeProofData(child);Object.freeze(value);}
 return value;
}

test('frozen input reuse preserves immutable bindings while default callers retain clone isolation',async()=>{
 const {createSourceEpochProjector}=await import('./helpers/combined-epoch/source-epoch-runtime.mjs');
 const path='config/architecture.json',input=reusableProofFixture(),source=input.current[path].source;
 const cloned=createSourceEpochProjector(input);
 input.current[path].source='unreviewed';input.targets.prior.files[path].source='unreviewed';input.owners.length=0;
 assert.equal(cloned.proof.current[path].source,source);assert.equal(cloned.proof.targets.prior.files[path].source,'{}\n');
 assert.equal(cloned.proof.owners.length,2);assert.equal(Object.isFrozen(input.current[path]),false);
 const frozen=freezeProofData(reusableProofFixture()),reused=createSourceEpochProjector(frozen,{reuseFrozenInput:true});
 assert.equal(reused.proof,frozen);assert(Object.isFrozen(reused.proof.current[path]));
 assert.throws(()=>{frozen.current[path].source='unreviewed';},TypeError);
 assert.throws(()=>{frozen.targets.prior.files[path].source='unreviewed';},TypeError);
 assert.equal(reused.preCombinedSource(path,source,{target:'prior',readSource:p=>frozen.current[p].source}),'{}\n');
});

test('frozen reuse rejects mutable/accessor/cyclic data and still validates complete source hashes',async()=>{
 const {createSourceEpochProjector}=await import('./helpers/combined-epoch/source-epoch-runtime.mjs');
 assert.throws(()=>createSourceEpochProjector(reusableProofFixture(),{reuseFrozenInput:true}),/must be frozen/);
 const broken=reusableProofFixture();broken.current['config/architecture.json'].sha256='0'.repeat(64);
 assert.throws(()=>createSourceEpochProjector(freezeProofData(broken),{reuseFrozenInput:true}),/source identity SHA256/);
 const plain=freezeProofData(reusableProofFixture());let getterCalls=0;
 const binding=Object.freeze({sha256:plain.current['config/architecture.json'].sha256,
  get source(){getterCalls++;return plain.current['config/architecture.json'].source;}});
 const accessor=Object.freeze({...plain,current:Object.freeze({...plain.current,'config/architecture.json':binding})});
 assert.throws(()=>createSourceEpochProjector(accessor,{reuseFrozenInput:true}),/data properties/);assert.equal(getterCalls,0);
 const symbolic=Object.freeze({...plain,get [Symbol('foreign')](){getterCalls++;return 'unreviewed';}});
 assert.throws(()=>createSourceEpochProjector(symbolic,{reuseFrozenInput:true}),/no symbol keys/);assert.equal(getterCalls,0);
 const hidden='src/lua/hidden.lua',hiddenCurrent='return "hidden-current"\n',unauthorized='UNVALIDATED HISTORICAL SOURCE\n';
 const bind=source=>Object.freeze({source,sha256:createHash('sha256').update(source).digest('hex')}),current={...plain.current},files={...plain.targets.prior.files};
 Object.defineProperty(current,hidden,{value:bind(hiddenCurrent),enumerable:false});
 Object.defineProperty(files,hidden,{value:Object.freeze({source:unauthorized,sha256:'0'.repeat(64)}),enumerable:false});
 const hiddenProof=Object.freeze({...plain,current:Object.freeze(current),targets:Object.freeze({prior:Object.freeze({...plain.targets.prior,files:Object.freeze(files)})})});
 let hiddenReads=0;const cloned=createSourceEpochProjector(hiddenProof);
 assert.equal(cloned.preCombinedSource(hidden,hiddenCurrent,{target:'prior',readSource(){hiddenReads++;throw Error('unexpected read');}}),hiddenCurrent);
 assert.equal(hiddenReads,0);assert.equal(Object.hasOwn(cloned.proof.current,hidden),false);
 assert.throws(()=>createSourceEpochProjector(hiddenProof,{reuseFrozenInput:true}),/enumerable JSON property/);
 const extra=[...plain.owners];extra.foreign='unreviewed';Object.freeze(extra);
 const sparse=Object.freeze(new Array(plain.owners.length));
 const hiddenIndex=[...plain.owners];Object.defineProperty(hiddenIndex,'0',{value:hiddenIndex[0],enumerable:false});Object.freeze(hiddenIndex);
 for(const owners of [extra,sparse,hiddenIndex])assert.throws(()=>createSourceEpochProjector(Object.freeze({...plain,owners}),{reuseFrozenInput:true}),/JSON array|JSON property/);
 const wrongKind=Object.freeze(Object.assign(Object.create(Array.prototype),plain));
 assert.throws(()=>createSourceEpochProjector(wrongKind,{reuseFrozenInput:true}),/plain data/);
 const cycle={};cycle.self=cycle;Object.freeze(cycle);
 assert.throws(()=>createSourceEpochProjector(cycle,{reuseFrozenInput:true}),/acyclic/);
});

test('reused flattened proofs freshly read each declared owner once and stop at the first invalid owner',async()=>{
 const {createSourceEpochProjector}=await import('./helpers/combined-epoch/source-epoch-runtime.mjs');
 const input=freezeProofData(reusableProofFixture()),projector=createSourceEpochProjector(input,{reuseFrozenInput:true});
 const path='config/architecture.json',source=input.current[path].source;let changed,replacement,reads=[];
 const reader=owner=>{reads.push(owner);if(owner===changed){if(replacement instanceof Error)throw replacement;return replacement;}return input.current[owner].source;};
 const project=value=>projector.preCombinedSource(path,value,{target:'prior',readSource:reader});
 assert.equal(project(source),'{}\n');assert.deepEqual(reads,input.owners);
 for(const owner of input.owners)for(replacement of [input.current[owner].source+'\n',null,new Error('missing reused owner')]){
  changed=owner;reads=[];assert.throws(()=>project(source),/combined linked owner/);
  assert.deepEqual(reads,input.owners.slice(0,input.owners.indexOf(owner)+1));
  changed=undefined;reads=[];assert.equal(project(source),'{}\n');assert.deepEqual(reads,input.owners);
 }
 for(const foreign of [source+'unreviewed',null,undefined,'{}\n']){
  reads=[];assert.equal(project(foreign),foreign);assert.deepEqual(reads,[]);
 }
});
