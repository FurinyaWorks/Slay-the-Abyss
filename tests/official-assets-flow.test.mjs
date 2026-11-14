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
 const directory=mkdtempSync(join(root,'official-flow-'));
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
 assert.equal(face.children.find(c=>c.name==='stsReferenceBack').children.find(c=>c.name==='body').children.find(c=>c.name==='paperWell').image,theme.image.rect,
  'the generated production shared face retains its rectangular paper well');
 const script=`
local generated=${luaString(directory.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
-- Fixture paths include build/lua. Explicit preloads prevent any generated
-- module from silently falling back to another candidate's shared build.
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
local profile=require('abyss_ui_profile');assert(profile.nativePageLifecycle)
local GameUI=require('abyss_game_ui');local create=GameUI.new;local Fixture;local Production=true
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
 platform.campaign=true;platform.campaignProfile=Production and 'competition-two-act' or nil
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
local F=H.F
local Map=require('abyss_map')
local Routes=dofile('tests/lua/support/map_routes.lua')
local function start(production)
 Production=production~=false
 local h,root=F.fixture()
 assert(h.mode=='menu' and not h.run)
 assert(F.click(root,'menuPanel','start') and h.characterOpen and not h.run)
 assert(h:selectCharacter('traveler') and h:selectElement('ironclad'))
 assert(h:confirmCharacter())
 if Production then
 assert(h.mode=='node' and h.run.nodeFlow.event.id=='neow')
 assert(F.click(root,'nodePanel','eventView/option1'))
 assert(F.click(root,'nodePanel','eventView/option2'))
 assert(F.click(root,'nodePanel','eventView/option1'))
 end
 assert(h.mode=='map' and h.run.act==1 and h.run.campaign and h.run.runSeed=='1')
 return h,root
end
-- Independent room contract fixture, following existing map_routes/node_ui
-- tests: Map.choose traverses real connected edges without resolving prior
-- rooms. This is NOT a natural playthrough or proof of earlier room victories.
local function room(kind)
 -- Independent campaign Host without production Neow: no completed room owner
 -- is fabricated or erased to permit direct connected-map routing.
 local h,root=start(false)
 local path=Routes.to(h.map,function(n)return n.type==kind and n.roomKind~='boss_treasure'end)
 for i=1,#path-1 do assert(Map.choose(h.map,path[i]))end
 h:refresh()
 assert(h.mapUI:choose(path[#path]))
 assert(h.run.nodeFlow.type==kind,'seed resolved a different room kind')
 print('OFFICIAL_ROUTED_ROOM '..kind..' floor='..h.run.floor)
 return h,root
end
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

test('official flow: untouched starter run selects character, wins first map encounter and returns with a real reward',t=>{
 runOfficial(t,`
