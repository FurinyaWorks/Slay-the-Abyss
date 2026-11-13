package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local X,C,Q,A,S,D=require('abyss_xiao_dispatch'),require('abyss_combat'),require('abyss_action_queue'),require('abyss_actor'),require('abyss_power_schedule'),require('abyss_data')
D.statuses.statuses[#D.statuses.statuses+1]={id='xiao_mask',priority=5,kind='buff',stack='intensity',decay='none'}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function fresh(mask)
 local s=C.new(D,{deck={'strike','defend'},enemies={'cultist','cultist'},seed=42,enableStances=true,orbSlots=0,cardRandomSeed='42'})
 s.xiao={relicUsed=false,startingRelic=true};s.pendingPlay={uid=910,targetId=s.enemies[2].id};s.cardInUse={uid=910,id='strike',upgraded=false}
 for _,e in ipairs(s.enemies)do e.hp=50;e.block=0 end
 if mask>0 then A.applyPower(s,s.player,'xiao_mask',mask,s.player);S.recordApplied(s,s.player,'xiao_mask',nil)end
 return s
end
local handlers={effect=function(s,a,q)
 if a.effect.op=='xiaoCard'then return X.dispatch(C,s,a.effect,q)end
 if a.effect.op=='pauseProbe'then return 'pause'end
 local target=s.player;for _,e in ipairs(s.enemies)do if e.id==a.effect.targetId then target=e end end
 C.applyEffects(s,{a.effect},s.player,target,s.cardInUse);return true
end}
local function run(s,e)Q.start(s,{{kind='effect',effect=e}});return Q.run(s,handlers)end
local s=fresh(2);s.enemies[2].block=3
run(s,{op='xiaoCard',kind='damage',value=6,uid=910});eq(s.enemies[2].hp,43);eq(s.enemies[1].hp,50)
print('PASS actual host damage uses stable paid target mask bonus and armor')
s=fresh(2);run(s,{op='xiaoCard',kind='plunge',value=6,uid=910});eq(s.enemies[1].hp,40);eq(s.enemies[2].hp,40)
s=fresh(0);run(s,{op='xiaoCard',kind='plunge',value=6,uid=910});eq(s.enemies[1].hp,50);eq(s.enemies[2].hp,44)
print('PASS actual host plunge distinguishes all-enemy mask and single-target calm')
s=fresh(0);s.draw=s.hand;s.hand={};local hp=s.player.hp
Q.start(s,{{kind='effect',effect={op='pauseProbe'}},{kind='effect',effect={op='loseHp',value=2}},{kind='effect',effect={op='xiaoCard',kind='maskCommit',value=2,uid=910}}})
eq(Q.run(s,handlers),'pause');eq(s.player.hp,hp);eq(s.xiao.relicUsed,false)
Q.resume(s,handlers);eq(s.player.hp,hp-2);eq(s.player.statuses.xiao_mask,2);eq(s.xiao.relicUsed,true);eq(#s.hand,1)
local count=0;for _,v in ipairs(s.player.powerScheduleOrder or {})do if v.id=='xiao_mask'then count=count+1 end end;eq(count,1)
run(s,{op='xiaoCard',kind='maskCommit',value=1,uid=910});eq(s.player.statuses.xiao_mask,2);eq(#s.hand,1)
run(s,{op='xiaoCard',kind='maskCommit',value=0,uid=910});eq(s.player.statuses.xiao_mask,nil)
for _,v in ipairs(s.player.powerScheduleOrder or {})do assert(v.id~='xiao_mask')end
print('PASS queue pause resumes real payment then first entry schedule and actual exit removal')
s=fresh(0);s.player.hp=0;run(s,{op='xiaoCard',kind='maskCommit',value=2,uid=910});eq(s.xiao.relicUsed,false);eq(s.player.statuses.xiao_mask,nil)
for _,effect in ipairs({{op='xiaoCard',kind='damage',value=6,uid=911},{op='xiaoCard',kind='damage',value=6,uid=910,targetId='wrong'},{op='xiaoCard',kind='damage',value=false,uid=910}})do
 s=fresh(0);local n=#s.events;assert(not pcall(X.dispatch,C,s,effect,Q));eq(#s.events,n);eq(s.enemies[2].hp,50)
end
print('PASS death grants no entry and invalid paid context rejects before mutation')
