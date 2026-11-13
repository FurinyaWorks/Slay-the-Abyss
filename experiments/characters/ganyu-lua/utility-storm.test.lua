package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local E=require('abyss_effects');local Q=require('abyss_action_queue');local X=require('abyss_exhaust');local S=require('abyss_snapshot')
local M=dofile('experiments/characters/ganyu-lua/storm-card.lua');local Paid=dofile('experiments/characters/ganyu-lua/queued-card.lua')
local defs=dofile('experiments/characters/ganyu-lua/utility-storm-definitions.lua').cards
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
 local storm=M.prepare(C,s,card.effects[1],s.cardInUse.uid)
 local utility=card.effects[2].op=='ganyuCard'and Paid.prepare(C,s,card.effects[2],nil,s.cardInUse.uid)or card.effects[2]
 local actions={{kind='effect',effect=storm},{kind='effect',effect=utility}};if card.exhaust then actions[#actions+1]={kind='useCard'}end
 Q.start(s,actions);return Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='ganyuStorm'then return M.dispatch(C,st,a.effect,q)end
  eq(st.ganyuResource.storm.amount,7);eq(st.ganyuResource.storm.turns,2)
  if a.effect.op=='ganyuCard'then Paid.dispatch(C,st,a.effect,q)else E.apply(C,st,{a.effect},st.player,nil)end
  if fault=='utility'then error('after actual utility')end;return true
 end,useCard=function(st,a,q)local ok=X.move(st,st.cardInUse,'using',q);if fault=='exhaust'then error('after exhaust')end;return ok end})
end
local n=0
for _,def in ipairs(defs)do for _,up in ipairs({false,true})do for _,charge in ipairs({0,1,2})do for _,mode in ipairs({'normal','full','empty','noDraw','shuffle'})do
 local s,c,card=fresh(def,up,mode,charge);local hand=#s.hand;assert(run(s,card));eq(s.enemies[1].hp,200)
 eq(s.ganyuResource.charge,def.exhaust and math.min(2,charge+1)or charge);eq(#s.hand,hand+(not def.exhaust and(mode=='normal'or mode=='shuffle')and 1 or 0))
 if def.exhaust then eq(s.exhaust[#s.exhaust],c);eq(s.cardInUse,nil);eq(s.player.block,3)else eq(s.cardInUse,c);eq(s.player.block,0)end;n=n+1
end end
 for _,fault in ipairs(def.exhaust and{'utility','exhaust'}or{'utility'})do
 local s,c,card=fresh(def,up,'shuffle',1);local before=C.copy(s);local hand=s.hand;local draw=s.draw;local discard=s.discard;local resource=s.ganyuResource;local restore=S.capture(s)
 s.energy=s.energy-card.cost;assert(not pcall(run,s,card,fault));restore();same(s,before);eq(s.hand,hand);eq(s.draw,draw);eq(s.discard,discard);eq(s.ganyuResource,resource);eq(s.cardInUse,c);assert(run(s,card))
 end
end end
print('PASS '..n..' field-before-utility base/up charge/full/empty/NoDraw/shuffle +6 utility/exhaust full-state rollback retries; isolated paid context')
