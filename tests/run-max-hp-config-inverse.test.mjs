import test,{after} from 'node:test';
import {historicalTest,createHistoricalBaseline,historicalInputPath} from './helpers/historical-baseline-inputs.mjs';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {analyzeSources} from '../scripts/check-architecture.mjs';

// Historical source contracts execute their exact original helper closure.
// The current public facade is exercised separately below on the live tree.
const archiveBytes=readFileSync(new URL('./fixtures/nodes-battle-original-chain-98fef95d.json.gz',import.meta.url));
const hash=s=>createHash('sha256').update(s).digest('hex');
assert.equal(hash(archiveBytes),'f904703b3e747713eba5297718f222a833bf84995c73fa0c8845723dfff11c96');
const archive=JSON.parse(gunzipSync(archiveBytes));
const readOriginalInput=path=>readFileSync(new URL('../'+path,import.meta.url));
function validateOriginalChain(value,readInput=readOriginalInput){
 assert.equal(value.schemaVersion,1);assert.equal(value.sourceCommit,'98fef95d047652aa6a8880241ddff28ef320a484','original Run and Nodes config chain commit');
 const manifest=Object.fromEntries(Object.entries(value.files).map(([path,binding])=>[path,binding.gitBlob]));
 assert.equal(hash(JSON.stringify(manifest)),'c472b6d2420318936d59c4eb4a3e5aa2a9803bf29e283ab27d5b38a3e97b5ad0','complete original Run and Nodes config chain inventory');
 return Object.fromEntries(Object.entries(value.files).map(([path,binding])=>{
  historicalInputPath(process.cwd(),path);
  assert.notEqual(Object.hasOwn(binding,'existing'),Object.hasOwn(binding,'source'),'one complete original input: '+path);
  if(binding.existing)assert.equal(binding.existing,path,'original input reference stays at its authenticated path');
  const raw=binding.existing?readInput(path):Buffer.from(binding.source);
  const source=path.endsWith('.gz')?raw:Buffer.from(raw.toString('utf8').replaceAll('\r\n','\n'));
  assert.equal(hash(source),binding.sha256,'original complete Run and Nodes chain bytes: '+path);
  assert.equal(createHash('sha1').update(`blob ${source.length}\0`).update(source).digest('hex'),binding.gitBlob,'original Run and Nodes chain Git blob: '+path);
  return [path,source];
 }));
}
const originalInputs=validateOriginalChain(archive),originalRoot=createHistoricalBaseline().directory;
after(()=>rmSync(originalRoot,{recursive:true,force:true}));
// Replace only this private baseline's fixture link, never the real oracle.
rmSync(join(originalRoot,'tests/fixtures'));
for(const [path,source]of Object.entries(originalInputs)){
 const target=historicalInputPath(originalRoot,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,source);
}
const previousCwd=process.cwd();let chain;
try{
 process.chdir(originalRoot);
 chain=await Promise.all(['run-max-hp-config-inverse','competition-roster-config-composition','nodes-battle-max-hp-config-inverse','core-architecture-inverse','approved-node-ui-refactor','approved-ui-inverse'].map(name=>import(pathToFileURL(join(originalRoot,'tests/helpers/'+name+'.mjs')).href)));
}catch(error){rmSync(originalRoot,{recursive:true,force:true});throw error;}finally{process.chdir(previousCwd);}
const [{projectRunMaxHpConfig,preRunMaxHpConfig},{preRosterConfigSource},{projectNodesBattleMaxHpConfig},{preCoreArchitectureSource},{preIntegratedNodeUiSource},{preApprovedUiSource}]=chain;
const path='config/architecture.json';
const read=p=>preRosterConfigSource(p,readFileSync(p,'utf8').replaceAll('\r\n','\n'));
const expected={live:'3476d3d6407f1a64c194add9937c48da1eb2ce6ba98cc90617feb3751aeb9c44',combined:'df2d58668d69864a61e3d177c8ab4183cedd11fb12bdb6f9e14312b008bf6f9b',run:'bc1a6dca0701091f73a8464de978a4b202597c70500c84c73f33a855a510240e'};
const run=['abyss_run_initialization','abyss_run_transition','abyss_run_rooms','abyss_run_settlement','abyss_run_potions'];
const nodes=['abyss_nodes_common','abyss_nodes_entry','abyss_nodes_events','abyss_nodes_sources'];
const battle=['abyss_battle_actions','abyss_battle_action_bindings','abyss_battle_card_bindings','abyss_battle_card_gestures','abyss_battle_card_layout','abyss_battle_details','abyss_battle_detail_bindings','abyss_battle_input_state','abyss_battle_potion_bindings','abyss_battle_render','abyss_battle_render_actors','abyss_battle_render_hud','abyss_battle_render_state','abyss_battle_targeting','abyss_battle_target_bindings'];
const additions=['abyss_max_hp_relics',...battle,...nodes,...run];
const project=(source,target)=>projectRunMaxHpConfig(path,source,target);

