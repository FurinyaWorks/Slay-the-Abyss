package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local E=require('abyss_effects');local Q=require('abyss_action_queue');local X=require('abyss_exhaust');local S=require('abyss_snapshot')
local M=dofile('experiments/characters/ganyu-lua/storm-card.lua');local Paid=dofile('experiments/characters/ganyu-lua/queued-card.lua')
local defs=dofile('experiments/characters/ganyu-lua/charge-draw-definitions.lua').cards
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(def,up,mode,charge)
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=def
 local deck={};for i=1,20 do deck[i]=def.id end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm'},seed=42});local c=table.remove(s.hand,1);c.upgraded=up;s.cardInUse=c;s.pendingPlay={uid=c.uid,cardType='skill'}
 s.ganyuResource={charge=charge,storm={amount=7,turns=1}};s.enemies[1].hp=200
 if mode=='full'then C.draw(s,6)elseif mode=='empty'then for i=#s.draw,1,-1 do s.exhaust[#s.exhaust+1]=table.remove(s.draw,i)end elseif mode=='noDraw'then s.player.noDraw=true elseif mode=='shuffle'then for i=#s.draw,1,-1 do s.discard[#s.discard+1]=table.remove(s.draw,i)end end
 s.player.statuses.feel_no_pain=3;s.exhaustPowerOrder={'feel_no_pain'}
 return s,c,C.cardDefinition(s,c)
end
local function run(s,card,fault)
 local beforeCharge=s.ganyuResource.charge;local drawSeen=false
 local actions={};for _,e in ipairs(card.effects)do actions[#actions+1]={kind='effect',effect=e.op=='ganyuCard'and Paid.prepare(C,s,e,nil,s.cardInUse.uid)or e}end
 if card.exhaust then actions[#actions+1]={kind='useCard'}end
 Q.start(s,actions);return Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='ganyuCard'then
   if not card.exhaust then assert(drawSeen)end
   Paid.dispatch(C,st,a.effect,q)
  else
   eq(st.ganyuResource.charge,card.exhaust and math.min(2,beforeCharge+card.effects[1].amount)or beforeCharge)
   E.apply(C,st,{a.effect},st.player,nil);drawSeen=true
   if fault=='draw'then error('after actual draw before next operation')end
  end;return true
 end,useCard=function(st,a,q)local ok=X.move(st,st.cardInUse,'using',q);if fault=='exhaust'then error('after exhaust')end;return ok end})
end
local n=0
for _,def in ipairs(defs)do for _,up in ipairs({false,true})do for _,charge in ipairs({0,1,2})do for _,mode in ipairs({'normal','full','empty','noDraw','shuffle'})do
 local s,c,card=fresh(def,up,mode,charge);local hand=#s.hand;assert(run(s,card));eq(s.enemies[1].hp,200)
 eq(s.ganyuResource.charge,math.min(2,charge+(def.exhaust and(up and 2 or 1)or 1)));eq(#s.hand,hand+((mode=='normal'or mode=='shuffle')and(def.exhaust and 1 or up and 3 or 2)or 0));eq(s.ganyuResource.storm.amount,7);eq(s.ganyuResource.storm.turns,1)
 if def.exhaust then eq(s.exhaust[#s.exhaust],c);eq(s.cardInUse,nil);eq(s.player.block,3)else eq(s.cardInUse,c);eq(s.player.block,0)end;n=n+1
end end
 for _,fault in ipairs(def.exhaust and{'draw','exhaust'}or{'draw'})do
 local s,c,card=fresh(def,up,'shuffle',1);local before=C.copy(s);local hand=s.hand;local draw=s.draw;local discard=s.discard;local resource=s.ganyuResource;local restore=S.capture(s)
 s.energy=s.energy-card.cost;assert(not pcall(run,s,card,fault));restore();same(s,before);eq(s.hand,hand);eq(s.draw,draw);eq(s.discard,discard);eq(s.ganyuResource,resource);eq(s.cardInUse,c);assert(run(s,card))
 end
end end
print('PASS '..n..' ordered draw/charge base/up charge/full/empty/NoDraw/shuffle +6 draw/exhaust full-state rollback retries; isolated paid context')
