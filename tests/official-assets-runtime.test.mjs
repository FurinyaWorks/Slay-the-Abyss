import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,rmSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';

const require=createRequire(import.meta.url);
function runOfficial(t,body,marker){
 const root=resolve('.artifacts/test-tmp');mkdirSync(root,{recursive:true});
 const directory=mkdtempSync(join(root,'official-runtime-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 buildLuaData('data',join(directory,'abyss_data.lua'));
 buildUI(directory,undefined,{officialAssets:true,nativePageLifecycle:true});
 const modules=readdirSync(directory).filter(name=>name.endsWith('.lua')).map(name=>name.slice(0,-4));
 for(const name of ['abyss_data','abyss_ui_layout','abyss_ui_templates','abyss_theme','abyss_ui_profile'])assert(modules.includes(name));
 const layout=JSON.parse(readFileSync(join(directory,'game-ui.json'),'utf8'));
 const theme=JSON.parse(readFileSync(join(directory,'official-assets-theme.json'),'utf8'));
 const stage=layout.controls.find(c=>c.name==='stage');
 const battle=stage.children.find(c=>c.name==='battlePanel');
 const face=battle.children.find(c=>c.name==='card1');
 assert.equal(face.children.find(c=>c.name==='roundBody').children.find(c=>c.name==='flat').image,theme.image.rect);
 const script=`
local generated=${luaString(directory.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
-- Fixture paths include build/lua. Explicit preloads prevent any generated
-- module from silently falling back to another candidate's shared build.
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
local profile=require('abyss_ui_profile');assert(profile.nativePageLifecycle)
local GameUI=require('abyss_game_ui');local create=GameUI.new;local Fixture
-- Pass the generated bootstrap setting into the real Host. The shared fixture
-- otherwise omits this platform option; do not replace lifecycle implementation.
GameUI.new=function(root,data,presentation,event,platform)
 local active={}
 for _,name in ipairs({'nodePanel','choicePanel'})do
  local page=root:GetChild(name);local prior=getmetatable(page);active[page]=true
  setmetatable(page,{__index=function(c,key)if key=='active'then return active[c]end;return prior.__index(c,key)end,
   __newindex=function(c,key,value)assert(key~='active','active is readonly');return prior.__newindex(c,key,value)end})
  page.SetActive=function(c,value)active[c]=value;Fixture.setEngineActive(c,value)end
 end
 platform.nativePageLifecycle=profile.nativePageLifecycle
 return create(root,data,presentation,event,platform)
end
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
Fixture=H.F
local C=H.F.Combat
local function same(a,b)
 if type(a)~=type(b)then return false end
 if type(a)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
local function unchanged(state,before,message)assert(same(state,before),message)end
${body}
print('${marker}')
`;
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',script],{
  cwd:process.cwd(),encoding:'utf8',maxBuffer:2*1024*1024,timeout:30000,
  env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''},
 });
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 assert.match(result.stdout,new RegExp(marker));
}

