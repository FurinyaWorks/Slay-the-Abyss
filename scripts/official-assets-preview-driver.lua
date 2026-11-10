local V=dofile('scripts/official-assets-preview.lua')
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Map=require('abyss_map');local Routes=dofile('tests/lua/support/map_routes.lua')
local h,root=F.fixture();V.capture('menu',h,root,'real Host menu')
assert(h:start());V.capture('character',h,root,'real Host start command')
assert(h:selectCharacter('traveler') and h:selectElement('ironclad') and h:confirmCharacter())
V.capture('map',h,root,'real Host character confirmation; component campaign without Neow')
assert(h.mapUI:choose(F.Nodes.available(h.run,h.map)[1].id));h:update(1);V.capture('battle',h,root,'first connected map encounter')
-- Explicit legal click strategy; no health, phase, resource or victory mutation.
for turn=1,60 do
 if h.run.phase~='combat'then break end
 for attempt=1,10 do
  if h.run.phase~='combat'then break end
  local b=h.run.combat;local slot
  for i,c in ipairs(b.hand)do if F.Combat.canPlay(b,c.uid,h.battleUI.target)then slot=i;break end end
  if not slot then break end
  F.click(root,'battlePanel','card'..slot)
  if h.battleUI.selected then
   local _,reason=F.Combat.canPlay(b,h.battleUI.selected,nil)
   F.click(root,'battlePanel',reason=='invalid_target' and 'enemy1' or 'playArea')
  end
 end
 if h.run.phase=='combat'then F.click(root,'battlePanel','endTurn')end
end
assert(h.run.phase=='reward');V.capture('reward',h,root,'natural first encounter victory via legal card and turn clicks')
for _,kind in ipairs({'shop','event','camp','treasure'})do
 local u,r=F.fixture();assert(F.start(u))
 local path=Routes.to(u.map,function(n)return n.type==kind and n.roomKind~='boss_treasure'end)
 for i=1,#path-1 do assert(Map.choose(u.map,path[i]))end
 u:refresh();assert(u.mapUI:choose(path[#path]))
 V.capture(kind,u,r,'independent component room; connected-map route skips resolution of preceding rooms, NOT natural playthrough')
 if kind=='treasure'then F.click(r,'nodePanel','treasureView/chest');u.nodeUI:update(2);V.capture('treasure-open',u,r,'real chest-open command in independent room')end
end
-- Explicit component stress setup, not natural run evidence.
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local deck={};for i=1,12 do deck[i]='strike'end
local u,b,p,event,tap,drain,toggle,r=H.setup(deck,{'cultist','jaw_worm'})
F.Combat.draw(u.run.combat,20);u:refresh();u:update(1)
assert(#u.run.combat.hand==10 and #u.run.combat.enemies==2)
V.capture('battle-ten-dual',u,r,'real Combat.new component stress fixture plus Core draw; NOT natural deck or encounter')
V.print()
