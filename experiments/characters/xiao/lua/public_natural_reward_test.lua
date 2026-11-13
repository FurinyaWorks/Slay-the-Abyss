-- Preregistered finite author probe. Run from an exact shared archive; src-only.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,Run=H.C,H.Data,H.Run
local F=require('abyss_xiao_resource_reward_run')
-- Fixed four seeds, at most two native cultist encounters, 20 turns/100 policy steps each.
-- No state/HP/energy/deck/draw/offer mutation. Policy sees current hand and live target only.
local totals={paid=0,dead=0,unseen=0,incomplete=0}
local function hp(r)return r.combat and r.combat.player.hp or r.hp end
local function battle(r,wanted)
 for _=1,100 do
  if r.phase~='combat'then return r.hp>0 and 'won'or'dead'end
  local s=r.combat;if s.player.hp<=0 then return 'dead'end
  if s.turn>20 then return 'incomplete'end
  if s.phase~='player'then return 'incomplete'end
  local target;for i,e in ipairs(s.enemies)do if e.hp>0 then target=i;break end end
  if not target then return 'incomplete'end
  local chosen,score
  for _,c in ipairs(s.hand)do
   if C.canPlay(s,c.uid,target)then
    local id=c.cardId;local rank=10
    if c.deckUid==wanted then rank=100 end
    if id=='xiao_candidate_x04'then rank=(s.player.statuses.xiao_mask or 0)==0 and s.player.hp>8 and 60 or -1
    elseif id=='xiao_candidate_x01'or id=='xiao_candidate_x03'or id=='xiao_candidate_x05'or id=='xiao_candidate_x07'or id=='xiao_candidate_x11'or id=='xiao_candidate_x12'or id=='xiao_candidate_x15'or id=='xiao_candidate_x18'then rank=rank+30 end
    if rank>=0 and(not score or rank>score)then chosen=c;score=rank end
   end
  end
  if chosen then
   local uid,deckUid,up,id=chosen.uid,chosen.deckUid,chosen.upgraded,chosen.cardId
   assert(Run.play(r,uid,target),'preflight accepted action rejected')
   if wanted and deckUid==wanted then return 'paid',id,up end
  else assert(Run.endTurn(r),'native end turn rejected')end
 end
 return 'incomplete'
end
for _,seed in ipairs({41,42,43,44})do
 local r=F.new(D,seed);assert(Run.startCombat(r,'cultist_solo'))
 local first=battle(r)
 if first=='won'then
  local offered=Run.rewardOptions(r);assert(#offered>0,'real reward offer empty')
  local id=offered[1];local up=r.rewards.cardUpgrades[1];local uid=r.nextDeckUid
  assert(Run.claimCardReward(r,1));local c=r.deck[#r.deck];assert(c.uid==uid and c.cardId==id and c.upgraded==up)
  assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'))
  local result,paidId,paidUp=battle(r,uid)
  if result=='paid'then assert(paidId==id and paidUp==up);totals.paid=totals.paid+1
  elseif result=='won'then result='unseen';totals.unseen=totals.unseen+1
  else totals[result]=totals[result]+1 end
  print('XIAO_NATURAL_ROW seed='..seed..' first=won offer='..id..' upgraded='..tostring(up)..' result='..result..' hp='..hp(r))
 else totals[first]=totals[first]+1;print('XIAO_NATURAL_ROW seed='..seed..' first='..first..' result='..first..' hp='..hp(r))end
end
assert(totals.paid+totals.dead+totals.unseen+totals.incomplete==4)
print('XIAO_NATURAL_SUMMARY paid='..totals.paid..' dead='..totals.dead..' unseen='..totals.unseen..' incomplete='..totals.incomplete)