test('official candidate preserves real ten-card dual-enemy combat through cancellation, dragging and turns',t=>{
 runOfficial(t,`
local deck={};for i=1,12 do deck[i]='strike'end
local h,u,p,event,tap,drain,toggle,root=H.setup(deck,{'cultist','jaw_worm'})
local b=h.run.combat
assert(#b.hand==5 and #b.enemies==2)
C.draw(b,20);h:refresh();h:update(1)
assert(#b.hand==10 and #b.draw==2,'real draw must enforce ten-card cap')
local seen={}
for i,c in ipairs(b.hand)do
 assert(not seen[c.uid] and C.cardDefinition(b,c).id=='strike');seen[c.uid]=true
 assert(p:GetChild('card'..i).visible,'legal hand slot missing')
end
assert(H.F.actorControl(p,'enemy1').visible and H.F.actorControl(p,'enemy2').visible)
local dataBefore=C.copy(H.F.Data);local before=C.copy(b)
-- The shared native mock does not initialize static images from the layout.
-- Bind precisely the generated image IDs, then fail if render substitutes them.
local function specChild(node,name)
 for _,v in ipairs(node.children or {})do if v.name==name then return v end end
 error('missing generated child '..name)
end
local layout=require('abyss_ui_layout');local stage
for _,v in ipairs(layout)do if v.name=='stage'then stage=v end end
local battle=specChild(stage,'battlePanel')
local textures={}
for i=1,10 do
 local card=p:GetChild('card'..i);local spec=specChild(battle,'card'..i)
 for _,name in ipairs({'roundBody','roundFrame','roundShadow'})do
  local image=card:GetChild(name):GetChild('flat')
  local id=specChild(specChild(spec,name),'flat').image
  assert(id==H.F.Theme.image.rect)
  image:SetImage('static',id);textures[#textures+1]={image,id}
 end
end
h:refresh();u:render()
for _,entry in ipairs(textures)do assert(entry[1].imageId==entry[2],'render replaced official card texture')end
-- The selected light medallion requires dark neutral numbers. Exercise the
-- real cost painter as well as red/green changes and insufficient-energy ink.
local Skin=require('abyss_card_skin');local theme=H.F.Theme
local card=p:GetChild('card1');local number=card:GetChild('cost')
local ink=theme.cardSkin.costText
local battleInk=theme.cardSkin.battleCostText
assert(ink.r==64 and ink.g==56 and ink.b==41,'official neutral ink')
assert(battleInk.r==255 and battleInk.g==248 and battleInk.b==216,'battle coin neutral ink')
local function colour(actual,expected,label)
 assert(actual and actual.r==expected.r and actual.g==expected.g and actual.b==expected.b,label)
end
colour(number.fontColor,battleInk,'live battle neutral cost')
local paint={color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end}
local definition=C.cardDefinition(b,b.hand[1])
for _,case in ipairs({
 {cost=0,baseCost=1,tone=theme.cardSkin.costTone.down,direction='↓'},
 {cost=2,baseCost=1,tone=theme.cardSkin.costTone.up,direction='↑'},
 {cost=1,baseCost=1,dim=true,blockReason='insufficient_energy',tone=theme.cardSkin.costTone.up,direction=''},
 {cost=1,baseCost=1,dim=true,blockReason='invalid_target',tone=ink,direction=''},
 {cost=1,baseCost=1,tone=ink,direction=''},
})do
 Skin.apply(card,definition,paint,case)
 colour(number.fontColor,case.tone,'live cost semantic ink')
 assert(card:GetChild('costDirection').text==case.direction,'live cost direction')
 case.surfaceScope='battle'
 Skin.apply(card,definition,paint,case)
 colour(number.fontColor,case.tone==ink and battleInk or case.tone,'battle scoped semantic ink')
 assert(card:GetChild('costDirection').text==case.direction,'battle scoped cost direction')
end
local costless=C.copy(definition);costless.cost=-2
Skin.apply(card,costless,paint,{surfaceScope='battle'})
assert(not card:GetChild('nativeCostOrb').visible,'costless card keeps a coin')
u:render();assert(card:GetChild('nativeCostOrb').visible,'live cost orb not restored')
colour(number.fontColor,battleInk,'battle neutral ink restored after semantic cost changes')
unchanged(b,before,'official image binding mutated Combat')
unchanged(H.F.Data,dataBefore,'official image binding mutated Core data')
-- Selection alone is presentation-only. A resize invalidates the held pointer,
-- including a late release/click after another pointer makes a fresh selection.
event('card1','down',7);h:resize(1600,900)
tap('card1',8);assert(u.selected==b.hand[1].uid)
event('card1','up',7);event('card1','click',7)
unchanged(b,before,'cancelled touch committed a replacement selection')
tap('card1',8);assert(u.selected==nil)
unchanged(b,before,'selection/cancel changed combat')
-- Successful drag aims at the second real enemy and spends one energy once.
local target=H.F.actorControl(p,'enemy2');local hp,otherHP=b.enemies[2].hp,b.enemies[1].hp
b.enemies[1].sourcePosition={x=-600,y=0};b.enemies[2].sourcePosition={x=-100,y=0};u:render()
target=H.F.actorControl(p,'enemy2')
event('card1','down',9);event('card1','drag',9,target.x,target.y)
event('dragLayer','up',9,target.x,target.y);drain()
assert(b.energy==2 and #b.hand==9 and b.enemies[2].hp==hp-6,'targeted drag did not commit real Strike')
assert(b.enemies[1].hp==otherHP,'targeted drag damaged the unselected enemy')
local committed=C.copy(b)
event('card1','endDrag',9,target.x,target.y);event('card1','up',9);event('card1','click',9)
unchanged(b,committed,'late drag events replayed a committed card')
-- Moving drag interrupted by a modal must not revive on return.
event('card1','down',10);event('card1','drag',10,-285,0);toggle()
event('card1','up',10);event('card1','endDrag',10);event('card1','click',10)
assert(u.selected==nil and u.gesture==nil and not p:GetChild('dragLayer').visible)
unchanged(b,committed,'modal-cancelled drag spent energy or dealt damage')
local playerHP=b.player.hp
tap('endTurn',11);drain()
assert(b.turn==2 and b.energy==3 and b.player.hp<playerHP,'enemy damage and next-turn refill missing')
assert(p:GetChild('energy').text=='3/3')
for _,entry in ipairs(textures)do assert(entry[1].imageId==entry[2],'hand refresh lost official texture')end
unchanged(H.F.Data,dataBefore,'gameplay mutated generated Core data')
-- A dead preview target must not make Clash glow when the other real target
-- is rejected by its original only-attacks rule.
local ch,cu,cp,_,_,_,_,cr=H.setup({'clash','defend'},{'cultist','jaw_worm'})
local cb=ch.run.combat;cb.enemies[1].hp=0;cu.target=1;ch:refresh()
for i,card in ipairs(cb.hand)do if card.cardId=='clash'then
 assert(not C.canPlay(cb,card.uid,1)and not C.canPlay(cb,card.uid,2))
 assert(not cp:GetChild('card'..i):GetChild('nativePlayableRim').visible,'Clash has no legal target but glows')
end end
-- Shortcut retains the existing modal transaction identity, including a
-- mandatory choice that opens/closes between physical Down and Up.
local rh=cp:GetChild('topBar'):GetChild('battleRoute'):GetChild('hit')
local function routeEvent(kind,id)return rh.listeners[kind]({touchId=id})end
routeEvent('down',700);ch.choiceUI.generation=ch.choiceUI.generation+1
routeEvent('up',700);assert(not routeEvent('click',700)and not ch.routeOpen)
ch.choiceUI.visible=true
routeEvent('down',701);routeEvent('up',701);assert(not routeEvent('click',701)and not ch.routeOpen)
ch.choiceUI.visible=false
routeEvent('down',702);routeEvent('up',702);assert(routeEvent('click',702)and ch.routeOpen)
assert(cr:GetChild('mapPanel'):GetChild('previewBack'):GetChild('label').text=='返回战斗')
assert(ch:closeExit()and not ch.routeOpen and ch.mode=='battle')
assert(cr:GetChild('mapPanel'):GetChild('previewBack'):GetChild('label').text~='返回战斗')
`, 'OFFICIAL_RUNTIME_COMBAT_PASS');
});

