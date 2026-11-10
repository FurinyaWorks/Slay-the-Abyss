import {nativeAudioBuildArgs,buildNativeAudioGame} from '../scripts/build-native-audio-game.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {deckCardTemplate} from '../scripts/deck-ui-layout.mjs';
import {applyOfficialAssets,officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {officialAssetsProfile,officialAssetFlags,validateOfficialAssets,officialAssetsArgs,officialAssetsFromReceipt} from '../scripts/official-assets-profile.mjs';
import {artFeatureReceipt,artBuildOptionsFromReceipt,readArtFeatures} from '../scripts/art-features.mjs';
import {portraitInventory,portraitRuntimeInputs} from '../scripts/official-portraits.mjs';
import {auditUiBuildArgs} from '../scripts/audit-native-candidate.mjs';
import {uiProfileReceipt,uiProfileFromReceipt,validateUiProfileOptions} from '../scripts/ui-profile.mjs';
import {buildUI,assertNativeUiCapacity} from '../scripts/build-ui.mjs';
import {buildNativeCandidate} from '../scripts/build-native-candidate.mjs';
import {gameBuildArgs} from '../scripts/build-game.mjs';
const children=node=>node.controls??node.children??[];
const all=node=>[node,...children(node).flatMap(all)];
const paths=(node,prefix='')=>allPaths(node,prefix);
function allPaths(node,prefix){const path=prefix+'/'+node.name;return [[path,node],...children(node).flatMap(item=>allPaths(item,path))];}
const child=(node,name)=>children(node).find(item=>item.name===name);
function receipt(){return {officialAssetsProfile,artFeatures:artFeatureReceipt(officialAssetFlags),uiProfile:uiProfileReceipt(true),
 officialPortraits:{...portraitInventory(officialAssetFlags),inputs:portraitRuntimeInputs(officialAssetFlags).map(path=>({path}))}};}

test('official art is opt-in and preserves both legacy CLI presets and strict candidate guards',async()=>{
 assert.equal(validateOfficialAssets({}),false);
 assert.equal(validateOfficialAssets({officialAssets:true}),true);
 assert.deepEqual(officialAssetsArgs(['map.gil','--official-assets']),{args:['map.gil'],officialAssets:true});
 for(const args of [['--official-assets=false'],['--official-assets','--official-assets']])assert.throws(()=>officialAssetsArgs(args));
 for(const patch of [{officialAssets:1},{releaseCandidate:true},{lightweight2d:true},{v25BattleChrome:true},{v25CardAssets:'private'},{v25UiMasks:'private'},
  {nativeCardArt:{count:0}},{performanceArt:true},{readyCardArt:true},{componentWidgets:{}},{prepare(){}},{artFeatures:{cards:true}},
  {artFeatures:{selectionAvatar:false}},{artFeatures:{battlePortrait:false}},{artFeatures:{menuBackground:true}}]){
  assert.throws(()=>validateOfficialAssets({officialAssets:true,...patch}));
 }
 await assert.rejects(buildNativeCandidate({officialAssets:true,prepare(){}}),/separate non-release/);
 assert.deepEqual(gameBuildArgs(['base.gil','--art-version=official']),['base.gil','--official-assets','--native-page-lifecycle']);
 for(const version of ['legacy','enhanced'])assert(!gameBuildArgs(['base.gil','--art-version='+version]).includes('--official-assets'));
});

test('receipts and pinned source audits reconstruct official art and reject mismatched profiles',()=>{
 const value=receipt();
 assert.equal(officialAssetsFromReceipt(value),true);
 assert.equal(artBuildOptionsFromReceipt(value).officialAssets,true);
 assert.equal(uiProfileFromReceipt(value),true);
 assert.equal(validateUiProfileOptions({officialAssets:true,nativePageLifecycle:true}),true);
 const args=auditUiBuildArgs(value);
 assert(args.includes('--official-assets'));assert(args.includes('--native-page-lifecycle'));
 assert(!args.includes('--lightweight-2d'));assert(!args.includes('--v25-battle-chrome'));
 assert.equal(officialAssetsFromReceipt({}),false);
 for(const patch of [{officialAssetsProfile:'unknown'},{experimentalBattleChrome:'v25-layered-v1'},
  {experimentalProfile:'bounded-2d-v1'},{artFeatures:artFeatureReceipt({})},{nativeCardArt:{}},{v25UiMasks:{}}])
  assert.throws(()=>officialAssetsFromReceipt({...value,...patch}));
});

test('approved battle geometry keeps live field identities and input contracts while other pages retain their geometry',()=>{
 const layout=gameLayout(),template=deckCardTemplate(),theme=officialAssetsTheme(nativeTheme);
 const nodes=[...paths(layout),...paths(template)];
 const semantic=nodes.filter(([,node])=>['text','cursorArea','presetButton'].includes(node.kind))
  .map(([path,node])=>[path,node,structuredClone(node)]);
 const containers=nodes.filter(([,node])=>node.kind==='container').map(([path,node])=>[path,node,{position:node.position,size:node.size,visible:node.visible,scale:node.scale,rotation:node.rotation}]);
 const result=applyOfficialAssets([layout,template],theme);
 const current=new Map([...paths(layout),...paths(template)]);
  for(const [path,node,before] of semantic){
   assert.equal(current.get(path),node,path);
   if(path.includes('/battlePanel/')){
    // Battle geometry is intentionally restored to the approved V25 tokens.
    // The existing event-bearing objects and input/state contracts still survive.
    for(const key of ['kind','states','focusable','interactable','raycastTarget'])assert.deepEqual(node[key],before[key],path+' '+key);
    continue;
   }
  for(const key of ['position','size','visible','scale','rotation','states','focusable','interactable','raycastTarget'])assert.deepEqual(node[key],before[key],path+' '+key);
   if(node.text){const actual={...node.text},expected={...before.text};delete actual.colour;delete expected.colour;if(expected.autoSize&&(expected.minFontSize*1.45+4>before.size?.[1]||path.endsWith('/shopView/removal/description')))expected.minFontSize=nativeTheme.font.minimum;assert.deepEqual(actual,expected,path);}
 }
  for(const [path,node,before]of containers){if(path.includes('/battlePanel/'))continue;assert.equal(current.get(path),node,path);for(const key of Object.keys(before))assert.deepEqual(node[key],before[key],path+' '+key);}
 const cards=[...all(layout),...all(template)].filter(node=>child(node,'roundFrame')&&child(node,'costDisc'));
 assert.equal(result.cardHosts,cards.length);assert(cards.length>=40);assert(result.removedControls>500);
 for(const card of cards){assert.equal(child(child(card,'roundBody'),'flat').image,107253);assert.equal(child(card,'costCore').image,107202);}
  const battle=child(layout,'battlePanel');
  assert.deepEqual(child(battle,'hero').position,[-324,-37]);
  assert.equal(child(child(battle,'hero'),'name').visible,false);
  assert.deepEqual(child(battle,'endTurn').position,[454.5,-220]);
  assert.deepEqual(child(battle,'endTurn').size,[143,56]);
  assert.deepEqual(child(battle,'drawIcon').position,[-585.5,-311.5]);
  for(let i=1;i<=10;i++){
   const card=child(battle,'card'+i);assert(card);
   assert.deepEqual(card.size,[150,210]);
   assert.deepEqual(child(card,'cost').position,[-66.5078125,95]);
   assert.deepEqual(child(card,'name').position,[0,79.8046875]);
   assert.deepEqual(child(card,'label').size,[114,60.921875]);
   assert.equal(child(card,'cost').text.fontSize,25);
  }
 assertNativeUiCapacity(layout);assertNativeUiCapacity(template);
});

test('scene and button substitutions preserve semantic icons and all four native button states',()=>{
 const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme);
 const before=new Map(paths(layout).filter(([,node])=>node.kind==='image').map(([path,node])=>[path,node.image]));
 applyOfficialAssets([layout],theme);
 const battle=child(layout,'battlePanel'),turn=child(battle,'endTurn');
 assert.deepEqual(turn.states,{normal:'normal',hover:'hover',pressed:'pressed',disabled:'disabled'});
  for(const state of turn.children)assert.equal(child(state,'plate').image,nativeTheme.officialAssets.images.button);
 for(const [path,node]of paths(layout))if(/\/(portrait|intentIcon|intentBadge|intentExtra|hpIcon|goldIcon|blockedLock|art|art_attack|art_skill|art_power|icon)$/.test(path)&&node.kind==='image')
  assert.equal(node.image,before.get(path),path);
 assert.equal(child(child(layout,'menuPanel'),'backdrop').image,nativeTheme.image.officialBackdrops.title);
 const menu=child(layout,'menuPanel'),result=child(menu,'result');
 for(const key of ['floor','victories','time','deck']){
  const stat=child(result,'stat_'+key);assert.equal(child(stat,'face').image,107311);
  assert.equal(child(stat,'face').colour,'#FFFFFF');assert.equal(child(stat,'border').colour,nativeTheme.color.goldDim);
 }
 const map=child(layout,'mapPanel'),field=child(child(map,'mapGroup1'),'mapField');
 assert.equal(field.image,nativeTheme.image.rect);assert.equal(field.colour,nativeTheme.color.mapCanvas.backdrop);
  assert.equal(theme.cardSkin.text.body,nativeTheme.officialAssets.cardInk);assert.equal(nativeTheme.cardSkin.text.body,undefined);
 const removal=child(child(child(layout,'nodePanel'),'shopView'),'removal');
 const description=child(removal,'description');
 assert.equal(description.text.fontSize,20);assert.equal(description.text.minFontSize,nativeTheme.font.minimum);
 assert.equal(description.text.autoSize,true);assert.deepEqual(description.size,[104,64]);
});

