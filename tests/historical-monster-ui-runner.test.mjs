import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import fileSystem from 'node:fs';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {historicalMonsterUiFixtures,runHistoricalMonsterUi,historicalMonsterLuaArgs,recordHistoricalMonsterPhase,closeHistoricalMonsterRuntime} from './helpers/historical-monster-ui-runner.mjs';
import {verifiedHistoricalMonsterSources,historicalMonsterSourcePaths} from './helpers/historical-monster-ui-materialize.mjs';
import {loadHistoricalBaselineInputs} from './helpers/historical-baseline-inputs.mjs';
import {multiMonsterSourceLayer} from './helpers/multi-monster-art-source-inverse.mjs';
const helperPaths=['tests/lua/support/game_ui_fixture.lua','tests/lua/support/battle_gesture_fixture.lua'];
test('only fourteen exact frozen fixtures and the two-capture differential are historical',()=>{
 assert.deepEqual(historicalMonsterUiFixtures,[
  'tests/lua/battle_ui.lua',...Array.from({length:6},(_,i)=>`tests/lua/battle_ui_slice_${i+2}.lua`),
  'tests/lua/battle_ui_card_play.lua','tests/lua/battle_ui_card_play_slice_2.lua','tests/lua/battle_ui_card_play_slice_3.lua',
  'tests/lua/battle_ui_card_play_slice_4.lua',
  'tests/lua/battle_ui_card_play_slice_5.lua',
 'tests/lua/battle_ui_drag_click_compatibility.lua','tests/lua/battle_ui_drag_click_compatibility_slice_2.lua',
 ]);
 for(const path of ['tests/lua/game_ui.lua','tests/lua/support/battle_ui_cases.lua','tests/lua/battle_ui_slice_8.lua','tests/lua/battle_ui_card_play_slice_6.lua','../tests/lua/battle_ui.lua','/tests/lua/battle_ui.lua'])
  assert.throws(()=>runHistoricalMonsterUi(path),/only exact/);
 assert.throws(()=>runHistoricalMonsterUi(historicalMonsterUiFixtures[0],{caseName:'skip others'}),/complete frozen/);
});
test('all original historical inputs reject foreign edits independently of current implementation maintenance',()=>{
 const paths=[...historicalMonsterSourcePaths,...helperPaths];
 const original=loadHistoricalBaselineInputs();
 const current=new Map(paths.map(p=>{assert.ok(original[p],'registered original input: '+p);return [p,original[p].toString('utf8')];}));
 assert.equal(verifiedHistoricalMonsterSources('.',p=>current.get(p)).length,paths.length);
 for(const dirty of paths)assert.throws(()=>verifiedHistoricalMonsterSources('.',p=>current.get(p)+(p===dirty?'\n-- foreign source drift\n':'')),/unreviewed current/);
 for(const dirty of paths)assert.throws(()=>verifiedHistoricalMonsterSources('.',p=>p===dirty?'':current.get(p)),/unreviewed current/);
 const defaults=new Map(verifiedHistoricalMonsterSources('current-maintenance-is-not-a-historical-input'));
 for(const [path,binding]of Object.entries(multiMonsterSourceLayer.files))
  assert.equal(defaults.get(path),binding.beforeSource,'default replay uses the unchanged complete original oracle: '+path);
 assert.equal(verifiedHistoricalMonsterSources('.',p=>current.get(p).replaceAll('\r\n','\n').replaceAll('\n','\r\n')).length,paths.length);
});
test('historical child applies central defaults and keeps explicit deadlines, buffer, signals and full error output',()=>{
 const original=childProcess.spawnSync,calls=[];
 let result={status:0,signal:null,stdout:'ok',stderr:''};
 childProcess.spawnSync=(...args)=>{calls.push(args);return result;};syncBuiltinESMExports();
 try{
  for(const script of historicalMonsterUiFixtures){
   calls.length=0;assert.equal(runHistoricalMonsterUi(script),result);
   assert.equal(calls.length,1);assert.match(calls[0][1][0],/historical-monster-ui-entry\.mjs$/);
   assert.equal(calls[0][1][1],script);assert.equal(calls[0][2].timeout,120000);
   assert.equal(calls[0][2].maxBuffer,1024*1024);
  }
  calls.length=0;runHistoricalMonsterUi('battle-refactor-render');assert.equal(calls[0][2].timeout,120000);assert.equal(calls[0][2].maxBuffer,64*1024*1024);
  calls.length=0;runHistoricalMonsterUi(historicalMonsterUiFixtures[0],{timeout:321});assert.equal(calls[0][2].timeout,321);
  const error=new Error('original ETIMEDOUT');result={error,status:null,signal:'SIGTERM',stdout:'已执行组\n',stderr:'原始错误\n'};
  assert.throws(()=>runHistoricalMonsterUi(historicalMonsterUiFixtures[0]),e=>e.cause===error&&e.message.includes('已执行组')&&e.message.includes('原始错误'));
  result={status:null,signal:'SIGKILL',stdout:'',stderr:''};assert.throws(()=>runHistoricalMonsterUi(historicalMonsterUiFixtures[0]),/terminated by SIGKILL/);
  result={status:7,signal:null,stdout:'actual Lua failure',stderr:'stack'};assert.equal(runHistoricalMonsterUi(historicalMonsterUiFixtures[0]),result);
 }finally{childProcess.spawnSync=original;syncBuiltinESMExports();}
});

