import {sourceSlice,closeoutPriorEpoch,ciRepairSourceEpoch} from './helpers/closeout-source-epoch.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync as diskReadFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sourceEpoch,preDefectFinalEpoch} from './helpers/combined-epoch/pre-formation-source-epoch.mjs';
import {defectFinalEpoch} from './helpers/defect-final-source-epoch.mjs';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
import {preComponentUiCiSource} from './helpers/component-ui-ci-source-inverse.mjs';
import {sourceEpoch as currentEpoch,preRoomUiEpoch as componentEpoch} from './helpers/combined-epoch/source-epoch.mjs';
// The original50-owner source contracts retain the frozen Defect epoch;
// Actual current68+28+merchant admission is independently exercised below.
const readFileSync=(file,...args)=>preComponentUiCiSource(file,sourceSlice(file,diskReadFileSync(file,...args).replaceAll('\r\n','\n'),'encounterFormationPrior'));
const path='src/lua/abyss_defect_final_cards.lua',proof=sourceEpoch.proof,prior=preDefectFinalEpoch.proof;
const raw=p=>proof.current[p]?.source??null;
test('Defect final outer epoch preserves every prior binding and exact frozen production byte',()=>{
 assert.equal(defectFinalEpoch.proof.currentCommit,'6f017ff875baa2de80a121e507634a2d859fecfa');
 assert.equal(proof.currentCommit,prior.currentCommit);
 assert.equal(proof.currentTreeCommitted,false);
 assert.match(proof.defectFinalCurrentCommitRole,/base only/);
 assert.equal(raw(path),readFileSync(path,'utf8').replaceAll('\r\n','\n'));
 assert.deepEqual(defectFinalEpoch.proof.targets.prior.files[path],prior.current[path]);
 assert.deepEqual(proof.targets.defectFinalPrior.files,prior.current);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(proof.targets[name],target,name);
 for(const [file,binding]of Object.entries(prior.current))if(file!==path)assert.deepEqual(proof.current[file],binding,file);
 assert.deepEqual(proof.owners,[...prior.owners,path]);assert.equal(proof.owners.length,50);
});
test('all advertised historical targets restore Defect final from LF and CRLF without rewriting originals',()=>{
 for(const [target,record]of Object.entries(proof.targets)){
  const expected=record.files[path]?.source??raw(path);
  for(const source of [raw(path),raw(path).replaceAll('\n','\r\n')])assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource:raw}),expected,target);
  let reads=0;const original=record.files[path]?.source;
  assert.equal(sourceEpoch.preCombinedSource(path,original,{target,readSource(){reads++;throw Error('unexpected read');}}),original);assert.equal(reads,0);
 }
});
test('current facade retains exact config identity and rechecks all 50 owners after warm success',()=>{
 const file='config/architecture.json',source=raw(file),target='actor';
 let calls=0;assert.equal(sourceEpoch.preCombinedSource(file,source,{target,readSource:p=>{calls++;return raw(p);}}),proof.targets.actor.files[file].source);assert.equal(calls,50);
 for(const owner of proof.owners){
  let bad=false;const readSource=p=>bad&&p===owner?raw(p)+'\n':raw(p);
  sourceEpoch.preCombinedSource(file,source,{target,readSource});bad=true;
  assert.throws(()=>sourceEpoch.preCombinedSource(file,source,{target,readSource}),/linked owner identity/,owner);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'defectFinalPrior',readSource:p=>p===owner?null:raw(p)}),/linked owner identity/,owner);
 }
});
test('foreign bytes never authorize reads and composed readers preserve explicit raw reader ownership',()=>{
 for(const target of Object.keys(proof.targets))for(const source of [raw(path)+'\n',raw(path).slice(1),null,undefined,{},17]){
  let reads=0;assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource(){reads++;throw Error('unexpected read');}}),source);assert.equal(reads,0);
 }
 const reader=sourceEpoch.combinedReader(raw,'defectFinalPrior');assert.equal(reader(path),prior.current[path].source);
 assert.equal(sourceEpoch.combinedReader(reader,'defectFinalPrior'),reader);
 const retargeted=sourceEpoch.combinedReader(reader,'actor');assert.equal(retargeted(path),proof.targets.actor.files[path].source);
 assert.throws(()=>sourceEpoch.combinedReader(null,'actor'),/reader/);
});
test('isolated authenticated helper closure retains the exact Defect final epoch and rejects owner drift',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'silent-epoch-closure-'));
 try{
  copyIntegrationSourceClosure(directory);
  const isolated=(await import(pathToFileURL(join(directory,'tests/helpers/combined-epoch/pre-formation-source-epoch.mjs')).href)).sourceEpoch;
  assert.deepEqual(isolated.proof,proof);
  assert.equal(isolated.preCombinedSource(path,raw(path),{target:'defectFinalPrior',readSource:raw}),prior.current[path].source);
  assert.throws(()=>isolated.preCombinedSource(path,raw(path),{target:'defectFinalPrior',readSource:p=>p===path?raw(p)+'\n':raw(p)}),/linked owner identity/);
 }finally{rmSync(directory,{recursive:true,force:true});}
});


