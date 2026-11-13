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
 if(result.status!==0)writeFileSync('.artifacts/deck-sort-reveal-audit-20261113/failed-regression.lua',body);
 assert.ifError(result.error);assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/DECK_REUSE_PASS/);
}
test('post-paint fast publication is limited to existing deck content and Neow text, and never trusts pre-paint readiness',()=>{
 lua(`package.path='src/lua/?.lua;'..package.path
local Gate=require('abyss_page_reveal');local ready=true;local callback;local shown=0
local cover={SetVisible=function(_,v)if v then shown=shown+1 end end,SetAsLastSibling=function()end,GetChild=function()end}
local gate=Gate.new(cover,function()if callback then local f=callback;callback=nil;f()end;return ready end)
local flow,event={},{};local owner={mode='node',run={phase='node',nodeFlow=flow},nodeUI={mode='normal'}};flow.roomKind='neow';flow.event=event;event.stage='neow_intro'
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
});
