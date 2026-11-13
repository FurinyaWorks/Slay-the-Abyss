-- Pending shared 19/24 admission. Native C.play/draw/exhaust only, no wrapper.
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
