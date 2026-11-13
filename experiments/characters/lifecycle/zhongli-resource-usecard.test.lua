-- Public 03/04 admission. No replacement of public C.play/payment.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Actors=require('abyss_actor')
local function fresh(up)
 local d=C.copy(D)
 d.cards.cards[#d.cards.cards+1]={id='zl03',name='HOLD',type='skill',cost=2,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind='gainJade',value=12}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=16}}}}
 d.cards.cards[#d.cards.cards+1]={id='zl04',name='HOLD',type='attack',cost=1,target='ENEMY',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind='spendJade',value=6},{op='damage',value=14}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=6},{op='damage',value=18}}}}
 local s=C.new(d,{seed=4,deck={{cardId='zl03',upgraded=up},{cardId='zl04',upgraded=up}},enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=false}})
 s.enemies[1].hp=100;s.enemies[1].maxHp=100
 return s
end
local function card(s,id)for _,c in ipairs(s.hand)do if c.cardId==id then return c end end;error('missing hand card')end
for _,up in ipairs({false,true})do
 local s=fresh(up);local gain=card(s,'zl03');local spend=card(s,'zl04');local before=C.copy(s)
 eq(C.play(s,spend.uid,1),false);same(s,before) -- insufficient resource must reject before energy.
 eq(C.play(s,gain.uid),true);eq(s.energy,1);eq(s.zhongliCandidate.jade,up and 16 or 12)
 before=C.copy(s);eq(C.play(s,spend.uid,99),false);same(s,before)
 assert(C.play(s,spend.uid,1));eq(s.energy,0);eq(s.zhongliCandidate.jade,up and 10 or 6);eq(s.enemies[1].hp,up and 82 or 86)
 eq(#s.discard,2);eq(s.discard[1],gain);eq(s.discard[2],spend);eq(s.pendingPlay,nil);eq(s.cardInUse,nil)
 before=C.copy(s);eq(C.play(s,spend.uid,1),false);same(s,before)
 -- Ordinary modifiers, not fixed final damage. Resource storage does not bypass them.
 s=fresh(up);assert(C.play(s,card(s,'zl03').uid));Actors.applyPower(s,s.player,'strength',2,s.player);Actors.applyPower(s,s.player,'weak',1,s.enemies[1]);Actors.applyPower(s,s.enemies[1],'vulnerable',1,s.player);s.enemies[1].block=5
 assert(C.play(s,card(s,'zl04').uid,1));eq(s.enemies[1].hp,up and 83 or 87)
 -- Cap storage is a legitimate paid no-op, not free energy or a refund.
 s=fresh(up);s.zhongliCandidate.jade=20;assert(C.play(s,card(s,'zl03').uid));eq(s.energy,1);eq(s.zhongliCandidate.jade,20)
 -- Lethal ordinary attack completes original UID disposition; no ad hoc jade refund.
 s=fresh(up);assert(C.play(s,card(s,'zl03').uid));s.enemies[1].hp=1;spend=card(s,'zl04');assert(C.play(s,spend.uid,1));eq(s.zhongliCandidate.jade,up and 10 or 6);eq(s.discard[#s.discard],spend)
end
print('AUTHOR_PUBLIC_ZL_RESOURCE_PAID_PASS: 03->04 fits natural3 energy; resource/UID/cap/ordinary modifiers/lethal disposition')
local Jade=require('abyss_zhongli_jade_resource');local Stage=require('abyss_zhongli_paid_cards')
-- Gain and spend failures restore the real pre-payment graph and public aliases.
for _,id in ipairs({'zl03','zl04'})do
 local s=fresh(false);if id=='zl04'then assert(C.play(s,card(s,'zl03').uid))end
 local c=card(s,id);local before=C.copy(s);local z=s.zhongliCandidate;local hand=s.hand;local player=s.player
 local apply=Jade.apply;local reached=false
 Jade.apply=function(state,kind,value)local result=apply(state,kind,value);if state==s then reached=true;error('after actual jade commit')end;return result end
 eq(pcall(C.play,s,c.uid,id=='zl04'and 1 or nil),false);Jade.apply=apply;assert(reached)
 same(s,before);eq(s.zhongliCandidate,z);eq(s.hand,hand);eq(s.player,player)
 assert(C.play(s,c.uid,id=='zl04'and 1 or nil));eq(s.energy,id=='zl04'and 0 or 1)
end
-- Failure after native damage restores both the earlier resource spend and damage.
do
 local s=fresh(true);assert(C.play(s,card(s,'zl03').uid));local c=card(s,'zl04');local before=C.copy(s);local enemy=s.enemies[1];local z=s.zhongliCandidate
 local damage=C.damage;local hit=false
 C.damage=function(state,source,target,...)local result=damage(state,source,target,...);if state==s and target==enemy then hit=true;error('after native spend attack')end;return result end
 eq(pcall(C.play,s,c.uid,1),false);C.damage=damage;assert(hit);same(s,before);eq(s.enemies[1],enemy);eq(s.zhongliCandidate,z)
end
-- Real Scry continuation between energy payment and resource commit.
do
 local s=fresh(false);assert(C.play(s,card(s,'zl03').uid));local c=card(s,'zl04');local dispatch=Stage.dispatch;local once=false
 -- Controlled real-entity pile arrangement supplies the Scry window (Scry never reshuffles).
 s.draw[#s.draw+1]=table.remove(s.discard)
 Stage.dispatch=function(combat,state,e,q)
  if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end
  return dispatch(combat,state,e,q)
 end
 assert(C.play(s,c.uid,1));Stage.dispatch=dispatch
 local p=assert(s.pendingScry);eq(s.energy,0);eq(s.zhongliCandidate.jade,12);eq(s.enemies[1].hp,100)
 local before=C.copy(s);local paid=s.pendingPlay;local z=s.zhongliCandidate;local q=s.actionQueue;local apply=Jade.apply
 Jade.apply=function(...)apply(...);error('after resumed spend')end
 eq(pcall(C.chooseScry,s,{},p.token),false);Jade.apply=apply
 same(s,before);eq(s.pendingPlay,paid);eq(s.zhongliCandidate,z);eq(s.actionQueue,q);eq(s.pendingScry,p)
 -- Controlled external resource mutation demonstrates execution-time recheck.
 s.zhongliCandidate.jade=5;local low=C.copy(s);eq(pcall(C.chooseScry,s,{},p.token),false);same(s,low)
 s.zhongliCandidate.jade=12;assert(C.chooseScry(s,{},p.token));eq(z.jade,6);eq(s.enemies[1].hp,86)
 local done=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,done)
end
-- Normal attack reactions may kill the player after spending, never refund storage.
do
 local s=fresh(false);assert(C.play(s,card(s,'zl03').uid));s.player.hp=1;s.enemies[1].statuses.thorns=2
 local c=card(s,'zl04');assert(C.play(s,c.uid,1));eq(s.player.hp,0);eq(s.zhongliCandidate.jade,6);eq(s.energy,0)
end
-- Manual and automatic entry reject altered identities/effects consistently.
local CardActions=require('abyss_card_actions')
for _,id in ipairs({'zl03','zl04'})do for _,mode in ipairs({'normal','unmarked','silentFinalCard','runNativeABI','extra'})do
 local s=fresh(false);local c=card(s,id);s.zhongliCandidate.jade=id=='zl04'and 6 or 0;local d=s.catalog.cards[id]
 if mode=='unmarked'then d.zhongliCandidate=nil elseif mode=='extra'then d.effects[1].fixed=true elseif mode~='normal'then d[mode]=true end
 for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
 local energy=s.energy;C.queueCard(s,c,{targetIndex=1,exhaustCards=false});CardActions.drain(C,s);eq(s.energy,energy)
 eq(s.zhongliCandidate.jade,mode=='normal'and(id=='zl03'and 12 or 0)or(id=='zl04'and 6 or 0))
 eq(s.enemies[1].hp,mode=='normal'and id=='zl04'and 86 or 100)
end end
for _,field in ipairs({'fixed','times','condition'})do
 local s=fresh(false);assert(C.play(s,card(s,'zl03').uid));s.catalog.cards.zl04.effects[2][field]=true
 local before=C.copy(s);eq(C.play(s,card(s,'zl04').uid,1),false);same(s,before)
end
print('ZHONGLI_RESOURCE_TRANSACTION_PASS')
