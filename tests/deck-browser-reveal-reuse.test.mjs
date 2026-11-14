import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildLuaData,luaString} from '../scripts/build-lua-data.mjs';
import {buildUI} from '../scripts/build-ui.mjs';
const require=createRequire(import.meta.url);
function lua(body){
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',body],{encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});
 if(result.status!==0){mkdirSync('.artifacts/deck-sort-reveal-audit-20261113',{recursive:true});writeFileSync('.artifacts/deck-sort-reveal-audit-20261113/failed-regression.lua',body);}
 assert.ifError(result.error);assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/DECK_REUSE_PASS/);
}
test('post-paint fast publication is limited to existing deck content and Neow text, and never trusts pre-paint readiness',()=>{
 lua(`package.path='src/lua/?.lua;'..package.path
local Gate=require('abyss_page_reveal');local ready=true;local callback;local shown=0
local cover={SetVisible=function(_,v)if v then shown=shown+1 end end,SetAsLastSibling=function()end,GetChild=function()end}
local gate=Gate.new(cover,function()if callback then local f=callback;callback=nil;f()end;return ready end)
local flow,event={floor=0,mapSeed='seed',mapSignature='map'},{id='neow'};local owner={mode='node',run={phase='node',nodeFlow=flow},nodeUI={mode='normal'}};flow.roomKind='neow';flow.event=event;event.stage='neow_intro'
local function strict(intent)gate:request(intent);assert(not gate:step(intent));assert(gate:step(intent))end
strict(Gate.intent(owner));local initial=shown
for _,stage in ipairs({'neow_blessing','neow_result'})do event.stage=stage;local intent=Gate.intent(owner);gate:begin(intent);assert(not gate:covered()and shown==initial);assert(gate:finish(intent));assert(not gate:covered()and shown==initial)end
event.stage='neow_intro';local intent=Gate.intent(owner);gate:begin(intent);ready=false
assert(not gate:finish(intent)and gate:covered(),'old owner readiness published a new pending paint');ready=true;assert(not gate:step(intent));assert(gate:step(intent))
event.stage='neow_card_reward';intent=Gate.intent(owner);gate:begin(intent);gate:finish(intent);assert(gate:covered(),'new card reward incorrectly used text fast path');assert(not gate:step(intent));assert(gate:step(intent))
owner.nodeUI.picker={};event.stage='neow_choose_card';intent=Gate.intent(owner);gate:begin(intent);gate:finish(intent);assert(gate:covered(),'new picker must retain the original preparation boundary');assert(not gate:step(intent));assert(gate:step(intent))
owner.deckUI={visible=true,openSession=1,contentRevision=1};local deck=Gate.intent(owner);strict(deck);initial=shown
owner.deckUI.generation=50;assert(not gate:request(Gate.intent(owner)),'input generation must not be a publication identity')
owner.deckUI.contentRevision=2;deck=Gate.intent(owner);gate:begin(deck);assert(gate:finish(deck)and not gate:covered()and shown==initial)
owner.nodeUI.picker={};deck=Gate.intent(owner);gate:begin(deck);gate:finish(deck);assert(gate:covered(),'same deck session cannot fast-publish a changed picker');assert(not gate:step(deck));assert(gate:step(deck))
owner.deckUI.contentRevision=3;owner.nodeUI.mode='new-picker';deck=Gate.intent(owner);gate:begin(deck);gate:finish(deck);assert(gate:covered(),'content revision must not mask another intent change');assert(not gate:step(deck));assert(gate:step(deck))
owner.deckUI.contentRevision=4;deck=Gate.intent(owner);gate:begin(deck);callback=function()gate:request({page='menuPanel'})end
assert(not gate:finish(deck)and gate:covered()and gate.intent.page=='menuPanel','reentrant paint published an obsolete intent')
strict(deck);owner.deckUI.openSession=2;deck=Gate.intent(owner);gate:begin(deck);gate:finish(deck);assert(gate:covered(),'reopening a deck must prepare its new session');assert(not gate:step(deck));assert(gate:step(deck))
print('DECK_REUSE_PASS')`);
});

