package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local E=require('abyss_effects');local Q=require('abyss_action_queue');local S=require('abyss_snapshot')
local Paid=dofile('experiments/characters/ganyu-lua/queued-card.lua');local defs=dofile('experiments/characters/ganyu-lua/shield-charge-definitions.lua').cards
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(def,up,charge)
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=def
 local s=C.new(d,{deck={def.id,'strike','strike','strike','strike'},enemies={'jaw_worm'},seed=42});local c
 for i,v in ipairs(s.hand)do if v.cardId==def.id then c=table.remove(s.hand,i);break end end;assert(c)
 c.upgraded=up;s.cardInUse=c;s.pendingPlay={uid=c.uid};s.ganyuResource={charge=charge,storm={amount=7,turns=2}};s.player.statuses.dexterity=2
 return s,c,C.cardDefinition(s,c)
end
local function run(s,card,fault)
 local e=Paid.prepare(C,s,card.effects[2],nil,s.cardInUse.uid)
 Q.start(s,{{kind='effect',effect=card.effects[1]},{kind='effect',effect=e}})
 return Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='ganyuCard'then eq(st.player.block,card.effects[1].value+2);Paid.dispatch(C,st,a.effect,q);if fault=='charge'then error('after charge')end
  else E.apply(C,st,{a.effect},st.player,nil);if fault=='block'then error('after block before charge')end end;return true
 end})
end
local n=0
for _,def in ipairs(defs)do for _,up in ipairs({false,true})do for _,charge in ipairs({0,1,2})do
 local s,c,card=fresh(def,up,charge);assert(run(s,card));eq(s.player.block,card.effects[1].value+2);eq(s.ganyuResource.charge,math.min(2,charge+card.effects[2].amount));eq(s.ganyuResource.storm.amount,7);eq(s.ganyuResource.storm.turns,2);eq(s.cardInUse,c);n=n+1
end
 for _,fault in ipairs({'block','charge'})do
 local s,c,card=fresh(def,up,1);local before=C.copy(s);local resource=s.ganyuResource;local hand=s.hand;local restore=S.capture(s);s.energy=s.energy-card.cost
 assert(not pcall(run,s,card,fault));restore();same(s,before);eq(s.hand,hand);eq(s.ganyuResource,resource);eq(s.cardInUse,c);assert(run(s,card))
 end
end end
print('PASS '..n..' shield-before-charge/saturation base-up cases +12 block/charge failure Snapshot retries; no public C.play')
for _,up in ipairs({false,true})do
 local d=C.copy(D);local def=defs[3];d.cards.cards[#d.cards.cards+1]=def
 local s=C.new(d,{deck={def.id,'strike','strike','strike','strike'},enemies={'jaw_worm'},seed=42});local c
 for _,v in ipairs(s.hand)do if v.cardId==def.id then c=v end end;assert(c);c.upgraded=up;s.ganyuResource={charge=0}
 assert(C.endTurn(s));local found=false;for _,v in ipairs(s.hand)do if v==c then found=true end end;assert(found);eq(c.upgraded,up);eq(s.player.block,0);eq(s.ganyuResource.charge,0)
end
print('PASS2 native56 unplayed retains original UID, no automatic shield or charge')