local h,root=start();local run=h.run
assert(#run.deck==10 and run.hp==run.maxHp)
assert(h.mapUI:choose(F.Nodes.available(run,h.map)[1].id))
assert(h.mode=='battle' and h.map.floor==1 and run.phase=='combat')
assert(not h:advanceAct() and not h:settle(),'unfinished battle accepted ending commands')
F.win(h,root)
assert(run.phase=='reward' and run.victories==1)
local offer=run.rewards.cards[1]
F.click(root,'battlePanel','cardReward');F.click(root,'battlePanel','card1')
if run.phase=='reward' then
 if run.rewards.goldClaimed==false then F.click(root,'battlePanel','goldReward')end
 F.click(root,'battlePanel','continue')
end
assert(h.run==run and h.mode=='map' and run.nodeFlow.complete)
assert(#run.deck==11 and run.deck[11].cardId==offer)
local before=C.copy(run)
root:GetChild('battlePanel'):GetChild('card1'):GetChild('hit').click()
unchanged(run,before,'stale reward control duplicated a claimed card')
assert(#F.Nodes.available(run,h.map)>0)
`, 'OFFICIAL_FLOW_STARTER_PASS');
});

test('official flow: independently routed shop previews, cancels, purchases and exits without duplicate spending',t=>{
 runOfficial(t,`
local h,root=room('shop');local run=h.run;local gold,deck=run.gold,#run.deck
local index
for i=1,7 do local action=h.nodeUI.actions['shopView/card'..i];if action and action.enabled then index=i;break end end
assert(index,'seed must offer an affordable real card')
local name='shopView/card'..index
F.click(root,'nodePanel',name);assert(run.gold==gold and #run.deck==deck)
F.click(root,'nodePanel','back');assert(run.gold==gold and #run.deck==deck,'cancel bought a card')
F.click(root,'nodePanel',name);F.click(root,'nodePanel','confirm')
assert(run.gold<gold and #run.deck==deck+1,'confirmed shop purchase did not reach Core')
local spent=run.gold
F.click(root,'nodePanel','confirm');assert(run.phase=='map' and h.mode=='node')
F.click(root,'nodePanel','confirm');assert(h.mode=='map' and run.nodeFlow.complete)
assert(run.gold==spent and #run.deck==deck+1,'shop exit replayed transaction')
assert(not root:GetChild('nodePanel').active)
`, 'OFFICIAL_FLOW_SHOP_PASS');
});

test('official flow: independently routed event uses its actual leave option and restores map ownership',t=>{
 runOfficial(t,`
local h,root=room('event');local run=h.run
assert(run.nodeFlow.event and root:GetChild('nodePanel').active)
print('OFFICIAL_EVENT '..run.nodeFlow.event.id)
local leave,leaveCount=nil,0
for i=1,6 do
 local option=root:GetChild('nodePanel'):GetChild('eventView'):GetChild('option'..i)
 if option and option.visible then
  local label=option:GetChild('title').text
  if label:match('^%[离开%]') then
   assert(label=='[离开] 什么也不会发生。','leave action must retain its complete original description')
   leave,leaveCount=i,leaveCount+1
  end
 end
end
assert(leave,'seed event must expose an actual leave choice')
assert(leaveCount==1,'only one visible leave action may own the transaction')
local hp,gold,deck=run.hp,run.gold,#run.deck
F.click(root,'nodePanel','eventView/option'..leave)
assert(run.phase=='map' and h.mode=='node' and run.nodeFlow.complete)
F.click(root,'nodePanel','confirm')
assert(h.mode=='map' and not root:GetChild('nodePanel').active)
assert(run.hp==hp and run.gold==gold and #run.deck==deck,'leave changed inventory or health')
`, 'OFFICIAL_FLOW_EVENT_PASS');
});

test('official flow: independently routed camp rejects full-HP rest then upgrades a real card',t=>{
 runOfficial(t,`
local h,root=room('camp');local run=h.run;local before=C.copy(run)
assert(not h.nodeUI.actions['campView/rest'].enabled)
assert(not h.nodeUI:press('campView/rest'))
unchanged(run,before,'disabled full-HP rest mutated Core')
assert(h.nodeUI.actions['campView/forge'].enabled)
F.click(root,'nodePanel','campView/forge')
F.click(root,'nodePanel','pickerView/forgeGrid/card1')
assert(run.phase=='node','upgrade committed before confirmation')
F.click(root,'nodePanel','confirm');h.nodeUI:update(2)
assert(run.phase=='map' and h.mode=='node' and run.nodeFlow.complete)
local upgraded=0;for _,card in ipairs(run.deck)do if card.upgraded then upgraded=upgraded+1 end end
assert(upgraded==1 and #run.deck==#before.deck and run.hp==before.hp,'forge lost card or mutated HP')
F.click(root,'nodePanel','confirm')
assert(h.mode=='map' and not root:GetChild('nodePanel').active)
`, 'OFFICIAL_FLOW_REST_PASS');
});

test('official flow: independently routed treasure opens real offers and consumes each claim once',t=>{
 runOfficial(t,`
local h,root=room('treasure');local run=h.run
assert(run.nodeFlow.chest and not run.nodeFlow.chest.opened)
F.click(root,'nodePanel','treasureView/chest');h.nodeUI:update(2)
assert(run.nodeFlow.chest.opened and #run.nodeFlow.reward.items>0)
local claims=0
while run.phase=='node' and #run.nodeFlow.reward.items>0 do
 local choice
 for i,item in ipairs(run.nodeFlow.reward.items)do
  if item.kind~='relic' or item.available==true then choice=i;break end
 end
 if not choice then F.click(root,'nodePanel','back');break end
 local pending=#run.nodeFlow.reward.items
 assert(h.nodeUI.actions['treasureView/rewardItem'..choice].enabled)
 F.click(root,'nodePanel','treasureView/rewardItem'..choice);claims=claims+1
 assert(#run.nodeFlow.reward.items<pending,'claim did not consume one pending source item')
end
assert(claims>0 and run.nodeFlow.complete and h.mode=='map')
local before=C.copy(run);assert(not h.nodeUI:press('treasureView/rewardItem1'))
unchanged(run,before,'hidden treasure accepted duplicate claim')
`, 'OFFICIAL_FLOW_TREASURE_PASS');
});

test('official flow: actual boss entry refuses premature chapter/settlement then reaches defeat through enemy turns',t=>{
 runOfficial(t,`
local h,root=room('boss');local run=h.run
assert(run.phase=='combat' and run.act==1 and h.mode=='battle')
assert(run.floor==16 and #run.combat.enemies>0)
local original=C.copy(run)
assert(not h:advanceAct() and not h:settle(),'live boss bypassed required victory/treasure')
unchanged(run,original,'rejected ending command mutated run')
-- Do not fake HP, phase or boss rewards. Passing real turns naturally reaches
-- defeat. Boss victory / act transition / victory ending remain unverified.
for i=1,30 do
 if run.phase~='combat' then break end
 F.click(root,'battlePanel','endTurn')
end
assert(run.phase=='defeat' and h.mode=='defeat' and root:GetChild('menuPanel').visible)
assert(run.combat.player.hp==0 and run.act==1)
local before=C.copy(run)
assert(not h:advanceAct());unchanged(run,before,'defeat advanced chapter')
assert(F.click(root,'menuPanel','start') and h.characterOpen)
assert(h:selectCharacter('traveler') and h:selectElement('ironclad') and h:confirmCharacter())
assert(h.run~=run and h.run.act==1 and h.run.victories==0 and h.run.hp==h.run.maxHp)
assert(h.mode=='node' and h.run.nodeFlow.event.id=='neow','defeat restart lost real opening history')
`, 'OFFICIAL_FLOW_BOSS_DEFEAT_PASS');
});