test('official candidate keeps C-mode, repeated pile modals, real victory and return-map controls live',t=>{
 runOfficial(t,`
local F=H.F
local h,root=F.fixture();assert(F.start(h));assert(H.Run.startCombat(h.run,'cultist_solo'))
h.run.combat=C.new(F.Data,{deck={'strike','strike','strike','strike','strike','strike'},enemies={'cultist','jaw_worm'}})
h:refresh();local u,p,b=h.battleUI,root:GetChild('battlePanel'),h.run.combat
assert(not u.dragEnabled,'C-mode must not expose drag capabilities')
local hp=b.enemies[1].hp
F.click(root,'battlePanel','card1');assert(u.selected==b.hand[1].uid and b.energy==3)
F.click(root,'battlePanel','enemy1');assert(b.energy==2 and b.enemies[1].hp==hp-6)
assert(#b.discard==1 and #b.draw==1)
-- Twenty round trips with real nonempty draw/discard sources; reject commands
-- while covered and verify every return restores the same active combat owner.
for i=1,20 do
 local kind=i%2==0 and 'discard' or 'draw';local before=C.copy(b)
 local hit=p:GetChild(kind..'Icon'):GetChild('hit')
 assert(hit.visible and hit.raycastTarget and hit.click({touchId=100+i}))
 h:update(0)
 assert(h.deckUI.visible and h.deckUI.pileKind==kind and not u.active)
 assert(root:GetChild('deckPanel'):GetChild('grid').itemCount==#b[kind])
 u:endTurn();u:playSlot(1)
 unchanged(b,before,'covered battle accepted a command')
 assert(root:GetChild('deckPanel'):GetChild('close'):GetChild('hit').click({touchId=100+i}))
 assert(not h.deckUI.visible and u.active and h.run.combat==b)
 unchanged(b,before,'pile round trip mutated combat')
end
F.click(root,'battlePanel','card1');F.click(root,'battlePanel','enemy2')
assert(b.energy==1,'C-mode failed after repeated page lifecycle')
-- A separate legal one-card encounter reaches victory via actual card input,
-- not by editing HP or injecting reward phase/state.
local win,view,panel,event,tap,drain,toggle,winRoot=H.setup({'bludgeon'},{'acid_slime_s'})
tap('card1',201);tap('enemy1',201);drain()
assert(win.run.phase=='reward' and panel:GetChild('rewardList').visible)
for _,kind in ipairs({'draw','discard'})do
 local hit=panel:GetChild(kind..'Icon'):GetChild('hit')
 assert(not hit.visible and not hit.click({touchId=202}) and not win.deckUI.visible,'reward retained battle pile input')
end
panel:GetChild('cardReward').click();assert(panel:GetChild('rewardStage').visible)
toggle();assert(view.active and panel:GetChild('rewardStage').visible)
local count=#win.run.deck
tap('card1',203);drain()
assert(#win.run.deck==count+1 and win.run.rewards.cardResolved,'real card reward not claimed')
panel:GetChild('continue').click();win:refresh()
assert(win.run.phase=='map' and win.mode=='map' and not view.active)
assert(winRoot:GetChild('mapPanel').visible and not panel.visible,'reward did not restore map page')
local before=C.copy(win.run)
event('card1','up',201);event('card1','click',201)
unchanged(win.run,before,'late battle pointer acted after return to map')
`, 'OFFICIAL_RUNTIME_FLOW_PASS');
});

