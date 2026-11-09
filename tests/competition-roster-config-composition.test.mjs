import nativeTest,{after} from 'node:test';
import {historicalTest as test,withHistoricalBaseline,createHistoricalBaseline,historicalInputPath} from './helpers/historical-baseline-inputs.mjs';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {preHistoricalRosterConfigSource as preRosterConfigSource,projectHistoricalRosterConfigSource as projectRosterConfigSource} from './helpers/competition-roster-config-composition.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');

// Original cases use the complete original helper closure. The already reviewed
// Nodes archive owns the shared 113 inputs; this archive adds only 12 old inputs
// needed by the retirement/presentation guards, without copying their oracles.
const sharedBytes=readFileSync(new URL('./fixtures/nodes-battle-original-chain-98fef95d.json.gz',import.meta.url));
assert.equal(hash(sharedBytes),'f904703b3e747713eba5297718f222a833bf84995c73fa0c8845723dfff11c96');
const additionBytes=readFileSync(new URL('./fixtures/roster-original-chain-additions-98fef95d.json.gz',import.meta.url));
assert.equal(hash(additionBytes),'9457f12918895fef7306aabf521c151383f2fc3adea64543d6c3a2652f660b15');
const shared=JSON.parse(gunzipSync(sharedBytes)),additions=JSON.parse(gunzipSync(additionBytes));
const sharedManifest='c472b6d2420318936d59c4eb4a3e5aa2a9803bf29e283ab27d5b38a3e97b5ad0';
const additionManifest='4c1a15bc6bba4a86de7ea9a3a3b231584e7c736433165e62901cc98125ad9d2a';
const readOriginalInput=path=>readFileSync(new URL('../'+path,import.meta.url));
function validateOriginalChain(value,expectedManifest,readInput=readOriginalInput){
 assert.equal(value.schemaVersion,1);
 assert.equal(value.sourceCommit,'98fef95d047652aa6a8880241ddff28ef320a484','original Roster config chain commit');
 const manifest=Object.fromEntries(Object.entries(value.files).map(([path,binding])=>[path,binding.gitBlob]));
 assert.equal(hash(JSON.stringify(manifest)),expectedManifest,'complete original Roster config chain inventory');
 return Object.fromEntries(Object.entries(value.files).map(([path,binding])=>{
  historicalInputPath(process.cwd(),path);
  assert.notEqual(Object.hasOwn(binding,'existing'),Object.hasOwn(binding,'source'),'one complete original input: '+path);
  if(binding.existing)assert.equal(binding.existing,path,'original input reference stays at its authenticated path');
  const raw=binding.existing?readInput(path):Buffer.from(binding.source);
  const source=path.endsWith('.gz')?raw:Buffer.from(raw.toString('utf8').replaceAll('\r\n','\n'));
  assert.equal(hash(source),binding.sha256,'original complete Roster chain bytes: '+path);
  assert.equal(createHash('sha1').update(`blob ${source.length}\0`).update(source).digest('hex'),binding.gitBlob,'original Roster chain Git blob: '+path);
  return [path,source];
 }));
}
const sharedInputs=validateOriginalChain(shared,sharedManifest),additionalInputs=validateOriginalChain(additions,additionManifest);
for(const file of Object.keys(additionalInputs))assert.equal(Object.hasOwn(sharedInputs,file),false,'additional original input has one owner: '+file);
const originalInputs={...sharedInputs,...additionalInputs},originalRoot=createHistoricalBaseline().directory;
after(()=>rmSync(originalRoot,{recursive:true,force:true}));
// Replace only this private baseline's link, never the real source/oracle tree.
rmSync(join(originalRoot,'tests/fixtures'));
for(const [file,source]of Object.entries(originalInputs)){
 const target=historicalInputPath(originalRoot,file);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,source);
}
const previousCwd=process.cwd();let chain;
try{
 process.chdir(originalRoot);
 chain=await Promise.all(['pr323-accepted-source-inverse','competition-roster-config-composition','competition-roster-source-inverse','nodes-battle-max-hp-config-inverse','approved-node-ui-refactor','presentation-announcement-retirement','p0-presentation-inverse'].map(name=>import(pathToFileURL(join(originalRoot,'tests/helpers/'+name+'.mjs')).href)));
}catch(error){rmSync(originalRoot,{recursive:true,force:true});throw error;}finally{process.chdir(previousCwd);}
const [{preAcceptedPr323Source},{preRosterConfigSource:publicPreRosterConfigSource,projectRosterConfigSource:publicProjectRosterConfigSource,rosterConfigComposition:proof},{preRosterSource,rosterSourceBindings},{preNodesBattleMaxHpConfig},{preIntegratedNodeUiSource},{preRetirementSource},{preAcceptedPresentation}]=chain;
const path='config/architecture.json',read=p=>preAcceptedPr323Source(p,readFileSync(p,'utf8')).replaceAll('\r\n','\n');
const project=(source,target)=>projectRosterConfigSource(path,source,target);
const source=withHistoricalBaseline(()=>read(path));
test('actual complete registration union adds only roster admission and retains every accepted Nodes Battle MaxHP classification',()=>{
 assert.equal(hash(source),'45bdb013ff452b410816bcd192f5ed5de9ecc0067a75b2a113721a03c98764ba');
 const current=project(source,'current'),roster=project(source,'roster');
 const acceptedRun=JSON.parse(read('tests/fixtures/run-max-hp-config-inverse.json'));
 assert.equal(hash(current),acceptedRun.combinedSha256LF);
 assert.equal(hash(roster),rosterSourceBindings.files[path].afterSha256);
 assert.equal(proof.targets.current.head,'e27c7a0f1060a61d995ab0b27d43cb23f1fbc07e');
 assert.equal(proof.targets.roster.head,'296bc0a290f7858f54a2d8b0cd1da052cee96a29');
 const live=JSON.parse(source),a=JSON.parse(current),b=JSON.parse(roster),union={...a.layers};
 for(const [name,layer]of Object.entries(b.layers)){
  if(Object.hasOwn(union,name))assert.equal(union[name],layer,'accepted source classification conflict: '+name);
  union[name]=layer;
 }
 assert.deepEqual(live.layers,union,'all actual registrations are the checked union, not a count or subset');
 assert.deepEqual({...live,layers:null},{...a,layers:null},'every non-registry architecture field remains');
 assert.deepEqual(Object.keys(live.layers),['abyss_run_admission',...Object.keys(a.layers)]);
 assert.equal(live.layers.abyss_run_admission,'core');
 const actual=JSON.parse(readFileSync(path,'utf8'));
 for(const file of readdirSync('src/lua',{recursive:true}).filter(file=>file.endsWith('.lua')))
  assert.ok(Object.hasOwn(actual.layers,file.slice(0,-4).replaceAll('/','.')),'actual source remains classified: '+file);
});
test('outer proof composes both immutable config witnesses through all existing historical guards',()=>{
 const current=project(source,'current'),roster=project(source,'roster');
 for(const target of ['current','roster']){
  const previous=project(source,target);
  assert.equal(project(source.replaceAll('\n','\r\n'),target),previous);
  assert.equal(preRosterConfigSource(path,source,target),previous);
  assert.equal(preRosterConfigSource(path,source.replaceAll('\n','\r\n'),target),previous);
  assert.equal(preRosterConfigSource(path,previous,target),previous);
 }
 assert.equal(preRosterSource(path,source),source,'old roster proof does not consume a new unowned union');
 assert.equal(preNodesBattleMaxHpConfig(path,source),source,'old triple proof stays strict');
 for(const historical of [current,roster])for(const guard of [preIntegratedNodeUiSource,preRetirementSource,preAcceptedPresentation])
  assert.equal(guard(path,source),guard(path,historical));
 assert.equal(hash(read('tests/fixtures/competition-roster-source-inverse.json')),'cb5cfb72ee26b567d534333d685d38d5c72aca79b9a148fd63ec625f87399fcc');
 assert.equal(hash(read('tests/fixtures/nodes-battle-max-hp-config-inverse.json')),'5e130a11180cb03714f315a21f5cf90a722374c2833dda033529851ad2809b92');
});
test('all actual registration mutations reject unknown identities while retaining the exact complete prior config witness',()=>{
 const layers=JSON.parse(source).layers;
 const previous=project(source,'current');
 let mutations=0,accepted=0;
 for(const [name,layer]of Object.entries(layers)){
  const line=source.split('\n').find(row=>row.includes(`"${name}":`));assert.ok(line);
  for(const mutant of [source.replace(line+'\n',''),source.replace(line+'\n',line+'\n'+line+'\n'),
   source.replace(`"${name}":`,`"${name}_unreviewed":`),source.replace(line,line.replace(`"${layer}"`,`"${layer==='core'?'ui':'core'}"`))]){
   assert.notEqual(mutant,source);mutations++;
   for(const target of ['current','roster']){
    assert.throws(()=>project(mutant,target),/unreviewed integrated roster config source/);
    assert.equal(preRosterConfigSource(path,mutant,target),mutant);
   }
   if(mutant===previous)accepted++;
  }
 }
 assert.equal(mutations,Object.keys(layers).length*4);
 assert.equal(accepted,1,'only removing the sole admission insertion recovers a complete old config');
});
test('config reordering unrelated bytes and missing wrong-path or target inputs remain rejected',()=>{
 const first='    "abyss_run_admission": "core",\n',next='    "abyss_run_potion_candidate": "core",\n';
 for(const mutant of [source+'\n',source.replace(first+next,next+first),source.replace('"dynamicExceptions": []','"dynamicExceptions": ["unknown"]'),source.replace('"reason": "Potion/upgrade/HP','"reason": "unreviewed Potion/upgrade/HP')]){
  assert.notEqual(mutant,source);
  for(const target of ['current','roster'])assert.throws(()=>project(mutant,target),/unreviewed integrated roster config source/);
 }
 for(const missing of [null,undefined,''])assert.throws(()=>project(missing,'current'),/roster config/);
 assert.throws(()=>project(source,'unknown'),/roster config composition target/);
 assert.throws(()=>projectRosterConfigSource('wrong.json',source,'current'),/roster config composition path/);
 assert.equal(preRosterConfigSource('wrong.json',source),source);
});

