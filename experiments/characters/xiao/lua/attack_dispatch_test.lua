package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C,Q,D=require('abyss_combat'),require('abyss_action_queue'),require('abyss_data')
local X=require('abyss_xiao_dispatch');local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
local function fresh(mask)
 local s=C.new(D,{deck={'strike'},enemies={'cultist','cultist'},seed=42})
 s.xiao={relicUsed=true,startingRelic=true};s.player.statuses.xiao_mask=mask>0 and mask or nil
 local card=s.hand[1];s.pendingPlay={uid=card.uid,targetId=s.enemies[2].id};s.cardInUse=card
 for _,e in ipairs(s.enemies)do e.hp=50;e.block=5 end
 return s
end
local handlers={effect=function(s,a,q)
 if a.effect.op=='xiaoCard'then return X.dispatch(C,s,a.effect,q)end
 if a.effect.op=='faultProbe'then error('post damage failure')end
 local target=s.player;for _,e in ipairs(s.enemies)do if e.id==a.effect.targetId then target=e end end
 C.applyEffects(s,{a.effect},s.player,target,s.cardInUse);return true
end}
local function effect(s,kind,value)return {kind='effect',effect={op='xiaoCard',kind=kind,value=value,uid=s.pendingPlay.uid}}end
for _,up in ipairs({false,true})do for mask=0,1 do
 local s=fresh(mask);local value=up and 9 or 6
 s.pendingPlay.targetId='absent' -- AoE must not require unrelated single target.
 Q.start(s,{effect(s,'damageAll',value)});Q.run(s,handlers)
 for _,e in ipairs(s.enemies)do eq(e.hp,50-(value+mask*4-5));eq(e.block,0)end
end end
print('PASS x12 base/up real AoE armor and mask bonus without single target')
for _,up in ipairs({false,true})do
 local s=fresh(1);local target=s.enemies[2];local damage=up and 9 or 6
 Q.start(s,{effect(s,'breakBlock',0),effect(s,'damage',damage)});Q.run(s,handlers)
 eq(target.block,0);eq(target.hp,50-damage-4);eq(s.enemies[1].hp,50);eq(s.enemies[1].block,5)
end
print('PASS x15 base/up removes same paid targets armor before real damage')
local s=fresh(0);s.enemies[2].hp=0;local before=C.copy(s)
assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='breakBlock',value=0,uid=s.pendingPlay.uid},Q));same(s,before)
s=fresh(0);before=C.copy(s);local target=s.enemies[2];local restore=require('abyss_snapshot').capture(s)
local ok=pcall(function()Q.start(s,{effect(s,'breakBlock',0),effect(s,'damage',9),{kind='effect',effect={op='faultProbe'}}});Q.run(s,handlers)end)
assert(not ok);eq(target.block,0);eq(target.hp,41);restore();same(s,before);eq(s.enemies[2],target)
print('PASS dead target rejects before break and host snapshot restores armor damage and queue')
