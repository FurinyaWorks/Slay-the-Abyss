-- First-eight admission acceptance; exact src-only public Run commands.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Run=require('abyss_run');local B=require('abyss_xiao_play_bridge')
local function acquired(id,up,many)
 local r=Run.new(D,42,{experimental=true,candidateLifecycle={kind='xiao',relicEnabled=false}})
 for _,d in ipairs(B.additionalDefinitions())do r.data.cards.cards[#r.data.cards.cards+1]=C.copy(d)end
 assert(Run.startCombat(r,'cultist_solo'))
 for _,e in ipairs(r.combat.enemies)do C.damage(r.combat,r.combat.player,e,999,true)end
 assert(Run.finishCombat(r));r.rewards.cards={'xiao_candidate_'..id};r.rewards.cardUpgrades={up};r.rewards.cardResolved=false
 assert(Run.claimCardReward(r,1));local uid=r.deck[#r.deck].uid
 assert(Run.leaveCombatRewards(r));assert(Run.obtainCard(r,'xiao_candidate_x17'));if many then for i=1,8 do assert(Run.obtainCard(r,'xiao_candidate_x20'))end end;assert(Run.startCombat(r,'cultist_solo'))
 local s=r.combat;local card
 for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.deckUid==uid then card=table.remove(pile,i);break end end end
 assert(card);s.hand[#s.hand+1]=card;s.enemies[1].hp=100;s.enemies[1].block=0
 eq(card.upgraded,up);eq(card.deckUid,uid);return r,card
end
eq(#B.definitions(),8);eq(#B.additionalDefinitions(),11)
local Paid=require('abyss_xiao_paid_cards')
for _,v in ipairs({false,-1,2147483648,'3'})do assert(not Paid.supports({op='xiaoCard',kind='exhaustDamage',value=3,cap=v}))end
assert(not Paid.supports({op='xiaoCard',kind='unmaskedDraw',value=2,cap=3}))
local Actors=require('abyss_actor')
for _,up in ipairs({false,true})do for _,id in ipairs({'x20','x21','x22'})do for _,mask in ipairs({0,2})do
 local r,c=acquired(id,up);local s=r.combat
 local f;for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.cardId=='xiao_candidate_x17'then f=table.remove(pile,i);break end end end
 s.hand[#s.hand+1]=assert(f)
 assert(f);assert(Run.play(r,f.uid,1));eq(#s.exhaust,1);eq(s.exhaust[1].uid,f.uid)
 if mask>0 then Actors.applyPower(s,s.player,'xiao_mask',mask,s.player)end
 if id=='x21'then s.enemies[1].hp=0;local before=C.copy(r);assert(not Run.play(r,c.uid,1));same(r,before);s.enemies[1].hp=100 end
 local energy,hand=s.energy,#s.hand
 if id~='x20'then s.energy=0;local before=C.copy(r);assert(not Run.play(r,c.uid,1));same(r,before);s.energy=energy end
 assert(Run.play(r,c.uid,1));eq(s.energy,energy-(id=='x20'and 0 or 1))
 if id=='x20'then eq(#s.hand,math.min(10,hand-1+(mask==0 and(up and 3 or 2)or 0)));eq(#s.exhaust,2);eq(s.exhaust[2].uid,c.uid)
 elseif id=='x21'then eq(s.enemies[1].hp,100-3-(mask>0 and 4 or 0))else eq(s.player.block,2)end
end end end
print('XIAO_EXHAUST_RUN_PASS')
for _,up in ipairs({false,true})do for _,id in ipairs({'x20','x21','x22'})do
 local r,c=acquired(id,up);local s=r.combat;local before=C.copy(r);local hand=s.hand
 local apply=C.applyEffects;local reached=false
 C.applyEffects=function(st,effects,...)
  local out=apply(st,effects,...)
  if effects[1].op==(id=='x20'and 'draw'or id=='x21'and 'damage'or 'block')then reached=true;error('after exhausted-count benefit')end
  return out
 end
 assert(not pcall(Run.play,r,c.uid,1));C.applyEffects=apply;assert(reached);same(r,before);eq(s.hand,hand);assert(Run.play(r,c.uid,1))
end end
print('XIAO_EXHAUST_ROLLBACK_PASS')

for _,up in ipairs({false,true})do for _,id in ipairs({'x21','x22'})do
 local r,c=acquired(id,up,true);local s=r.combat
 Actors.applyPower(s,s.player,'xiao_mask',2,s.player) -- no draw on fuel; actual UseCard exhaust still occurs
 for n=1,8 do
  local f;for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.cardId=='xiao_candidate_x20'then f=table.remove(pile,i);break end end;if f then break end end
  assert(f);s.hand[#s.hand+1]=f;assert(Run.play(r,f.uid,1));eq(#s.exhaust,n)
 end
 assert(Run.play(r,c.uid,1))
 if id=='x21'then eq(s.enemies[1].hp,100-(up and 24 or 18)-4)else eq(s.player.block,up and 14 or 10)end
end end
for _,up in ipairs({false,true})do
 local r,c=acquired('x21',up);local s=r.combat
 Actors.applyPower(s,s.player,'xiao_mask',2,s.player);s.enemies[1].hp=1
 local before=C.copy(r);local finish=Run.finishCombat;local reached=false
 Run.finishCombat=function(run)local v=finish(run);reached=true;error('after final kill settlement')end
 assert(not pcall(Run.play,r,c.uid,1));Run.finishCombat=finish;assert(reached);same(r,before)
 assert(Run.play(r,c.uid,1));assert(r.phase~='combat')
end
print('XIAO_EXHAUST_CAP_TERMINAL_PASS eight actual exhaust instances cap and final settlement rollback')
