import test from 'node:test';
import {preOfficialUiRepairSource} from './helpers/official-ui-repair-source-epoch.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {componentUiSourceEpoch} from './helpers/component-ui-source-epoch.mjs';
import {sourceSlice} from './helpers/closeout-source-epoch.mjs';
import {
 officialBattlePotionHudSourceProof as proof,preOfficialBattlePotionHudSource,
 preOfficialBattleSource,officialBattleResponseSourceProof as response,
 officialBattleLocalRenderSourceProof as localRender,officialBattleFeedbackSourceProof as feedback,
 officialBattleMouseAimSourceProof as mouseAim,preOfficialBattleMouseAimSource,
} from './helpers/official-battle-source-inverse.mjs';

const hash=source=>createHash('sha256').update(source).digest('hex');
// This literal Git contract predates shared CardSkin; authenticate the current
// closure before selecting the exact reviewed pre-repair battle source view.
const historical=path=>sourceSlice(path,readFileSync(path,'utf8'),'officialUiRepairPrior');
const changed=[
 'src/lua/abyss_battle_actions.lua','src/lua/abyss_battle_card_gestures.lua',
 'src/lua/abyss_battle_card_view.lua','src/lua/abyss_battle_info_content.lua',
 'src/lua/abyss_battle_info_view.lua','src/lua/abyss_battle_render_state.lua',
];

test('potion HUD epoch authenticates all six Git sources and only the historical owner intersection',()=>{
 assert.equal(proof.beforeCommit,'4d3fe8ae7b47094e4aa93bfc60351c6d9231a098');
 assert.equal(proof.afterCommit,'bf4dc9237d396b301140eaad3bfb8d8347e23a0a');
 const old=JSON.parse(gunzipSync(readFileSync(new URL('./helpers/combined-epoch/source-epoch.json.gz',import.meta.url))));
 assert.deepEqual(Object.keys(proof.files),changed.filter(path=>old.owners.includes(path)));
 assert.deepEqual(Object.keys(proof.unprojectedChanges),changed.filter(path=>!old.owners.includes(path)));
 assert.deepEqual([...Object.keys(proof.files),...Object.keys(proof.unprojectedChanges)].sort(),changed);
 for(const [path,binding]of Object.entries({...proof.files,...proof.unprojectedChanges})){
  for(const side of ['before','after']){
   const source=binding[side+'Source'];assert.equal(hash(source),binding[side+'Sha256'],path+' '+side);
   assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex'),binding[side+'GitBlobSha1']);
  }
  const predecessor=response.files[path]?.afterSource??localRender.files[path]?.afterSource
   ??feedback.files[path]?.afterSource??componentUiSourceEpoch.proof.current[path]?.source;
  assert.equal(binding.beforeSource,predecessor,path+' exact immutable predecessor');
  assert.notEqual(binding.beforeSha256,binding.afterSha256);
  assert.equal(preOfficialBattleMouseAimSource(path,preOfficialUiRepairSource(path,historical(path))).replaceAll('\r\n','\n'),binding.afterSource,path+' committed after identity');
  assert.ok(Object.isFrozen(binding));
 }
 assert.ok(Object.isFrozen(proof)&&Object.isFrozen(proof.files)&&Object.isFrozen(proof.unprojectedChanges));
});

test('mouse aim epoch authenticates the complete single-owner Git change and refuses drift',()=>{
 const path='src/lua/abyss_battle_card_view.lua',binding=mouseAim.files[path];
 assert.deepEqual(Object.keys(mouseAim.files),[path]);assert.deepEqual(Object.keys(mouseAim.unprojectedChanges),[]);
 assert.equal(binding.beforeSource,proof.files[path].afterSource);
 assert.equal(preOfficialUiRepairSource(path,historical(path).replaceAll('\r\n','\n')),binding.afterSource);
 for(const side of ['before','after']){
  const source=binding[side+'Source'];assert.equal(hash(source),binding[side+'Sha256']);
  assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex'),binding[side+'GitBlobSha1']);
 }
 for(const source of [binding.afterSource,binding.afterSource.replaceAll('\n','\r\n')]){
  assert.equal(preOfficialBattleMouseAimSource(path,source),binding.beforeSource);
  assert.equal(preOfficialBattleSource(path,source),preOfficialBattleSource(path,binding.beforeSource));
 }
 for(const source of [binding.afterSource+'\n',binding.afterSource.slice(1),'\ufeff'+binding.afterSource,null,{},17]){
  assert.equal(preOfficialBattleMouseAimSource(path,source),source);
  assert.equal(preOfficialBattleSource(path,source),source);
 }
 for(const foreign of ['foreign','__proto__',...changed.filter(p=>p!==path)])assert.equal(preOfficialBattleMouseAimSource(foreign,binding.afterSource),binding.afterSource);
});

test('potion HUD inverse composes outermost while exact-source and owner drift are rejected',()=>{
 for(const [path,binding]of Object.entries(proof.files)){
  const after=binding.afterSource;
  for(const source of [after,after.replaceAll('\n','\r\n')]){
   assert.equal(preOfficialBattlePotionHudSource(path,source),binding.beforeSource,path);
   assert.equal(preOfficialBattleSource(path,source),preOfficialBattleSource(path,binding.beforeSource),path+' immutable inverse chain');
  }
  assert.equal(preOfficialBattlePotionHudSource(path,binding.beforeSource),binding.beforeSource,'older epoch is not rewritten');
  const drift=[after+'\n',after.slice(1),after.replace(/\n/,'\n '),'\ufeff'+after,null,undefined,{},17];
  for(const source of drift){
   assert.equal(preOfficialBattlePotionHudSource(path,source),source,path+' modified source refused');
   assert.equal(preOfficialBattleSource(path,source),source,path+' modified source cannot enter an older epoch');
  }
  for(const foreign of ['foreign','__proto__','constructor','src/lua/abyss_battle_card_glow.lua',...changed.filter(p=>p!==path)]){
   assert.equal(preOfficialBattlePotionHudSource(foreign,after),after,foreign+' wrong-owner source refused');
   assert.equal(preOfficialBattleSource(foreign,after),after,foreign+' no historical owner widening');
  }
 }
 for(const [path,binding]of Object.entries(proof.unprojectedChanges)){
  assert.equal(preOfficialBattlePotionHudSource(path,binding.afterSource),binding.afterSource,'witness does not authorize projection');
  assert.equal(preOfficialBattleSource(path,binding.afterSource),binding.afterSource,'unprotected owner stays outside history');
 }
});
