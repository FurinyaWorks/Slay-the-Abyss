-- Real draw/discard/recharge cycling of all ten starter instances; fixed harmless enemy.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq=H.C,H.Data,H.eq
local directory=debug.getinfo(1,'S').source:sub(2):match('^(.*[/])')or './'
local F=dofile(directory..'abyss_xiao_starter.lua');local manifest=dofile(directory..'abyss_xiao_starter_data.lua');local Run=require('abyss_run')
local data,options=F.prepare(D,manifest)
data.enemies.enemies[#data.enemies.enemies+1]={id='xiao_cycle_fixture',name='test wait',tier='normal',hp=9999,intents={{id='wait',kind='defend',effects={{op='block',value=0}}}}}
data.enemies.encounters[#data.enemies.encounters+1]={id='xiao_cycle_room',tier='normal',enemies={'xiao_cycle_fixture'},minFloor=1,maxFloor=14}
local r=Run.new(data,11,options);assert(Run.startCombat(r,'xiao_cycle_room'))
local seen={};local count=0
for turn=1,10 do
 local s=r.combat;assert(s.player.hp>0)
 while s.energy>0 and #s.hand>0 do
  local c=s.hand[1];local energy=s.energy;assert(Run.play(r,c.uid,1));eq(s.energy,energy-1)
  if not seen[c.deckUid]then seen[c.deckUid]=true;count=count+1 end
  eq(s.cardInUse,nil)
 end
 if count==10 then break end
 assert(Run.endTurn(r))
end
eq(count,10);for _,c in ipairs(r.deck)do assert(seen[c.uid])end
print('XIAO_STARTER_CYCLE_PASS all ten deck UIDs naturally drawn and paid with real recharge discard reshuffle; fixed no-attack enemy')