test('unknown source targets are rejected rather than gaining an identity fallback',()=>{
 for(const target of ['unknown','',undefined,null]){
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target,readSource:raw}),/unknown source target/);
  assert.throws(()=>sourceEpoch.combinedReader(raw,target)(path),/unknown source target/);
 }
});

test('configuration layout admission preserves exact tokens and freshly authenticates all 50 current raw owners',async()=>{
 const {sourceEpoch}=await import('./helpers/combined-epoch/pre-formation-source-epoch.mjs');
 const proof=sourceEpoch.proof,path='config/architecture.json',source=proof.current[path].source;
 const raw=p=>proof.current[p]?.source??null,expected=proof.targets.actor.files[path].source;
 assert.equal(proof.owners.length,50);
 const layouts=[JSON.stringify(JSON.parse(source)),JSON.stringify(JSON.parse(source),null,'\t'),source+'\n\t '];
 for(const input of layouts){
  let calls=0;assert.equal(sourceEpoch.preCombinedSource(path,input,{target:'actor',readSource:p=>{calls++;return raw(p);}}),expected);
  assert.equal(calls,50);
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

test('outer foreign-source fallback preserves invalid raw-reader semantics',()=>{
 for(const target of Object.keys(proof.targets))for(const source of ['foreign source',null,{},17])for(const readSource of [null,false,0,{}])
  assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource}),source);
});

test('live LF and CRLF raw owner reads authenticate 50 current owners on every call',()=>{
 const config='config/architecture.json',input=readFileSync(config,'utf8'),expected=proof.targets.actor.files[config].source;
 for(const crlf of [false,true]){
  const seen=[];let corrupt=null,missing=null;
  const live=file=>{seen.push(file);if(file===missing)return null;const bytes=readFileSync(file,'utf8').replaceAll('\r\n','\n');return file===corrupt?bytes+'\n':crlf?bytes.replaceAll('\n','\r\n'):bytes;};
  for(let repeat=0;repeat<2;repeat++){seen.length=0;assert.equal(sourceEpoch.preCombinedSource(config,input,{target:'actor',readSource:live}),expected);assert.deepEqual(seen,proof.owners);}
  for(const owner of proof.owners){
   corrupt=owner;assert.throws(()=>sourceEpoch.preCombinedSource(config,input,{target:'actor',readSource:live}),/linked owner identity/,owner);corrupt=null;
   missing=owner;assert.throws(()=>sourceEpoch.preCombinedSource(path,readFileSync(path,'utf8'),{target:'defectFinalPrior',readSource:live}),/linked owner identity/,owner);missing=null;
  }
 }
});

test('outer metadata preserves the full predecessor and rejects altered predecessor metadata',async()=>{
 const {extendDefectFinalEpoch}=await import('./helpers/defect-final-source-epoch.mjs');
 for(const [key,value]of Object.entries(prior))if(!['current','owners','targets'].includes(key))assert.deepEqual(proof[key],value,key);
 assert.equal(proof.defectFinalCollectedBaseCommit,'6f017ff875baa2de80a121e507634a2d859fecfa');
 assert.equal(proof.current[path].rawGitBlob,proof.current[path].gitBlob);
 assert.equal(proof.current[path].mode,'100644');
 for(const field of ['source','sha256','gitBlob','rawGitBlob','mode']){
  const changed=structuredClone(prior);changed.current[path][field]='tampered';
  assert.throws(()=>extendDefectFinalEpoch({...preDefectFinalEpoch,proof:changed}),/authenticated predecessor/,field);
 }
 assert(Object.isFrozen(proof));assert(Object.isFrozen(proof.targets.defectFinalPrior.files[path]));
 assert.throws(()=>{proof.current[path].source='foreign';},TypeError);
});

