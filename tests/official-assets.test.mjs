import {nativeAudioBuildArgs,buildNativeAudioGame} from '../scripts/build-native-audio-game.mjs';
import test from 'node:test';
import {cardFaceChildren} from '../scripts/card-face.mjs';
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
import {merchantControl} from '../scripts/cinematic-ui-layout.mjs';
import {gameBuildArgs} from '../scripts/build-game.mjs';
import {styleEvent} from '../scripts/v25-node-layout.mjs';
import {applyOfficialNeowLayout} from '../scripts/noncombat-neow-layout.mjs';
import {applyOfficialNoncombatLayout} from '../scripts/noncombat-v25-layout.mjs';
import {assertOfficialRunContracts} from '../scripts/official-run-layout.mjs';
import {buildStsSharedCardChrome,geoCardReferenceTokens} from '../scripts/sts-card-reference-profile.mjs';
const children=node=>node.controls??node.children??[];
const all=node=>[node,...children(node).flatMap(all)];
const paths=(node,prefix='')=>allPaths(node,prefix);
function allPaths(node,prefix){const path=prefix+'/'+node.name;return [[path,node],...children(node).flatMap(item=>allPaths(item,path))];}
const child=(node,name)=>children(node).find(item=>item.name===name);
const restoredPagePath=path=>path.includes('/battlePanel/')||path.includes('/characterPanel/')
 ||path.includes('/menuPanel/start/')||/\/menuPanel\/(?:start|emblem|vista|heroArt)$/.test(path)
 // Only the adopted map/chrome owners change geometry; other room and menu
 // paths below must still retain their original transforms and input identity.
 ||/^\/SlayTheAbyss\/mapPanel\/(?:mapGroup1\/(?:title|notice|typeLegend)(?:\/|$)|previewBack(?:\/|$)|resources\/(?:hpIcon|hp|goldIcon|gold)$|resourceHints\/(?:hp|gold)(?:\/hit)?$)/.test(path)
 ||/^\/SlayTheAbyss\/nodePanel\/(?:title|hpIcon|hp|goldIcon|gold)$/.test(path)
 ||/^\/SlayTheAbyss\/potionEntry\/open(?:\/hit)?$/.test(path)
 ||/^\/SlayTheAbyss\/potionEntry\/open\/hit\/(?:normal|hover|pressed|disabled)\/slot[1-5](?:\/|$)/.test(path);
function receipt(){return {officialAssetsProfile,artFeatures:artFeatureReceipt(officialAssetFlags),uiProfile:uiProfileReceipt(true),
 officialPortraits:{...portraitInventory(officialAssetFlags,{officialAssets:true}),inputs:portraitRuntimeInputs(officialAssetFlags).map(path=>({path}))}};}

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