test('a historical projection cannot hide a missing MaxHP registration from the current production architecture gate',()=>{
 const sources=Object.fromEntries(readdirSync('src/lua').filter(file=>file.endsWith('.lua')).sort().map(file=>[file.slice(0,-4),read('src/lua/'+file)]));
 const live=JSON.parse(readFileSync(path,'utf8').replaceAll('\r\n','\n'));
 assert.deepEqual(analyzeSources(sources,live).errors,[]);
 const missing=structuredClone(live);delete missing.layers.abyss_max_hp_relics;
 assert.ok(analyzeSources(sources,missing).errors.some(error=>error.file==='src/lua/abyss_max_hp_relics.lua'&&error.message==='Module needs explicit classification'));
});

historicalTest('current union retains literal accepted Run config plus only MaxHP and the complete prior reviewed triple config',()=>{
 const source=read(path);assert.equal(hash(source),expected.live);
 const combined=project(source,'combined'),acceptedRun=project(source,'run');
 assert.equal(hash(combined),expected.combined);assert.equal(hash(acceptedRun),expected.run);
 const live=JSON.parse(source),previous=JSON.parse(combined),accepted=JSON.parse(acceptedRun);
 assert.deepEqual(Object.keys(live.layers),[...Object.keys(previous.layers),...run]);
 for(const target of [previous,accepted]){
  assert.deepEqual({...live,layers:null},{...target,layers:null});
  for(const [name,layer]of Object.entries(target.layers))assert.equal(live.layers[name],layer);
 }
 assert.deepEqual(Object.keys(live.layers).filter(name=>!Object.hasOwn(accepted.layers,name)),['abyss_max_hp_relics']);
 for(const name of [...run,...nodes,'abyss_max_hp_relics'])assert.equal(live.layers[name],'core');
 for(const name of battle)assert.equal(live.layers[name],'ui');
});

historicalTest('exact Run outer layer composes both unchanged inner complete-source proofs and preserves their old witnesses',()=>{
 const source=read(path),combined=project(source,'combined'),acceptedRun=project(source,'run');
 assert.throws(()=>projectNodesBattleMaxHpConfig(path,source,'nodes'),/unreviewed combined Nodes Battle Max HP/);
 assert.throws(()=>preCoreArchitectureSource(path,source),/unreviewed integrated core registration base/);
 for(const target of ['combined','run']){
  const projected=project(source,target);
  assert.equal(project(source.replaceAll('\n','\r\n'),target),projected);
  assert.equal(preRunMaxHpConfig(path,source,target),projected);
  assert.equal(preRunMaxHpConfig(path,projected,target),projected);
 }
 for(const witness of [source,source.replaceAll('\n','\r\n'),combined,acceptedRun]){
  assert.equal(preIntegratedNodeUiSource(path,witness),preIntegratedNodeUiSource(path,combined));
  assert.equal(preApprovedUiSource(path,witness),preApprovedUiSource(path,combined));
 }
});

