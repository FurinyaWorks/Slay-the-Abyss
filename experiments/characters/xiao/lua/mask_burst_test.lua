package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C,Q,D=require('abyss_combat'),require('abyss_action_queue'),require('abyss_data')
local X=require('abyss_xiao_dispatch');local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
local function fresh(mask)
 local s=C.new(D,{deck={'strike'},enemies={'cultist','cultist'},seed=42})
 s.xiao={relicUsed=true,startingRelic=true};s.player.statuses.xiao_mask=mask>0 and mask or nil
 local card=table.remove(s.hand,1);s.pendingPlay={uid=card.uid,targetId=s.enemies[2].id};s.cardInUse=card
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
D.statuses.statuses[#D.statuses.statuses+1]={id='xiao_mask',priority=5,kind='buff',stack='intensity',decay='none'}
local P=require('abyss_xiao_card_plan')
local function burst(s,up)
 local plan=P.plan({hp=s.player.hp,mask=s.player.statuses.xiao_mask or 0,relicUsed=true,startingRelic=true},{id='x57',upgraded=up})
 local actions={};for _,e in ipairs(plan.orderedEffects)do e.uid=s.pendingPlay.uid;actions[#actions+1]={kind='effect',effect=e}end
 Q.start(s,actions);Q.run(s,handlers)
end
for _,up in ipairs({false,true})do for mask=0,3 do
 local s=fresh(mask);s.pendingPlay.targetId='absent';burst(s,up)
 local damage=mask*(up and 10 or 8)+(mask>0 and 4 or 0)
 for _,e in ipairs(s.enemies)do eq(e.hp,50-math.max(0,damage-5));eq(e.block,math.max(0,5-damage))end
 eq(s.player.statuses.xiao_mask,nil)
end end
print('PASS x57 base upgrade all durations scale before native armor then exit without unrelated target')
for _,up in ipairs({false,true})do
 local s=fresh(3);s.enemies[1].hp=0;s.enemies[2].hp=1;s.enemies[2].block=0;burst(s,up)
 eq(s.enemies[1].hp,0);eq(s.enemies[2].hp,0);eq(s.player.statuses.xiao_mask,nil)
end
print('PASS native group hit excludes prior dead enemy; isolated queued exit still follows last-enemy kill')
local s=fresh(3);local before=C.copy(s);local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()burst(s,true);error('after burst exit')end));restore();same(s,before)
assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='maskBurstAll',value=2147483647,uid=s.pendingPlay.uid},Q));same(s,before)
print('PASS burst multiplication overflow rejects before queue and host Snapshot restores group damage plus exit')

for _,up in ipairs({false,true})do
 local s=fresh(0);s.player.statuses.strength=2
 for _,enemy in ipairs(s.enemies)do enemy.block=0 end
 burst(s,up)
 for _,enemy in ipairs(s.enemies)do eq(enemy.hp,48)end
 eq(#s.hand,0);eq(s.cardInUse.uid,s.pendingPlay.uid)
end
print('PASS native Strength makes zero-window burst deal two; explicit parity negative not a balance approval')
