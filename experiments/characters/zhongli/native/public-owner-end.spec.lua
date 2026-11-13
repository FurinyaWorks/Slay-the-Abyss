-- PENDING ACCEPTANCE SPEC. Shared 3d1ec966 pays install but does not wire owner-end.
-- Never report this spec as passed until a reviewed shared hook actually runs.
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
