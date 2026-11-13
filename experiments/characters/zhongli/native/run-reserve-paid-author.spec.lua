package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same;local Run=require('abyss_run')
local red=arg and arg[1]=='baseline-rejection'
for _,id in ipairs({'zl26','zl38'})do for _,up in ipairs({false,true})do
 local r=Run.new(D,23,{experimental=true,candidateLifecycle={kind='zhongli',relicEnabled=false}})
 local d={id=id,name='HOLD',type='skill',cost=id=='zl26'and 2 or 0,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind='gainJade',value=id=='zl26'and 10 or 2}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=id=='zl26'and 14 or 3}}}}
 if id=='zl26'then d.selfRetain=true else d.exhaust=true end
 r.data.cards.cards[#r.data.cards.cards+1]=d;assert(Run.startCombat(r,'cultist_solo'))
 C.damage(r.combat,r.combat.player,r.combat.enemies[1],999,true);assert(Run.finishCombat(r))
 r.rewards.cards={id};r.rewards.cardUpgrades={up};r.rewards.cardResolved=false;assert(Run.claimCardReward(r,1));local deckUid=r.deck[#r.deck].uid
 assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'));local s=r.combat;local c
 for _,pile in ipairs({s.hand,s.draw})do for i,x in ipairs(pile)do if x.deckUid==deckUid then c=table.remove(pile,i);s.hand[#s.hand+1]=c;break end end end
 assert(c);eq(c.upgraded,up);eq(c.deckUid,deckUid);eq(s.zhongliCandidate.jade,0)
 if red then
  local before=C.copy(r);eq(Run.play(r,c.uid),false);same(r,before)
 else
  if id=='zl26'then
   assert(Run.endTurn(r));local found=false;for _,x in ipairs(s.hand)do if x==c then found=true end end;assert(found);eq(s.zhongliCandidate.jade,0)
  else s.energy=0 end -- explicit zero-energy fixture, no energy generation
  local beforeEnergy=s.energy;assert(Run.play(r,c.uid));eq(s.energy,beforeEnergy-(id=='zl26'and 2 or 0));eq(s.zhongliCandidate.jade,id=='zl26'and(up and 14 or 10)or(up and 3 or 2))
  local pile=id=='zl26'and s.discard or s.exhaust;local found=false;for _,x in ipairs(pile)do if x==c then found=true end end;assert(found)
  local before=C.copy(r);eq(Run.play(r,c.uid),false);same(r,before)
  if id=='zl38'then assert(Run.endTurn(r));for _,x in ipairs(s.hand)do assert(x~=c,'exhausted zero-cost card redrawn')end end
 end
end end
print(red and 'AUTHOR_ZL_RESERVE_RUN_RED_CONFIRMED four acquired identities rejected unchanged before shared admission' or 'AUTHOR_ZL_RESERVE_RUN_PASS four reward identities retain or zero-energy exhaust through public Run')
