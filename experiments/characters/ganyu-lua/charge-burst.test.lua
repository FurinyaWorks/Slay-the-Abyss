package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local E=require('abyss_effects');local Q=require('abyss_action_queue');local S=require('abyss_snapshot');local X=require('abyss_exhaust')
local Paid=dofile('experiments/characters/ganyu-lua/queued-card.lua');local def=dofile('experiments/characters/ganyu-lua/charge-burst-definitions.lua').cards[1]
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(up,charge,noDraw)
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=def;local deck={};for i=1,16 do deck[i]=def.id end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm'},seed=42});local c=table.remove(s.hand,1);c.upgraded=up;s.cardInUse=c;s.pendingPlay={uid=c.uid};s.energy=0;s.ganyuResource={charge=charge}
 s.player.noDraw=noDraw;s.player.statuses.dexterity=2;s.player.statuses.feel_no_pain=3;s.player.statuses.dark_embrace=1;s.exhaustPowerOrder={'feel_no_pain','dark_embrace'}
 return s,c,C.cardDefinition(s,c)
end
local function run(s,card,fault)
 local e=Paid.prepare(C,s,card.effects[1],nil,s.cardInUse.uid);local actions={{kind='effect',effect=e}}
 if card.effects[2]then actions[#actions+1]={kind='effect',effect=card.effects[2]}end;actions[#actions+1]={kind='useCard'}
 Q.start(s,actions);return Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='ganyuCard'then Paid.dispatch(C,st,a.effect,q);if fault=='charge'then error('after charge')end
  else eq(st.ganyuResource.charge,2);E.apply(C,st,{a.effect},st.player,nil);if a.effect.op=='block'and fault=='block'then error('after block')end end;return true
 end,useCard=function(st,a,q)local ok=X.move(st,st.cardInUse,'using',q);if fault=='exhaust'then error('after exhaustion')end;return ok end})
end
for _,up in ipairs({false,true})do for _,charge in ipairs({0,1,2})do for _,noDraw in ipairs({false,true})do
 local s,c,card=fresh(up,charge,noDraw);local hand=#s.hand;assert(run(s,card));eq(s.ganyuResource.charge,2);eq(s.player.block,up and 8 or 3);eq(s.energy,0);eq(s.exhaust[#s.exhaust],c);eq(s.cardInUse,nil);eq(#s.hand,hand+(noDraw and 0 or 1))
 local before=C.copy(s);assert(not pcall(run,s,card));same(s,before)
end end
 for _,fault in ipairs(up and{'charge','block','exhaust'}or{'charge','exhaust'})do
 local s,c,card=fresh(up,1,false);local before=C.copy(s);local resource=s.ganyuResource;local hand=s.hand;local exhaust=s.exhaust;local restore=S.capture(s)
 assert(not pcall(run,s,card,fault));restore();same(s,before);eq(s.ganyuResource,resource);eq(s.hand,hand);eq(s.exhaust,exhaust);eq(s.cardInUse,c);assert(run(s,card));eq(s.player.block,up and 8 or 3)
 end
end
print('PASS12 zero-energy base/up charge cap/native FNP-DE-NoDraw/replay rejection +5 charge/block/exhaust rollback retries; isolated paid context')
