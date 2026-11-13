-- Author supplemental acceptance; run only against a frozen shared storm host.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data')
local definitions=dofile(assert(GANYU_STORM_DEFINITIONS,'source-bound definition path required'))
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(up,relic)
 local d=C.copy(D);for _,def in ipairs(definitions.cards)do d.cards.cards[#d.cards.cards+1]=def end
 local deck={};for i=1,12 do deck[i]='ganyu_lab_05'end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=relic}})
 s.hand[1].upgraded=up;s.enemies[1].hp=100;s.enemies[1].maxHp=100;s.enemies[1].block=0
 return s,s.hand[1]
end
for _,up in ipairs({false,true})do
 local s,c=fresh(up,false);s.ganyuResource.charge=1;s.ganyuResource.storm={amount=9,turns=4}
 assert(C.play(s,c.uid));eq(s.energy,1);eq(s.ganyuResource.charge,1);eq(s.ganyuResource.storm.amount,9);eq(s.ganyuResource.storm.turns,4);eq(s.enemies[1].hp,100)
 local n,nc=fresh(up,true);assert(C.play(n,nc.uid));eq(n.energy,1);assert(C.endTurn(n));eq(n.ganyuResource.charge,1);eq(n.ganyuResource.storm.turns,1);eq(n.enemies[1].hp,up and 94 or 96)
 -- Real Corruption exhaust + Dark Embrace triggers after setup, then a native draw fault.
 local f,fc=fresh(up,false);assert(require('abyss_corruption').apply(f,1));f.player.statuses.dark_embrace=1;f.exhaustPowerOrder={'dark_embrace'};f.player.powerOrder={'dark_embrace'};f.energy=0
 local before=C.copy(f);local hand=f.hand;local resource=f.ganyuResource;local originalDraw=C.draw;local reached=false
 C.draw=function(state,count,...)
  if state==f then reached=true;eq(state.ganyuResource.storm.amount,up and 6 or 4);eq(state.exhaust[#state.exhaust],fc)end
  local result=originalDraw(state,count,...);if state==f then error('after real post-storm exhaust draw')end;return result
 end
 local called,ok,why=pcall(C.play,f,fc.uid);C.draw=originalDraw
 assert(reached,'post-setup native exhaust hook not reached');assert(not called or ok==false);same(f,before);eq(f.hand,hand);eq(f.ganyuResource,resource);eq(f.hand[1],fc)
 assert(C.play(f,fc.uid));eq(f.energy,0);eq(f.exhaust[#f.exhaust],fc);eq(f.ganyuResource.storm.amount,up and 6 or 4)
 local finished=C.copy(f);eq(C.play(f,fc.uid),false);same(f,finished)
end
print('PASS6 source-bound public storm refresh/bank/Corruption native-exhaust-fault retry cases')