test('approved pages keep live input identities while unrelated pages retain their geometry',()=>{
 const layout=gameLayout(),template=deckCardTemplate(),theme=officialAssetsTheme(nativeTheme);
 const nodes=[...paths(layout),...paths(template)];
 // Event presentation now explicitly adopts the existing room component and
 // the approved Neow adapter. Compare every owned field to that shared
 // projection instead of treating this authorized room as unchanged geometry.
 const expectedEvent=structuredClone(child(child(layout,'nodePanel'),'eventView'));
 styleEvent(expectedEvent,theme);
 applyOfficialNeowLayout({children:[{name:'nodePanel',children:[expectedEvent]}]},theme);
 const eventProjection=new Map(paths(expectedEvent,'/SlayTheAbyss/nodePanel'));
 // The approved minimal menu is an adopted component too. Bind every owned
 // geometry/input field to that projection while retaining unrelated pages.
 const expectedMenuLayout=structuredClone(layout);
 applyOfficialNoncombatLayout(expectedMenuLayout,theme);
 const menuProjection=new Map(paths(child(expectedMenuLayout,'menuPanel'),'/SlayTheAbyss'));
 const semantic=nodes.filter(([,node])=>['text','cursorArea','presetButton'].includes(node.kind))
  .map(([path,node])=>[path,node,structuredClone(node)]);
 const containers=nodes.filter(([,node])=>node.kind==='container').map(([path,node])=>[path,node,{position:node.position,size:node.size,visible:node.visible,scale:node.scale,rotation:node.rotation}]);
 const cardText=new Map(),cardDecorationPaths=new Set(),retiredCardDecorationPaths=new Set(),cardHosts=new Set();
 for(const [path,face]of nodes)if(child(face,'roundFrame')&&child(face,'costDisc')){
  cardHosts.add(face);
  for(const key of ['name','cost','costDirection','type','label','description','stamp','hit'])if(child(face,key))cardText.set(child(face,key),key==='description'?'label':key);
  for(const [inner,node]of nodes)if(inner.startsWith(path+'/')&&node.kind==='container'){
   cardDecorationPaths.add(inner);
   if(['roundShadow','roundFrame','roundBody','skin','roleMark','tagEdge','tagBody','nativeRibbon','nativeCostOrb','v25NodeCardChrome']
    .some(name=>inner.startsWith(path+'/'+name+'/')))retiredCardDecorationPaths.add(inner);
  }
 }
 const result=applyOfficialAssets([layout,template],theme);
 const current=new Map([...paths(layout),...paths(template)]);
 const retiredDeckPrefix='/SlayTheAbyss/characterPanel/deckView/';
 const retiredDeck=child(child(layout,'characterPanel'),'deckView');
 assert.equal(retiredDeck.visible,false);assert.deepEqual(retiredDeck.children,[],
  'selection must use the shared deck browser instead of keeping twelve independent card slots');
 const merchant=new Map(paths(merchantControl(theme),'/SlayTheAbyss/nodePanel'));
  for(const [path,node,before] of semantic){
   if(path.startsWith(retiredDeckPrefix)){
    assert.equal(current.has(path),false,path+' duplicate selection browser must be removed');continue;
   }
   if(path.startsWith('/SlayTheAbyss/deckPanel/pileReturn/')){
    // The approved pile return uses permanent artwork plus one native receiver.
    if(path.endsWith('/hit')){
     const hit=current.get(path);assert.equal(hit.kind,'cursorArea');
     assert.deepEqual(hit.size,before.size);assert.equal(hit.focusable,true);
    }
    continue;
   }
   assert.equal(current.get(path),node,path);
   if(menuProjection.has(path)){
    const expected=menuProjection.get(path);
    assert.equal(node.kind,before.kind,path+' existing menu semantic control kind');
    for(const key of ['position','size','visible','scale','rotation','states','focusable','interactable','raycastTarget'])
     assert.deepEqual(node[key],expected[key],path+' approved menu '+key);
    if(node.text){
     const actualText={...node.text},expectedText={...expected.text};
     delete actualText.colour;delete expectedText.colour;
     if(expectedText.autoSize&&expectedText.minFontSize*1.45+4>expected.size?.[1])expectedText.minFontSize=nativeTheme.font.minimum;
     assert.deepEqual(actualText,expectedText,path+' approved menu text');
    }
    continue;
   }
   if(eventProjection.has(path)){
    assert.deepEqual(node,eventProjection.get(path),path+' shared event projection');continue;
   }
   if(merchant.has(path)){
    const expected=structuredClone(merchant.get(path));
    if(expected.text)expected.text.content=before.text.content;
    assert.deepEqual(node,expected,path+' shared merchant projection');continue;
   }
   if(cardText.has(node)){
    const canonical=child(child(child(layout,'battlePanel'),'card1'),cardText.get(node))??cardFaceChildren(theme,'node').find(part=>part.name===cardText.get(node));
    if(canonical.text?.autoSize&&canonical.text.minFontSize*1.45+4>canonical.size[1])canonical.text.minFontSize=theme.font.minimum;
    for(const key of ['position','size','visible','scale','rotation','states','focusable','interactable','raycastTarget','text'])assert.deepEqual(node[key],canonical[key],path+' shared '+key);
    continue;
   }
   if(restoredPagePath(path)){
    // Battle geometry is intentionally restored to the approved V25 tokens.
    // The existing event-bearing objects and input/state contracts still survive.
    for(const key of ['kind','states','focusable','interactable','raycastTarget'])assert.deepEqual(node[key],before[key],path+' '+key);
    continue;
   }
  for(const key of ['position','size','visible','scale','rotation','states','focusable','interactable','raycastTarget']){
   const potionLabel=/^\/SlayTheAbyss\/potionEntry\/open\/hit\/(?:normal|hover|pressed|disabled)\/label$/.test(path);
   const relicHit=/^\/SlayTheAbyss\/relicBar\/slot\d+\/hit$/.test(path);
   const expected=key==='size'&&relicHit?[theme.officialAssets.battleRelicBar.hit,theme.officialAssets.battleRelicBar.hit]:key==='size'&&cardText.get(node)==='cost'
    ?child(child(child(layout,'battlePanel'),'card1'),'cost').size:key==='visible'&&potionLabel?false:before[key];
   assert.deepEqual(node[key],expected,path+' '+key);
  }
   if(node.text){const actual={...node.text},expected={...before.text};delete actual.colour;delete expected.colour;
    if(cardText.has(node))for(const key of ['outline','outlineColour','outlineOpacity']){
     const canonical=child(child(child(layout,'battlePanel'),'card1'),cardText.get(node)).text;
     assert.deepEqual(actual[key],canonical[key],path+' shared '+key);expected[key]=canonical[key];
    }
    if(expected.autoSize&&(expected.minFontSize*1.45+4>before.size?.[1]||path.endsWith('/shopView/removal/description')))expected.minFontSize=nativeTheme.font.minimum;assert.deepEqual(actual,expected,path);}
 }
  const canonical=child(child(layout,'battlePanel'),'card1');
  for(const [path,node,before]of containers){
   if(path.startsWith(retiredDeckPrefix)){
    assert.equal(current.has(path),false,path+' duplicate selection browser must be removed');continue;
   }
   if(menuProjection.has(path)){
    assert.equal(current.get(path),node,path+' menu input owner identity');
    for(const key of Object.keys(before))assert.deepEqual(node[key],menuProjection.get(path)[key],path+' approved menu '+key);
    continue;
   }
   if(restoredPagePath(path)||path.startsWith('/SlayTheAbyss/deckPanel/pileReturn'))continue;
   if(retiredCardDecorationPaths.has(path)){
    assert.equal(current.has(path),false,path+' retired independent card decoration must be removed');continue;
   }
   if(cardDecorationPaths.has(path)){assert(current.has(path),path+' shared decoration remains addressable');continue;}
   assert.equal(current.get(path),node,path);
   if(eventProjection.has(path)){
    assert.deepEqual(node,eventProjection.get(path),path+' shared event projection');continue;
   }
   if(merchant.has(path)){
    assert.deepEqual(node,merchant.get(path),path+' shared merchant projection');continue;
   }
   for(const key of Object.keys(before)){
    if(key==='scale'&&/^\/SlayTheAbyss\/potionEntry\/open\/hit\/(?:normal|hover|pressed|disabled)$/.test(path)){
     assert.deepEqual(node.scale,[1,1],path+' battle slot states already own their scale');continue;
    }
    const relicSlot=/^\/SlayTheAbyss\/relicBar\/slot(\d+)$/.exec(path);
    if(relicSlot&&key==='position'){
     const bar=theme.officialAssets.battleRelicBar;
     assert.deepEqual(node.position,[bar.origin[0]+bar.step*(Number(relicSlot[1])-1),bar.origin[1]],path+' canonical position');continue;
    }
    assert.deepEqual(node[key],key==='size'&&cardHosts.has(node)?theme.layout.card.size:before[key],path+' '+key);
   }
  }
 const cards=[...all(layout),...all(template)].filter(node=>child(node,'roundFrame')&&child(node,'costDisc'));
 const retiredCards=nodes.filter(([path,node])=>path.startsWith(retiredDeckPrefix)&&cardHosts.has(node)).map(([,node])=>node);
 assert.equal(retiredCards.length,12,'only the duplicated twelve-card selection modal is retired');
 assert.equal(result.cardHosts,cardHosts.size,'composition authenticates every original host before retiring the duplicate modal');
 assert.equal(cards.length,cardHosts.size-retiredCards.length);assert(cards.length>=40);assert(result.removedControls>500);
 for(const face of cardHosts)assert.equal(cards.includes(face),!retiredCards.includes(face),'retain every active original card host');
 assertOfficialRunContracts([layout,template]);
 for(const card of cards){
  for(const role of ['roundBody','roundFrame']){
   const old=child(card,role);assert.equal(old.visible,false);assert.deepEqual(old.children,[],'retired card material must stay empty');
  }
  const skin=child(card,'skin');if(skin){assert.equal(skin.visible,false);assert.deepEqual(skin.children,[]);}
  assert.equal(child(card,'costCore').image,107203);assert.equal(child(card,'costCore').visible,false);
  for(const role of ['stsReferenceBack','stsReferenceChrome']){
   const material=child(card,role);assert(material);assert.deepEqual(material.position,[0,0]);assert.deepEqual(material.size,theme.layout.card.size);
  }
 }
  const battle=child(layout,'battlePanel');
  assert.deepEqual(child(battle,'hero').position,[-324,-37]);
  assert.equal(child(child(battle,'hero'),'name').visible,false);
  assert.deepEqual(child(battle,'endTurn').position,[454.5,-220]);
  assert.deepEqual(child(battle,'endTurn').size,[143,56]);
  assert.deepEqual(child(battle,'drawIcon').position,[-585.5,-311.5]);
  for(const kind of ['draw','discard']){
   const pile=child(battle,kind+'Icon'),hit=child(pile,'hit'),label=child(battle,kind+'Label');
   const hx=pile.position[0]+hit.position[0],hy=pile.position[1]+hit.position[1];
   assert.equal(label.visible,false,'original pile captions remain hover details');
   assert.equal(label.text.content,'','runtime visibility refresh must not restore a caption over exhaust');
   assert.deepEqual(hit.size,pile.size,'actual pile stack must be clickable');
   const turn=child(battle,'endTurn');
   assert(hx+hit.size[0]/2<turn.position[0]-turn.size[0]/2||hx-hit.size[0]/2>turn.position[0]+turn.size[0]/2,'pile target must not overlap irreversible End Turn');
  }
  const hints=child(battle,'resourceHints');
  for(let slot=1;slot<=5;slot++){
   const help=child(battle,'potionHelp'),caption=child(help,'potionCaption'+slot);
   assert.equal(caption.active,false);assert.equal(caption.visible,false);assert.equal(caption.text.content,'','original potion slots have no permanent abbreviations');
   const bottle=child(battle,'potion'+slot)??child(help,'potion'+slot);
   assert.deepEqual(bottle.position,[nativeTheme.officialAssets.battleHud.potionX+(slot-1)*nativeTheme.officialAssets.battleHud.potionStep,nativeTheme.officialAssets.battleHud.y]);
   assert.deepEqual(bottle.size,[44,44]);
  }
  for(const kind of ['hp','gold']){
   const box=child(hints,kind),hit=child(box,'hit');
   for(let slot=1;slot<=3;slot++){
    const potion=child(battle,'potion'+slot);
    assert(Math.abs(box.position[0]-potion.position[0])>=(hit.size[0]+potion.size[0])/2,'resource help overlaps potion '+slot);
   }
  }
  const exhaust=child(battle,'exhaustIcon'),discard=child(battle,'discardIcon');
  assert.deepEqual(exhaust.size,[32,32],'exhaust must remain a compact visual entry');
  assert.deepEqual(child(exhaust,'hit').size,[44,44],'compact art retains a native touch target');
  assert.equal(child(exhaust,'image').image,102049,'reuse the verified existing exhaust keyword glyph');
  assert.notEqual(child(exhaust,'image').colour,'#000000','do not restore the solid black circle');
  assert.equal(child(battle,'exhaust').text.fontSize,18);
  assert.ok(child(battle,'exhaust').size[1]>=18*1.45+4,'counter retains one native text row');
  assert(exhaust.position[1]-child(exhaust,'hit').size[1]/2>discard.position[1]+child(discard,'hit').size[1]/2,'exhaust and discard hits overlap');
  const reference=theme.officialAssets.stsCardReference,material=buildStsSharedCardChrome(theme),tokens=geoCardReferenceTokens(theme);
  for(let i=1;i<=10;i++){
   const card=child(battle,'card'+i);assert(card);
   assert.deepEqual(card.size,[150,210]);
   for(const [name,key]of [['cost','cost'],['name','title'],['label','body']]){
    const field=child(card,name),geometry=reference.geometry[key];
    assert.deepEqual(field.position,geometry.position);assert.deepEqual(field.size,geometry.size);
    assert.equal(field.text.fontSize,Math.max(14,theme.font.minimum,tokens.typography[key]));
   }
   assert.deepEqual(child(card,'stsReferenceBack').children,material.children.filter(n=>['body','portraits'].includes(n.name)));
   assert.deepEqual(child(card,'stsReferenceChrome').children,material.children.filter(n=>!['body','portraits'].includes(n.name)));
   assert.deepEqual(child(card,'roundBody').children,[],'retired square paper must not leak through reference corners');
   assert.equal(child(card,'nameBand').visible,false);
   for(const role of ['nativeRibbon','nativeCostOrb','skin']){
    const retired=child(card,role);assert.equal(retired.visible,false);assert.deepEqual(retired.children,[],role+' cannot duplicate shared material');
   }
   const glow=child(card,'nativePlayableRim');
   assert.deepEqual(nativeTheme.officialAssets.battleGlowSource.rgba,[.2,.9,1,.25],'source float color remains explicit despite native 8-bit quantization');
   assert.equal(child(glow,'softEdge').children[0].opacity,.25,'main border retains source alpha');
   for(const control of all(glow)){
    assert(control.size[0]>0&&control.size[0]<=1600&&control.size[1]>0&&control.size[1]<=900,'every glow control must satisfy formal encoder rect limits before scale');
   }
   for(const layer of glow.children){
    assert.equal(layer.children.length,8,'bounded soft contour has four edges and four corners');
    assert(layer.children.every(n=>n.image===106056||n.image===106057),'glow must use verified continuous alpha textures');
    for(const part of layer.children)assert.equal(part.imageType,part.name.startsWith('corner')?'basic':'stretch');
    for(const part of layer.children.filter(n=>n.name.startsWith('corner'))){
     assert.equal(Math.abs(part.position[0]),66,'radial center stays under the rounded card corner');
     assert.equal(Math.abs(part.position[1]),96,'radial peak must not float outside the silhouette');
    }
   }
  }
 assertNativeUiCapacity(layout);assertNativeUiCapacity(template);
});