test('real Host reuses each grid base and native metadata through 100 sorts, preserves stale input, and waits for deferred cells',t=>{
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});const out=mkdtempSync(join(base,'deck-reuse-'));t.after(()=>rmSync(out,{recursive:true,force:true}));
 buildLuaData('data',join(out,'abyss_data.lua'));buildUI(out,undefined,{officialAssets:true});
 const preloads=readdirSync(out).filter(n=>n.endsWith('.lua')).map(n=>`package.preload[${luaString(n.slice(0,-4))}]=assert(loadfile(${luaString(join(out,n).replaceAll('\\','/'))}))`).join('\n');
 lua(`package.path='src/lua/?.lua;tests/lua/?.lua;'..package.path
${preloads}
local G=require('abyss_game_ui');local make=G.new;local host;local Art=require('abyss_card_art_runtime')
G.new=function(root,data,presentation,event,p)
 p.presentationReady=function(intent)return (intent.page~='deckPanel' or not(host.deckUI.pending or host.deckUI.calibrating or host.deckUI.pendingGrid)) and Art.presentationReady(intent.page)end
 p.presentationPage=function(page)Art.setPresentationPage(page)end
 return make(root,data,presentation,event,p)
end
local F=dofile('tests/lua/support/game_ui_fixture.lua');local root;host,root=F.fixture(nil,function()return true end,nil,{CursorDown='down',CursorUp='up'})
local Gate=require('abyss_page_reveal');local function tick()host:update(1/60);Art.update();host.pageReveal:step(Gate.intent(host));host:refresh()end
local function settle()for _=1,5 do tick()end;assert(not host.pageReveal:covered())end
settle();assert(host:start());settle();assert(F.confirmStart(host));settle();assert(require('abyss_run').startCombat(host.run,'cultist_solo'));host:refresh();settle()
local run=host.run;local card=F.Combat.copy(run.deck[1]);run.combat.draw={}
-- EMPTY does not calibrate. The first later nonempty list still probes its real base.
local panel=root:GetChild('deckPanel');local pile=panel:GetChild('pileGrid');local browser=panel:GetChild('grid');pile.indexBase=0;browser.indexBase=1
local refresh=pile.RefreshItems;local sizes={};pile.RefreshItems=function(self,n,fn)sizes[#sizes+1]=n;return refresh(self,n,fn)end
assert(host:openDeck('draw'));settle();assert(#host.deckUI.cards==0 and not host.deckUI.calibrating and #sizes==1 and sizes[1]==0,'EMPTY refresh count '..#sizes..' sizes '..table.concat(sizes,','));assert(host:closeDeck());settle()
local other;for _,candidate in ipairs(run.deck)do if candidate.cardId~=card.cardId then other=candidate;break end end;assert(other)
for i=1,3 do local instance=F.Combat.copy(i==2 and card or other);instance.uid=900+i;run.combat.draw[i]=instance end
local originalPile=F.Combat.copy(run.combat.draw)
sizes={};assert(host:openDeck('draw'));settle();local deck=host.deckUI
assert(deck.indexBase==0 and sizes[1]==1 and sizes[2]==3,'first nonempty list did not calibrate its actual zero base')
assert(require('abyss_art_features').flags.cards==false)
for _,mode in ipairs({'type','cost','name','original'})do assert(deck:setPileSort(mode));assert(not host.pageReveal:covered(),'ordinary cards=false sort acquired a cover')end
assert(deck:setPileSort('name'));local firstName=host.nodeUI.presentation[deck.cards[1].cardId].name
for i=2,#deck.cards do assert(host.nodeUI.presentation[deck.cards[i-1].cardId].name<=host.nodeUI.presentation[deck.cards[i].cardId].name)end
assert(deck:setPileSort('name'));assert(host.nodeUI.presentation[deck.cards[1].cardId].name~=firstName,'display order did not actually reverse')
for i,c in ipairs(run.combat.draw)do assert(c.uid==originalPile[i].uid and c.cardId==originalPile[i].cardId,'display sort changed the real pile order')end
assert(host:closeDeck());settle()
for _,instance in ipairs(run.combat.draw)do instance.cardId=card.cardId end
-- Opt into a one-slot runtime source on the real visible faces only. This is
-- an isolated native-API counter fixture, not an SDK rendering/performance claim.
for _,cell in pairs(pile.items)do local face=cell:GetChild('face');face.children.artSamples=F.control({name='artSamples',kind='container',size={144,64}},face)end
local created,destroyed=0,0
Art.configure({imageTemplateIndex=1,containerTemplateIndex=2,instantiate=function()created=created+1;return setmetatable({alive=true},{__index=function()return function()return true end end})end,destroy=function(c)destroyed=destroyed+1;c.alive=false end})
local metadata={runtime=true,cardId=card.cardId,slots={{image=100001,imageType='stretch',size={1,1},position={0,0},anchorMin={.5,.5},anchorMax={.5,.5},pivot={.5,.5},scale={1,1},rotation={0,0,0},colour={255,255,255,255}}}}
local artPresentation=F.Combat.copy(host.nodeUI.presentation);artPresentation[card.cardId].nativeArt=metadata;deck:setPresentation(artPresentation)
sizes={};assert(host:openDeck('draw'));settle()
assert(deck.indexBase==0 and #sizes==1 and sizes[1]==3 and created>0,'known base or native source preparation missing')
local count,removed=created,destroyed;local shown=0;local cover=root:GetChild('pageReveal');local visibility=cover.SetVisible
cover.SetVisible=function(self,v)if v then shown=shown+1 end;return visibility(self,v)end
local before=F.Combat.copy(run.combat.draw);local initialSession=deck.openSession;local back=panel:GetChild('pileReturn'):GetChild('hit')
back.listeners.down({touchId=44});sizes={}
for i=1,100 do
 assert(panel:GetChild('pileTools'):GetChild('cost'):GetChild('hit').click());assert(not host.pageReveal:covered(),'same-ready metadata sort acquired a full page cover');host:update(0);Art.update();host.pageReveal:step(Gate.intent(host))
 assert(not host.pageReveal:covered()and deck.openSession==initialSession)
end
assert(#sizes==100);for _,n in ipairs(sizes)do assert(n==3,'sorting recalibrated an already known grid base')end
assert(created==count and destroyed==removed,'same-face metadata sorting reallocated or released native artwork')
assert(shown==0,'ready sorting flashed the cover even within one Lua callback')
for i,c in ipairs(run.combat.draw)do assert(c.uid==before[i].uid and c.cardId==before[i].cardId,'sort mutated the real combat pile')end
back.listeners.up({touchId=44});assert(not back.click({touchId=44})and deck.visible,'stale Down/Up survived an input generation change')
-- A genuinely different source on this existing page is registered by its
-- actual Display/NativeArt lease before post-paint readiness is queried.
artPresentation[other.cardId].nativeArt=F.Combat.copy(metadata);artPresentation[other.cardId].nativeArt.cardId=other.cardId
deck.allCards[1].cardId=other.cardId
assert(deck:setPileSort('type'));assert(host.pageReveal:covered()and not Art.presentationReady('deckPanel'),'new native lease was incorrectly treated as the old ready owner');settle()
pile.deferRefresh=true;assert(deck:setPileSort('type'));assert(deck.pendingGrid and host.pageReveal:covered(),'deferred callbacks must not publish old owner readiness')
pile:recycle(0,pile.indexBase);assert(deck.pendingGrid,'one cell cannot certify all prior visible slots')
pile:flush();assert(not deck.pendingGrid);pile.deferRefresh=false;settle()
assert(host:closeDeck());settle();assert(host:openDeck('draw'));assert(host.pageReveal:covered(),'new deck session bypassed preparation');settle();assert(deck.openSession>initialSession)
assert(host:closeDeck());settle()
-- The second native grid has an independent one-based callback contract.
local choice={token='grid-base',cards=F.Combat.copy(run.combat.draw),op='discover'};assert(deck:open(run,choice));deck:update();assert(deck.indexBase==1);assert(deck:close())
assert(host:openDeck('draw'));settle();assert(deck.indexBase==0,'browser/pile grids shared an index calibration');assert(host:closeDeck());settle()
run.combat.draw={};assert(host:openDeck('draw'));settle();assert(#deck.cards==0 and not deck.pendingGrid and not deck.calibrating,'N to EMPTY left preparation pending')
print('DECK_REUSE_PASS')`);

 // Exercise the actual bootstrap readiness closure, not a replacement predicate.
 lua(`package.path='src/lua/?.lua;tests/lua/?.lua;'..package.path
${preloads}
local F=dofile('tests/lua/support/game_ui_fixture.lua');local G=require('abyss_game_ui');local create=G.new
local C=F.Combat;local Gate=require('abyss_page_reveal')
package.loaded.abyss_art_features={schemaVersion=2,flags={cards=false,menuBackground=false,selectionAvatar=false,battlePortrait=false,monsters=false}}
Color=setmetatable({FromRGBA=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end},{__call=function(_,r,g,b,a)return{r=r,g=g,b=b,a=a}end})
Enum={ImageSource={StaticReference='static'},ImageType={Basic='basic',Stretch='stretch'},CursorEventType={CursorClick='click'},Device={Controller='controller',MobileController='mobileController',Mobile='mobile'}}
local function boot(amount,origin)
 local canvas=F.control({children=F.Layout});local host,p;local actors=F.monsterActors()
 package.loaded.abyss_monster_actor_binding={enabled=true,templateIndex=actors.templateIndex,containerTemplateIndex=actors.containerTemplateIndex,powerTemplateIndex=actors.powerTemplateIndex}
 game={GetUICanvasSize=function()return 1280,720 end,IsTestPlay=function()return true end,GetDevice=function()return'desktop'end,GetCursorUIPos=function()return 0,0 end,
  InstantiateClientUIControl=actors.instantiate,DestroyClientUIControl=actors.destroy}
 script={object=canvas,GetParam=function()return false end,EnableUpdate=function()end}
 G.new=function(root,data,presentation,event,platform)p=platform;host=create(root,data,presentation,event,platform);return host end
 dofile('src/lua/abyss_ui.lua');OnStart();G.new=create;local update=OnUpdate
 for i=1,5 do update(1/60)end;assert(host and not host.pageReveal:covered());assert(host:start())
 for i=1,5 do update(1/60)end;assert(F.confirmStart(host));for i=1,5 do update(1/60)end
 local original=C.copy(host.run.deck);host.run.deck={}
 for i=1,amount do local card=C.copy(original[(i-1)%#original+1]);card.uid=1000+i;host.run.deck[i]=card end
 local grid=host.root:GetChild('deckPanel'):GetChild('pileGrid');grid.indexBase=origin;grid.deferRefresh=true
 assert(host:openDeck());return host,p,grid,update
end
local function turns(update)for i=1,3 do update(1/60)end end
local function fill(grid,first,last)for i=first,last do grid:recycle(i-1,i-1+grid.indexBase)end end
for _,origin in ipairs({0,1})do
 local host,p,grid,update=boot(10,origin);local deck=host.deckUI
 assert(deck.calibrating and grid.itemCount==1,'cold grid must calibrate its own native origin')
 grid:recycle(0,origin);update(1/60);assert(not deck.calibrating and grid.itemCount==10 and deck.pendingGrid)
 grid:recycle(0,origin);turns(update)
 assert(deck.pendingGrid and not p.presentationReady(Gate.intent(host)) and host.pageReveal:covered(),'cold first cell revealed an incomplete native page')
 fill(grid,1,9);assert(deck.pendingGrid);fill(grid,10,10);turns(update)
 assert(not deck.pendingGrid and p.presentationReady(Gate.intent(host)) and not host.pageReveal:covered())
 for i=1,10 do assert(deck.bindings[grid.items[i-1]].uid==1000+i,'cold origin mapped wrong UID')end
end
-- A fresh small visible set cannot become the readiness limit of a larger list.
local host,p,grid,update=boot(3,0);local deck=host.deckUI
grid:recycle(0,0);update(1/60);fill(grid,1,3);turns(update);assert(not host.pageReveal:covered())
local definition=C.copy(host.run.deck[1]);local function grow(amount)
 assert(host:closeDeck());turns(update);host.run.deck={}
 for i=1,amount do local card=C.copy(definition);card.uid=2000+i;host.run.deck[i]=card end
 assert(host:openDeck());assert(not deck.calibrating and grid.itemCount==amount,'warm grid recalibrated')
end
grow(10);fill(grid,1,3);turns(update)
assert(deck.pendingGrid and not p.presentationReady(Gate.intent(host)) and host.pageReveal:covered(),'warm three-cell history published ten incomplete cells')
fill(grid,4,10);turns(update);assert(not host.pageReveal:covered())
grow(17);for i=1,15 do grid:recycle(0,i-1)end;turns(update)
assert(deck.pendingGrid and host.pageReveal:covered(),'one recycled control certified several visible indices')
assert(deck:setSort('original'));fill(grid,1,14);turns(update);assert(deck.pendingGrid and host.pageReveal:covered(),'partly visible third row was omitted')
local retired=grid.items[0];local retiredHit=retired:GetChild('hit');grid.destroyOnRecycle=true;grid:recycle(0,16);grid.destroyOnRecycle=false
fill(grid,15,15);turns(update);assert(deck.pendingGrid and not retired.alive and not retiredHit.click(),'destroyed prepared cell certified readiness')
fill(grid,1,1);turns(update);assert(not deck.pendingGrid and not host.pageReveal:covered(),'cold viewport waited for offscreen cards')
grow(100);fill(grid,1,14);turns(update);assert(deck.pendingGrid and host.pageReveal:covered())
fill(grid,15,15);turns(update);assert(not deck.pendingGrid and not host.pageReveal:covered(),'virtualized hundred-card list waited for offscreen entries')
local callback=grid.refreshCallback;local cell=grid.items[0];grid.scrollProgress=.6
grid:recycle(0,50);assert(deck.bindings[cell].uid==2051 and not deck.pendingGrid and not host.pageReveal:covered(),'scroll recycling lost the current UID or reopened preparation')
assert(deck:setSort('cost'));local current=grid.refreshCallback;local uid=deck.bindings[cell].uid;callback(cell,0);assert(grid.refreshCallback==current and deck.bindings[cell].uid==uid,'late callback changed the owned refresh or UID')
fill(grid,1,15);turns(update);assert(not deck.pendingGrid)
-- Exact intersection: the next row at the viewport edge is excluded; one
-- additional viewport pixel makes all five cells of that partial row required.
local top=grid:GetPadding();grid:SetSizeDelta(918,top+210+27);assert(deck:setSort('cost'))
fill(grid,1,4);turns(update);assert(deck.pendingGrid);fill(grid,5,5);turns(update);assert(not deck.pendingGrid)
grid:SetSizeDelta(918,top+210+27+1);assert(deck:setSort('cost'));fill(grid,1,5);turns(update)
assert(deck.pendingGrid,'one-pixel partial row was omitted');fill(grid,6,10);turns(update);assert(not deck.pendingGrid)
-- Completion is provisional until the real gate confirms a second scheduler turn.
grid:SetSizeDelta(918,557);grow(17);fill(grid,1,15);assert(not deck.pendingGrid and host.pageReveal:covered())
local preparedCell=grid.items[0];grid.destroyOnRecycle=true;grid:recycle(0,16);grid.destroyOnRecycle=false
turns(update);assert(not preparedCell.alive and deck.pendingGrid and host.pageReveal:covered(),'completed then destroyed cell published an incomplete page')
fill(grid,1,1);turns(update);assert(not deck.pendingGrid and not host.pageReveal:covered())
grow(17);fill(grid,1,15);assert(not deck.pendingGrid);grid:recycle(0,16)
turns(update);assert(deck.pendingGrid and host.pageReveal:covered(),'completed cell recycled offscreen published stale index readiness')
fill(grid,1,1);turns(update);assert(not deck.pendingGrid and not host.pageReveal:covered())
grow(17);fill(grid,1,15);F.monsterActors().destroy(grid.items[0])
turns(update);assert(deck.pendingGrid and host.pageReveal:covered(),'destroyed cell without a refresh callback bypassed final readiness')
grid.destroyOnRecycle=true;fill(grid,1,1);grid.destroyOnRecycle=false;turns(update);assert(not host.pageReveal:covered())
local oldReady=deck.gridReady;assert(host:closeDeck());turns(update);host.run.deck={}
assert(host:openDeck());turns(update);assert(not deck.pendingGrid and not host.pageReveal:covered() and not deck.gridReady,'nonempty to empty reused old preparation')
assert(oldReady() and not deck.pendingGrid,'retired readiness closure polluted the empty generation')
grow(17);local listReady=deck.gridReady;assert(deck.pendingGrid)
assert(deck:showText('详情','只读详情'));turns(update)
assert(not deck.gridReady and not deck.pendingGrid and not host.pageReveal:covered(),'details retained list preparation')
assert(listReady() and not deck.pendingGrid,'retired list closure polluted detail mode')
assert(host:closeDeck());turns(update);assert(deck:inspectText(host.run,'检查','只读检查'));turns(update)
assert(not deck.pendingGrid and not deck.gridReady and not host.pageReveal:covered(),'inspectText inherited old readiness')
print('DECK_REUSE_PASS')`);
});

