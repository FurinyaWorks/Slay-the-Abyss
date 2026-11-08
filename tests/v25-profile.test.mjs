import test from 'node:test';
import assert from 'node:assert/strict';
import {v25ChromeArgs,validateV25Chrome,v25ChromeFromReceipt,v25CardAssetsFromReceipt,validateV25TextureReceipt} from '../scripts/v25-profile.mjs';
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

test('private V25 UI masks require an explicit source pack and survive audit reconstruction',()=>{
 assert.deepEqual(v25ChromeArgs(['--v25-ui-masks=build/mask.private.json','--v25-battle-chrome']),
  {args:[],v25BattleChrome:true,v25UiMasks:'build/mask.private.json'});
 for(const args of [['--v25-ui-masks='],['--v25-ui-masks=a','--v25-ui-masks=b']])assert.throws(()=>v25ChromeArgs(args));
 assert.throws(()=>validateV25Chrome({v25UiMasks:'a.json'}));
 assert.throws(()=>validateV25Chrome({v25BattleChrome:true,v25UiMasks:'a.json',releaseCandidate:true}));
 const invalid={experimentalBattleChrome:'v25-layered-v1',artFeatures:artFeatureReceipt({}),v25UiMasks:{}};
 assert.throws(()=>artBuildOptionsFromReceipt(invalid),/mask/i);
 const receipt={...invalid,v25UiMasks:{assetFile:{path:'mask.json',sha256:'a'.repeat(64)},inputs:[],templateIndices:{AbyssV25SelectionConstellation:12}}};
 assert.equal(artBuildOptionsFromReceipt(receipt).v25UiMasks,'mask.json');
 assert.ok(auditUiBuildArgs(receipt,{v25UiMasksPath:'isolated-mask.json'}).includes('--v25-ui-masks=isolated-mask.json'));
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

test('packed RGBA textures bind every original block once to distinct candidate roots',()=>{
 const texture={width:2,height:1,blocks:'00000000000100010a141e80'+'000100000001000100000000',count:2,drawCount:1,
  display:{position:[.5,0],size:[2,1]}};
 const prepared={sourceManifestSha256:'a'.repeat(64),binding:{variants:{attack:{basic:'shell'}},manaTemplateId:'mana'},
  textureData:{shell:texture,mana:{...texture,display:{position:[-66,93.5],size:[2,1]}}}};
 const masks={textureData:{mask:{...texture,width:512,height:512,display:{position:[0,0],size:[512,512]}}}};
 const options={masks,maskIndices:{mask:5},imageTemplateId:6,groupTemplateId:7};
 const source=v25CardBindingSource(prepared,{shell:3,mana:4},options);
 assert.match(source,/source-rgba-packed-v1/);assert.match(source,/uiMask/);
 assert.equal(source.split(texture.blocks).length-1,3,'each complete texture is stored once, including zero-alpha RGB');
 for(const broken of [{...options,imageTemplateId:3},{...options,groupTemplateId:6},{...options,imageTemplateId:0},
  {...options,maskIndices:{mask:4}}])assert.throws(()=>v25CardBindingSource(prepared,{shell:3,mana:4},broken),/template|binding/i);
 const maskOnly=v25CardBindingSource(undefined,undefined,options);
 assert.match(maskOnly,/enabled.*false/);assert.match(maskOnly,/uiMask/);
});

test('packed texture receipts reject shared-root aliases and unbound profiles before loading private files',()=>{
 const receipt={experimentalBattleChrome:'v25-layered-v1',v25CardAssets:{templateIndices:{shell:3,mana:4}},
  v25UiMasks:{templateIndices:{mask:5}},v25TextureRuntime:{profile:'source-rgba-packed-v1',imageTemplateIndex:6,containerTemplateIndex:7}};
 assert.doesNotThrow(()=>validateV25TextureReceipt(receipt));
 for(const patch of [{imageTemplateIndex:3},{containerTemplateIndex:6},{profile:'compact-v1'},{imageTemplateIndex:0},{extra:true}]){
  const broken={...receipt,v25TextureRuntime:{...receipt.v25TextureRuntime,...patch}};
  assert.throws(()=>validateV25TextureReceipt(broken),/packed V25 texture/);
 }
 assert.throws(()=>validateV25TextureReceipt({...receipt,v25CardAssets:undefined,v25UiMasks:undefined}));
 assert.throws(()=>validateV25TextureReceipt({...receipt,experimentalBattleChrome:undefined}));
 assert.doesNotThrow(()=>validateV25TextureReceipt({experimentalBattleChrome:'v25-layered-v1'}),'old exact-source candidates retain their pinned producer recipe');
});
