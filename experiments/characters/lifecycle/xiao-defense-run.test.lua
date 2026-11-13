-- First-eight admission acceptance; exact src-only public Run commands.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Run=require('abyss_run');local B=require('abyss_xiao_play_bridge')
local function acquired(id,up)
 local r=Run.new(D,42,{experimental=true,candidateLifecycle={kind='xiao',relicEnabled=false}})
 for _,d in ipairs(B.additionalDefinitions())do r.data.cards.cards[#r.data.cards.cards+1]=C.copy(d)end
 assert(Run.startCombat(r,'cultist_solo'))
 for _,e in ipairs(r.combat.enemies)do C.damage(r.combat,r.combat.player,e,999,true)end
 assert(Run.finishCombat(r));r.rewards.cards={'xiao_candidate_'..id};r.rewards.cardUpgrades={up};r.rewards.cardResolved=false
 assert(Run.claimCardReward(r,1));local uid=r.deck[#r.deck].uid
 assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'))
 local s=r.combat;local card
 for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.deckUid==uid then card=table.remove(pile,i);break end end end
 assert(card);s.hand[#s.hand+1]=card;s.enemies[1].hp=100;s.enemies[1].block=0
 eq(card.upgraded,up);eq(card.deckUid,uid);return r,card
end
eq(#B.definitions(),8);eq(#B.additionalDefinitions(),8)
local Actors=require('abyss_actor');local defs=B.additionalDefinitions()
same(defs[7].effects,{{op='xiaoCard',kind='maskBlock',value=8}})
same(defs[7].upgrade.effects,{{op='xiaoCard',kind='maskBlock',value=12}})
same(defs[8].effects,{{op='xiaoCard',kind='breakBlock',value=0},{op='xiaoCard',kind='damage',value=6}})
same(defs[8].upgrade.effects,{{op='xiaoCard',kind='breakBlock',value=0},{op='xiaoCard',kind='damage',value=9}})
for _,d in ipairs({defs[7],defs[8]})do eq(d.cost,1);eq(d.exhaust,false)end
for _,up in ipairs({false,true})do for _,id in ipairs({'x13','x15'})do for _,mask in ipairs({0,2})do
 local r,c=acquired(id,up);local s=r.combat;if mask>0 then Actors.applyPower(s,s.player,'xiao_mask',mask,s.player)end
 local energy=s.energy;s.energy=0;local before=C.copy(r);assert(not Run.play(r,c.uid,1));same(r,before);s.energy=energy
 if id=='x15'then s.enemies[1].hp=0;before=C.copy(r);assert(not Run.play(r,c.uid,1));same(r,before);s.enemies[1].hp=100;s.enemies[1].block=999
 else Actors.applyPower(s,s.player,'dexterity',2,s.player);Actors.applyPower(s,s.player,'frail',1,s.player)end
 assert(Run.play(r,c.uid,1));eq(s.energy,energy-1);eq(s.cardInUse,nil)
 if id=='x13'then local n=up and 12 or 8;if mask==0 then n=n/2 end;eq(s.player.block,math.floor((n+2)*0.75))
 else eq(s.enemies[1].block,0);eq(s.enemies[1].hp,100-(up and 9 or 6)-(mask>0 and 4 or 0))end
 local found=false;for _,v in ipairs(s.discard)do if v.uid==c.uid then found=true end end;assert(found)
end end end
print('XIAO_DEFENSE_RUN_PASS source base upgrade reward UID paid conditional modified block armor break and discard')
for _,up in ipairs({false,true})do for _,id in ipairs({'x13','x15'})do
 local r,c=acquired(id,up);local s=r.combat;s.enemies[1].block=99;local before=C.copy(r);local hand=s.hand
 local apply=C.applyEffects;local reached=false
 C.applyEffects=function(st,effects,...)
  local v=apply(st,effects,...)
  if effects[1].op==(id=='x13'and 'block'or 'damage')then reached=true;error('after native defense benefit')end
  return v
 end
 assert(not pcall(Run.play,r,c.uid,1));C.applyEffects=apply;assert(reached);same(r,before);eq(s.hand,hand)
 assert(Run.play(r,c.uid,1))
end end
print('XIAO_DEFENSE_ROLLBACK_PASS base upgrade armor and native block damage fault full Run restore')
for _,up in ipairs({false,true})do
 local r,c=acquired('x15',up);r.combat.enemies[1].hp=1;r.combat.enemies[1].block=999
 local before=C.copy(r);local finish=Run.finishCombat;local reached=false
 Run.finishCombat=function(run)local v=finish(run);reached=true;error('after break kill reward publication')end
 assert(not pcall(Run.play,r,c.uid,1));Run.finishCombat=finish;assert(reached);same(r,before)
 assert(Run.play(r,c.uid,1));assert(r.phase~='combat')
end
print('XIAO_DEFENSE_TERMINAL_PASS armor break final kill rewards and whole Run rollback')
