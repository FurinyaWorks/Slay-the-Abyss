-- First-eight admission acceptance; exact src-only public Run commands.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Run=require('abyss_run');local B=require('abyss_xiao_play_bridge')
local function acquired(id,up)
 local data=C.copy(D);for _,e in ipairs(data.enemies.encounters)do if e.id=='cultist_solo'then e.enemies={'cultist','cultist'}end end
 local r=Run.new(data,42,{experimental=true,candidateLifecycle={kind='xiao',relicEnabled=false}})
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
local Actors=require('abyss_actor');local defs=B.additionalDefinitions()
same(defs[5].effects,{{op='xiaoCard',kind='damageAll',value=6}})
same(defs[5].upgrade.effects,{{op='xiaoCard',kind='damageAll',value=9}})
same(defs[6].effects,{{op='xiaoCard',kind='damageAll',value=18},{op='xiaoCard',kind='maskCommit',value=0,requiresAlive=true}})
same(defs[6].upgrade.effects,{{op='xiaoCard',kind='damageAll',value=24},{op='xiaoCard',kind='maskCommit',value=0,requiresAlive=true}})
eq(defs[5].cost,1);eq(defs[5].exhaust,false);eq(defs[6].cost,2);eq(defs[6].exhaust,true)
for _,up in ipairs({false,true})do for _,id in ipairs({'x12','x18'})do for _,mask in ipairs({0,2})do
 local r,c=acquired(id,up);local s=r.combat;assert(#s.enemies==2)
 for _,e in ipairs(s.enemies)do e.hp=100;e.block=3 end
 if mask>0 then Actors.applyPower(s,s.player,'xiao_mask',mask,s.player)end
 local energy=s.energy;local cost=id=='x12'and 1 or 2
 s.energy=cost-1;local before=C.copy(r);assert(not Run.play(r,c.uid,999));same(r,before);s.energy=energy
 assert(Run.play(r,c.uid,999));eq(s.energy,energy-cost)
 local n=id=='x12'and(up and 9 or 6)or(up and 24 or 18);n=n+(mask>0 and 4 or 0)
 for _,e in ipairs(s.enemies)do eq(e.hp,100-(n-3));eq(e.block,0)end
 if id=='x18'or mask==0 then eq(s.player.statuses.xiao_mask,nil)else eq(s.player.statuses.xiao_mask,mask)end
 local found=false;for _,v in ipairs(id=='x18'and s.exhaust or s.discard)do if v.uid==c.uid then found=true end end;assert(found)
end end end
print('XIAO_AREA_RUN_PASS source base upgrade fixed reward UID masked and calm two enemy native armor damage and disposition')
for _,up in ipairs({false,true})do for _,id in ipairs({'x12','x18'})do
 local r,c=acquired(id,up);local s=r.combat;Actors.applyPower(s,s.player,'xiao_mask',2,s.player)
 for _,e in ipairs(s.enemies)do e.hp=1;e.block=0 end
 local before=C.copy(r);local hand=s.hand;local finish=Run.finishCombat;local reached=false
 Run.finishCombat=function(run)eq(run.combat.player.statuses.xiao_mask,2);local v=finish(run);reached=true;error('after area terminal native skip and rewards')end
 assert(not pcall(Run.play,r,c.uid,999));Run.finishCombat=finish;assert(reached);same(r,before);eq(s.hand,hand)
 assert(Run.play(r,c.uid,999));assert(r.phase~='combat')
 local r2,c2=acquired(id,up);local s2=r2.combat;for _,e in ipairs(s2.enemies)do e.hp=100;e.block=3 end
 before=C.copy(r2);local damage=C.damage;reached=false
 C.damage=function(...)local v=damage(...);reached=true;error('after native area first damage')end
 assert(not pcall(Run.play,r2,c2.uid,999));C.damage=damage;assert(reached);same(r2,before)
end end
print('XIAO_AREA_ROLLBACK_PASS first native target fault and terminal reward fault restore entire Run')