for(const official of [false,true])test(`${official?'official':'default'} generated cards preserve strict lookup, rarity tint and required children`,t=>{
 const root=resolve('.artifacts/test-tmp');mkdirSync(root,{recursive:true});
 const directory=mkdtempSync(join(root,'banner-contract-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 buildLuaData('data',join(directory,'abyss_data.lua'));
 buildUI(directory,undefined,{officialAssets:official});
 const modules=readdirSync(directory).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
 const script=`
local generated=${luaString(directory.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local h,u,p=H.setup({'strike','defend','bash','anger','inflame'},{'cultist','jaw_worm'})
local official=${official}
local theme=H.F.Theme
assert((theme.presentationProfile=='official-assets-first')==official)
local probes=0
for i=1,10 do
 local box=p:GetChild('card'..i)
 assert((box.children.nativeBannerRight~=nil)==official,'generated profile owns the ribbon')
 local get=box.GetChild
 box.GetChild=function(self,key)
  if key=='nativeBannerRight' or key=='nativePlayableRim' or key=='nativeRibbon' or key=='nativeCostOrb' then probes=probes+1;assert(official,'default profile probed official-only decoration')end
  return assert(get(self,key),'missing required card child '..key)
 end
end
local function colour(actual,expected)
 assert(actual and actual.r==expected.r and actual.g==expected.g and actual.b==expected.b,'rarity ink mismatch')
end
for _,rarity in ipairs({'basic','common','uncommon','rare'})do
 -- Test-local copy of real card definitions; no gameplay source is changed.
 for _,def in pairs(h.run.combat.catalog.cards)do def.rarity=rarity end
 u:render()
 for i=1,#h.run.combat.hand do
  local box=p:GetChild('card'..i)
  local ink=official and theme.officialAssets.battleBannerByRarity[rarity] or theme.color.rarityBand[rarity]
  colour(box:GetChild('nameBand').imageColor,ink)
  if official then colour(box:GetChild('nativeBannerRight').imageColor,ink)end
 end
end
assert(official and probes>0 or not official and probes==0)
for _,name in ipairs(official and {'nameBand','nameRule','art','nativeBannerRight','nativePlayableRim','nativeRibbon','nativeCostOrb'} or {'nameBand','nameRule','art'})do
 local box=p:GetChild('card1');local saved=box.children[name];assert(saved)
 box.children[name]=nil
 local ok,reason=pcall(function()u:render()end)
 box.children[name]=saved
 assert(not ok and tostring(reason):find('missing required card child '..name,1,true),tostring(reason))
 u:render()
end
print('BANNER_CONTRACT_PASS')
`;
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',script],{
  encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''},
 });
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 assert.match(result.stdout,/BANNER_CONTRACT_PASS/);
});
