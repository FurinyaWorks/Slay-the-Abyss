-- Actual opt-in shared 16/57 admission. This is actual public C.play, never a payment wrapper.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local function fresh(id,up,jade)
 local d=C.copy(D)
 d.cards.cards[#d.cards.cards+1]={id='zl16',name='HOLD',type='skill',cost=1,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind='spendJade',value=6},{op='block',value=16}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=6},{op='block',value=21}}}}
 d.cards.cards[#d.cards.cards+1]={id='zl57',name='HOLD',type='skill',cost=1,target='ENEMY',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind='spendJade',value=3},{op='applyStatus',status='weak',value=3}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},{op='applyStatus',status='weak',value=4}}}}
 local s=C.new(d,{seed=4,deck={{cardId=id,upgraded=up}},enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=false}})
 s.zhongliCandidate.jade=jade;return s,s.hand[1]
end
local count=0
for _,id in ipairs({'zl16','zl57'})do for _,up in ipairs({false,true})do for jade=0,20 do
 local s,c=fresh(id,up,jade);local before=C.copy(s);local need=id=='zl16'and 6 or 3
 if jade<need then eq(C.play(s,c.uid,1),false);same(s,before)
 else
  assert(C.play(s,c.uid,1));eq(s.energy,2);eq(s.zhongliCandidate.jade,jade-need)
  eq(#s.hand,0);eq(#s.discard,1);eq(s.discard[1],c);eq(#s.exhaust,0)
  if id=='zl16'then eq(s.player.block,up and 21 or 16)else eq(s.enemies[1].statuses.weak,up and 4 or 3)end
  before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
 end
 count=count+1
end end end
for _,id in ipairs({'zl16','zl57'})do for _,up in ipairs({false,true})do
 local s,c=fresh(id,up,6);s.energy=0;local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
end end
for _,up in ipairs({false,true})do
 local s,c=fresh('zl57',up,3);local before=C.copy(s);eq(C.play(s,c.uid,99),false);same(s,before)
end
print('AUTHOR_PUBLIC_ZL_DEFENSE_PAID_PASS 84 reserve/version cases plus4 zero-energy and2 invalid-target cases')
local Stage=require('abyss_zhongli_paid_cards');local Jade=require('abyss_zhongli_jade_resource');local Actors=require('abyss_actor')
for _,up in ipairs({false,true})do
 local s,c=fresh('zl16',up,6);Actors.applyPower(s,s.player,'dexterity',3,s.player);Actors.applyPower(s,s.player,'frail',1,s.enemies[1]);assert(C.play(s,c.uid));eq(s.player.block,up and 18 or 14);eq(s.zhongliCandidate.jade,0)
 s,c=fresh('zl57',up,3);Actors.applyPower(s,s.enemies[1],'artifact',1,s.enemies[1]);assert(C.play(s,c.uid,1));eq(s.enemies[1].statuses.artifact,0);eq(s.enemies[1].statuses.weak,nil);eq(s.energy,2);eq(s.zhongliCandidate.jade,0);eq(s.discard[1],c)
end
-- Fault after real native shield/Weak restores resource, cost and original aliases.
for _,id in ipairs({'zl16','zl57'})do
 local s,c=fresh(id,false,6);local before=C.copy(s);local player,enemy,z,hand=s.player,s.enemies[1],s.zhongliCandidate,s.hand
 local apply=C.applyEffects;local hit=false
 C.applyEffects=function(state,effects,...)local out=apply(state,effects,...);for _,e in ipairs(effects)do if state==s and(e.op=='block'or e.op=='applyStatus')then hit=true;error('after native defense')end end;return out end
 eq(pcall(C.play,s,c.uid,1),false);C.applyEffects=apply;assert(hit);same(s,before);eq(s.player,player);eq(s.enemies[1],enemy);eq(s.zhongliCandidate,z);eq(s.hand,hand);eq(s.hand[1],c)
 assert(C.play(s,c.uid,1));eq(s.energy,2)
end
-- Actual Scry pause before spend: dynamic balance is rechecked, not pre-consumed.
do
 local s,c=fresh('zl57',false,3)
 -- Controlled rearrangement of existing same-combat instances supplies Scry.
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=C.copy(s.catalog.cards.zl57)
 s=C.new(d,{deck={'zl57','strike','defend'},enemies={'cultist'},seed=4,candidateLifecycle={kind='zhongli',relicEnabled=false}})
 for i=#s.hand,1,-1 do if s.hand[i].cardId=='zl57'then c=s.hand[i]else s.draw[#s.draw+1]=table.remove(s.hand,i)end end;s.zhongliCandidate.jade=3
 local dispatch=Stage.dispatch;local once=false
 Stage.dispatch=function(combat,state,e,q)if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end;return dispatch(combat,state,e,q)end
 assert(C.play(s,c.uid,1));Stage.dispatch=dispatch;local p=assert(s.pendingScry);eq(s.energy,2);eq(s.zhongliCandidate.jade,3)
 s.zhongliCandidate.jade=2;local low=C.copy(s);eq(pcall(C.chooseScry,s,{},p.token),false);same(s,low)
 s.zhongliCandidate.jade=3;local before=C.copy(s);local paid,z,q=s.pendingPlay,s.zhongliCandidate,s.actionQueue;local apply=C.applyEffects
 C.applyEffects=function(state,effects,...)local out=apply(state,effects,...);for _,e in ipairs(effects)do if e.op=='applyStatus'then error('after resumed weak')end end;return out end
 eq(pcall(C.chooseScry,s,{},p.token),false);C.applyEffects=apply;same(s,before);eq(s.pendingPlay,paid);eq(s.zhongliCandidate,z);eq(s.actionQueue,q);eq(s.pendingScry,p)
 assert(C.chooseScry(s,{},p.token));eq(z.jade,0);eq(s.energy,2);eq(s.enemies[1].statuses.weak,3)
 local done=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,done)
end
-- Controlled native life-loss after actual spend demonstrates host terminal policy.
for _,id in ipairs({'zl16','zl57'})do
 local s,c=fresh(id,false,6);local apply=Jade.apply
 Jade.apply=function(state,...)local result=apply(state,...);C.applyEffects(state,{{op='loseHp',value=state.player.hp}},state.player,state.player);return result end
 assert(C.play(s,c.uid,1));Jade.apply=apply;eq(s.player.hp,0);eq(s.energy,2);eq(s.zhongliCandidate.jade,id=='zl16'and 0 or 3);eq(s.player.block,0);eq(s.enemies[1].statuses.weak,nil)
end
local CardActions=require('abyss_card_actions')
for _,id in ipairs({'zl16','zl57'})do for _,mode in ipairs({'normal','unmarked','native','extra','tail'})do
 local s,c=fresh(id,false,6);local def=s.catalog.cards[id]
 if mode=='unmarked'then def.zhongliCandidate=nil elseif mode=='native'then def.runNativeABI=true elseif mode=='extra'then def.effects[1].fixed=true elseif mode=='tail'then def.effects[2].times=2 end
 if mode~='normal'then local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)end
 table.remove(s.hand,1);C.queueCard(s,c,{targetIndex=1});CardActions.drain(C,s);eq(s.energy,3);eq(s.zhongliCandidate.jade,mode=='normal'and(id=='zl16'and 0 or 3)or 6)
end end
print('ZHONGLI_DEFENSE_TRANSACTION_PASS')
