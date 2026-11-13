-- Actual public paid admission; test definitions remain explicit research fixtures.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Jade=require('abyss_zhongli_jade_resource');local CardActions=require('abyss_card_actions')
local function fresh(id,up,jade)
 local d=C.copy(D)
 for _,name in ipairs({'zl26','zl38'})do
  local retain=name=='zl26'
  d.cards.cards[#d.cards.cards+1]={id=name,name='HOLD',type='skill',cost=retain and 2 or 0,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,selfRetain=retain,exhaust=not retain,effects={{op='zhongliCard',kind='gainJade',value=retain and 10 or 2}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=retain and 14 or 3}}}}
 end
 local s=C.new(d,{seed=4,deck={{cardId=id,upgraded=up}},enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=false}})
 s.zhongliCandidate.jade=jade;return s,s.hand[1]
end
for _,id in ipairs({'zl26','zl38'})do for _,up in ipairs({false,true})do for jade=0,20 do
 local s,c=fresh(id,up,jade);if id=='zl38'then s.energy=0 end
 local beforeEnergy=s.energy;assert(C.play(s,c.uid));eq(s.energy,beforeEnergy-(id=='zl26'and 2 or 0))
 eq(s.zhongliCandidate.jade,math.min(20,jade+(id=='zl26'and(up and 14 or 10)or(up and 3 or 2))))
 eq((id=='zl26'and s.discard or s.exhaust)[1],c);eq(#s.hand,0)
 local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)
end end end
-- Real committed gain fault: whole host snapshot, original references, retry once.
for _,id in ipairs({'zl26','zl38'})do for _,up in ipairs({false,true})do
 local s,c=fresh(id,up,7);local before=C.copy(s);local z,hand,exhaust=s.zhongliCandidate,s.hand,s.exhaust
 local apply=Jade.apply;local hit=false
 Jade.apply=function(state,...)local out=apply(state,...);hit=true;error('after reserve gain')end
 eq(pcall(C.play,s,c.uid),false);Jade.apply=apply;assert(hit);same(s,before)
 eq(s.zhongliCandidate,z);eq(s.hand,hand);eq(s.exhaust,exhaust);eq(s.hand[1],c);assert(C.play(s,c.uid))
end end
-- Native auto-use is free by host policy, but strict declaration gate still applies.
for _,id in ipairs({'zl26','zl38'})do for _,mode in ipairs({'normal','unmarked','retain','exhaust','extra','wrongValue'})do
 local s,c=fresh(id,false,0);local d=s.catalog.cards[id]
 if mode=='unmarked'then d.zhongliCandidate=nil
 elseif mode=='retain'then d.selfRetain=id~='zl26'
 elseif mode=='exhaust'then d.exhaust=id~='zl38'
 elseif mode=='extra'then d.effects[1].condition='always'
 elseif mode=='wrongValue'then d.effects[1].value=1 end
 if mode~='normal'then local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)end
 table.remove(s.hand,1);C.queueCard(s,c,{});CardActions.drain(C,s)
 eq(s.energy,3);eq(s.zhongliCandidate.jade,mode=='normal'and(id=='zl26'and 10 or 2)or 0)
end end
for _,up in ipairs({false,true})do
 local s,c=fresh('zl26',up,0);s.energy=1;local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)
end
print('ZHONGLI_RESERVE_TRANSACTION_PASS 84 public cases,4 actual postgain rollback retries,12 auto gates,2 insufficient energy')