test('scene and button substitutions preserve semantic icons and all four native button states',()=>{
 const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme);
 const before=new Map(paths(layout).filter(([,node])=>node.kind==='image').map(([path,node])=>[path,node.image]));
 applyOfficialAssets([layout],theme);
 const battle=child(layout,'battlePanel'),turn=child(battle,'endTurn');
 assert.deepEqual(turn.states,{normal:'normal',hover:'hover',pressed:'pressed',disabled:'disabled'});
  for(const state of turn.children){
   assert(child(state,'v25Chrome'));
   assert.equal(child(child(state,'v25Chrome'),'faceLight'),undefined,'no rectangular face highlight patch');
   for(const name of ['border','borderLeft','borderRight','inner','innerLeft','innerRight','plate','plateLeft','plateRight'])assert.equal(child(state,name).visible,false,'legacy '+name+' must not widen the restored turn button');
  }
 for(const [path,node]of paths(layout))if(/\/(portrait|intentIcon|intentBadge|intentExtra|hpIcon|goldIcon|blockedLock|art|art_attack|art_skill|art_power|icon)$/.test(path)&&node.kind==='image'){
  const expected=path==='/SlayTheAbyss/nodePanel/eventView/art'?theme.icon.eventArt.default:
   before.get(path)??(/^\/SlayTheAbyss\/relicBar\/slot(?:1[3-9]|2[0-5])\/icon$/.test(path)?before.get('/SlayTheAbyss/relicBar/slot1/icon'):undefined);
  assert.equal(node.image,expected,path);
 }
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

test('official selection keeps its approved 1600 background while battle and opt-out retain their explicit sources',t=>{
 const root=resolve('.artifacts/test-tmp');mkdirSync(root,{recursive:true});const dir=mkdtempSync(join(root,'official-assets-'));
 t.after(()=>rmSync(dir,{force:true,recursive:true}));
 buildUI(dir,undefined,{officialAssets:true,nativePageLifecycle:true});
 assert.deepEqual(readArtFeatures(dir),officialAssetFlags);
 const layout=JSON.parse(readFileSync(join(dir,'game-ui.json'),'utf8'));
 const battle=child(child(layout,'stage'),'battlePanel');
 assert(child(child(battle,'card1'),'stsReferenceChrome'),'official battle card must mount the shared reference chrome');
 assert(child(child(battle,'hero'),'officialFigure'));
 const portrait=readFileSync(join(dir,'abyss_traveler_portrait_assets.lua'),'utf8');
 assert.match(portrait,/battle133=/);assert.match(portrait,/avatar96=/);
 assert.match(portrait,/battlePixel=/);
 const inventory=portraitInventory(officialAssetFlags,{officialAssets:true});
 assert.equal(inventory.assets.some(a=>a.asset==='temporary-pixel-traveler'),false);
 assert.match(portrait,/battleApprovedIdle=/);
 const selected=inventory.assets.find(a=>a.asset==='lowpolyLumine');
 const fighting=inventory.assets.find(a=>a.asset==='traveler-geo/idle-approved-v1');
 assert.equal(fighting?.images,7303);
 assert.equal(fighting.motion,'approved-source-field-native-band-approximation');
 assert.equal(inventory.selectionUses,'lowpolyLumine');assert.equal(selected?.images,1600);
 assert.notEqual(selected.sourceSha256,fighting.sourceSha256,'approved background and combat idle retain distinct source identities');
 assert.equal(inventory.assets.some(a=>a.asset==='traveler-geo/portraits/battle133-selection'),false);
 assert.equal(inventory.assets.find(a=>a.asset==='traveler-geo/portraits/avatar96').images,457);
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
