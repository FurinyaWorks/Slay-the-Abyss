import test from 'node:test';
import assert from 'node:assert/strict';
import {v25ChromeArgs,validateV25Chrome,v25ChromeFromReceipt,v25CardAssetsFromReceipt} from '../scripts/v25-profile.mjs';
import {v25CardBindingSource,assertV25CardPreparation} from '../scripts/v25-card-binding.mjs';
import {artFeatureReceipt,artBuildOptionsFromReceipt} from '../scripts/art-features.mjs';
import {auditUiBuildArgs} from '../scripts/audit-native-candidate.mjs';
import {buildNativeCandidate} from '../scripts/build-native-candidate.mjs';
import {validateUiProfileOptions,uiProfileReceipt,uiProfileFromReceipt} from '../scripts/ui-profile.mjs';

test('V25 chrome is explicit, rejects flat artwork and cannot become an RC',()=>{
  assert.equal(validateV25Chrome({}),false);
  assert.equal(validateV25Chrome({v25BattleChrome:true}),true);
  for(const options of [{v25BattleChrome:1},{v25BattleChrome:true,lightweight2d:true},{v25BattleChrome:true,releaseCandidate:true}])
    assert.throws(()=>validateV25Chrome(options));
});
test('CLI rejects duplicates and malformed chrome options',()=>{
  assert.deepEqual(v25ChromeArgs(['base.gil','--v25-battle-chrome']),{args:['base.gil'],v25BattleChrome:true});
  for(const args of [['--v25-battle-chrome=false'],['--v25-battle-chrome','--v25-battle-chrome']])assert.throws(()=>v25ChromeArgs(args));
});
test('receipt reconstruction preserves chrome and rejects unrecognized profiles',()=>{
  assert.equal(v25ChromeFromReceipt({}),false);
  assert.equal(v25ChromeFromReceipt({experimentalBattleChrome:'v25-layered-v1'}),true);
  assert.throws(()=>v25ChromeFromReceipt({experimentalBattleChrome:'v25'}));
  assert.throws(()=>v25ChromeFromReceipt({experimentalBattleChrome:'v25-layered-v1',experimentalProfile:'bounded-native-2d-v1'}));
});
test('source audit regenerates the same chrome instead of silently falling back',()=>{
  const receipt={artFeatures:artFeatureReceipt({}),experimentalBattleChrome:'v25-layered-v1'};
  assert.equal(artBuildOptionsFromReceipt(receipt).v25BattleChrome,true);
  assert.ok(auditUiBuildArgs(receipt).includes('--v25-battle-chrome'));
  assert.ok(!auditUiBuildArgs({artFeatures:artFeatureReceipt({})}).includes('--v25-battle-chrome'));
});
test('candidate rejects a fake preparation that could label old UI as V25 chrome',async()=>{
  await assert.rejects(buildNativeCandidate({v25BattleChrome:true,prepare(){}}),/actual UI builder/);
});
test('V25 can stop hidden pages without enabling flat card or low-detail art',()=>{
  assert.equal(validateUiProfileOptions({nativePageLifecycle:true,v25BattleChrome:true}),true);
  const receipt={uiProfile:uiProfileReceipt(true),experimentalBattleChrome:'v25-layered-v1',artFeatures:artFeatureReceipt({})};
  assert.equal(uiProfileFromReceipt(receipt),true);
  const args=auditUiBuildArgs(receipt);
  assert.ok(args.includes('--native-page-lifecycle'));
  assert.ok(args.includes('--v25-battle-chrome'));
  assert.ok(!args.includes('--lightweight-2d'));
  assert.throws(()=>validateUiProfileOptions({nativePageLifecycle:true}));
});
test('private card assets stay explicit, local and bound to V25 development mode',()=>{
 assert.deepEqual(v25ChromeArgs(['--v25-card-assets=build/private.json','--v25-battle-chrome']),
  {args:[],v25BattleChrome:true,v25CardAssets:'build/private.json'});
 for(const args of [['--v25-card-assets='],['--v25-card-assets=a','--v25-card-assets=b']])assert.throws(()=>v25ChromeArgs(args));
 assert.throws(()=>validateV25Chrome({v25CardAssets:'a.json'}));
 assert.throws(()=>validateV25Chrome({v25BattleChrome:true,v25CardAssets:'a.json',releaseCandidate:true}));
 assert.throws(()=>v25CardAssetsFromReceipt({v25CardAssets:{assetFile:{path:'a.json',sha256:'a'.repeat(64)},inputs:[],templateIndices:{}}}));
 const receipt={experimentalBattleChrome:'v25-layered-v1',artFeatures:artFeatureReceipt({}),
  v25CardAssets:{assetFile:{path:'a.json',sha256:'a'.repeat(64)},inputs:[],templateIndices:{}}};
 assert.equal(v25CardAssetsFromReceipt(receipt),'a.json');
 assert.ok(auditUiBuildArgs(receipt,{v25CardAssetsPath:'isolated.json'}).includes('--v25-card-assets=isolated.json'));
});
test('template bindings cannot enable a partial or unbound private surface',()=>{
 const prepared={sourceManifestSha256:'a'.repeat(64),binding:{variants:{attack:{basic:'shell'}},manaTemplateId:'mana'}};
 assert.match(v25CardBindingSource(),/enabled=false/);
 assert.throws(()=>v25CardBindingSource(prepared,{shell:3}),/Missing V25/);
 assert.throws(()=>v25CardBindingSource(prepared,{shell:3,mana:0}),/Missing V25/);
 assert.throws(()=>v25CardBindingSource(prepared,{shell:3,mana:3}),/Duplicate V25/);
 const source=v25CardBindingSource(prepared,{shell:3,mana:4});
 assert.match(source,/enabled.*true/);assert.match(source,/manaTemplateId.*4/);
});

test('candidate source snapshot and emitted templates must match the first private preparation',()=>{
 const record={path:'private.png',sha256:'a'.repeat(64),bytes:12};
 const template={name:'V25Shell',kind:'container',children:[]};
 const prepared={inputs:[record],templates:[template]};
 assert.doesNotThrow(()=>assertV25CardPreparation(prepared,[{path:'normal.lua'},record],[template]));
 assert.throws(()=>assertV25CardPreparation(prepared,[{...record,sha256:'b'.repeat(64)}]),/source snapshot/);
 assert.throws(()=>assertV25CardPreparation(prepared,[record],[]),/emitted template/);
 assert.throws(()=>assertV25CardPreparation(prepared,[record],[template,template]),/emitted template/);
 assert.throws(()=>assertV25CardPreparation(prepared,[record],[{...template,visible:true}]),/emitted template/);
});