test('public roster bridges retain original witnesses and reject foreign partial or changed linked sources freshly',()=>{
 // The exhaustive registry matrix above owns every original mutation. These
 // representatives own composition into the unchanged public historical guards.
 const previous=project(source,'current'),raw=readFileSync(path,'utf8');
 for(const target of ['current','roster']){
  assert.equal(publicProjectRosterConfigSource(path,raw,target),project(source,target));
  assert.equal(publicPreRosterConfigSource(path,raw.replaceAll('\n','\r\n'),target),project(source,target));
  assert.equal(publicPreRosterConfigSource(path,project(source,target),target),project(source,target));
 }
 const line=source.split('\n').find(row=>row.includes('"abyss_run_potion_candidate":'));
 assert.ok(line);
 const admission='    "abyss_run_admission": "core",\n';
 const mutants=[source+'\n',source.replace(line+'\n',''),source.replace(line+'\n',line+'\n'+line+'\n'),
  source.replace('"abyss_run_potion_candidate":','"abyss_run_potion_candidate_unreviewed":'),source.replace(line,line.replace('"core"','"ui"')),
  source.replace(admission+line+'\n',line+'\n'+admission),source.replace('"dynamicExceptions": []','"dynamicExceptions": ["unknown"]'),
  source.replace('"reason": "Potion/upgrade/HP','"reason": "unreviewed Potion/upgrade/HP')];
 for(const mutant of mutants){
  assert.notEqual(mutant,source);
  for(const target of ['current','roster']){
   assert.throws(()=>publicProjectRosterConfigSource(path,mutant,target),/unreviewed integrated roster config source/);
   assert.equal(publicPreRosterConfigSource(path,mutant,target),mutant);
  }
  for(const guard of [preIntegratedNodeUiSource,preRetirementSource,preAcceptedPresentation])
   assert.throws(()=>guard(path,mutant),/unreviewed integrated/);
 }
 for(const guard of [preIntegratedNodeUiSource,preRetirementSource,preAcceptedPresentation])
  assert.equal(guard(path,previous),guard(path,source),'the sole complete prior union stays accepted');
 for(const missing of [null,undefined,''])assert.throws(()=>publicProjectRosterConfigSource(path,missing,'current'),/roster config/);
 assert.throws(()=>publicProjectRosterConfigSource(path,raw,'unknown'),/roster config composition target/);
 assert.throws(()=>publicProjectRosterConfigSource('wrong.json',source,'current'),/roster config composition path/);
 assert.equal(publicPreRosterConfigSource('wrong.json',source),source);
 const owner='src/lua/abyss_monster_intent_particle_view.lua',original=readFileSync(owner);
 const expected=publicProjectRosterConfigSource(path,raw,'current');
 try{
  writeFileSync(owner,Buffer.concat([original,Buffer.from('\n-- linked owner drift\n')]));
  assert.throws(()=>publicProjectRosterConfigSource(path,raw,'current'),/linked source identity/);
  assert.throws(()=>publicPreRosterConfigSource(path,raw,'current'),/linked source identity/);
 }finally{writeFileSync(owner,original);}
 assert.equal(publicProjectRosterConfigSource(path,raw,'current'),expected);
});