test('historical Fengari alone has an exact 1GiB old-space cap without changing its script',()=>{
 assert.deepEqual(historicalMonsterLuaArgs('/pinned/fengari.lua-cli.js','dofile(\"unchanged\")'),['--max-old-space-size=1024','/pinned/fengari.lua-cli.js','-e','dofile(\"unchanged\")']);
 const entry=readFileSync(new URL('./helpers/historical-monster-ui-entry.mjs',import.meta.url),'utf8');
 assert.match(entry,/spawnSync\(process\.execPath,historicalMonsterLuaArgs\(cli,/);
 assert.doesNotMatch(entry,/NODE_OPTIONS\s*[:=]/);
 assert.match(entry,/if\(result\.status===0\)phase\('lua-finished'\)/,'failed Lua output must be forwarded before further diagnostic writes');
});

test('a real child phase survives an injected silent timeout and removes both temporary files',()=>{
 const spawn=childProcess.spawnSync;let receipt;
 childProcess.spawnSync=(command,args,options)=>{
  receipt=args[3];
  const writer=new URL('./helpers/historical-monster-ui-runner.mjs',import.meta.url).href;
  const source=`import {recordHistoricalMonsterPhase} from ${JSON.stringify(writer)};
import {writeFileSync} from 'node:fs';
const file=process.argv[1];recordHistoricalMonsterPhase(file,${JSON.stringify(args[1])},'lua');
writeFileSync(file+'.next','partial next phase');`;
  const result=spawn(command,['--input-type=module','-e',source,receipt],options);
  assert.ifError(result.error);assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,'');
  return {...result,status:null,signal:'SIGTERM',error:Object.assign(new Error('injected silent timeout'),{code:'ETIMEDOUT'})};
 };syncBuiltinESMExports();
 try{
  assert.throws(()=>runHistoricalMonsterUi('tests/lua/battle_ui_card_play_slice_3.lua'),error=>
   error.cause?.code==='ETIMEDOUT'&&error.message.includes('Historical last phase: lua (')
   &&!error.message.includes('Lua stdout'));
  assert.equal(existsSync(receipt),false);assert.equal(existsSync(receipt+'.next'),false);
 }finally{childProcess.spawnSync=spawn;syncBuiltinESMExports();}
});

test('entry cleanup always closes its runtime and preserves an existing replay failure',()=>{
 const entry=readFileSync(new URL('./helpers/historical-monster-ui-entry.mjs',import.meta.url),'utf8');
 assert.match(entry,/catch\(error\)\{failure=error;throw error;\}\s*finally\{\s*closeHistoricalMonsterRuntime\(runtime,phase,succeeded,failure\);/);
 for(const failed of [false,true])for(const phaseFails of [false,true])for(const closeFails of [false,true]){
  const original=failed?new Error('original replay failure'):undefined;
  const diagnostic=new Error('phase write denied'),cleanup=new Error('runtime close denied');let closed=0;
  const runtime={close(){closed++;if(closeFails)throw cleanup;}};
  const phase=()=>{if(phaseFails)throw diagnostic;};
  if(!failed&&(phaseFails||closeFails))assert.throws(()=>closeHistoricalMonsterRuntime(runtime,phase,true,original),error=>error===(closeFails?cleanup:diagnostic));
  else closeHistoricalMonsterRuntime(runtime,phase,!failed,original);
  assert.equal(closed,1,'diagnostic failures cannot skip runtime.close');
  if(failed){assert.match(original.message,/^original replay failure/);if(closeFails)assert.match(original.message,/runtime close denied/);}
 }
 const events=[],completeError=new Error('complete phase denied');
 assert.throws(()=>closeHistoricalMonsterRuntime({close(){events.push('close');}},name=>{
  events.push(name);if(name==='complete')throw completeError;
 },true),error=>error===completeError);
 assert.deepEqual(events,['cleanup','close','complete']);
});

test('foreign, truncated and missing phase receipts cannot borrow progress or mask the original timeout',()=>{
 const spawn=childProcess.spawnSync;let receipt;
 const originalError=new Error('original silent timeout');
 try{
  for(const mode of ['foreign','truncated','missing']){
   childProcess.spawnSync=(_command,args)=>{
    receipt=args[3];const state=JSON.parse(readFileSync(receipt,'utf8'));
    if(mode==='foreign')writeFileSync(receipt,JSON.stringify({...state,runId:'stale-other-call',phase:'complete'}));
    if(mode==='truncated')writeFileSync(receipt,'{');
    if(mode==='missing')unlinkSync(receipt);
    writeFileSync(receipt+'.next','stale uncommitted phase');
    return {error:originalError,status:null,signal:null,stdout:'',stderr:''};
   };syncBuiltinESMExports();
   assert.throws(()=>runHistoricalMonsterUi('tests/lua/battle_ui_card_play_slice_3.lua'),error=>
    error.cause===originalError&&error.message.includes('Historical last phase: unavailable'));
   assert.equal(existsSync(receipt),false);assert.equal(existsSync(receipt+'.next'),false);
  }
 }finally{childProcess.spawnSync=spawn;syncBuiltinESMExports();}
});

test('successful historical calls keep their exact result and leave no phase receipt',()=>{
 const spawn=childProcess.spawnSync;let receipt;
 const result={status:0,signal:null,stdout:'all original cases',stderr:''};
 childProcess.spawnSync=(_command,args)=>{
  receipt=args[3];const state=JSON.parse(readFileSync(receipt,'utf8'));
  recordHistoricalMonsterPhase(receipt,state.script,'complete');return result;
 };syncBuiltinESMExports();
 try{
  assert.equal(runHistoricalMonsterUi('tests/lua/battle_ui_card_play_slice_3.lua'),result);
  assert.equal(existsSync(receipt),false);assert.equal(existsSync(receipt+'.next'),false);
 }finally{childProcess.spawnSync=spawn;syncBuiltinESMExports();}
});

test('phase cleanup errors remain visible without masking the original child failure',()=>{
 const spawn=childProcess.spawnSync,unlink=fileSystem.unlinkSync;
 const childError=new Error('original child failure'),cleanupError=Object.assign(new Error('phase cleanup denied'),{code:'EACCES'});
 let receipt;
 try{
  for(const failed of [true,false]){
   childProcess.spawnSync=(_command,args)=>{
    receipt=args[3];writeFileSync(receipt+'.next','interrupted update');
    return {error:failed?childError:undefined,status:failed?null:0,signal:null,stdout:'',stderr:''};
   };
   fileSystem.unlinkSync=path=>{if(path===receipt+'.next')throw cleanupError;return unlink(path);};
   syncBuiltinESMExports();
   assert.throws(()=>runHistoricalMonsterUi('tests/lua/battle_ui_card_play_slice_3.lua'),error=>failed
    ?error.cause===childError&&error.message.includes('Historical phase cleanup failed: phase cleanup denied')
    :error===cleanupError);
   assert.equal(existsSync(receipt),false,'cleanup must still remove the other owned file');
   assert.equal(existsSync(receipt+'.next'),true);unlink(receipt+'.next');
  }
 }finally{
  childProcess.spawnSync=spawn;fileSystem.unlinkSync=unlink;syncBuiltinESMExports();
  if(receipt)for(const path of [receipt+'.next',receipt])if(existsSync(path))unlink(path);
 }
});

test('historical proof construction preserves JSON conversion, isolation and non-aliased containers',async()=>{
 const {createSourceEpochProjector}=await import('./helpers/combined-epoch/source-epoch-runtime.mjs');
 const {createHash}=await import('node:crypto');
 const path='src/lua/clone_proof.lua',source='return "current"\n';
 const binding=text=>({source:text,sha256:createHash('sha256').update(text).digest('hex')});
 const fresh=()=>{const shared=binding(source);return {schemaVersion:1,normalization:'LF',currentCommit:'a'.repeat(40),owners:[path],current:{[path]:shared},
  targets:{same:{commit:'a'.repeat(40),files:{[path]:shared}},prior:{commit:'b'.repeat(40),files:{[path]:binding('return "prior"\n')}}}};};
 const nullPrototype=Object.assign(Object.create(null),{key:'value'});
 const special=JSON.parse('{"__proto__":{"preserved":true}}');
 const inherited=Object.create({inherited:true});inherited.own='kept';
 const accessor={get value(){return 'converted';}};
 const sparse=[];sparse[2]='third';
 const extraArray=['first'];extraArray.extra='ignored';
 const hiddenArray=['first'];Object.defineProperty(hiddenArray,'0',{enumerable:false,value:'hidden index'});
 const overriddenArray=['first'];
 Object.defineProperty(overriddenArray,'map',{value(){throw Error('array map must not execute');}});
 Object.defineProperty(overriddenArray,'constructor',{get(){throw Error('array species must not execute');}});
 const variants=[overriddenArray,nullPrototype,special,inherited,accessor,sparse,extraArray,hiddenArray,new Date('2026-11-10T00:00:00Z'),
  {toJSON(){return {converted:true};}},{missing:undefined,values:[undefined,NaN,Infinity,-Infinity,-0]},new Number(2),/ignored/,
  new Proxy({key:'value'},{})];
 for(const metadata of [undefined,...variants]){
  const input=fresh();if(metadata!==undefined)input.metadata=metadata;
  const expected=JSON.parse(JSON.stringify(input)),project=createSourceEpochProjector(input);
  assert.deepEqual(project.proof,expected);
  assert.notEqual(project.proof.current[path],input.current[path]);
  assert.notEqual(project.proof.current[path],project.proof.targets.same.files[path],'JSON duplicates aliased containers');
  assert.ok(Object.isFrozen(project.proof.current[path]));
  input.current[path].source='foreign input mutation';
  assert.equal(project.proof.current[path].source,source);
  let actual=source,reads=0;const readSource=()=>{reads++;return actual;};
  assert.equal(project.preCombinedSource(path,source,{target:'prior',readSource}),'return "prior"\n');
  actual='foreign source';assert.throws(()=>project.preCombinedSource(path,source,{target:'prior',readSource}),/linked owner identity/);
  actual=source;assert.equal(project.preCombinedSource(path,source,{target:'prior',readSource}),'return "prior"\n');assert.equal(reads,3);
 }
 for(const metadata of [1n,(()=>{const value={};value.self=value;return value;})()]){
  const input=fresh();input.metadata=metadata;
  assert.throws(()=>JSON.stringify(input),TypeError);assert.throws(()=>createSourceEpochProjector(input),TypeError);
 }
 const invalid=fresh();invalid.current[path].sha256='0'.repeat(64);
 assert.throws(()=>createSourceEpochProjector(invalid),/source identity SHA256/);
});

test('complete archived proof construction retains every JSON byte and rejects source drift',async()=>{
 const {createSourceEpochProjector}=await import('./helpers/combined-epoch/source-epoch-runtime.mjs');
 const {gunzipSync}=await import('node:zlib');
 const packed=JSON.parse(gunzipSync(readFileSync(new URL('./helpers/combined-epoch/source-epoch.json.gz',import.meta.url))));
 const expand=files=>Object.fromEntries(Object.entries(files).map(([path,key])=>[path,key===null?null:packed.bindings[key]]));
 const input={schemaVersion:1,normalization:packed.normalization,currentCommit:packed.currentCommit,owners:packed.owners,current:expand(packed.current),
  targets:Object.fromEntries(Object.entries(packed.targets).map(([name,target])=>[name,{commit:target.commit,files:expand(target.files)}]))};
 const expected=JSON.stringify(input),project=createSourceEpochProjector(input);
 assert.equal(JSON.stringify(project.proof),expected,'every field, source byte, key order and target survives');
 const owner=input.owners.find(path=>input.current[path]);
 input.current[owner].source+='\n-- foreign mutation';
 assert.equal(JSON.stringify(project.proof),expected,'no caller object retained');
 assert.throws(()=>createSourceEpochProjector(input),/source identity SHA256/);
});

test('proof array copying defines own elements without invoking inherited index setters',()=>{
 const module=new URL('./helpers/combined-epoch/source-epoch-runtime.mjs',import.meta.url).href;
 const source=`import assert from 'node:assert/strict';
import {createSourceEpochProjector} from ${JSON.stringify(module)};
const input={schemaVersion:1,normalization:'LF',currentCommit:'a'.repeat(40),owners:[],current:{},targets:{},metadata:Array.from({length:10},(_,i)=>i)};
const expected=JSON.parse(JSON.stringify(input)),previous=Object.getOwnPropertyDescriptor(Array.prototype,'9');
let actual,error,calls=0;
try{
 Object.defineProperty(Array.prototype,'9',{configurable:true,set(){calls++;throw Error('inherited index setter must not execute');}});
 try{actual=createSourceEpochProjector(input).proof;}catch(failure){error=failure;}
}finally{
 if(previous)Object.defineProperty(Array.prototype,'9',previous);else delete Array.prototype[9];
}
assert.ifError(error);assert.equal(calls,0);assert.deepEqual(actual,expected);
assert.ok(Object.hasOwn(actual.metadata,'9'));assert.notEqual(actual.metadata,input.metadata);
assert.ok(Object.isFrozen(actual.metadata));`;
 const result=childProcess.spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',timeout:10000});
 assert.ifError(result.error);assert.equal(result.status,0,result.stdout+result.stderr);
});
