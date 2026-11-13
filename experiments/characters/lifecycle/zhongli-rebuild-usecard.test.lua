-- Actual opt-in public admission of 20/62; no simulated payment or draw implementation.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local function fresh(id,up,jade,full)
 local d=C.copy(D)
 d.cards.cards[#d.cards.cards+1]={id='zl20',name='HOLD',type='skill',cost=1,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind='emptyJade',value=9}},upgrade={effects={{op='zhongliCard',kind='emptyJade',value=12}}}}
 d.cards.cards[#d.cards.cards+1]={id='zl62',name='HOLD',type='skill',cost=1,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,exhaust=true,effects={{op='zhongliCard',kind='emptyJade',value=6},{op='draw',value=1}},upgrade={effects={{op='zhongliCard',kind='emptyJade',value=8},{op='draw',value=2}}}}
 local deck={{cardId=id,upgraded=up}};for i=1,11 do deck[#deck+1]='strike'end
 local s=C.new(d,{seed=4,deck=deck,enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=false}})
 -- Controlled rearrangement of existing native UIDs supplies hand-limit/draw cases.
 local c;for _,v in ipairs(s.hand)do if v.cardId==id then c=v end end
 if not c then for i,v in ipairs(s.draw)do if v.cardId==id then c=table.remove(s.draw,i);s.hand[#s.hand+1]=c;break end end end
 for i=#s.hand,1,-1 do if s.hand[i]~=c then s.draw[#s.draw+1]=table.remove(s.hand,i)end end
 if full then while #s.hand<10 do s.hand[#s.hand+1]=table.remove(s.draw)end end
 s.zhongliCandidate.jade=jade;return s,c
end
local count=0
for _,id in ipairs({'zl20','zl62'})do for _,up in ipairs({false,true})do for _,jade in ipairs({0,1,20})do for _,full in ipairs({false,true})do
 local s,c=fresh(id,up,jade,full);local beforeCount=#s.hand;local amount=id=='zl20'and(up and 12 or 9)or(up and 8 or 6)
 assert(C.play(s,c.uid));eq(s.energy,2);eq(s.zhongliCandidate.jade,jade==0 and amount or jade)
 local draws=id=='zl62'and(up and 2 or 1)or 0
 eq(#s.hand,math.min(10,beforeCount-1+draws));eq(#s.exhaust,id=='zl62'and 1 or 0)
 eq(id=='zl62'and s.exhaust[1]or s.discard[1],c)
 for _,v in ipairs(s.hand)do assert(v~=c,'resolving card redrawn')end
 local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before);count=count+1
end end end end
print('AUTHOR_PUBLIC_ZL_REBUILD_PAID_PASS '..count..' zero/residual/full jade, base/upgrade, hand limit, draw/exhaust UID and paid no-op')
local Jade=require('abyss_zhongli_jade_resource');local Stage=require('abyss_zhongli_paid_cards')
-- Empty draw plus empty discard never redraws the resolving exhausted card.
for _,up in ipairs({false,true})do
 local s,c=fresh('zl62',up,0,false);s.draw={};s.discard={};assert(C.play(s,c.uid));eq(#s.hand,0);eq(s.exhaust[1],c);eq(s.energy,2)
end
-- Real draw failure restores payment, jade, RNG, piles, and their external aliases.
do
 local s,c=fresh('zl62',true,0,false);local before=C.copy(s);local h,d,z,r=s.hand,s.draw,s.zhongliCandidate,s.rng;local draw=C.draw;local hit=false
 C.draw=function(state,...)local out=draw(state,...);if state==s then hit=true;error('after native rebuild draw')end;return out end
 eq(pcall(C.play,s,c.uid),false);C.draw=draw;assert(hit);same(s,before);eq(s.hand,h);eq(s.draw,d);eq(s.zhongliCandidate,z);eq(s.rng,r);eq(s.hand[1],c)
 assert(C.play(s,c.uid));eq(s.energy,2);eq(z.jade,8);eq(s.exhaust[1],c)
end
-- Legal Scry pause does not commit jade early; failed resume restores revealed boundary.
do
 local s,c=fresh('zl62',false,0,false);local dispatch=Stage.dispatch;local once=false
 Stage.dispatch=function(combat,state,e,q)if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end;return dispatch(combat,state,e,q)end
 assert(C.play(s,c.uid));Stage.dispatch=dispatch;local p=assert(s.pendingScry);eq(s.energy,2);eq(s.zhongliCandidate.jade,0)
 local before=C.copy(s);local paid,z,q=s.pendingPlay,s.zhongliCandidate,s.actionQueue;local apply=Jade.apply
 Jade.apply=function(...)apply(...);error('after resumed rebuild')end
 eq(pcall(C.chooseScry,s,{},p.token),false);Jade.apply=apply;same(s,before);eq(s.pendingPlay,paid);eq(s.zhongliCandidate,z);eq(s.actionQueue,q);eq(s.pendingScry,p)
 assert(C.chooseScry(s,{},p.token));eq(z.jade,6);eq(s.energy,2);eq(s.exhaust[1],c)
 local done=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,done)
end
local CardActions=require('abyss_card_actions')
for _,id in ipairs({'zl20','zl62'})do for _,mode in ipairs({'normal','unmarked','silentFinalCard','runNativeABI','extra','badTail'})do
 local s,c=fresh(id,false,0,false);local def=s.catalog.cards[id]
 if mode=='unmarked'then def.zhongliCandidate=nil elseif mode=='extra'then def.effects[1].fixed=true elseif mode=='badTail'then if id=='zl62'then def.effects[2].times=2 else def.effects[1].value=8 end elseif mode~='normal'then def[mode]=true end
 if mode~='normal'then local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)end
 table.remove(s.hand,1);local energy=s.energy;C.queueCard(s,c,{exhaustCards=id=='zl62'});CardActions.drain(C,s);eq(s.energy,energy);eq(s.zhongliCandidate.jade,mode=='normal'and(id=='zl20'and 9 or 6)or 0)
end end
for _,mode in ipairs({'noExhaust','noEnergy'})do local s,c=fresh('zl62',false,0,false);if mode=='noExhaust'then s.catalog.cards.zl62.exhaust=false else s.energy=0 end;local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)end
print('ZHONGLI_REBUILD_TRANSACTION_PASS')