nativeTest('original Roster closure rejects relabeled missing changed or redirected inputs before import',()=>{
 for(const [archive,manifest,helper]of [[shared,sharedManifest,'tests/helpers/competition-roster-config-composition.mjs'],[additions,additionManifest,'tests/helpers/p0-presentation-inverse.mjs']]){
  const invalid=structuredClone(archive);invalid.sourceCommit='0'.repeat(40);
  assert.throws(()=>validateOriginalChain(invalid,manifest),/original Roster config chain commit/);
  for(const mutation of [value=>{delete value.files[helper];},value=>{value.files[helper].gitBlob='0'.repeat(40);}]){
   const changed=structuredClone(archive);mutation(changed);assert.throws(()=>validateOriginalChain(changed,manifest),/complete original Roster config chain inventory/);
  }
  for(const mutation of [value=>{value.files[helper].source+='\n';},value=>{value.files[helper].sha256='0'.repeat(64);}]){
   const changed=structuredClone(archive);mutation(changed);assert.throws(()=>validateOriginalChain(changed,manifest),/original complete Roster chain bytes/);
  }
  const ambiguous=structuredClone(archive);ambiguous.files[helper].existing=helper;
  assert.throws(()=>validateOriginalChain(ambiguous,manifest),/one complete original input/);
  const file=Object.keys(archive.files).find(file=>archive.files[file].existing),wrong=structuredClone(archive);
  wrong.files[file].existing=helper;
  assert.throws(()=>validateOriginalChain(wrong,manifest),/original input reference stays/);
  const missing=new Error('missing original Roster proof');
  assert.throws(()=>validateOriginalChain(archive,manifest,path=>{if(path===file)throw missing;return readOriginalInput(path);}),error=>error===missing,'original read failures remain visible');
  assert.throws(()=>validateOriginalChain(archive,manifest,path=>path===file?Buffer.from('{}\n'):readOriginalInput(path)),/original complete Roster chain bytes/);
  const crlf=validateOriginalChain(archive,manifest,path=>{const bytes=readOriginalInput(path);return path.endsWith('.gz')?bytes:Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n').replaceAll('\n','\r\n'));});
  for(const [file,bytes]of Object.entries(crlf))assert.deepEqual(bytes,originalInputs[file],'checkout CRLF retains the complete original Git bytes: '+file);
 }
 assert.notEqual(readFileSync(path,'utf8').replaceAll('\r\n','\n'),originalInputs[path].toString('utf8'),'current source is not the original Roster epoch');
});

nativeTest('current Roster registration admission validates every raw owner freshly at the supported develop target',async()=>{
 const {sourceEpoch}=await import('./helpers/combined-epoch/source-epoch.mjs');
 const raw=readFileSync(path,'utf8').replaceAll('\r\n','\n'),layers=JSON.parse(raw).layers,owners=sourceEpoch.proof.owners;
 for(const file of readdirSync('src/lua',{recursive:true}).filter(file=>file.endsWith('.lua')))
  assert.ok(Object.hasOwn(layers,file.slice(0,-4).replaceAll('/','.')),'current source remains classified: '+file);
 assert.equal(layers.abyss_run_admission,'core');
 // These independent expectations were verified against the original Git blob
 // d572702dc8966a1770c1c6dab67ef947e563afb8 at develop@d8a57cae.
 assert.equal(sourceEpoch.proof.targets.develop.commit,'d8a57cae2a867200ca8e588abc0d368e6cdb3799');
 const expected='0e75d9e1f08cfb7738215b9a31cce141f03cc2469077bce0db3376fe1f446a9c';
 let changed,replacement,reads=[];
 const reader=file=>{reads.push(file);if(file===changed){if(replacement instanceof Error)throw replacement;return replacement;}return readFileSync(file,'utf8');};
 const project=input=>sourceEpoch.preCombinedSource(path,input,{target:'develop',readSource:reader});
 const accepted=project(raw);assert.equal(hash(accepted),expected);assert.notEqual(accepted,raw);assert.deepEqual(reads,owners,'complete raw owner admission in original order');
 reads=[];assert.equal(project(raw.replaceAll('\n','\r\n')),accepted);assert.deepEqual(reads,owners,'CRLF is not cached authorization');
 for(const owner of owners){
  changed=owner;
  for(replacement of [readFileSync(owner,'utf8')+'\n',null,new Error('missing current owner')]){
   reads=[];assert.throws(()=>project(raw),/linked owner (identity|missing)/);
   assert.deepEqual(reads,owners.slice(0,owners.indexOf(owner)+1),'stop at the first untrusted raw owner');
  }
  changed=undefined;reads=[];assert.equal(project(raw),accepted);assert.deepEqual(reads,owners,'each restored owner requires a new complete admission');
 }
});

nativeTest('current Roster legacy bridge rejects incompatible owners rather than claiming either ancient witness',async()=>{
 const current=await import('./helpers/competition-roster-config-composition.mjs');
 const raw=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 assert.throws(()=>current.preRosterConfigSource(path,raw),/delivery linked source identity: src\/lua\/abyss_monster_intent_particle_view\.lua/,'an unsupported old bridge cannot borrow a much older delivery owner');
});
