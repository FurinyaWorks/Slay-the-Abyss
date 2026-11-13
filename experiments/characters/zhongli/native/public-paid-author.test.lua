-- Author acceptance: run against exact shared integration 3d1ec96620a3808067ad96fb978a4ba47500c0a5, NOT base903.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq=H.C,H.Data,H.eq
local function fresh()
 local d=C.copy(D)
 for _,x in ipairs({{'zl21','installPillar',3,4},{'zl31','installRepair',2,3}})do d.cards.cards[#d.cards.cards+1]={id=x[1],name='candidate',type='power',cost=2,target='SELF',color='colorless',rarity='special',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind=x[2],value=x[3]}},upgrade={effects={{op='zhongliCard',kind=x[2],value=x[4]}}}}end
 return C.new(d,{seed=4,deck={{cardId='zl21',upgraded=true},{cardId='zl31',upgraded=true},'zl21','zl31'},enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=false}})
end
for _,order in ipairs({{'zl21','zl31'},{'zl31','zl21'}})do
 local s=fresh();local count=#s.hand
 for _,id in ipairs(order)do
  local up,base;for _,c in ipairs(s.hand)do if c.cardId==id then if c.upgraded then up=c else base=c end end end;assert(up and base)
  s.energy=3;assert(C.play(s,up.uid));eq(s.energy,1);s.energy=3;assert(C.play(s,base.uid));eq(s.energy,1)
 end
 eq(s.player.statuses.zl_candidate_pillar,4);eq(s.player.statuses.zl_candidate_repair,3);eq(s.zhongliCandidate.jade,0)
 eq(#s.hand,count-4);eq(#s.discard,0);eq(#s.exhaust,0)
 eq(#require('abyss_power_schedule').list(s.player,{zl_candidate_pillar=true,zl_candidate_repair=true}),2)
 local n=fresh();eq(n.player.statuses.zl_candidate_pillar,nil);eq(n.player.statuses.zl_candidate_repair,nil);eq(n.zhongliCandidate.jade,0)
end
print('AUTHOR_PUBLIC_ZL_PASS: both acquisition orders, upgraded-before-base strongest retention, paid distinct UIDs, Power disposition and fresh reset')