test('source and configuration reject unknown targets and malformed live readers after warm authorization',()=>{
 for(const file of [path,'config/architecture.json']){
  for(const target of ['unknown','',null,undefined,'__proto__']){
   assert.throws(()=>sourceEpoch.preCombinedSource(file,raw(file),{target,readSource:raw}),/unknown source target/);
   assert.throws(()=>sourceEpoch.preCombinedSource(file,'foreign',{target,readSource:null}),/unknown source target/);
  }
  const target=file===path?'defectFinalPrior':'actor';
  sourceEpoch.preCombinedSource(file,raw(file),{target,readSource:raw});
  for(const readSource of [null,false,0,{},[]])assert.throws(()=>sourceEpoch.preCombinedSource(file,raw(file),{target,readSource}),/reader/);
  assert.throws(()=>sourceEpoch.preCombinedSource(file,raw(file),{target,readSource(){throw Error('unavailable');}}),/linked owner missing/);
  for(const value of [{},17,false,undefined])assert.throws(()=>sourceEpoch.preCombinedSource(file,raw(file),{target,readSource:()=>value}),/linked owner identity/);
 }
});

test('current raw production authenticates original68, exact28 and merchant owners without the historical CI source view',()=>{
 const current=currentEpoch.proof,file='config/architecture.json',source=diskReadFileSync(file,'utf8');
 const actual=Object.fromEntries(current.owners.map(path=>[path,diskReadFileSync(path,'utf8')]));
 assert.equal(componentEpoch.proof.owners.length,68);
 assert.deepEqual(closeoutPriorEpoch.proof.owners.filter(path=>!componentEpoch.proof.owners.includes(path)).sort(),[
  'battle_actions','battle_aim_arrow','battle_card_gestures','battle_card_layout','battle_detail_bindings','battle_details','battle_info_content','battle_info_view','battle_render_actors','battle_render_hud','battle_render_state','battle_reward_layout','battle_ui','curses','feedback_actor_painter','golden_idol_event','joust_event','lumine_idle','match_event_ui','node_ui','node_ui_events','node_ui_feedback','potion_discard_ui','relic_names','relic_view_ui','shop_ui','skill_feedback','battle_card_glow'
 ].map(name=>'src/lua/abyss_'+name+'.lua').sort());
 assert(componentEpoch.proof.owners.every(path=>current.owners.includes(path)),'retain all original component owners');
 assert.equal(closeoutPriorEpoch.proof.owners.length,96);
 assert.deepEqual(ciRepairSourceEpoch.proof.owners.filter(path=>!closeoutPriorEpoch.proof.owners.includes(path)),['src/lua/abyss_merchant.lua']);
 assert.equal(ciRepairSourceEpoch.proof.owners.length,97);
 assert.deepEqual(current.owners.filter(path=>!ciRepairSourceEpoch.proof.owners.includes(path)),['card_art_runtime','controller','game_ui_lifecycle','game_ui_overlays','game_ui_run','node_ui_lifecycle','page_reveal'].map(n=>'src/lua/abyss_'+n+'.lua'));
 assert.equal(current.owners.length,104);let changed,replacement,reads=[];
 const reader=path=>{reads.push(path);if(path===changed){if(replacement instanceof Error)throw replacement;return replacement;}return actual[path];};
 const project=input=>currentEpoch.preCombinedSource(file,input,{target:'develop',readSource:reader});
 const expected=current.targets.develop.files[file].source;
 assert.equal(createHash('sha256').update(expected).digest('hex'),'0e75d9e1f08cfb7738215b9a31cce141f03cc2469077bce0db3376fe1f446a9c');
 assert.equal(project(source),expected);assert.deepEqual(reads,current.owners);
 for(const owner of current.owners)for(replacement of [actual[owner]+'\n',null,new Error('missing current owner')]){
  changed=owner;reads=[];assert.throws(()=>project(source),/combined linked owner/);assert.deepEqual(reads,current.owners.slice(0,current.owners.indexOf(owner)+1));
  changed=undefined;reads=[];assert.equal(project(source),expected);assert.deepEqual(reads,current.owners);
 }
 for(const foreign of [source+'-- foreign',expected,null,undefined,{},17]){reads=[];assert.equal(project(foreign),foreign);assert.deepEqual(reads,[]);}
});
