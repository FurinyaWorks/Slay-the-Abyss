local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Run=require('abyss_run')
local Map=require('abyss_map')
local cursor={CursorDown='down',CursorUp='up',CursorExit='exit',CursorEndDrag='endDrag'}
local function hit(r,p,n)return r:GetChild(p):GetChild(n):GetChild('hit')end
local function release(c,id)c.listeners.down({touchId=id});c.listeners.up({touchId=id})end
local function tap(c,id)release(c,id);return c.click({touchId=id})end
local function same(a,b)
 if type(a)~=type(b)then return false end
 if type(a)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
local cases=0
local function test(name,fn)fn();cases=cases+1;print('ok session menu '..cases..' - '..name)end
test('map, battle, busy feedback and node survive repeated title round trips',function()
 for _,context in ipairs({'map','battle','busy','node'})do
  local calls=0
  local h,r=F.fixture(nil,function()calls=calls+1;return true end,nil,cursor);assert(F.start(h))
  if context=='battle' or context=='busy'then
   assert(Run.startCombat(h.run,'cultist_solo'));h:refresh()
   if context=='busy'then h.battleUI:endTurn();assert(h.battleUI.busy)end
  elseif context=='node'then
   local routes=dofile('tests/lua/support/map_routes.lua')
   local path=routes.to(h.map,function(n)return n.type=='camp'end)
   for i=1,#path-1 do assert(Map.choose(h.map,path[i]))end
   h.run.floor=h.map.floor;assert(h.mapUI:choose(routes.at(h.map,path[#path]).id))
  end
  local run,map,battle,flow=h.run,h.map,h.run.combat,h.run.nodeFlow
  local before=F.Combat.copy(run);local mapBefore=F.Combat.copy(map);local mode=h.mode
  local feedback=h.battleUI.feedback.elapsed
  for i=1,2 do
   assert(h:openMenu());assert(tap(hit(r,'runMenu','mainMenu'),10+i))
   assert(h.mode=='menu' and h.sessionPaused and not h.exitOpen)
   assert(r:GetChild('menuPanel'):GetChild('continueRun').visible)
   assert(not h.battleUI.active and not h.mapUI.navigationEnabled)
   assert(not h.nodeUI:press('campView/rest') and not h:openDeck())
   h:update(20);h:refresh();h:resize(1280,720)
   assert(same(before,run) and same(mapBefore,map),'paused session mutated')
   assert(h.battleUI.feedback.elapsed==feedback and calls==0)
   assert(tap(hit(r,'menuPanel','continueRun'),20+i))
   assert(h.mode==mode and not h.sessionPaused)
   assert(h.run==run and h.map==map and run.combat==battle and run.nodeFlow==flow)
   assert(same(before,run) and same(mapBefore,map))
  end
  h:disable()
 end
end)
test('new game and abandon confirmations cancel safely and discard only on confirm',function()
 local calls=0
 local h,r=F.fixture(nil,function()calls=calls+1 end,nil,cursor);assert(F.start(h))
 local run=h.run
 assert(h:openMenu() and h:returnToMainMenu())
 assert(tap(hit(r,'menuPanel','start'),1) and h.navigationAction=='new' and not h.characterOpen)
 assert(r:GetChild('exitPanel'):GetChild('message').text:find('无法恢复',1,true))
 assert(tap(hit(r,'exitPanel','cancel'),2) and h.run==run and h.sessionPaused)
 assert(h:continueRun() and h:openMenu())
 assert(tap(hit(r,'runMenu','abandon'),3) and h.navigationAction=='abandon')
 assert(tap(hit(r,'exitPanel','cancel'),4) and h.run==run and not h.sessionPaused)
 assert(h:openMenu() and tap(hit(r,'runMenu','abandon'),5))
 assert(tap(hit(r,'exitPanel','confirm'),6) and h.run==nil and h.mode=='menu' and calls==0)
 assert(not h:continueRun() and not h:confirmExit())
 assert(not r:GetChild('menuPanel'):GetChild('continueRun').visible)
 assert(F.start(h));run=h.run;assert(h:openMenu() and h:returnToMainMenu())
 assert(h:start() and h:confirmExit() and h.characterOpen and h.run==nil)
 assert(F.confirmStart(h) and h.run~=run and calls==0)
 h:disable()
end)
test('title quit preserves session on failure, retries once and never claims a persistent save',function()
 local calls=0
 local h,r=F.fixture(nil,function(victory)assert(not victory);calls=calls+1;return calls>1 end,nil,cursor)
 assert(F.start(h));assert(h:openMenu() and h:returnToMainMenu())
 local run=h.run;local before=F.Combat.copy(run)
 assert(r:GetChild('menuPanel'):GetChild('sessionHint').text:find('退出奇域后无法继续',1,true))
 assert(tap(hit(r,'menuPanel','titleQuit'),1))
 assert(not tap(hit(r,'exitPanel','confirm'),2) and calls==1 and not h.settlementRequested)
 assert(h:closeExit() and h:continueRun() and same(before,run))
 assert(h:openMenu() and h:returnToMainMenu() and h:openExit())
 assert(h:confirmExit() and calls==2 and h.settlementRequested)
 assert(not h:continueRun() and not h:confirmExit() and calls==2)
 h:disable()
end)
test('old pointer releases cannot return, continue or replace a later context',function()
 local h,r=F.fixture(nil,nil,nil,cursor);assert(F.start(h))
 assert(h:openMenu());local back=hit(r,'runMenu','mainMenu');release(back,1)
 assert(h:closeExit() and h:openMenu());assert(not back.click({touchId=1}))
 assert(tap(back,2));local resume=hit(r,'menuPanel','continueRun');release(resume,3)
 assert(h:openExit() and h:closeExit());assert(not resume.click({touchId=3}) and h.sessionPaused)
 assert(tap(resume,4) and h.mode=='map')
 h:disable()
end)
print('SESSION_MENU_NAVIGATION_PASS '..cases)
