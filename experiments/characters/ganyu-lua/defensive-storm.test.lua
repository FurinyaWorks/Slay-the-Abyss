package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local E=require('abyss_effects');local Q=require('abyss_action_queue');local X=require('abyss_exhaust');local S=require('abyss_snapshot')
local M=dofile('experiments/characters/ganyu-lua/storm-card.lua');local R=dofile('experiments/characters/ganyu-lua/resources.lua')
local defs=dofile('experiments/characters/ganyu-lua/defensive-storm-definitions.lua').cards
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(def,up,prior)
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=def
 local deck={def.id};for i=1,14 do deck[#deck+1]='strike'end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm'},seed=42});local c
 for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.cardId==def.id then c=table.remove(pile,i);break end end end;assert(c)
 c.upgraded=up;s.cardInUse=c;s.pendingPlay={uid=c.uid,cardType='skill'};s.ganyuResource={charge=1,storm=prior and C.copy(prior)or nil}
 s.player.statuses.dexterity=2;s.player.statuses.feel_no_pain=3;s.exhaustPowerOrder={'feel_no_pain'};s.enemies[1].hp=200;s.enemies[1].block=0
 return s,c,C.cardDefinition(s,c)
end
local function run(s,card,fault)
 local e=M.prepare(C,s,card.effects[2],s.cardInUse.uid)
 local actions={{kind='effect',effect=card.effects[1]},{kind='effect',effect=e}};if card.exhaust then actions[#actions+1]={kind='useCard'}end
 Q.start(s,actions);return Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='ganyuStorm'then eq(st.player.block,card.effects[1].value+2);local ok=M.dispatch(C,st,a.effect,q);if fault=='storm'then error('after field')end;return ok end
  E.apply(C,st,{a.effect},st.player,nil);return true
 end,useCard=function(st,a,q)local ok=X.move(st,st.cardInUse,'using',q);if fault=='exhaust'then error('after exhaust')end;return ok end})
end
local count=0
for _,def in ipairs(defs)do for _,up in ipairs({false,true})do for _,prior in ipairs({false,{amount=9,turns=1},{amount=1,turns=5}})do
 local s,c,card=fresh(def,up,prior);assert(run(s,card));eq(s.player.block,card.effects[1].value+2+(card.exhaust and 3 or 0));eq(s.enemies[1].hp,200);eq(s.ganyuResource.charge,1)
 local a=math.max(card.effects[2].amount,prior and prior.amount or 0);local turns=math.max(card.effects[2].turns,prior and prior.turns or 0)
 eq(s.ganyuResource.storm.amount,a);eq(s.ganyuResource.storm.turns,turns)
 if card.exhaust then eq(s.exhaust[#s.exhaust],c);eq(s.cardInUse,nil)else eq(s.cardInUse,c)end
 for turn=1,turns do local bank=R.bankBeforeDiscard(s.ganyuResource,turn,0,false);local tick=R.stormAfterDiscard(bank.after,turn);s.ganyuResource=tick.after;E.apply(C,s,tick.afterDiscard,s.player,nil);eq(s.enemies[1].hp,200-a*turn)end
 eq(s.ganyuResource.storm,nil);count=count+1
 end
 for _,fault in ipairs(def.exhaust and{'storm','exhaust'}or{'storm'})do
 local s,c,card=fresh(def,up,{amount=9,turns=1});local before=C.copy(s);local resource=s.ganyuResource;local hand=s.hand;local exhaust=s.exhaust;local restore=S.capture(s)
 s.energy=s.energy-card.cost;assert(not pcall(run,s,card,fault));restore();same(s,before);eq(s.ganyuResource,resource);eq(s.hand,hand);eq(s.exhaust,exhaust);eq(s.cardInUse,c)
 assert(run(s,card));eq(s.ganyuResource.storm.amount,9)
 end
end end
print('PASS '..count..' generated shield-before-field/max-refresh/native ticks +6 field/exhaust rollback retries; no public C.play/owner-end scheduling')
