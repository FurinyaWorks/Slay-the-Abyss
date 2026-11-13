-- Pending explicit Zhongli Run admission; real Run commands, fixed deck/reward fixtures.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same;local Run=require('abyss_run')
local function def(id,kind,value,up)
 return {id=id,name='HOLD',type='skill',cost=2,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind=kind,value=value}},upgrade={effects={{op='zhongliCard',kind=kind,value=up}}}}
end
local function get(r,id)
 local s=r.combat;for _,pile in ipairs({s.hand,s.draw,s.discard})do for i,c in ipairs(pile)do if c.cardId==id then
  table.remove(pile,i);if #s.hand==10 then s.draw[#s.draw+1]=table.remove(s.hand)end;s.hand[#s.hand+1]=c;return c
 end end end;error('missing fixture card '..id)
end
local r=Run.new(D,19,{experimental=true,candidateLifecycle={kind='zhongli',relicEnabled=false}})
local cards={def('zl03','gainJade',12,16),def('zl21','installPillar',3,4),def('zl31','installRepair',2,3)};cards[2].type='power';cards[3].type='power'
cards[4]={id='zl04',name='HOLD',type='attack',cost=1,target='ENEMY',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind='spendJade',value=6},{op='damage',value=14}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=6},{op='damage',value=18}}}}
for _,d in ipairs(cards)do r.data.cards.cards[#r.data.cards.cards+1]=d end
-- Explicit starter-deck fixture, NOT a natural reward/unlock assertion.
for i,id in ipairs({'zl03','zl21','zl31'})do r.deck[i].cardId=id end
assert(Run.startCombat(r,'cultist_solo'));local first=r.combat;eq(first.zhongliCandidate.jade,0)
assert(Run.play(r,get(r,'zl03').uid));eq(first.zhongliCandidate.jade,12);assert(Run.endTurn(r))
assert(Run.play(r,get(r,'zl21').uid));eq(first.player.statuses.zl_candidate_pillar,3);assert(Run.endTurn(r))
assert(Run.play(r,get(r,'zl31').uid));eq(first.player.statuses.zl_candidate_repair,2)
C.damage(first,first.player,first.enemies[1],999,true);assert(Run.finishCombat(r))
r.rewards.cards={'zl04'};r.rewards.cardUpgrades={true};r.rewards.cardResolved=false;assert(Run.claimCardReward(r,1))
local acquired=r.deck[#r.deck];local deckUid=acquired.uid;eq(acquired.cardId,'zl04');eq(acquired.upgraded,true)
assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'));local battle=r.combat
assert(battle~=first);eq(battle.zhongliCandidate.jade,0);eq(battle.player.statuses.zl_candidate_pillar,nil);eq(battle.player.statuses.zl_candidate_repair,nil)
local c=get(r,'zl04');eq(c.deckUid,deckUid);eq(c.upgraded,true)
assert(Run.play(r,get(r,'zl03').uid));eq(battle.energy,1);eq(battle.zhongliCandidate.jade,12)
battle.enemies[1].hp=1;local before=C.copy(r);local deck,z,cfg=r.deck,battle.zhongliCandidate,r.candidateLifecycle;local finish=Run.finishCombat;local reached=false
Run.finishCombat=function(run)local out=finish(run);reached=true;error('after actual Zhongli Run rewards')end
local ok=pcall(Run.play,r,c.uid,1);Run.finishCombat=finish;assert(not ok and reached);same(r,before);eq(r.combat,battle);eq(r.deck,deck);eq(battle.zhongliCandidate,z);eq(r.candidateLifecycle,cfg)
assert(Run.play(r,c.uid,1));assert(r.phase~='combat');eq(z.jade,6);eq(battle.energy,0)
assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'));eq(r.combat.zhongliCandidate.jade,0);eq(get(r,'zl04').deckUid,deckUid)
print('AUTHOR_ZL_RUN_PUBLIC_PASS real paid03/21/31 then upgraded reward04 across three battles, resource/Power reset and whole-Run reward rollback')