test('real Neow transactions keep their stable room identity through Host text updates but prepare different rooms and card pickers',t=>{
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});const out=mkdtempSync(join(base,'neow-reveal-'));t.after(()=>rmSync(out,{recursive:true,force:true}));
 buildLuaData('data',join(out,'abyss_data.lua'));buildUI(out,undefined,{officialAssets:true});
 const preloads=readdirSync(out).filter(n=>n.endsWith('.lua')).map(n=>`package.preload[${luaString(n.slice(0,-4))}]=assert(loadfile(${luaString(join(out,n).replaceAll('\\','/'))}))`).join('\n');
 lua(`package.path='src/lua/?.lua;tests/lua/?.lua;'..package.path
${preloads}
local G=require('abyss_game_ui');local make=G.new;local Art=require('abyss_card_art_runtime')
G.new=function(root,data,presentation,event,p)
 p.presentationReady=function(intent)return Art.presentationReady(intent.page)end
 p.presentationPage=function(page)Art.setPresentationPage(page)end
 return make(root,data,presentation,event,p)
end
local F=dofile('tests/lua/support/game_ui_fixture.lua');local host,root=F.fixture(nil,function()return true end)
local Gate=require('abyss_page_reveal');local Run=require('abyss_run')
local function settle()for _=1,4 do host:update(0);Art.update();host.pageReveal:step(Gate.intent(host));host:refresh()end;assert(not host.pageReveal:covered())end
settle();assert(host:start());settle();assert(F.confirmStart(host));settle()
local run=host.run;assert(F.Nodes.beginNeow(run,host.map,{bossCount=0}));host:refresh();settle()
local cover=root:GetChild('pageReveal');local visibility=cover.SetVisible;local covered=0
cover.SetVisible=function(self,v)if v then covered=covered+1 end;return visibility(self,v)end
local event=root:GetChild('nodePanel'):GetChild('eventView')
local function option(i)return event:GetChild('option'..i):GetChild('hit')end
local flow,oldEvent=run.nodeFlow,run.nodeFlow.event
assert(flow.event.stage=='neow_intro'and option(1).click())
assert(host.run==run and run.nodeFlow~=flow and run.nodeFlow.event~=oldEvent,'real transaction did not replace copied child tables')
assert(run.nodeFlow.event.stage=='neow_blessing'and not host.pageReveal:covered()and covered==0,'actual intro-to-offers transaction restarted full-page preparation')
flow,oldEvent=run.nodeFlow,run.nodeFlow.event;local hp=run.maxHp
assert(option(2).click())
assert(run.nodeFlow~=flow and run.nodeFlow.event~=oldEvent and run.maxHp>hp and run.nodeFlow.event.stage=='neow_result')
assert(not host.pageReveal:covered()and covered==0,'actual blessing-to-result transaction restarted preparation')
-- Identity, not the mere fact that both pages have Neow text, owns the shortcut.
assert(Run.transaction(run,function(staged)staged.nodeFlow.id='different-room';return true end));host:refresh()
assert(host.pageReveal:covered(),'different stable node id used the old room readiness');settle()
assert(Run.transaction(run,function(staged)staged.nodeFlow.id=nil;staged.nodeFlow.event.stage='neow_blessing';staged.nodeFlow.event.rewards={{type='UPGRADE_CARD',drawback='NONE'}};return true end));host:refresh();settle()
assert(F.Nodes.chooseEvent(run,'reward_1'));host:refresh()
assert(run.nodeFlow.event.stage=='neow_choose_card'and host.nodeUI.picker=='neow_card'and host.pageReveal:covered(),'real card picker incorrectly used the pure-text shortcut')
settle();print('DECK_REUSE_PASS')`);
});
