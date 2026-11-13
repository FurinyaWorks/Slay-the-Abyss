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
eq(#B.definitions(),8);eq(#B.additionalDefinitions(),6)
local defs=B.additionalDefinitions()
same(defs[3].effects,{{op='loseHp',value=2},{op='xiaoCard',kind='maskCommit',value=1,requiresAlive=true},{op='block',value=8}})
same(defs[3].upgrade.effects,{{op='loseHp',value=2},{op='xiaoCard',kind='maskCommit',value=1,requiresAlive=true},{op='block',value=11}})
same(defs[4].effects,{{op='loseHp',value=3},{op='energy',value=2}})
same(defs[4].upgrade.effects,{{op='loseHp',value=3},{op='energy',value=3}})
eq(defs[3].cost,1);eq(defs[3].exhaust,false);eq(defs[4].cost,0);eq(defs[4].exhaust,true)
local Actors=require('abyss_actor')
for _,up in ipairs({false,true})do for _,id in ipairs({'x10','x17'})do
 local r,c=acquired(id,up);local s=r.combat;local cost=id=='x10'and 2 or 3
 s.player.hp=cost;local before=C.copy(r);assert(not Run.play(r,c.uid,1));same(r,before)
 Actors.applyPower(s,s.player,'intangible',1,s.player);before=C.copy(r);assert(not Run.play(r,c.uid,1));same(r,before)
 s.player.hp=20;local energy=s.energy;assert(Run.play(r,c.uid,1));eq(s.player.hp,19)
 if id=='x10'then eq(s.energy,energy-1);eq(s.player.statuses.xiao_mask,1);eq(s.player.block,up and 11 or 8)
 else eq(s.energy,energy+(up and 3 or 2));local found=false;for _,v in ipairs(s.exhaust)do if v.uid==c.uid then found=true end end;assert(found)end
end end
print('XIAO_LIFE_RUN_PASS real reward paid life prerequisites and native Intangible divergence')
for _,up in ipairs({false,true})do for _,id in ipairs({'x10','x17'})do
 local r,c=acquired(id,up);local s=r.combat;s.player.hp=20
 local before=C.copy(r);local hand=s.hand;local apply=C.applyEffects;local reached=false
 C.applyEffects=function(st,effects,...)
  local v=apply(st,effects,...)
  if effects[1].op==(id=='x10'and 'block'or 'energy')then reached=true;error('after actual life card benefit')end
  return v
 end
 assert(not pcall(Run.play,r,c.uid,1));C.applyEffects=apply;assert(reached);same(r,before);eq(s.hand,hand)
 assert(Run.play(r,c.uid,1));eq(s.player.hp,id=='x10'and 18 or 17)
end end
print('XIAO_LIFE_ROLLBACK_PASS base upgraded native benefit fault restores entire paid Run')
