import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';
import {buildUI} from '../scripts/build-ui.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {lowpolySelectLiterals} from '../scripts/official-portraits.mjs';
const require=createRequire(import.meta.url);

function temporary(t){
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});
 const out=mkdtempSync(join(base,'sts-character-browser-'));t.after(()=>rmSync(out,{recursive:true,force:true}));return out;
}
function lua(out,body){
 const path=join(out,'contract.lua');writeFileSync(path,body);
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),path],
  {encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024,env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''}});
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 assert.match(result.stdout,/CHARACTER_BROWSER_PASS/,result.stdout+result.stderr);
}

test('starter projection owns copied definitions/display and local deterministic IDs without creating a Run or RNG',t=>{
 const out=temporary(t);
 lua(out,`package.path='src/lua/?.lua;'..package.path
package.preload.abyss_theme=function()return ${toLua(nativeTheme)} end
local Deck=require('abyss_deck_ui');local C=require('abyss_combat')
package.loaded.abyss_run={new=function()error('preview created Run')end}
package.loaded.abyss_rng={new=function()error('preview created RNG')end}
local info={id='geo',deck={{id='strike',count=17,definition={id='strike',type='attack',effects={{op='damage',value=6}}},display={name='打击',cost='1'}},
 {id='defend',count=19,definition={id='defend',type='skill',effects={{op='block',value=5}}},display={name='防御',cost='1'}}}}
local before=C.copy(info);local a,p=assert(Deck.previewContext(info));local b=assert(Deck.previewContext(info))
assert(#a.deck==36 and #a.data.cards.cards==2 and a.readOnlyPreview and not a.combat and not a.phase and not a.rng)
local ids={};for i,card in ipairs(a.deck)do assert(card.uid==b.deck[i].uid and not ids[card.uid]);ids[card.uid]=true end
a.deck[1].cardId='changed';a.data.cards.cards[1].effects[1].value=99;p.strike.name='changed'
assert(info.deck[1].definition.effects[1].value==6 and info.deck[1].display.name=='打击' and info.deck[1].id==before.deck[1].id)
assert(b.data.cards.cards[1].effects[1].value==6 and b.deck[1].cardId=='strike')
for _,bad in ipairs({0,-1,1.5,math.huge,0/0})do info.deck[1].count=bad;assert(not Deck.previewContext(info))end
info.deck[1].count=17;info.deck[1].definition.id='mismatch';assert(not Deck.previewContext(info))
info.deck[1]=false;assert(not Deck.previewContext(info))
assert(not Deck.previewContext({}));print('CHARACTER_BROWSER_PASS')`);
});

