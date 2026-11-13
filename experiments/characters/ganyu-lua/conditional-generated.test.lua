package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local E=require('abyss_effects');local Q=require('abyss_action_queue')
local M=dofile('experiments/characters/ganyu-lua/conditional-card.lua')
local definitions=dofile('experiments/characters/ganyu-lua/conditional-definitions.lua')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function run(s,e,fault)
 Q.start(s,{{kind='effect',effect=e}})
 return Q.run(s,{effect=function(state,a,queue)
  if a.effect.op=='ganyuConditional'then return M.dispatch(C,state,a.effect,queue)end
  local target;for _,enemy in ipairs(state.enemies)do if enemy.id==a.effect.targetId then target=enemy end end
  E.apply(C,state,{a.effect},state.player,target);if fault then error('after native conditional')end;return true
 end})
end

local expected={['17']={8,14,11,17},['19']={5,8,7,10},['35']={2,5,3,7},['32']={3,6,4,8},['41']={3,5,4,7},['42']={3,6,4,8},['45']={4,4,6,5}}
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
 local active=(id=='32'and storm)or((id=='41'or id=='42')and charge>=1)or(id~='32'and id~='41'and id~='42'and charge==2)
 local value=base+(active and bonus or 0);assert(run(s,e))
 local remaining=charge
 if (id=='17'or id=='19'or id=='35')and charge==2 then remaining=0 elseif(id=='41'or id=='42')and charge>=1 then remaining=charge-1 end
 eq(s.ganyuResource.charge,remaining)
 local block=id=='19'or id=='32'or id=='42';eq(s.player.block,block and value+2 or 0)
 eq(s.enemies[1].hp,block and 100 or 99-value);eq(s.enemies[2].hp,id=='35'and 99-value or 100)
 count=count+1
end end end end
print('PASS '..count..' generated definition/native variant/real queue combinations; not public payment')
