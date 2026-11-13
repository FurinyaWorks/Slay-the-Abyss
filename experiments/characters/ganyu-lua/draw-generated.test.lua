package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local E=require('abyss_effects');local Q=require('abyss_action_queue');local S=require('abyss_snapshot');local X=require('abyss_exhaust')
local M=dofile('experiments/characters/ganyu-lua/draw-card.lua');local definitions=dofile('experiments/characters/ganyu-lua/draw-definitions.lua')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(def,up,mode)
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=def
 local deck={};for i=1,20 do deck[i]=def.id end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm'},seed=42})
 local c=table.remove(s.hand,1);c.upgraded=up;s.cardInUse=c;s.pendingPlay={uid=c.uid,cardType='skill'}
 s.ganyuResource={charge=2,storm={amount=4,turns=2}}
 if mode=='full'then C.draw(s,6)elseif mode=='empty'then for i=#s.draw,1,-1 do s.exhaust[#s.exhaust+1]=table.remove(s.draw,i)end elseif mode=='noDraw'then s.player.noDraw=true end
 s.player.statuses.feel_no_pain=3;s.player.statuses.dark_embrace=1;s.exhaustPowerOrder={'feel_no_pain','dark_embrace'}
 return s,c,C.cardDefinition(s,c)
end
local function run(s,e,exhaust,fault)
 local actions={{kind='effect',effect=e}};if exhaust then actions[#actions+1]={kind='useCard'}end
 Q.start(s,actions)
 return Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='ganyuDraw'then return M.dispatch(C,st,a.effect,q)end
  E.apply(C,st,{a.effect},st.player,nil);if fault==true then error('after actual draw')end;return true
 end,useCard=function(st,a,q)local ok=X.move(st,st.cardInUse,'using',q);if fault=='exhaust'then error('after actual exhaust movement')end;return ok end})
end
local count=0
for _,def in ipairs(definitions.cards)do for _,up in ipairs({false,true})do for _,mode in ipairs({'normal','full','empty','noDraw'})do
 local s,c,card=fresh(def,up,mode);local initial=#s.hand;local id=def.id:sub(-2);local drawn=id=='30'and(up and 4 or 3)or(up and 3 or 2)
 local e=M.prepare(C,s,card.effects[1],c.uid);assert(run(s,e,card.exhaust))
 eq(#s.hand,mode=='normal'and initial+drawn+(card.exhaust and 1 or 0)or initial)
 eq(s.ganyuResource.charge,id=='30'and 0 or id=='43'and 1 or 2);eq(s.ganyuResource.storm.turns,2)
 if card.exhaust then eq(s.exhaust[#s.exhaust],c);eq(s.cardInUse,nil);eq(s.player.block,3)else eq(s.cardInUse,c);eq(s.player.block,0)end
 count=count+1
end end end
for _,def in ipairs(definitions.cards)do
 local s,c,card=fresh(def,false,'normal');local e=M.prepare(C,s,card.effects[1],c.uid);local before=C.copy(s);local resource=s.ganyuResource;local hand=s.hand;local restore=S.capture(s)
 s.energy=s.energy-card.cost;assert(not pcall(run,s,e,card.exhaust,true));restore();same(s,before);eq(s.hand,hand);eq(s.ganyuResource,resource);eq(s.cardInUse,c)
 assert(run(s,e,card.exhaust))
end
print('PASS '..count..' generated draw/full/empty/NoDraw and native exhaust hook cases plus3 payment-shaped rollback/retry; not public C.play')

for _,def in ipairs(definitions.cards)do if def.exhaust then
 local s,c,card=fresh(def,false,'normal');local e=M.prepare(C,s,card.effects[1],c.uid);local before=C.copy(s);local exhaust=s.exhaust;local restore=S.capture(s)
 assert(not pcall(run,s,e,true,'exhaust'));restore();same(s,before);eq(s.exhaust,exhaust);eq(s.cardInUse,c);assert(run(s,e,true));eq(s.exhaust[#s.exhaust],c);eq(s.player.block,3)
end end
print('PASS2 native exhaust movement failures restore original instance/piles before one successful retry')