test('real official selection opens shared five-column browser with deck owner, controller/back, stale closure and restored presentation',t=>{
 const out=temporary(t);buildLuaData('data',join(out,'abyss_data.lua'));buildUI(out,undefined,{officialAssets:true});
 const preloads=readdirSync(out).filter(n=>n.endsWith('.lua')).map(n=>
  `package.preload[${luaString(n.slice(0,-4))}]=assert(loadfile(${luaString(join(out,n).replaceAll('\\','/'))}))`).join('\n');
 lua(out,`package.path='src/lua/?.lua;tests/lua/?.lua;'..package.path
${preloads}
local G=require('abyss_game_ui');local make=G.new;local sourcePage;local prepared=true;local focus;local controllerMode=false;local useGate=true
G.new=function(root,data,presentation,event,p)
 if useGate then p.presentationReady=function()return prepared end end
 p.presentationPage=function(page)sourcePage=page;require('abyss_card_art_runtime').setPresentationPage(page)end
 p.controllerApi={events={Confirm='navConfirm',Cancel='navCancel'},directions={Left='left',Right='right'},modes={Specified='specified'},
  isController=function()return controllerMode end,getFocus=function()return focus end,setFocus=function(v)focus=v end}
 return make(root,data,presentation,event,p)
end
local F=dofile('tests/lua/support/game_ui_fixture.lua');local host,root=F.fixture(nil,function()return true end)
local Gate=require('abyss_page_reveal');local Run=require('abyss_run');local created=0;local new=Run.new
Run.new=function(...)created=created+1;return new(...)end
local function settle()
 for i=1,4 do host:update(1/60);host.pageReveal:step(Gate.intent(host));host:refresh()end
end
settle();assert(host:start());settle();assert(host:selectCharacter('traveler'));assert(host:selectElement('ironclad'));settle()
local info=host.characterSelection.info;local original=F.Combat.copy(info)
local previewId=info.deck[1].id;info.deck[1].display.name='只读投影专用名'
local panel=root:GetChild('characterPanel');local opener=panel:GetChild('details'):GetChild('deckOpen'):GetChild('hit')
assert(panel.visible and not host.run and created==0)
local Display=require('abyss_card_display');local write=Display.writeNativeArt;local painted=0
Display.writeNativeArt=function(...)
 assert(sourcePage=='deckPanel','starter card wrote before its deck presentation owner');painted=painted+1;return write(...)
end
prepared=false;assert(opener.click());assert(host.pageReveal:covered() and Gate.intent(host).page=='deckPanel')
assert(not host.run and created==0 and host.characterSelection.deckOpen and host.deckUI.previewInfo==info)
local deck=host.deckUI;local deckPanel=root:GetChild('deckPanel')
assert(deck.browserShell and not deck.pileView and not deck.pileKind and not deck.choiceToken and not deck.battle)
assert(deck.run.readOnlyPreview and #deck.cards==info.deckSize and deckPanel:GetChild('pileGrid').visible)
assert(not panel.visible and not panel:GetChild('deckView').visible and #panel:GetChild('deckView'):GetChildren()==0)
assert(host.controller.scope=='pageReveal' and require('abyss_controller').pointerBlocked(host.controller),'preparation must keep preview input covered')
assert(not host:openStarterDeck(),'covered/reentrant opening must fail')
for i=1,4 do host:update(1/60);host:refresh()end
assert(deck.visible and host.pageReveal:covered(),'menu stale-deck rule closed read-only preview')
prepared=true;settle();assert(host.controller.scope=='deck' and not host.pageReveal:covered() and painted>0)
local cards=deckPanel:GetChild('pileGrid');assert(cards.itemCount==info.deckSize,'starter browser omitted cards')
for index=0,info.deckSize-1 do
 local cell=cards:recycle(0,index+cards.indexBase);local face=cell:GetChild('face')
 assert(face:GetChild('name').text~='' and face:GetChild('cost').text~='' and face:GetChild('label').text~='','starter card lost actual name/cost/rules')
end
cards:flush()
assert(deckPanel:GetChild('pileReturn').visible)
assert(deck:setSort('cost'));settle()
local previewCard;for _,card in ipairs(deck.cards)do if card.cardId==previewId then previewCard=card;break end end
assert(deck:showCardDetails(previewCard));assert(deck.detailPages and deck.detailTitle:find('只读投影专用名',1,true))
assert(deck:back() and not deck.detailPages and deck.visible)
controllerMode=true;host:syncController();assert(host.controller.scope=='deck' and focus)
local back=deckPanel:GetChild('pileReturn'):GetChild('hit')
assert(host.controller:focus(back));host.controller:tick()
assert(back.navigationListeners.navConfirm(),'controller cannot reach shared browser return')
controllerMode=false;settle();assert(not deck.visible and not host.characterSelection.deckOpen and panel.visible)
assert(host.characterSelection.info==info and info.deck[1].count==original.deck[1].count and created==0 and not host.run)
-- Closing preview restores the exact caller display source, not a preview copy.
Display.writeNativeArt=write
assert(F.confirmStart(host));settle();assert(created==1 and host.run)
assert(host:openDeck());settle();assert(not deck.previewInfo and deck.browserShell and not deck.run.readOnlyPreview)
assert(deck.listTitle:find('卡组',1,true) and deck.catalog.cards[deck.cards[1].cardId])
local restored;for _,card in ipairs(deck.cards)do if card.cardId==previewId then restored=card;break end end
assert(deck:showCardDetails(restored));assert(deck.detailTitle:find(F.Presentation[previewId].name,1,true) and not deck.detailTitle:find('只读投影专用名',1,true),'preview presentation leaked into the real deck')
assert(host:closeDeck());settle()
-- A replaced loadout projection invalidates only the old preview and resets its flag.
host.run=nil;host.map=nil;host.mode='menu';assert(host:start());settle();assert(host:selectCharacter('traveler'));assert(host:selectElement('ironclad'));settle()
assert(host:openStarterDeck());settle();host.characterSelection.info=F.Combat.copy(host.characterSelection.info);host:refresh()
assert(not deck.visible and not host.characterSelection.deckOpen)
-- Legacy/no-reveal hosts retain the preexisting selection generation boundary.
useGate=false
local cursor={CursorDown='down',CursorUp='up',CursorExit='exit',CursorEndDrag='enddrag'}
local legacy,legacyRoot=F.fixture(nil,function()return true end,nil,cursor)
assert(legacy:start() and not legacy.pageReveal)
assert(legacy:selectCharacter('traveler'));assert(legacy:selectElement('ironclad'))
local confirm=legacyRoot:GetChild('characterPanel'):GetChild('confirm'):GetChild('hit')
for i,close in ipairs({function()return legacy:closeCharacters()end,function()return legacy:closeDeck()end})do
 confirm.listeners.down({touchId=50+i});assert(legacy:openStarterDeck());assert(not legacy:confirmCharacter())
 assert(close() and not legacy.characterSelection.deckOpen and legacy.characterOpen)
 confirm.listeners.up({touchId=50+i});assert(not confirm.click({touchId=50+i}) and not legacy.run,'stale confirm crossed preview')
end
print('CHARACTER_BROWSER_PASS')`);
});

