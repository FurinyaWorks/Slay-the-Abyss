-- Pending shared 16/57 admission. This is actual public C.play, never a payment wrapper.
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
