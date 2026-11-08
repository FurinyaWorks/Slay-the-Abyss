import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';
const require=createRequire(import.meta.url);

test('isolated V25 production Host keeps dynamic cards readable across prebuilt surface lifecycle',t=>{
 const root=resolve('.artifacts/test-tmp');mkdirSync(root,{recursive:true});
 const directory=mkdtempSync(join(root,'v25-card-skin-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 buildLuaData('data',join(directory,'abyss_data.lua'));
 buildUI(directory,undefined,{v25BattleChrome:true});
 const modules=readdirSync(directory).filter(name=>name.endsWith('.lua')).map(name=>name.slice(0,-4));
 const source=`
local generated=${luaString(directory.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local F=H.F
local Skin=require('abyss_card_skin')
local created,failMana={},false
local config={enabled=true,variants={attack={basic=11,common=12,uncommon=13,rare=14},
 skill={basic=21,common=22,uncommon=23,rare=24},power={basic=31,common=32,uncommon=33,rare=34}},manaTemplateId=99}
local wrapped=setmetatable({},{__mode='k'})
local function activate(host,value)F.setEngineActive(host,value)end
local function capabilities(control)
 -- This fixture lacks SetActive on decorative containers; supply the native
 -- documented method without changing production code or functional controls.
 if control.name=='v25Surface'then control.SetActive=activate end
 for _,child in pairs(control.children or {})do capabilities(child)end
 if control.kind=='grid' and not wrapped[control]then
  wrapped[control]=true;local original=control.RefreshItems
  control.RefreshItems=function(self,count,callback)
   return original(self,count,function(item,index)capabilities(item);return callback(item,index)end)
  end
 end
end
local destroy=F.monsterActors().destroy
local api={instantiate=function(id,parent)
 if failMana and id==99 then return false end
 -- Tiny synthetic native templates only. No private textures or bulk image
 -- geometry is used; counts below prove ownership, never performance.
 local node=F.control({name='syntheticSurface'..(#created+1),kind='container',visible=false,size={4,4},
  children={{name='sample',kind='image',size={4,4},image=100001,colour='#FFFFFF'}}},parent)
 node.SetActive=activate;node.templateId=id;created[#created+1]=node;parent.children[node.name]=node
 return node
end,destroy=destroy}
local function living()local n=0;for _,node in ipairs(created)do if node.alive then n=n+1 end end;return n end
local function visibleRoots()
 local n=0
 for _,node in ipairs(created)do if node.alive then
  local shown,parent=true,node
  while parent do if parent.visible==false then shown=false;break end;parent=parent.parent end
  if shown then n=n+1 end
 end end
 return n
end
local function boundedSlots()
 local counts={}
 for _,node in ipairs(created)do if node.alive then counts[node.parent]=(counts[node.parent] or 0)+1 end end
 for _,count in pairs(counts)do assert(count==2,'cached slot retained more than its current shell and mana')end
end
local function roots(face)
 local host=face:GetChild('v25Surface');local list={}
 for _,node in ipairs(created)do if node.alive and node.parent==host then list[#list+1]=node end end
 return list,host
end
local function ready(face,definition)
 local list,host=roots(face)
 assert(host.visible and #list==2,'card surface not complete')
 assert(list[1].templateId==config.variants[definition.type][definition.rarity or 'common'] and list[2].templateId==99,'wrong definition surface')
 for _,name in ipairs({'roundShadow','roundFrame','roundBody','nameBand','nameRule','roleRing','roleMark','tagEdge','tagBody'})do
  assert(not face:GetChild(name).visible,'legacy decoration covers surface: '..name)
 end
 assert(not face:GetChild('costDisc').visible and not face:GetChild('costCore').visible,'legacy orb covers prebuilt mana')
 assert(face:GetChild('cost').visible and face:GetChild('cost').text~='','dynamic cost lost')
 assert(face:GetChild('name').text~='' and face:GetChild('label').text~='','dynamic name/body lost')
 local skin=face:GetChild('skin')
 assert(skin:GetChild(definition.type).visible and skin:GetChild(definition.type):GetChild('well').visible,'colour illustration well lost')
 assert(not skin:GetChild(definition.type):GetChild('edge').visible and not skin:GetChild('gloss').visible)
end
local function setup(deck,enemies)
 Skin.destroySurface();failMana=false
 local h,u,p,event,tap,drain,toggle,root=H.setup(deck,enemies)
 capabilities(root);Skin.configureSurface(config,api);h:refresh()
 return h,u,p,event,tap,drain,toggle,root
end
local failures=0
local function check(name,body)
 local ok,why=pcall(body)
 Skin.destroySurface()
 if ok then print('V25_SKIN_'..name..'_PASS')else failures=failures+1;print('V25_SKIN_'..name..'_FAIL '..tostring(why))end
end

check('TEN_CARDS_COST_RESTORE',function()
 local deck={};for i=1,20 do deck[#deck+1]='defend'end;for i=1,10 do deck[#deck+1]='strike'end
 local h,u,p,event,tap,drain=setup(deck,{'cultist'})
 F.Combat.draw(h.run.combat,20);assert(#h.run.combat.hand==10,'legal hand cap not exercised')
 local hp,energy,turn=h.run.combat.player.hp,h.run.combat.energy,h.run.combat.turn
 local names,hits={},{}
 h:refresh()
 for i,instance in ipairs(h.run.combat.hand)do
  local face=p:GetChild('card'..i);ready(face,F.Combat.cardDefinition(h.run.combat,instance));assert(face.visible)
  names[i]=face:GetChild('name').text;hits[i]=face:GetChild('hit')
 end
 assert(living()==20 and hp==h.run.combat.player.hp and energy==h.run.combat.energy and turn==h.run.combat.turn)
 h:refresh()
 for i=1,10 do assert(p:GetChild('card'..i):GetChild('hit')==hits[i] and p:GetChild('card'..i):GetChild('name').text==names[i])end
 local changed=false
 for action=1,3 do
  local prior={};for i=1,#h.run.combat.hand do local list=roots(p:GetChild('card'..i));prior[i]=list[1]end
  local slot;for i,card in ipairs(h.run.combat.hand)do if card.cardId=='defend'then slot=i;break end end
  assert(slot,'seeded hand has no defend');tap('card'..slot,10+action);tap('playArea',10+action);drain()
  for i,instance in ipairs(h.run.combat.hand)do
   local face=p:GetChild('card'..i);ready(face,F.Combat.cardDefinition(h.run.combat,instance));local list=roots(face)
   if prior[i] and prior[i].templateId~=list[1].templateId then changed=true;assert(not prior[i].alive,'changed slot retained old shell')end
  end
  boundedSlots();assert(living()<=20,'fixed ten-slot cache grew beyond one pair per slot')
 end
 assert(h.run.combat.energy==0 and changed,'spent or changed-definition path was not exercised')
 for i=1,#h.run.combat.hand do assert(p:GetChild('card'..i):GetChild('blockedVeil').visible)end
 tap('endTurn',20);drain();assert(h.run.combat.energy==3 and h.run.combat.turn==2)
 for i,instance in ipairs(h.run.combat.hand)do ready(p:GetChild('card'..i),F.Combat.cardDefinition(h.run.combat,instance))end
 boundedSlots();assert(living()<=20)
end)

check('PILE_REOPEN',function()
 local deck={};for i=1,8 do deck[#deck+1]='defend';deck[#deck+1]='strike'end
 local h,u,p,event,tap,drain,toggle,root=setup(deck,{'cultist'})
 for round=1,2 do
  assert(p:GetChild('drawIcon'):GetChild('hit').click({touchId=30+round}));h:update(0)
  local grid=root:GetChild('deckPanel'):GetChild('grid');assert(h.deckUI.visible and grid.itemCount>0)
  local face=assert(grid.items[0]):GetChild('face');local before=roots(face)
  assert(#before==2,'visible grid has no prebuilt surface')
  -- A refresh need not repaint a stable Grid; its visible decoration must survive.
  h:refresh();local after,host=roots(face)
  assert(host.visible and #after==2 and not face:GetChild('roundFrame').visible,'stable visible Grid surface evicted by endFrame')
  assert(root:GetChild('deckPanel'):GetChild('close'):GetChild('hit').click({touchId=30+round}));h:refresh()
  assert(not h.deckUI.visible and not before[1].alive,'closed Grid retained prior surface')
 end
end)

check('FAILURE_FALLBACK',function()
 local h,u,p=setup({'defend','defend','defend','defend','defend','defend'},{'cultist'})
 local face=p:GetChild('card1');assert(#roots(face)==2)
 Skin.configureSurface(config,api);failMana=true;h:refresh()
 assert(living()==0 and not face:GetChild('v25Surface').visible,'partial template survived')
 assert(face:GetChild('roundFrame').visible and face:GetChild('roundBody').visible,'legacy fallback remains hidden')
 assert(face:GetChild('name').text~='' and face:GetChild('cost').text~='' and face:GetChild('label').text~='')
 assert(face:GetChild('costDisc').visible and face:GetChild('costCore').visible)
 failMana=false;h:refresh();assert(#roots(face)==2 and not face:GetChild('roundFrame').visible)
 Skin.configureSurface({enabled=false},{});h:refresh()
 assert(living()==0 and face:GetChild('roundFrame').visible and face:GetChild('roundBody').visible,'disabled surface did not restore legacy')
end)

check('REWARD_MAP_RELEASE',function()
 local h,u,p,event,tap,drain=setup({'bludgeon'},{'acid_slime_s'})
 assert(living()==2);tap('card1',40);tap('enemy1',40);drain()
 h:refresh()
 assert(h.run.phase=='reward' and p:GetChild('rewardList').visible and visibleRoots()==0,'hidden battle cache is still visible in reward list')
 boundedSlots();assert(living()<=20,'battle fixed-slot cache exceeded its bound')
 tap('cardReward',41);assert(p:GetChild('rewardStage').visible)
 assert(visibleRoots()>0,'reward card surface missing')
 tap('skip',42);h:refresh();assert(p:GetChild('rewardList').visible and visibleRoots()==0,'reward chooser remained visible after close/endFrame')
 local cached=living();boundedSlots()
 for round=1,3 do
  tap('cardReward',43+round*2);h:refresh();assert(p:GetChild('rewardStage').visible and visibleRoots()>0)
  tap('skip',44+round*2);h:refresh();assert(visibleRoots()==0 and living()==cached,'stable battle-page cache grew on picker reopen')
  boundedSlots()
 end
 tap('continue',43);assert(h.run.phase=='map' and h.mode=='map' and living()==0)
end)

check('DEAD_TEMPLATE_CACHED_FACE',function()
 local deck={};for i=1,8 do deck[#deck+1]='defend';deck[#deck+1]='strike'end
 local h,u,p,event,tap,drain,toggle,root=setup(deck,{'cultist'})
 assert(p:GetChild('drawIcon'):GetChild('hit').click({touchId=701}));h:update(0)
 local face=assert(root:GetChild('deckPanel'):GetChild('grid').items[0]):GetChild('face')
 local before=roots(face);assert(#before==2 and face.alive)
 local allocations=#created
 destroy(before[1]);h:refresh()
 local after,host=roots(face)
 assert(#after==0 and not host.visible and #created==allocations,'invalid cached pair was rebuilt instead of retired')
 assert(face:GetChild('roundFrame').visible and face:GetChild('roundBody').visible,'alive cached face lost its surface but legacy remains hidden')
 assert(face:GetChild('costDisc').visible and face:GetChild('costCore').visible,'invalid cached mana did not restore actual-cost orb')
 assert(face:GetChild('name').text~='' and face:GetChild('label').text~='' and face:GetChild('cost').text~='','live cached fields were modified')
end)

check('WRAPPER_RELEASE_RETRY',function()
 for _,method in ipairs({'configure','destroy'})do
  local h,u,p=setup({'defend','defend','defend','defend','defend','defend'},{'cultist'})
  local face=p:GetChild('card1');local before,allocations=living(),#created
  assert(before>0)
  local original=api.destroy
  api.destroy=function()return false end
  local accepted
  if method=='configure' then accepted=Skin.configureSurface({enabled=false},{})
  else accepted=Skin.destroySurface()end
  local retained=living()
  h:refresh()
  local noNewAllocations=#created==allocations
  api.destroy=original
  -- One path retries explicitly; the other uses the next real Host refresh.
  if method=='configure' then Skin.clearSurface()else h:refresh()end
  assert(accepted==false,'wrapper did not report pending destruction: '..method)
  assert(retained==before and noNewAllocations,'pending release allowed new surface ownership: '..method)
  assert(living()==0,'wrapper discarded failed destruction ledger: '..method)
  assert(face:GetChild('roundFrame').visible and face:GetChild('roundBody').visible,'pending release hid legacy fallback')
  Skin.configureSurface(config,api);h:refresh()
  assert(living()==before,'successful release prevented later surface configuration')
 end
end)
assert(failures==0,tostring(failures)..' V25 card-skin integration cases failed')
`;
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',source],{
  cwd:process.cwd(),encoding:'utf8',maxBuffer:2*1024*1024,timeout:30000,
  env:{...process.env,LUA_PATH:`${directory.replaceAll('\\','/')}/?.lua;./src/lua/?.lua`,LUA_PATH_5_3:`${directory.replaceAll('\\','/')}/?.lua;./src/lua/?.lua`,LUA_INIT:'',LUA_INIT_5_3:''},
 });
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 for(const name of ['TEN_CARDS_COST_RESTORE','PILE_REOPEN','FAILURE_FALLBACK','REWARD_MAP_RELEASE','DEAD_TEMPLATE_CACHED_FACE','WRAPPER_RELEASE_RETRY'])assert.match(result.stdout,new RegExp(`V25_SKIN_${name}_PASS`));
});
