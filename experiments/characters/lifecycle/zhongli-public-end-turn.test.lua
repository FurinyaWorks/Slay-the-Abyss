-- Public opt-in owner-end acceptance: actual paid Powers and actual C.endTurn.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq=H.C,H.Data,H.eq
local function fresh(up,reverse)
 local d=C.copy(D)
 for _,x in ipairs({{'zl21','installPillar',3,4},{'zl31','installRepair',2,3}})do
  d.cards.cards[#d.cards.cards+1]={id=x[1],name='HOLD',type='power',cost=2,target='SELF',color='colorless',rarity='special',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind=x[2],value=x[3]}},upgrade={effects={{op='zhongliCard',kind=x[2],value=x[4]}}}}
 end
 local s=C.new(d,{seed=4,deck={{cardId='zl21',upgraded=up},{cardId='zl31',upgraded=up}},enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=false}})
 local order=reverse and {'zl31','zl21'}or {'zl21','zl31'}
 for _,id in ipairs(order)do local c;for _,v in ipairs(s.hand)do if v.cardId==id then c=v end end
  -- Controlled refill proves installed-state lifecycle only, not 4-energy availability.
  s.energy=3;assert(C.play(s,c.uid));eq(s.energy,1)
 end
 eq(s.zhongliCandidate.jade,0);return s
end
local count=0
for _,up in ipairs({false,true})do for _,reverse in ipairs({false,true})do
 for _,hp in ipairs({1,30})do for _,block in ipairs({0,2,8})do
  local s=fresh(up,reverse);local pillar=up and 4 or 3;local repair=up and 3 or 2
  s.enemies[1].hp=hp;s.enemies[1].maxHp=30;s.enemies[1].block=block
  local expectedLoss=math.min(hp,math.max(0,pillar-block));local playerHp=s.player.hp
  assert(C.endTurn(s),'public endTurn rejected installed candidate')
  eq(s.enemies[1].hp,hp-expectedLoss,'pillar must resolve through actual public owner-end')
  eq(s.zhongliCandidate.jade,hp==expectedLoss and 0 or repair,'repair only after pillar and living sides')
  -- First cultist turn is a non-damaging ritual; no jade absorption contract is assumed.
  eq(s.player.hp,playerHp)
  count=count+1
 end end
end end
print('AUTHOR_PUBLIC_ZL_OWNER_END_PASS '..count..' exact public lifecycle cases')
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local Owner=require('abyss_zhongli_owner_end')
local function failAfterPillar(s,run)
 local apply=Owner.apply;local hit=false
 Owner.apply=function(c,state,e,q)
  local result=apply(c,state,e,q)
  if state==s and e.phase=='pillar'then hit=true;error('after real pillar damage')end
  return result
 end
 local ok=pcall(run);Owner.apply=apply;eq(ok,false);assert(hit)
end
-- Actual damage then fault restores the entire public command and aliases.
do
 local s=fresh(true,false);local before=C.copy(s);local z=s.zhongliCandidate;local p=s.player;local enemy=s.enemies[1];local hand=s.hand;local order=p.powerOrder
 failAfterPillar(s,function()return C.endTurn(s)end)
 same(s,before);eq(s.zhongliCandidate,z);eq(s.player,p);eq(s.enemies[1],enemy);eq(s.hand,hand);eq(s.player.powerOrder,order)
 assert(C.endTurn(s));eq(z.jade,3);eq(z.lastOwnerEnd,1);eq(z.ownerEndPending,nil)
end
-- Actual Codex pauses before the pair. Failed continuation retains offer/RNG.
do
 local s=fresh(false,true);s.relics={'nilrys_codex'};assert(C.endTurn(s))
 local pending=assert(s.pendingChoice);eq(s.zhongliCandidate.lastOwnerEnd,0)
 local before=C.copy(s);local z=s.zhongliCandidate;local q=s.actionQueue
 eq(C.chooseCard(s,pending.token,999),false);same(s,before)
 failAfterPillar(s,function()return C.chooseCard(s,pending.token,0)end)
 same(s,before);eq(s.pendingChoice,pending);eq(s.zhongliCandidate,z);eq(s.actionQueue,q)
 assert(C.chooseCard(s,pending.token,0));eq(z.jade,2);eq(z.lastOwnerEnd,1);eq(z.ownerEndPending,nil)
 local done=C.copy(s);eq(C.chooseCard(s,pending.token,0),false);same(s,done)
end
-- Fixed pillar retains native non-attack Thorns semantics.
do
 local s=fresh(false,false);s.player.hp=1;s.enemies[1].statuses.thorns=2
 assert(C.endTurn(s));eq(s.player.hp,1);eq(s.zhongliCandidate.jade,2)
end
-- Controlled native HP-loss injection after pillar proves dead-source cleanup only.
do
 local s=fresh(false,false);s.player.hp=1;local apply=Owner.apply
 Owner.apply=function(c,state,e,q)local result=apply(c,state,e,q);if state==s and e.phase=='pillar'then c.applyEffects(state,{{op='loseHp',value=1}},state.player,state.player)end;return result end
 local ok,result=pcall(C.endTurn,s);Owner.apply=apply;assert(ok,result);assert(result);eq(s.player.hp,0);eq(s.zhongliCandidate.jade,0);eq(s.zhongliCandidate.ownerEndPending,nil)
 for _,event in ipairs(s.events)do assert(event.kind~='enemy_turn')end
 local done=C.copy(s);eq(C.endTurn(s),false);same(s,done)
end
-- Failure in the subsequent player start restores pillar, repair and enemy work.
do
 local s=fresh(false,false);local before=C.copy(s);local z=s.zhongliCandidate;local start=C.startPlayerTurn;local hit=false
 C.startPlayerTurn=function(state,...)if state==s then hit=true;error('next turn fault')end;return start(state,...)end
 local ok=pcall(C.endTurn,s);C.startPlayerTurn=start;eq(ok,false);assert(hit);same(s,before);eq(s.zhongliCandidate,z)
end
print('ZHONGLI_PUBLIC_END_TURN_TRANSACTION_PASS')

-- Existing explicit remove/rebuild API preserves both acquisition histories.
do
 local L=require('abyss_zhongli_lifecycle');local Schedule=require('abyss_power_schedule')
 local original=fresh(false,false);local removed=L.removePillar(original)
 eq(original.player.statuses.zl_candidate_pillar,3);eq(removed.player.statuses.zl_candidate_pillar,nil)
 L.applyInstall(removed,'pillar',4);L.applyInstall(removed,'pillar',3)
 local count=0;for _,id in ipairs(removed.player.powerOrder)do if id=='zl_candidate_pillar'then count=count+1 end end;eq(count,1)
 count=0;for _,entry in ipairs(Schedule.list(removed.player,{zl_candidate_pillar=true}))do if entry.id=='zl_candidate_pillar'then count=count+1 end end;eq(count,1)
 assert(C.endTurn(removed));eq(removed.zhongliCandidate.jade,2)
end
print('ZHONGLI_REMOVE_REBUILD_PASS')
