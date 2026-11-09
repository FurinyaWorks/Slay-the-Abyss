import currentTest,{after} from 'node:test';
import {historicalTest as test,createHistoricalBaseline,historicalInputPath} from './helpers/historical-baseline-inputs.mjs';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
// Historical source contracts execute their exact original helper closure.
// The current public facade is exercised separately below on the live tree.
const archiveBytes=readFileSync(new URL('./fixtures/nodes-battle-original-chain-98fef95d.json.gz',import.meta.url));
const hash=s=>createHash('sha256').update(s).digest('hex');
assert.equal(hash(archiveBytes),'f904703b3e747713eba5297718f222a833bf84995c73fa0c8845723dfff11c96');
const archive=JSON.parse(gunzipSync(archiveBytes));
const readOriginalInput=path=>readFileSync(new URL('../'+path,import.meta.url));
function validateOriginalChain(value,readInput=readOriginalInput){
 assert.equal(value.schemaVersion,1);assert.equal(value.sourceCommit,'98fef95d047652aa6a8880241ddff28ef320a484','original Nodes config chain commit');
 const manifest=Object.fromEntries(Object.entries(value.files).map(([path,binding])=>[path,binding.gitBlob]));
 assert.equal(hash(JSON.stringify(manifest)),'c472b6d2420318936d59c4eb4a3e5aa2a9803bf29e283ab27d5b38a3e97b5ad0','complete original Nodes config chain inventory');
 return Object.fromEntries(Object.entries(value.files).map(([path,binding])=>{
  historicalInputPath(process.cwd(),path);
  assert.notEqual(Object.hasOwn(binding,'existing'),Object.hasOwn(binding,'source'),'one complete original input: '+path);
  if(binding.existing)assert.equal(binding.existing,path,'original input reference stays at its authenticated path');
  const raw=binding.existing?readInput(path):Buffer.from(binding.source);
  const source=path.endsWith('.gz')?raw:Buffer.from(raw.toString('utf8').replaceAll('\r\n','\n'));
  assert.equal(hash(source),binding.sha256,'original complete Nodes chain bytes: '+path);
  assert.equal(createHash('sha1').update(`blob ${source.length}\0`).update(source).digest('hex'),binding.gitBlob,'original Nodes chain Git blob: '+path);
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
 chain=await Promise.all(['run-max-hp-config-inverse','competition-roster-config-composition','nodes-battle-max-hp-config-inverse','battle-max-hp-config-inverse','core-architecture-inverse','approved-node-ui-refactor','approved-ui-inverse'].map(name=>import(pathToFileURL(join(originalRoot,'tests/helpers/'+name+'.mjs')).href)));
}catch(error){rmSync(originalRoot,{recursive:true,force:true});throw error;}finally{process.chdir(previousCwd);}
const [,{preRosterConfigSource},{preNodesBattleMaxHpConfig},{projectBattleMaxHpConfig,preCompositeBattleMaxHpConfig},,{preIntegratedNodeUiSource},{preApprovedUiSource}]=chain;
const path='config/architecture.json';
// The new exact outer proof supplies this unchanged inner proof's owned config.
const read=p=>preNodesBattleMaxHpConfig(p,preRosterConfigSource(p,readFileSync(p,'utf8').replaceAll('\r\n','\n')));
const battleHash='66b0aeb0d8a21a587cf67a14c1d503478674012045a303ece995db3532097244';
const maxHpHash='01c0e67dc5c791f9aeaf93afd3cd659ee93357958ac7ce45a474ce1cf720aaca';
const battleModules=['abyss_battle_actions','abyss_battle_action_bindings','abyss_battle_card_bindings','abyss_battle_card_gestures','abyss_battle_card_layout','abyss_battle_details','abyss_battle_detail_bindings','abyss_battle_input_state','abyss_battle_potion_bindings','abyss_battle_render','abyss_battle_render_actors','abyss_battle_render_hud','abyss_battle_render_state','abyss_battle_targeting','abyss_battle_target_bindings'];

test('combined config removes only known Battle or Max HP additions to the unchanged complete accepted identities',()=>{
 const source=read(path),battle=projectBattleMaxHpConfig(path,source,'battle'),maxHp=projectBattleMaxHpConfig(path,source,'maxHp');
 assert.equal(hash(battle),battleHash);assert.equal(hash(maxHp),maxHpHash);
 const live=JSON.parse(source),beforeBattle=JSON.parse(maxHp),beforeMaxHp=JSON.parse(battle);
 assert.deepEqual(Object.keys(live.layers).filter(key=>!Object.hasOwn(beforeBattle.layers,key)).sort(),[...battleModules].sort());
 for(const name of battleModules)assert.equal(live.layers[name],'ui');
 assert.deepEqual(Object.keys(live.layers).filter(key=>!Object.hasOwn(beforeMaxHp.layers,key)),['abyss_max_hp_relics']);
 assert.equal(live.layers.abyss_max_hp_relics,'core');
 for(const previous of [beforeBattle,beforeMaxHp]){
  for(const [key,value]of Object.entries(previous.layers))assert.equal(live.layers[key],value);
  assert.deepEqual({...live,layers:null},{...previous,layers:null},'no other architecture semantics are removed');
 }
 for(const [name,expected]of [['battle',battle],['maxHp',maxHp]])assert.equal(projectBattleMaxHpConfig(path,source.replaceAll('\n','\r\n'),name),expected);
 assert.equal(preCompositeBattleMaxHpConfig(path,source),maxHp);
 for(const previous of [battle,maxHp])assert.equal(preCompositeBattleMaxHpConfig(path,previous),previous,'older complete witnesses remain exact inputs to their own inverse');
});

test('combined projection rejects missing wrong-path unknown duplicated deleted reordered and unrelated inputs',()=>{
 const source=read(path),battleLine='    "abyss_battle_actions": "ui",\n',maxHpLine='    "abyss_max_hp_relics": "core",\n';
 assert.equal(source.split(battleLine).length,2);assert.equal(source.split(maxHpLine).length,2);
 const next='    "abyss_battle_action_bindings": "ui",\n';
 const mutants=[source+'\n',source.replace(battleLine,''),source.replace(maxHpLine,''),source.replace(battleLine,battleLine+battleLine),source.replace(maxHpLine,maxHpLine+maxHpLine),source.replace(battleLine+next,next+battleLine),source.replace('"dynamicExceptions": []','"dynamicExceptions": ["unknown"]'),source.replace('"abyss_run_potion_candidate": "core"','"abyss_run_potion_candidate": "ui"')];
 for(const mutant of mutants){
  assert.notEqual(mutant,source);
  for(const target of ['battle','maxHp'])assert.throws(()=>projectBattleMaxHpConfig(path,mutant,target),/unreviewed combined Battle Max HP/);
  assert.equal(preCompositeBattleMaxHpConfig(path,mutant),mutant);
  if(hash(mutant)===battleHash)assert.equal(preApprovedUiSource(path,mutant),preApprovedUiSource(path,projectBattleMaxHpConfig(path,source,'battle')),'removing all Max HP additions restores an exact older complete witness, never a partial drift');
  else assert.throws(()=>preApprovedUiSource(path,mutant),/unreviewed integrated/,'existing guard still rejects anything beyond the complete exact historical witnesses');
 }
 for(const missing of [null,undefined,''])assert.throws(()=>projectBattleMaxHpConfig(path,missing,'battle'),/combined Battle Max HP/);
 for(const wrongPath of ['config/other.json','src/lua/abyss_battle_ui.lua'])assert.throws(()=>projectBattleMaxHpConfig(wrongPath,source,'maxHp'),/combined Battle Max HP path/);
 assert.throws(()=>projectBattleMaxHpConfig(path,source,'all'),/combined Battle Max HP target/);
 assert.throws(()=>preApprovedUiSource(path,null),'a missing bound config remains rejected by the original guard');
});

test('combined source traverses the unchanged strict historical guards through either complete accepted config',()=>{
 const source=read(path),battle=projectBattleMaxHpConfig(path,source,'battle'),maxHp=projectBattleMaxHpConfig(path,source,'maxHp');
 const expected=preIntegratedNodeUiSource(path,maxHp);
 assert.equal(preIntegratedNodeUiSource(path,battle),expected);
 assert.equal(preIntegratedNodeUiSource(path,source),expected);
 assert.equal(preApprovedUiSource(path,source),preApprovedUiSource(path,battle));
 const frozen=[['tests/fixtures/battle-ui-governance-inverse.json','392785f4aa6d63795bbd42c9cb354339a175deddc0aa3bcd79a273e43e217e1f'],['tests/fixtures/max-hp-pr313-source-inverse.json','7c1d5bd39878668c7bdc811a4467d8726f811ca7db264d9d7c67e8f016fa85c9'],['tests/fixtures/approved-ui-latest-to-53fa.json','39f651e8ec7a3037947d1a76123c2d03a521dd4a05168565f80f7222590ec89a']];
 for(const [file,expectedHash]of frozen)assert.equal(hash(read(file)),expectedHash,'original full-source fixture stays unchanged: '+file);
});

currentTest('Battle config replay authenticates its original helper closure and rejects changed bytes',()=>{
 for(const file of ['tests/helpers/battle-max-hp-config-inverse.mjs','tests/helpers/approved-ui-inverse.mjs']){
  const changed=structuredClone(archive);
  const readChanged=input=>Buffer.concat([readOriginalInput(input),Buffer.from(input===file?'\n':'')]);
  if(!changed.files[file].existing)changed.files[file].source+='\n';
  assert.throws(()=>validateOriginalChain(changed,readChanged),/original complete Nodes chain bytes/);
 }
 const changed=structuredClone(archive);delete changed.files['tests/helpers/battle-max-hp-config-inverse.mjs'];
 assert.throws(()=>validateOriginalChain(changed),/complete original Nodes config chain inventory/);
 // Simulate an already-CRLF checkout too: expanding LF twice would create
 // CRCRLF and corrupt the authenticated bytes even though the source is valid.
 const asCrlf=(file,bytes)=>file.endsWith('.gz')?bytes:Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n').replaceAll('\n','\r\n'));
 for(const readInput of [readOriginalInput,file=>asCrlf(file,readOriginalInput(file))]){
  const crlf=validateOriginalChain(archive,file=>asCrlf(file,readInput(file)));
  for(const [file,bytes]of Object.entries(originalInputs))assert.deepEqual(crlf[file],bytes,'CRLF checkout preserves original complete bytes: '+file);
 }
});

currentTest('current Battle config facade rejects incompatible modern owners instead of borrowing historical admission',async()=>{
 const current=await import('./helpers/battle-max-hp-config-inverse.mjs');
 const raw=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 assert.notEqual(raw,originalInputs[path].toString('utf8'),'historical contract is not current production acceptance');
 for(const target of ['battle','maxHp'])assert.throws(()=>current.projectBattleMaxHpConfig(path,raw,target),/delivery linked source identity: src\/lua\/abyss_monster_intent_particle_view\.lua/);
 assert.throws(()=>current.preCompositeBattleMaxHpConfig(path,raw),/delivery linked source identity: src\/lua\/abyss_monster_intent_particle_view\.lua/);
});