test('isolated builder emits official skin plus the real preserved portraits and retains opt-out fallback',t=>{
 const root=resolve('.artifacts/test-tmp');mkdirSync(root,{recursive:true});const dir=mkdtempSync(join(root,'official-assets-'));
 t.after(()=>rmSync(dir,{force:true,recursive:true}));
 buildUI(dir,undefined,{officialAssets:true,nativePageLifecycle:true});
 assert.deepEqual(readArtFeatures(dir),officialAssetFlags);
 const layout=JSON.parse(readFileSync(join(dir,'game-ui.json'),'utf8'));
 const battle=child(child(layout,'stage'),'battlePanel');
 assert.equal(child(child(child(battle,'card1'),'roundBody'),'flat').image,107253);
 assert(child(child(battle,'hero'),'officialFigure'));
 const portrait=readFileSync(join(dir,'abyss_traveler_portrait_assets.lua'),'utf8');
 assert.match(portrait,/battle133=/);assert.match(portrait,/avatar96=/);
 assert.doesNotMatch(portrait,/lowpolyLand=/);
 assert.match(readFileSync(join(dir,'abyss_theme.lua'),'utf8'),/official-assets-first/);
 assert.match(readFileSync(join(dir,'abyss_ui_profile.lua'),'utf8'),/nativePageLifecycle=true/);
 buildUI(dir);
 const fallback=JSON.parse(readFileSync(join(dir,'game-ui.json'),'utf8'));
 assert.notEqual(child(child(child(child(child(fallback,'stage'),'battlePanel'),'card1'),'roundBody'),'vertical')?.image,107253);
 assert.deepEqual(readArtFeatures(dir),{cards:false,menuBackground:false,selectionAvatar:false,battlePortrait:false,monsters:false});
});

test('audio wrapper forwards the explicit official profile and lifecycle without legacy background defaults',async()=>{
 const parsed=nativeAudioBuildArgs(['base.gil','--official-assets']);
 assert.deepEqual(parsed.options.artFeatures,officialAssetFlags);assert.equal(parsed.options.nativePageLifecycle,true);
 const stop=Error('before native toolchain');let called=false;
 await assert.rejects(buildNativeAudioGame({...parsed.options,baseMap:'base.gil',buildFull:async options=>{
  called=true;assert.equal(options.officialAssets,true);assert.equal(options.nativePageLifecycle,true);
  assert.deepEqual(options.artFeatures,officialAssetFlags);throw stop;
 }}),error=>error===stop);assert(called);
});
