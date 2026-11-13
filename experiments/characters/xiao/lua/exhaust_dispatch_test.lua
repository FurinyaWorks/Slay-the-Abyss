package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C,Q,D,X=require('abyss_combat'),require('abyss_action_queue'),require('abyss_data'),require('abyss_xiao_dispatch')
local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
local function fresh(mask,n)
 local deck={};for i=1,12 do deck[i]='strike'end
 local s=C.new(D,{deck=deck,enemies={'cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true};s.player.statuses.xiao_mask=mask>0 and mask or nil
 local card=table.remove(s.hand);s.cardInUse=card;s.pendingPlay={uid=card.uid,targetId=s.enemies[1].id}
 s.enemies[1].hp=100;s.enemies[1].block=2
 for i=1,n do s.exhaust[#s.exhaust+1]=table.remove(s.draw)or table.remove(s.hand)end
 return s
end
local function run(s,kind,value,cap)
 Q.start(s,{{kind='effect',effect={op='xiaoCard',kind=kind,value=value,cap=cap,uid=s.pendingPlay.uid}}})
 Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end
  C.applyEffects(st,{a.effect},st.player,a.effect.targetId and st.enemies[1]or st.player,st.cardInUse);return true
 end})
end
for _,cap in ipairs({18,24})do for _,n in ipairs({0,1,6,9})do for mask=0,1 do
 local s=fresh(mask,n);run(s,'exhaustDamage',3,cap);eq(s.enemies[1].hp,100-math.max(0,math.min(n*3,cap)+mask*4-2));eq(#s.exhaust,n)
end end end
for _,cap in ipairs({10,14})do for _,n in ipairs({0,1,5,9})do local s=fresh(0,n);run(s,'exhaustBlock',2,cap);eq(s.player.block,math.min(n*2,cap));eq(#s.exhaust,n)end end
print('PASS x21/x22 real exhausted instances count capped base effect before host modifiers')
for _,draw in ipairs({2,3})do for mask=0,1 do
 local s=fresh(mask,0);local hand=#s.hand;local inUse=s.cardInUse
 run(s,'unmaskedDraw',draw);eq(#s.hand,hand+(mask==0 and draw or 0));eq(s.cardInUse,inUse)
 for _,c in ipairs(s.hand)do assert(c~=inUse)end
end end
print('PASS x20 real draw only unmasked excludes resolving card and retains actual instances')
for _,kind in ipairs({'exhaustDamage','exhaustBlock'})do
 local s=fresh(0,0);s.exhaust[2]={uid=999,cardId='strike'};local before=C.copy(s)
 assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind=kind,value=3,cap=18,uid=s.pendingPlay.uid},Q));same(s,before)
end
print('PASS sparse exhaust rejects before queued effects or state mutation')
