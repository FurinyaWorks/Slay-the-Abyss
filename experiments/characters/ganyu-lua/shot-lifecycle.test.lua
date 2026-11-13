package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local E=require('abyss_effects');local Q=require('abyss_action_queue');local S=require('abyss_snapshot');local X=require('abyss_exhaust')
local M=dofile('experiments/characters/ganyu-lua/queued-card.lua');local defs=dofile('experiments/characters/ganyu-lua/shot-lifecycle-definitions.lua').cards
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(def,up,charge,block)
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=def;local s=C.new(d,{deck={def.id,'strike','strike','strike','strike'},enemies={'jaw_worm','jaw_worm'},seed=42});local c
 for i,v in ipairs(s.hand)do if v.cardId==def.id then c=table.remove(s.hand,i);break end end;assert(c);c.upgraded=up;s.cardInUse=c;s.pendingPlay={uid=c.uid,targetId=s.enemies[1].id};s.ganyuResource={charge=charge}
 for _,enemy in ipairs(s.enemies)do enemy.hp=100;enemy.block=block end;s.player.statuses.strength=2
 return s,c,C.cardDefinition(s,c)
end
local function run(s,e,card,fault)
 local actions={{kind='effect',effect=e}};if card.exhaust then actions[#actions+1]={kind='useCard'}end;Q.start(s,actions)
 return Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='ganyuCard'then return M.dispatch(C,st,a.effect,q)end
  local target;for _,enemy in ipairs(st.enemies)do if enemy.id==a.effect.targetId then target=enemy end end;E.apply(C,st,{a.effect},st.player,target);if fault=='damage'then error('after native damage')end;return true
 end,useCard=function(st,a,q)local ok=X.move(st,st.cardInUse,'using',q);if fault=='exhaust'then error('after exhaust')end;return ok end})
end
local n=0
for _,def in ipairs(defs)do for _,up in ipairs({false,true})do for charge=0,2 do for _,block in ipairs({0,5})do
 local s,c,card=fresh(def,up,charge,block);local e=M.prepare(C,s,card.effects[1],s.enemies[1],c.uid);s.player.statuses.strength=90
 local id=def.id:sub(-2);local direct=id=='27'and(up and 10 or 7)or(up and 11 or 8);local bloom=id=='27'and(up and 8 or 6)or(up and 10 or 8)
 assert(run(s,e,card));eq(s.enemies[1].hp,100-math.max(0,direct+2+(charge==2 and bloom+2 or 0)-block));eq(s.enemies[2].hp,100-(charge==2 and math.max(0,bloom+2-block)or 0));eq(s.ganyuResource.charge,charge==2 and 0 or charge)
 if card.exhaust then eq(s.exhaust[#s.exhaust],c);eq(s.cardInUse,nil)else eq(s.cardInUse,c)end;n=n+1
end end
 for _,fault in ipairs(def.exhaust and{'damage','exhaust'}or{'damage'})do
 local s,c,card=fresh(def,up,2,5);local e=M.prepare(C,s,card.effects[1],s.enemies[1],c.uid);local before=C.copy(s);local resource=s.ganyuResource;local exhaust=s.exhaust;local restore=S.capture(s);s.energy=s.energy-card.cost
 assert(not pcall(run,s,e,card,fault));restore();same(s,before);eq(s.ganyuResource,resource);eq(s.exhaust,exhaust);eq(s.cardInUse,c);assert(run(s,e,card))
 end
 if def.selfRetain then local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=def;local t=C.new(d,{deck={def.id,'strike','strike','strike','strike'},enemies={'jaw_worm'},seed=42});local c;for _,v in ipairs(t.hand)do if v.cardId==def.id then c=v end end;assert(c);c.upgraded=up;t.ganyuResource={charge=1};assert(C.endTurn(t));local found=false;for _,v in ipairs(t.hand)do if v==c then found=true end end;assert(found);eq(t.ganyuResource.charge,1)end
end end
print('PASS '..n..' real shot/base-up/charge/armor/use-time captures +6 damage/exhaust Snapshot retries +2 native27 retention; no public payment or lethal cleanup')
