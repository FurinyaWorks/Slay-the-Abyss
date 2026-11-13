-- Pending canonical x05 admission. Factory/manifest local; runtime is src/build only.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local directory=debug.getinfo(1,'S').source:sub(2):match('^(.*[/])')or './'
local F=dofile(directory..'abyss_xiao_starter.lua');local manifest=dofile(directory..'abyss_xiao_starter_data.lua');local Run=require('abyss_run')
local function pick(s,id)
 for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.cardId==id then table.remove(pile,i);s.hand[#s.hand+1]=c;return c end end end
 error('missing starter card')
end
for _,up in ipairs({false,true})do for _,masked in ipairs({false,true})do
 local data,options=F.prepare(D,manifest);data.enemies.encounters[#data.enemies.encounters+1]={id='xiao_plunge_pair',tier='normal',enemies={'cultist','cultist'},minFloor=1,maxFloor=14}
 local r=Run.new(data,42,options)
 for _,c in ipairs(r.deck)do if c.cardId=='xiao_candidate_x05'then c.upgraded=up end end -- explicit upgrade fixture
 assert(Run.startCombat(r,'xiao_plunge_pair'));local s=r.combat
 for _,e in ipairs(s.enemies)do e.hp=100;e.block=0 end
 if masked then local entry=pick(s,'xiao_candidate_x04');assert(Run.play(r,entry.uid,1))end
 local c=pick(s,'xiao_candidate_x05');local energy=s.energy
 if not masked then local before=C.copy(r);assert(not Run.play(r,c.uid,99));same(r,before)end
 assert(Run.play(r,c.uid,masked and 99 or 2),'x05 public gate not admitted')
 eq(s.energy,energy-1);eq(s.cardInUse,nil)
 local amount=(up and 9 or 6)+(masked and 4 or 0)
 eq(s.enemies[1].hp,masked and 100-amount or 100);eq(s.enemies[2].hp,100-amount)
 local found=false;for _,v in ipairs(s.discard)do if v.uid==c.uid then found=true end end;assert(found)
end end
print('XIAO_STARTER_PLUNGE_PASS actual starter paid entry then base upgrade single/group targets and disposition')