historicalTest('all twenty-five live additive registrations reject missing duplicate renamed wrong-layer and cross-scope drift',()=>{
 const source=read(path),lines=source.split('\n'),mutants=[];
 for(const name of additions){
  const line=lines.find(line=>line.includes(`"${name}":`));assert.ok(line,name);
  mutants.push(source.replace(line+'\n',''),source.replace(line+'\n',line+'\n'+line+'\n'),source.replace(`"${name}":`,`"${name}_unknown":`),source.replace(line,line.replace(/: "(core|ui)"/,(_,layer)=>`: "${layer==='core'?'ui':'core'}"`)));
 }
 const first='    "abyss_run_initialization": "core",\n',next='    "abyss_run_transition": "core",\n';
 mutants.push(source+'\n',source.replace(first+next,next+first),source.replace(first,'').replace('  "layers": {\n','  "layers": {\n'+first),source.replace('"abyss_run_potions": "core"','"abyss_run_potions": "core",\n    "unknown": "core"'),source.replace('"dynamicExceptions": []','"dynamicExceptions": ["unknown"]'),source.replace('"abyss_run_potion_candidate": "core"','"abyss_run_potion_candidate": "ui"'),source.replace('"reason": "Potion/upgrade/HP','"reason": "unreviewed Potion/upgrade/HP'));
 let acceptedBaselineWitnesses=0;
 for(const mutant of mutants){
  assert.notEqual(mutant,source);
  for(const target of ['combined','run']){
   assert.throws(()=>project(mutant,target),/unreviewed combined Run Max HP/);
   assert.equal(preRunMaxHpConfig(path,mutant,target),mutant,'unmatched complete bytes remain visible to the original guards');
  }
  if(hash(mutant)===expected.run){
   acceptedBaselineWitnesses++;
   assert.equal(mutant,project(source,'run'),'only literal accepted58f config, not a partial or wildcard exemption');
   assert.equal(preIntegratedNodeUiSource(path,mutant),preIntegratedNodeUiSource(path,source));
   assert.equal(preApprovedUiSource(path,mutant),preApprovedUiSource(path,source));
  }else{
   assert.throws(()=>preIntegratedNodeUiSource(path,mutant),/unreviewed integrated/);
   assert.throws(()=>preApprovedUiSource(path,mutant),/unreviewed integrated/);
  }
 }
 assert.equal(acceptedBaselineWitnesses,1);
 assert.equal(mutants.length,107);
});

historicalTest('explicit Run proof rejects missing source wrong path unknown target and preserves all frozen prior witnesses',()=>{
 const source=read(path);
 for(const missing of [null,undefined,''])assert.throws(()=>project(missing,'combined'),/combined Run Max HP/);
 for(const wrongPath of ['config/other.json','data/presentation/ui_theme.json','src/lua/abyss_run.lua']){
  assert.throws(()=>projectRunMaxHpConfig(wrongPath,source,'run'),/combined Run Max HP path/);
  assert.equal(preRunMaxHpConfig(wrongPath,source),source);
 }
 assert.throws(()=>project(source,'unknown'),/combined Run Max HP target/);
 const frozen=[['tests/fixtures/nodes-battle-max-hp-config-inverse.json','5e130a11180cb03714f315a21f5cf90a722374c2833dda033529851ad2809b92'],['tests/fixtures/battle-max-hp-config-inverse.json','79bca8cc4391e1906049dd815dd143267894f37425253ca6ac9a836d7aa21456']];
 for(const [file,expectedHash]of frozen)assert.equal(hash(read(file)),expectedHash);
});

