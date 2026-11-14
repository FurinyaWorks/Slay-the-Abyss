import {preDefectActorSource} from './helpers/defect-actor-source-epoch.mjs';
import test from 'node:test';
import {officialUiRepairProof,preOfficialUiRepairSource} from './helpers/official-ui-repair-source-epoch.mjs';
import {preOfficialUiRepairEpoch} from './helpers/combined-epoch/source-epoch.mjs';
import {closeoutRead} from './helpers/closeout-ci-source.mjs';
import assert from 'node:assert/strict';
import {readFileSync as diskReadFileSync,mkdtempSync,rmSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sourceEpoch as currentSourceEpoch,preComponentUiEpoch as sourceEpoch,preEncounterFormationEpoch} from './helpers/combined-epoch/source-epoch.mjs';
import {preComponentUiCiSource} from './helpers/component-ui-ci-source-inverse.mjs';
import {componentUiSourceEpoch} from './helpers/component-ui-source-epoch.mjs';
import {jointUiSourceAt} from './helpers/joint-ui-source-epoch.mjs';
import {encounterFormationEpoch} from './helpers/encounter-formation-source-epoch.mjs';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
import {closeoutPriorEpoch,ciRepairSourceEpoch,stsStyleEpoch} from './helpers/closeout-source-epoch.mjs';
const path='src/lua/abyss_encounter_formation.lua',proof=sourceEpoch.proof,prior=preEncounterFormationEpoch.proof;
const raw=p=>proof.current[p]?.source??null;
// The original 51-owner assertions describe the frozen Formation predecessor.
// Current UI admission is independently checked against all raw owners below.
// Original Formation assertions read its explicit frozen predecessor view.
// Actual composed raw owners are independently checked by currentSourceEpoch below.
const rawCurrent=file=>diskReadFileSync(file,'utf8');
const noncombatPriorRead=currentSourceEpoch.combinedReader(rawCurrent,'noncombatPrior');
const componentRead=file=>jointUiSourceAt(file,noncombatPriorRead(file),'component');
const readFileSync=(file,...args)=>{
 const source=currentSourceEpoch.preCombinedSource(file,diskReadFileSync(file,...args).replaceAll('\r\n','\n'),{target:'noncombatPrior',readSource:rawCurrent});
 const component=jointUiSourceAt(file,source,'component');
 return preComponentUiCiSource(file,componentUiSourceEpoch.preCombinedSource(file,component,{target:'componentPrior',readSource:componentRead}));
};
test('Encounter formation outer epoch preserves every prior binding and exact frozen production byte',()=>{
 assert.equal(encounterFormationEpoch.proof.currentCommit,'fb04fd36ab4fbdba71c0da08bf71d2899143f69b');
 assert.equal(proof.currentCommit,prior.currentCommit);
 assert.equal(proof.currentTreeCommitted,false);
 assert.match(proof.encounterFormationCurrentCommitRole,/base only/);
 assert.equal(raw(path),readFileSync(path,'utf8').replaceAll('\r\n','\n'));
 assert.deepEqual(encounterFormationEpoch.proof.targets.prior.files[path],prior.current[path]);
 assert.deepEqual(proof.targets.encounterFormationPrior.files,prior.current);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(proof.targets[name],target,name);
 for(const [file,binding]of Object.entries(prior.current))if(file!==path)assert.deepEqual(proof.current[file],binding,file);
 assert.deepEqual(proof.owners,[...prior.owners,path]);assert.equal(proof.owners.length,51);
});
test('all advertised historical targets restore Encounter formation from LF and CRLF without rewriting originals',()=>{
 for(const [target,record]of Object.entries(proof.targets)){
  const expected=record.files[path]?.source??raw(path);
  for(const source of [raw(path),raw(path).replaceAll('\n','\r\n')])assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource:raw}),expected,target);
  let reads=0;const original=record.files[path]?.source;
  assert.equal(sourceEpoch.preCombinedSource(path,original,{target,readSource(){reads++;throw Error('unexpected read');}}),original);assert.equal(reads,0);
 }
});
test('current facade retains exact config identity and rechecks all 51 owners after warm success',()=>{
 const file='config/architecture.json',source=raw(file),target='actor';
 let calls=0;assert.equal(sourceEpoch.preCombinedSource(file,source,{target,readSource:p=>{calls++;return raw(p);}}),proof.targets.actor.files[file].source);assert.equal(calls,51);
 for(const owner of proof.owners){
  let bad=false;const readSource=p=>bad&&p===owner?raw(p)+'\n':raw(p);
  sourceEpoch.preCombinedSource(file,source,{target,readSource});bad=true;
  assert.throws(()=>sourceEpoch.preCombinedSource(file,source,{target,readSource}),/linked owner identity/,owner);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'encounterFormationPrior',readSource:p=>p===owner?null:raw(p)}),/linked owner identity/,owner);
 }
});
test('foreign bytes never authorize reads and composed readers preserve explicit raw reader ownership',()=>{
 for(const target of Object.keys(proof.targets))for(const source of [raw(path)+'\n',raw(path).slice(1),null,undefined,{},17]){
  let reads=0;assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource(){reads++;throw Error('unexpected read');}}),source);assert.equal(reads,0);
 }
 const reader=sourceEpoch.combinedReader(raw,'encounterFormationPrior');assert.equal(reader(path),prior.current[path].source);
 assert.equal(sourceEpoch.combinedReader(reader,'encounterFormationPrior'),reader);
 const retargeted=sourceEpoch.combinedReader(reader,'actor');assert.equal(retargeted(path),proof.targets.actor.files[path].source);
 assert.throws(()=>sourceEpoch.combinedReader(null,'actor'),/reader/);
});
test('isolated authenticated helper closure retains the exact Encounter formation epoch and rejects owner drift',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'formation-epoch-closure-'));
 try{
  copyIntegrationSourceClosure(directory);
  const isolated=(await import(pathToFileURL(join(directory,'tests/helpers/combined-epoch/source-epoch.mjs')).href)).preComponentUiEpoch;
  assert.deepEqual(isolated.proof,proof);
  assert.equal(isolated.preCombinedSource(path,raw(path),{target:'encounterFormationPrior',readSource:raw}),prior.current[path].source);
  assert.throws(()=>isolated.preCombinedSource(path,raw(path),{target:'encounterFormationPrior',readSource:p=>p===path?raw(p)+'\n':raw(p)}),/linked owner identity/);
 }finally{rmSync(directory,{recursive:true,force:true});}
});


