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
local defs=B.additionalDefinitions()
same(defs[1].effects,{{op='xiaoCard',kind='maskCommit',value=0,requiresAlive=true},{op='draw',value=2}})
same(defs[1].upgrade.effects,{{op='xiaoCard',kind='maskCommit',value=0,requiresAlive=true},{op='draw',value=3}})
same(defs[2].effects,{{op='xiaoCard',kind='damage',value=10},{op='xiaoCard',kind='maskCommit',value=0,requiresAlive=true}})
same(defs[2].upgrade.effects,{{op='xiaoCard',kind='damage',value=14},{op='xiaoCard',kind='maskCommit',value=0,requiresAlive=true}})
for _,d in ipairs({defs[1],defs[2]})do eq(d.cost,1);eq(d.exhaust,false)end
local Actors=require('abyss_actor')
for _,up in ipairs({false,true})do for _,id in ipairs({'x09','x11'})do
 local r,c=acquired(id,up);local s=r.combat;Actors.applyPower(s,s.player,'xiao_mask',2,s.player)
 local energy,hand=s.energy,#s.hand
 s.energy=0;local before=C.copy(r);assert(not Run.play(r,c.uid,1));same(r,before);s.energy=energy
 if id=='x11'then s.enemies[1].hp=0;before=C.copy(r);assert(not Run.play(r,c.uid,1));same(r,before);s.enemies[1].hp=100 end
 assert(Run.play(r,c.uid,1));eq(s.energy,energy-1);eq(s.player.statuses.xiao_mask,nil)
 eq(s.cardInUse,nil);local found=false;for _,v in ipairs(s.discard)do if v.uid==c.uid then found=true end end;assert(found)
 if id=='x11'then eq(s.enemies[1].hp,up and 82 or 86)else eq(#s.hand,hand-1+(up and 3 or 2))end
end end
print('XIAO_EXIT_RUN_PASS fixed reward real UID upgrade payment and source ordered effects')
for _,up in ipairs({false,true})do
 local r,c=acquired('x09',up);local s=r.combat;Actors.applyPower(s,s.player,'xiao_mask',2,s.player)
 for i=#s.draw,1,-1 do s.discard[#s.discard+1]=table.remove(s.draw,i)end
 local before=C.copy(r);local hand,draw=s.hand,s.draw;local fn=C.draw;local reached=false
 C.draw=function(st,n)eq(st.player.statuses.xiao_mask,nil);local v=fn(st,n);reached=true;error('after exit and real shuffle draw')end
 assert(not pcall(Run.play,r,c.uid,1));C.draw=fn;assert(reached);same(r,before);eq(s.hand,hand);eq(s.draw,draw)
 assert(Run.play(r,c.uid,1));eq(s.player.statuses.xiao_mask,nil)
 local r2,c2=acquired('x11',up);local s2=r2.combat;Actors.applyPower(s2,s2.player,'xiao_mask',2,s2.player);s2.enemies[1].hp=1
 before=C.copy(r2);local finish=Run.finishCombat;reached=false
 Run.finishCombat=function(run)eq(run.combat.player.statuses.xiao_mask,2);local v=finish(run);reached=true;error('after final enemy native terminal skip and reward')end
 assert(not pcall(Run.play,r2,c2.uid,1));Run.finishCombat=finish;assert(reached);same(r2,before);eq(r2.combat,s2)
 assert(Run.play(r2,c2.uid,1));assert(r2.phase~='combat')
end
print('XIAO_EXIT_ROLLBACK_PASS actual shuffle and final kill native terminal skip reward full Run snapshots')
