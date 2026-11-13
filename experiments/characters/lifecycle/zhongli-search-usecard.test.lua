-- Actual opt-in shared 19/24 admission. Native C.play/draw/exhaust only, no wrapper.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local function fresh(id,up,jade,full)
 local d=C.copy(D)
 d.cards.cards[#d.cards.cards+1]={id='zl19',name='HOLD',type='skill',cost=2,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,exhaust=true,effects={{op='zhongliCard',kind='gainJade',value=6},{op='draw',value=2}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=8},{op='draw',value=3}}}}
 d.cards.cards[#d.cards.cards+1]={id='zl24',name='HOLD',type='skill',cost=1,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,exhaust=true,effects={{op='zhongliCard',kind='spendJade',value=3},{op='draw',value=3}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},{op='draw',value=4}}}}
 local deck={{cardId=id,upgraded=up}};for i=1,11 do deck[#deck+1]='strike'end
 local s=C.new(d,{seed=4,deck=deck,enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=false}})
 local c;for _,v in ipairs(s.hand)do if v.cardId==id then c=v end end
 if not c then for i,v in ipairs(s.draw)do if v.cardId==id then c=table.remove(s.draw,i);s.hand[#s.hand+1]=c;break end end end
 for i=#s.hand,1,-1 do if s.hand[i]~=c then s.draw[#s.draw+1]=table.remove(s.hand,i)end end
 if full then while #s.hand<10 do s.hand[#s.hand+1]=table.remove(s.draw)end end
 s.zhongliCandidate.jade=jade;return s,c
end
local count=0
for _,id in ipairs({'zl19','zl24'})do for _,up in ipairs({false,true})do for _,jade in ipairs({0,3,20})do for _,full in ipairs({false,true})do
 local s,c=fresh(id,up,jade,full);local handSize=#s.hand;local before=C.copy(s)
 if id=='zl24'and jade<3 then eq(C.play(s,c.uid),false);same(s,before)
 else
  assert(C.play(s,c.uid));eq(s.energy,id=='zl19'and 1 or 2)
  eq(s.zhongliCandidate.jade,id=='zl19'and math.min(20,jade+(up and 8 or 6))or jade-3)
  local draws=id=='zl19'and(up and 3 or 2)or(up and 4 or 3)
  eq(#s.hand,math.min(10,handSize-1+draws));eq(#s.exhaust,1);eq(s.exhaust[1],c)
  for _,v in ipairs(s.hand)do assert(v~=c,'resolving search card redrawn')end
  before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)
 end
 count=count+1
end end end end
for _,id in ipairs({'zl19','zl24'})do for _,up in ipairs({false,true})do
 local s,c=fresh(id,up,3,false);s.draw={};s.discard={};assert(C.play(s,c.uid));eq(#s.hand,0);eq(s.exhaust[1],c);eq(s.energy,id=='zl19'and 1 or 2)
end end
print('AUTHOR_PUBLIC_ZL_SEARCH_PAID_PASS 24 resource/version/hand scenarios plus4 empty-pile cases')
local Jade=require('abyss_zhongli_jade_resource');local Stage=require('abyss_zhongli_paid_cards');local Exhaust=require('abyss_exhaust')
for _,id in ipairs({'zl19','zl24'})do for _,up in ipairs({false,true})do
 -- NoDraw blocks only draw, not real payment, resource commit or exhaust.
 local s,c=fresh(id,up,3,false);s.player.noDraw=true;assert(C.play(s,c.uid));eq(#s.hand,0);eq(s.exhaust[1],c);eq(s.energy,id=='zl19'and 1 or 2);eq(s.zhongliCandidate.jade,id=='zl19'and(up and 11 or 9)or 0)
 -- Actual exhaustion runs FNP and DE in original engine order exactly once.
 s,c=fresh(id,up,3,false);s.player.statuses.feel_no_pain=3;s.player.statuses.dark_embrace=1;Exhaust.rememberPower(s,'feel_no_pain');Exhaust.rememberPower(s,'dark_embrace')
 local count=0;local draw=C.draw;C.draw=function(state,n,...)if state==s then count=count+1 end;return draw(state,n,...)end
 assert(C.play(s,c.uid));C.draw=draw;eq(count,2);eq(s.player.block,3);eq(s.exhaust[1],c)
 local expected=id=='zl19'and(up and 3 or 2)or(up and 4 or 3);eq(#s.hand,expected+1)
 -- Fail after actual DE draw, after resource and source exhaust: whole graph rollback.
 s,c=fresh(id,up,3,false);s.player.statuses.feel_no_pain=3;s.player.statuses.dark_embrace=1;Exhaust.rememberPower(s,'feel_no_pain');Exhaust.rememberPower(s,'dark_embrace')
 local before=C.copy(s);local hand,d,ex,z,r=s.hand,s.draw,s.exhaust,s.zhongliCandidate,s.rng;count=0
 C.draw=function(state,n,...)local out=draw(state,n,...);if state==s then count=count+1;if count==2 then error('after actual DE draw')end end;return out end
 eq(pcall(C.play,s,c.uid),false);C.draw=draw;eq(count,2);same(s,before);eq(s.hand,hand);eq(s.draw,d);eq(s.exhaust,ex);eq(s.zhongliCandidate,z);eq(s.rng,r);eq(s.hand[1],c)
 assert(C.play(s,c.uid));eq(s.exhaust[1],c);eq(s.player.block,3)
end end
-- Revealed Scry continuation is not an energy/resource refund or a repeated draw.
do
 local s,c=fresh('zl24',false,3,false);local dispatch=Stage.dispatch;local once=false
 Stage.dispatch=function(combat,state,e,q)if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end;return dispatch(combat,state,e,q)end
 assert(C.play(s,c.uid));Stage.dispatch=dispatch;local p=assert(s.pendingScry);eq(s.energy,2);eq(s.zhongliCandidate.jade,3)
 local before=C.copy(s);local paid,z,q=s.pendingPlay,s.zhongliCandidate,s.actionQueue;local draw=C.draw
 C.draw=function(...)draw(...);error('after resumed native search')end
 eq(pcall(C.chooseScry,s,{},p.token),false);C.draw=draw;same(s,before);eq(s.pendingPlay,paid);eq(s.zhongliCandidate,z);eq(s.actionQueue,q);eq(s.pendingScry,p)
 assert(C.chooseScry(s,{},p.token));eq(z.jade,0);eq(s.energy,2);eq(s.exhaust[1],c);eq(#s.hand,3)
 local done=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,done)
end
local CardActions=require('abyss_card_actions')
for _,id in ipairs({'zl19','zl24'})do for _,mode in ipairs({'normal','unmarked','native','noExhaust','extra','tail'})do
 local s,c=fresh(id,false,3,false);local def=s.catalog.cards[id]
 if mode=='unmarked'then def.zhongliCandidate=nil elseif mode=='native'then def.silentFinalCard=true elseif mode=='noExhaust'then def.exhaust=false elseif mode=='extra'then def.effects[1].fixed=true elseif mode=='tail'then def.effects[2].times=2 end
 if mode~='normal'then local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)end
 table.remove(s.hand,1);C.queueCard(s,c,{exhaustCards=true});CardActions.drain(C,s);eq(s.energy,3)
 eq(s.zhongliCandidate.jade,mode=='normal'and(id=='zl19'and 9 or 0)or 3)
 if mode=='normal'then eq(s.exhaust[1],c);eq(#s.hand,id=='zl19'and 2 or 3)else eq(#s.hand,0)end
end end
for _,id in ipairs({'zl19','zl24'})do local s,c=fresh(id,false,3,false);s.energy=0;local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)end
print('ZHONGLI_SEARCH_TRANSACTION_PASS')