test('unknown source targets are rejected rather than gaining an identity fallback',()=>{
 for(const target of ['unknown','',undefined,null]){
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target,readSource:raw}),/unknown source target/);
  assert.throws(()=>sourceEpoch.combinedReader(raw,target)(path),/unknown source target/);
 }
});

test('configuration layout admission preserves exact tokens and freshly authenticates all 51 current raw owners',async()=>{
 const {preComponentUiEpoch:sourceEpoch}=await import('./helpers/combined-epoch/source-epoch.mjs');
 const proof=sourceEpoch.proof,path='config/architecture.json',source=proof.current[path].source;
 const raw=p=>proof.current[p]?.source??null,expected=proof.targets.actor.files[path].source;
 assert.equal(proof.owners.length,51);
 const layouts=[JSON.stringify(JSON.parse(source)),JSON.stringify(JSON.parse(source),null,'\t'),source+'\n\t '];
 for(const input of layouts){
  let calls=0;assert.equal(sourceEpoch.preCombinedSource(path,input,{target:'actor',readSource:p=>{calls++;return raw(p);}}),expected);
  assert.equal(calls,51);
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

test('live LF and CRLF raw owner reads authenticate 51 current owners on every call',()=>{
 const config='config/architecture.json',input=readFileSync(config,'utf8'),expected=proof.targets.actor.files[config].source;
 for(const crlf of [false,true]){
  const seen=[];let corrupt=null,missing=null;
  const live=file=>{seen.push(file);if(file===missing)return null;const bytes=readFileSync(file,'utf8').replaceAll('\r\n','\n');return file===corrupt?bytes+'\n':crlf?bytes.replaceAll('\n','\r\n'):bytes;};
  for(let repeat=0;repeat<2;repeat++){seen.length=0;assert.equal(sourceEpoch.preCombinedSource(config,input,{target:'actor',readSource:live}),expected);assert.deepEqual(seen,proof.owners);}
  for(const owner of proof.owners){
   corrupt=owner;assert.throws(()=>sourceEpoch.preCombinedSource(config,input,{target:'actor',readSource:live}),/linked owner identity/,owner);corrupt=null;
   missing=owner;assert.throws(()=>sourceEpoch.preCombinedSource(path,readFileSync(path,'utf8'),{target:'encounterFormationPrior',readSource:live}),/linked owner identity/,owner);missing=null;
  }
 }
});

test('outer metadata preserves the full predecessor and rejects altered predecessor metadata',async()=>{
 const {extendEncounterFormationEpoch}=await import('./helpers/encounter-formation-source-epoch.mjs');
 for(const [key,value]of Object.entries(prior))if(!['current','owners','targets'].includes(key))assert.deepEqual(proof[key],value,key);
 assert.equal(proof.encounterFormationCollectedBaseCommit,'fb04fd36ab4fbdba71c0da08bf71d2899143f69b');
 assert.equal(proof.current[path].rawGitBlob,proof.current[path].gitBlob);
 assert.equal(proof.current[path].mode,'100644');
 for(const field of ['source','sha256','gitBlob','rawGitBlob','mode']){
  const changed=structuredClone(prior);changed.current[path][field]='tampered';
  assert.throws(()=>extendEncounterFormationEpoch({...preEncounterFormationEpoch,proof:changed}),/authenticated predecessor/,field);
 }
 assert(Object.isFrozen(proof));assert(Object.isFrozen(proof.targets.encounterFormationPrior.files[path]));
 assert.throws(()=>{proof.current[path].source='foreign';},TypeError);
});

test('source and configuration reject unknown targets and malformed live readers after warm authorization',()=>{
 for(const file of [path,'config/architecture.json']){
  for(const target of ['unknown','',null,undefined,'__proto__']){
   assert.throws(()=>sourceEpoch.preCombinedSource(file,raw(file),{target,readSource:raw}),/unknown source target/);
   assert.throws(()=>sourceEpoch.preCombinedSource(file,'foreign',{target,readSource:null}),/unknown source target/);
  }
  const target=file===path?'encounterFormationPrior':'actor';
  sourceEpoch.preCombinedSource(file,raw(file),{target,readSource:raw});
  for(const readSource of [null,false,0,{},[]])assert.throws(()=>sourceEpoch.preCombinedSource(file,raw(file),{target,readSource}),/reader/);
  assert.throws(()=>sourceEpoch.preCombinedSource(file,raw(file),{target,readSource(){throw Error('unavailable');}}),/linked owner missing/);
  for(const value of [{},17,false,undefined])assert.throws(()=>sourceEpoch.preCombinedSource(file,raw(file),{target,readSource:()=>value}),/linked owner identity/);
 }
});

test('official repair adds exact complete-file identities without rewriting the battle predecessor',()=>{
 const files=officialUiRepairProof.files;
 for(const [file,row]of Object.entries(files)){
  const actual=closeoutRead('pr629')(file,'utf8').replaceAll('\r\n','\n');
  assert.equal(actual,row.current.source,'raw repair source: '+file);
  for(const source of [actual,actual.replaceAll('\n','\r\n')])assert.equal(preOfficialUiRepairSource(file,source),row.before.source,file);
  for(const source of [actual+'\n',actual.slice(1),null,{},17])assert.equal(preOfficialUiRepairSource(file,source),source,file);
  if(Object.hasOwn(preOfficialUiRepairEpoch.proof.current,file))assert.deepEqual(row.before,preOfficialUiRepairEpoch.proof.current[file]);
 }
 const repairRead=closeoutRead('pr629'),config=repairRead('config/architecture.json','utf8');
 assert.throws(()=>preOfficialUiRepairEpoch.preCombinedSource('config/architecture.json',config,{target:'develop',readSource:p=>repairRead(p,'utf8')}),/linked owner identity/,'removing the new layer must reject the actual repair');
 assert.equal(preOfficialUiRepairSource('unknown','foreign'),'foreign');
});

test('official repair helper closure imports in isolation and rejects new-file drift or removal',t=>{
 const root=mkdtempSync(join(tmpdir(),'official-repair-closure-')),destination=mkdtempSync(join(tmpdir(),'official-repair-copy-'));
 t.after(()=>{rmSync(root,{recursive:true,force:true});rmSync(destination,{recursive:true,force:true});});
 copyIntegrationSourceClosure(root);
 const module=pathToFileURL(join(root,'tests/helpers/combined-epoch/source-epoch.mjs')).href;
 assert.equal(closeoutPriorEpoch.proof.owners.length,96,'unchanged closeout predecessor');
 const closeout=pathToFileURL(join(root,'tests/helpers/closeout-source-epoch.mjs')).href;
 const result=spawnSync(process.execPath,['--input-type=module','-e',`const current=await import(${JSON.stringify(module)});const m={...current,sourceEpoch:(await import(${JSON.stringify(closeout)})).stsStyleEpoch};if(m.officialUiRepairIntegratedEpoch.proof.owners.length!==88)throw Error('isolated owner closure');if(m.ciRepairSourceEpoch.proof.owners.length!==97||m.sourceEpoch.proof.owners.length!==104)throw Error('combined owner closure');if(JSON.stringify(current.sourceEpoch.proof.owners)!==${JSON.stringify(JSON.stringify(currentSourceEpoch.proof.owners))})throw Error('current raw owner closure');`],{encoding:'utf8',timeout:30000,windowsHide:true});
 assert.ifError(result.error);assert.equal(result.status,0,result.stdout+result.stderr);
 for(const name of ['official-ui-repair-source-epoch.mjs','official-ui-repair-source-epoch.json.gz','shop-deck-source-epoch.json.gz']){
  const file=join(root,'tests/helpers',name),bytes=diskReadFileSync(file),changed=Buffer.from(bytes);changed[changed.length-1]^=1;
  writeFileSync(file,changed);assert.throws(()=>copyIntegrationSourceClosure(destination,{sourceRoot:root}),/fresh helper copy identity/,name);
  unlinkSync(file);assert.throws(()=>copyIntegrationSourceClosure(destination,{sourceRoot:root}),/ENOENT/,name);
  writeFileSync(file,bytes);copyIntegrationSourceClosure(destination,{sourceRoot:root});
 }
});

test('pre-feedback UI facade retains all 104 frozen owners and their original authorization contract',()=>{
 // This complete immutable view retains the old 104-owner contract. The next
 // case independently authenticates actual current disk bytes and all 105 owners.
 const currentSourceEpoch=stsStyleEpoch,diskReadFileSync=file=>stsStyleEpoch.proof.current[file]?.source??null;
 const current=currentSourceEpoch.proof,file='config/architecture.json',input=diskReadFileSync(file,'utf8'),target='develop';
 // Keep the component68 + exact28 predecessor; current admission adds merchant.
 assert.equal(closeoutPriorEpoch.proof.owners.length,96);
 assert.deepEqual(ciRepairSourceEpoch.proof.owners.filter(p=>!closeoutPriorEpoch.proof.owners.includes(p)),['src/lua/abyss_merchant.lua']);
 assert.equal(ciRepairSourceEpoch.proof.owners.length,97);
 assert.deepEqual(current.owners.filter(p=>!ciRepairSourceEpoch.proof.owners.includes(p)),['card_art_runtime','controller','game_ui_lifecycle','game_ui_overlays','game_ui_run','node_ui_lifecycle','page_reveal'].map(n=>'src/lua/abyss_'+n+'.lua'));
 assert.equal(current.owners.length,104);
 const expected=current.targets[target].files[file].source;
 for(const crlf of [false,true]){
  const reads=[];let bad=null,missing=false;
  const live=owner=>{reads.push(owner);if(owner===bad&&missing)return null;const bytes=diskReadFileSync(owner,'utf8').replaceAll('\r\n','\n');return owner===bad?bytes+'\n':crlf?bytes.replaceAll('\n','\r\n'):bytes;};
  for(let repeat=0;repeat<2;repeat++){reads.length=0;assert.equal(currentSourceEpoch.preCombinedSource(file,input,{target,readSource:live}),expected);assert.deepEqual(reads,current.owners);}
  for(const owner of current.owners){
   for(const absent of [false,true]){bad=owner;missing=absent;reads.length=0;assert.throws(()=>currentSourceEpoch.preCombinedSource(file,input,{target,readSource:live}),/linked owner identity/,owner);assert.deepEqual(reads,current.owners.slice(0,current.owners.indexOf(owner)+1));}
   bad=null;reads.length=0;assert.equal(currentSourceEpoch.preCombinedSource(file,input,{target,readSource:live}),expected);assert.deepEqual(reads,current.owners);
  }
  reads.length=0;assert.equal(currentSourceEpoch.preCombinedSource(file,'foreign source',{target,readSource:live}),'foreign source');assert.deepEqual(reads,[]);
 }
});

test('current UI facade authenticates all 105 disk owners once in order and rejects every warm drift or removal',()=>{
 const current=currentSourceEpoch.proof,file='config/architecture.json',input=diskReadFileSync(file,'utf8'),target='develop';
 assert.deepEqual(current.targets.stsFeedbackPrior.files,stsStyleEpoch.proof.current,'complete 104-owner predecessor remains available');
 assert.deepEqual(current.owners,[...stsStyleEpoch.proof.owners,'src/lua/abyss_monster_power_view.lua'].sort());
 assert.equal(current.owners.length,105);
 const expected=current.targets[target].files[file].source;
 for(const crlf of [false,true]){
  const reads=[];let bad=null,missing=false;
  const live=owner=>{reads.push(owner);if(owner===bad&&missing)return null;const bytes=diskReadFileSync(owner,'utf8').replaceAll('\r\n','\n');return owner===bad?bytes+'\n':crlf?bytes.replaceAll('\n','\r\n'):bytes;};
  for(let repeat=0;repeat<2;repeat++){reads.length=0;assert.equal(currentSourceEpoch.preCombinedSource(file,input,{target,readSource:live}),expected);assert.deepEqual(reads,current.owners);}
  for(const owner of current.owners){
   for(const absent of [false,true]){bad=owner;missing=absent;reads.length=0;assert.throws(()=>currentSourceEpoch.preCombinedSource(file,input,{target,readSource:live}),/linked owner identity/,owner);assert.deepEqual(reads,current.owners.slice(0,current.owners.indexOf(owner)+1));}
   bad=null;reads.length=0;assert.equal(currentSourceEpoch.preCombinedSource(file,input,{target,readSource:live}),expected);assert.deepEqual(reads,current.owners);
  }
  reads.length=0;assert.equal(currentSourceEpoch.preCombinedSource(file,'foreign source',{target,readSource:live}),'foreign source');assert.deepEqual(reads,[]);
 }
});