test('actual OnStart readiness reveals the preview while the hidden real selection portrait is still preparing',t=>{
 const out=temporary(t);buildLuaData('data',join(out,'abyss_data.lua'));buildUI(out,undefined,{officialAssets:true});
 const preloads=readdirSync(out).filter(n=>n.endsWith('.lua')).map(n=>
  `package.preload[${luaString(n.slice(0,-4))}]=assert(loadfile(${luaString(join(out,n).replaceAll('\\','/'))}))`).join('\n');
 const land=lowpolySelectLiterals(process.cwd(),{menuBackground:true})[0];
 lua(out,`package.path='src/lua/?.lua;tests/lua/?.lua;'..package.path
${preloads}
local F=dofile('tests/lua/support/game_ui_fixture.lua');local G=require('abyss_game_ui');local make=G.new
local host,platform,portrait;local noPortraitDuringBuild=false;local P=require('abyss_traveler_portraits');local create=P.new
P.new=function(...)portrait=create(...);return portrait end
G.new=function(root,data,presentation,event,p)platform=p;host=make(root,data,presentation,event,p);return host end
package.loaded.abyss_art_features={schemaVersion=2,flags={cards=false,menuBackground=true,selectionAvatar=true,battlePortrait=false,monsters=false}}
local Asset=require('abyss_traveler_portrait_assets');Asset.imagePrefabId=801;Asset.containerPrefabId=802
Asset.${land}
local actors=F.monsterActors()
package.loaded.abyss_monster_actor_binding={enabled=true,templateIndex=actors.templateIndex,containerTemplateIndex=actors.containerTemplateIndex,powerTemplateIndex=actors.powerTemplateIndex}
local function native(c)
 c.active=true;c.SetActive=function(self,value)self.active=value;F.setEngineActive(self,value)end
 for _,method in ipairs({'SetAnchorMin','SetAnchorMax','SetPivot','SetLocalRotation'})do c[method]=function()end end
 for _,child in ipairs(c:GetChildren())do native(child)end;return c
end
local canvas=native(F.control({children=F.Layout}));local serial=0;local enabled=false
local stage=canvas:GetChild('stage')
for _,name in ipairs({'characterPanel','battlePanel','menuPanel'})do
 local panel=stage:GetChild(name)
 if not panel:GetChild('lowpolyScene')then panel.children.lowpolyScene=native(F.control({name='lowpolyScene',kind='container'},panel))end
end
Color=setmetatable({FromRGBA=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end},{__call=function(_,r,g,b,a)return{r=r,g=g,b=b,a=a}end})
Enum={ImageSource={StaticReference='static'},ImageType={Basic='basic',Stretch='stretch'},CursorEventType={CursorClick='click'},
 Device={Controller='controller',MobileController='mobileController',Mobile='mobile'}}
game={GetUICanvasSize=function()return 1280,720 end,IsTestPlay=function()return true end,GetDevice=function()return'desktop'end,
 GetCursorUIPos=function()return 0,0 end,InstantiateClientUIControl=function(index,parent)
  if index==1 or index==2 or index==3 then return actors.instantiate(index,parent)end
  if portrait then
   for _,page in ipairs({'deckPanel','mapPanel','nodePanel','potionPanel','choicePanel'})do
    assert(portrait:readyForPage('menu',true,'ironclad',page),'unrelated page waited for busy portrait owner')
   end
   noPortraitDuringBuild=true
  end
  assert(index==801 or index==802,'unexpected source template');serial=serial+1
  local c=native(F.control({name='portrait'..serial,kind=index==801 and'image'or'container'},parent));parent.children[c.name]=c;return c
 end,DestroyClientUIControl=function(c)c:SetActive(false)end}
script={object=canvas,GetParam=function()return false end,EnableUpdate=function(_,value)enabled=value end}
dofile('src/lua/abyss_ui.lua');OnStart();assert(enabled and host and portrait,'real OnStart did not create the production owners')
for i=1,60 do OnUpdate(1/60);if not host.pageReveal:covered()then break end end
assert(noPortraitDuringBuild and not host.pageReveal:covered());assert(host:start());assert(host.characterSelection.info)
local Gate=require('abyss_page_reveal');local state=portrait:status().selection
assert(state.phase=='building' and not platform.presentationReady(Gate.intent(host)),'real selection must wait for its incomplete portrait')
assert(not portrait:readyForPage('menu',false,'ironclad'),'negative control requires a real paused menu-scene dependency')
assert(not host:openStarterDeck(),'public covered input must stay blocked')
-- Arrange an asynchronous page replacement without completing its old owner.
-- The actual shared browser and actual entry readiness remain under test.
platform.presentationPage('deckPanel');assert(host.deckUI:openPreview(host.characterSelection.info))
host.characterSelection.deckOpen=true;host:refresh();assert(Gate.intent(host).page=='deckPanel')
for i=1,5 do OnUpdate(1/60)end
state=portrait:status().selection
assert(state.phase=='building' or state.phase=='revealing','negative control accidentally completed the old portrait')
assert(host.deckUI.visible and not host.deckUI.pending and not host.deckUI.calibrating)
assert(platform.presentationReady(Gate.intent(host)) and not host.pageReveal:covered(),'hidden selection portrait blocked the actual preview entry readiness')
assert(not host.root:GetChild('characterPanel').visible and host.root:GetChild('deckPanel').visible)
print('CHARACTER_BROWSER_PASS')`);
});