test('original Run and Nodes config closure rejects relabeled, missing and changed inputs before import',()=>{
 const invalid=structuredClone(archive);invalid.sourceCommit='0'.repeat(40);
 assert.throws(()=>validateOriginalChain(invalid),/original Run and Nodes config chain commit/);
 const helper='tests/helpers/competition-roster-config-composition.mjs';
 for(const mutation of [value=>{delete value.files[helper];},value=>{value.files[helper].gitBlob='0'.repeat(40);}]){
  const changed=structuredClone(archive);mutation(changed);assert.throws(()=>validateOriginalChain(changed),/complete original Run and Nodes config chain inventory/);
 }
 for(const mutation of [value=>{value.files[helper].source+='\n';},value=>{value.files[helper].sha256='0'.repeat(64);}]){
  const changed=structuredClone(archive);mutation(changed);assert.throws(()=>validateOriginalChain(changed),/original complete Run and Nodes chain bytes/);
 }
 const wrong=structuredClone(archive),proof='tests/fixtures/run-max-hp-config-inverse.json';
 wrong.files[proof].existing='tests/fixtures/battle-max-hp-config-inverse.json';
 assert.throws(()=>validateOriginalChain(wrong),/original input reference stays/);
 const missing=new Error('missing original Run and Nodes proof');
 assert.throws(()=>validateOriginalChain(archive,file=>{if(file===proof)throw missing;return readOriginalInput(file);}),error=>error===missing,'read failures stay visible before import');
 assert.throws(()=>validateOriginalChain(archive,file=>file===proof?Buffer.from('{}\n'):readOriginalInput(file)),/original complete Run and Nodes chain bytes/,'corrupt independent proof cannot authorize an old helper');
 const crlf=validateOriginalChain(archive,file=>{const bytes=readOriginalInput(file);return file.endsWith('.gz')?bytes:Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n').replaceAll('\n','\r\n'));});
 for(const [file,bytes]of Object.entries(originalInputs))assert.deepEqual(crlf[file],bytes,'checkout CRLF recovers the same complete Git bytes: '+file);
 // Independent archive binding also authenticates the source presented to the
 // original Run cases; the live tree must not be mislabeled as that source.
 assert.notEqual(readFileSync(path,'utf8').replaceAll('\r\n','\n'),originalInputs[path].toString('utf8'));
});

test('current Run architecture admission uses its declared target and rereads every raw owner on each call',async()=>{
 const {sourceEpoch}=await import('./helpers/combined-epoch/source-epoch.mjs');
 const raw=readFileSync(path,'utf8').replaceAll('\r\n','\n'),owners=sourceEpoch.proof.owners;
 // Independent complete Git config at the declared develop target d8a57cae,
 // not a hash obtained from the projector's own return value or current proof.
 const targetHash='0e75d9e1f08cfb7738215b9a31cce141f03cc2469077bce0db3376fe1f446a9c';
 let changed,replacement,reads=[];
 const reader=file=>{reads.push(file);if(file===changed){if(replacement instanceof Error)throw replacement;return replacement;}return readFileSync(file,'utf8');};
 const project=source=>sourceEpoch.preCombinedSource(path,source,{target:'develop',readSource:reader});
 const accepted=project(raw);assert.equal(hash(accepted),targetHash);assert.notEqual(accepted,raw);
 assert.notEqual(hash(accepted),expected.combined,'current develop target is not the ancient Run target');
 assert.deepEqual(reads,owners,'complete fresh raw closure in admission order');
 const layers=JSON.parse(raw).layers;
 for(const name of [...run,...nodes,'abyss_max_hp_relics'])assert.equal(layers[name],'core','current registration: '+name);
 for(const name of battle)assert.equal(layers[name],'ui','current registration: '+name);
 for(const source of [raw,raw.replaceAll('\n','\r\n')]){
  reads=[];assert.equal(project(source),accepted);assert.deepEqual(reads,owners,'warm calls still read the complete raw owner closure');
 }
 for(const owner of owners){
  changed=owner;
  for(replacement of [readFileSync(owner,'utf8')+'\n',null,new Error('missing current Run owner')]){
   reads=[];assert.throws(()=>project(raw),error=>{
    assert.ok(error.message.startsWith('combined linked owner '+(replacement instanceof Error?'missing: ':'identity: ')+owner),error.message);return true;
   });
   assert.deepEqual(reads,owners.slice(0,owners.indexOf(owner)+1),'first bad raw owner stops validation: '+owner);
   changed=undefined;reads=[];assert.equal(project(raw),accepted);assert.deepEqual(reads,owners,'restoration validates afresh after every failure');changed=owner;
  }
 }
 changed=undefined;
 for(const unknown of [null,undefined,'',raw+'unreviewed',raw.replace('"abyss_run_initialization": "core"','"abyss_run_initialization": "ui"')]){
  reads=[];assert.equal(project(unknown),unknown);assert.deepEqual(reads,[],'unknown input grants no owner reads');
 }
 reads=[];assert.equal(project(accepted),accepted);assert.deepEqual(reads,[],'old accepted bytes grant no current owner reads');
 assert.throws(()=>sourceEpoch.preCombinedSource(path,raw,{target:'unknown',readSource:reader}),/unknown source target/);
 assert.throws(()=>sourceEpoch.preCombinedSource(path,raw,{target:'develop',readSource:null}),/linked owner reader/);
});

test('legacy Run config bridges reject unsupported current owners rather than claiming an ancient Run target',async()=>{
 const current=await import('./helpers/run-max-hp-config-inverse.mjs');
 const raw=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 assert.throws(()=>current.preRunMaxHpConfig(path,raw),/delivery linked source identity: src\/lua\/abyss_monster_intent_particle_view\.lua/,'current raw owners cannot borrow the original Run closure');
});
