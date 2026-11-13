package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local E=require('abyss_effects');local Q=require('abyss_action_queue');local X=require('abyss_exhaust');local S=require('abyss_snapshot')
local M=dofile('experiments/characters/ganyu-lua/conditional-card.lua')
local definitions=dofile('experiments/characters/ganyu-lua/conditional-lifecycle-definitions.lua')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function run(s,e,fault,exhaust)
 local actions={{kind='effect',effect=e}};if exhaust then actions[#actions+1]={kind='useCard'}end;Q.start(s,actions)
 return Q.run(s,{effect=function(state,a,queue)
  if a.effect.op=='ganyuConditional'then return M.dispatch(C,state,a.effect,queue)end
  local target;for _,enemy in ipairs(state.enemies)do if enemy.id==a.effect.targetId then target=enemy end end
  E.apply(C,state,{a.effect},state.player,target);if fault then error('after native conditional')end;return true
 end,useCard=function(st,a,q)return X.move(st,st.cardInUse,'using',q)end})
end

local expected={['34']={2,6,3,9},['38']={2,8,4,10},['40']={6,12,8,16},['74']={2,8,3,10}}
local count=0
for _,definition in ipairs(definitions.cards)do for _,up in ipairs({false,true})do for charge=0,2 do for _,storm in ipairs({false,true})do
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=definition
 local s=C.new(d,{deck={definition.id,definition.id,definition.id},enemies={'jaw_worm','jaw_worm'},seed=42})
 local instance=table.remove(s.hand,1);instance.upgraded=up;s.cardInUse=instance;s.pendingPlay={uid=instance.uid,targetId=s.enemies[1].id}
 s.ganyuResource={charge=charge,storm=storm and{amount=0,turns=2}or nil}
 s.player.statuses.strength=2;s.player.statuses.dexterity=2
 for _,enemy in ipairs(s.enemies)do enemy.hp=100;enemy.block=1 end
 local card=C.cardDefinition(s,instance);local e=M.prepare(C,s,card.effects[1],s.enemies[1],instance.uid)
 s.player.statuses.strength=90;s.player.statuses.dexterity=90
 local id=definition.id:sub(-2);local v=expected[id];local base,bonus=up and v[3]or v[1],up and v[4]or v[2]
 local active=(id=='74'and charge>=1)or(id~='74'and charge==2)
 local value=base+(active and bonus or 0);assert(run(s,e,false,card.exhaust))
 local remaining=charge
 if id~='74'and charge==2 then remaining=0 elseif id=='74'and charge>=1 then remaining=charge-1 end
 eq(s.ganyuResource.charge,remaining)
 local block=id=='38'or id=='74';eq(s.player.block,block and value+2 or 0)
 eq(s.enemies[1].hp,block and 100 or 99-value);eq(s.enemies[2].hp,id=='40'and 99-value or 100)
 if card.exhaust then eq(s.exhaust[#s.exhaust],instance);eq(s.cardInUse,nil)else eq(s.cardInUse,instance)end
 count=count+1
end end end end
print('PASS '..count..' generated definition/native variant/real queue combinations; not public payment')

for _,def in ipairs(definitions.cards)do for _,up in ipairs({false,true})do
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=def
 local s=C.new(d,{deck={def.id,'strike','strike','strike','strike'},enemies={'jaw_worm'},seed=42});local c
 for i,v in ipairs(s.hand)do if v.cardId==def.id then c=table.remove(s.hand,i);break end end;assert(c);c.upgraded=up;s.cardInUse=c;s.pendingPlay={uid=c.uid,targetId=s.enemies[1].id};s.ganyuResource={charge=2}
 s.enemies[1].hp=100;local card=C.cardDefinition(s,c);local e=M.prepare(C,s,card.effects[1],s.enemies[1],c.uid);local before=C.copy(s);local resource=s.ganyuResource;local restore=S.capture(s)
 s.energy=s.energy-card.cost;assert(not pcall(run,s,e,true,card.exhaust));restore()
 local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
 same(s,before);eq(s.ganyuResource,resource);eq(s.cardInUse,c);assert(run(s,e,false,card.exhaust))
 if def.selfRetain then
  local t=C.new(d,{deck={def.id,'strike','strike','strike','strike'},enemies={'jaw_worm'},seed=42});local retained;for _,v in ipairs(t.hand)do if v.cardId==def.id then retained=v end end;retained.upgraded=up;t.ganyuResource={charge=0};assert(C.endTurn(t));local found=false;for _,v in ipairs(t.hand)do if v==retained then found=true end end;assert(found);eq(t.ganyuResource.charge,0);eq(t.player.block,0)
 end
end end
print('PASS8 native-effect failure Snapshot retries +4 actual unplayed retention cases; no public payment/finalization')
