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

s=fresh(0);local aimed=s.enemies[2]
Q.start(s,{{kind='effect',effect={op='pauseProbe'}},{kind='effect',effect={op='xiaoCard',kind='damage',value=9,uid=910}}})
eq(Q.run(s,handlers),'pause');s.enemies[1],s.enemies[2]=s.enemies[2],s.enemies[1]
Q.resume(s,handlers);eq(aimed.hp,41);eq(s.enemies[2].hp,50)
print('PASS paused attack resolves paid stable ID after enemy list reorder')
for _,bad in ipairs({'dead','inUse','paidMissing','uidFalse'})do
 s=fresh(0)
 if bad=='dead'then s.enemies[2].hp=0 elseif bad=='inUse'then s.cardInUse.uid=911 elseif bad=='paidMissing'then s.pendingPlay=nil else s.pendingPlay.uid=false;s.cardInUse.uid=false end
 local enemy=s.enemies[2];local hp=enemy.hp;local events=#s.events
 assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='damage',value=6,uid=910},Q));eq(enemy.hp,hp);eq(#s.events,events);eq(s.actionQueue,nil)
end
print('PASS dead target missing paid context and mismatched resolving UID reject without queue effects')
local Snapshot=require('abyss_snapshot');local Copy=require('abyss_copy').copy
local function same(a,b,seen)
 if type(a)~='table'or type(b)~='table'then return a==b end
 seen=seen or {};if seen[a]==b then return true end;seen[a]=b
 for k,v in pairs(a)do if not same(v,b[k],seen)then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
for _,up in ipairs({false,true})do
 s=fresh(0);s.draw=s.hand;s.hand={};s.pendingPlay=nil;s.cardInUse=nil
 local originalCard={uid=910,id='strike',upgraded=up};s.hand[1]=originalCard;s.energy=3
 local before=Copy(s);local hand=s.hand;local draw=s.draw;local player=s.player;local restore=Snapshot.capture(s)
 local reached=false;local faultHandlers={effect=function(st,a,q)
  if a.effect.op=='faultProbe'then reached=true;eq(st.player.hp,before.player.hp-2);eq(st.energy,2);eq(#st.hand,1);eq(st.xiao.relicUsed,true);error('post-entry deliberate fault')end
  return handlers.effect(st,a,q)
 end}
 local ok=pcall(function()
  -- Explicit payment fixture: public beginQueuedPlay registration is not present.
  s.energy=s.energy-1;s.cardInUse=table.remove(s.hand,1);s.pendingPlay={uid=910,targetId=s.enemies[2].id}
  Q.start(s,{{kind='effect',effect={op='loseHp',value=2}},{kind='effect',effect={op='xiaoCard',kind='maskCommit',value=up and 3 or 2,uid=910}},{kind='effect',effect={op='faultProbe'}}})
  Q.run(s,faultHandlers)
 end)
 assert(not ok and reached);restore();assert(same(s,before));eq(s.hand,hand);eq(s.draw,draw);eq(s.player,player);eq(s.hand[1],originalCard);eq(s.pendingPlay,nil);eq(s.actionQueue,nil)
end
print('PASS real host Snapshot restores whole graph and object identity after payment entry draw and fault')
