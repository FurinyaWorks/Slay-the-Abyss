package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local L=require('experiments.characters.zhongli.native.lifecycle');local R=require('experiments.characters.zhongli.native.resource_cards');local Q=require('abyss_action_queue');local E=require('abyss_effects');local S=require('abyss_snapshot')
local function install(up)
 local data=C.copy(D);for _,d in ipairs(R.definitions())do if d.id=='zl66'then data.cards.cards[#data.cards.cards+1]=d end end
 local s=L.start(C.new(data,{seed=42,deck={{cardId='zl66',upgraded=up}},enemies={'cultist'}}),'counter',false)
 s.hand[1].cardId='zl66';s.hand[1].upgraded=up;local p=R.prepare(s,s.hand[1].uid);local actions={}
 for _,e in ipairs(p.effects)do actions[#actions+1]={kind='effect',effect=e}end
 Q.start(s,actions);Q.run(s,{effect=function(st,a,q)if a.effect.op=='zhongliCard'then return R.dispatch(C,st,a.effect,q)end;E.apply(C,st,{a.effect},st.player,st.enemies[1]);return true end})
 return s
end
local count=0
for _,up in ipairs({false,true})do for _,hit in ipairs({0,5})do for _,block in ipairs({0,10})do for _,enemyBlock in ipairs({0,2,9})do for _,fixed in ipairs({false,true})do
 local s=install(up);s.player.block=block;s.enemies[1].block=enemyBlock;local hp,ehp=s.player.hp,s.enemies[1].hp;local jade=s.zhongliCandidate.jade;local counter=up and 4 or 3
 C.damage(s,s.enemies[1],s.player,hit,fixed)
 assert(s.player.hp==hp-math.max(0,hit-block));assert(s.zhongliCandidate.jade==jade,'unimplemented absorption unexpectedly consumed resource')
 assert(s.enemies[1].hp==ehp-(fixed and 0 or math.max(0,counter-enemyBlock)))
 assert(s.enemies[1].block==(fixed and enemyBlock or math.max(0,enemyBlock-counter)))
 count=count+1
end end end end end
for _,up in ipairs({false,true})do
 local s=install(up);local jade=s.zhongliCandidate.jade;local hp=s.enemies[1].hp
 assert(C.endTurn(s));assert((s.player.statuses.flame_barrier or 0)==0 and s.enemies[1].hp==hp and s.zhongliCandidate.jade==jade)
end
assert(count==48)
print('RESOURCE_COUNTER_NATIVE_PASS 48 standalone attack/zero/block/fixed cases +2 native next-turn expiry; resource installation not public paid')
