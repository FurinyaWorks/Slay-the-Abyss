package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same;local Run=require('abyss_run');local F=require('abyss_keqing_starter_run')
local function pick(s,id)
 for _,pile in ipairs({s.hand,s.draw,s.discard})do for i,c in ipairs(pile)do if c.cardId==id then table.remove(pile,i);s.hand[#s.hand+1]=c;return c end end end;error('missing starter')
end
local original=C.copy(D);local r=F.new(D,42);same(D,original);eq(r.hp,60);eq(r.maxHp,60);eq(#r.deck,10);eq(#r.relics,0)
local counts={};for _,c in ipairs(r.deck)do counts[c.cardId]=(counts[c.cardId]or 0)+1 end;same(counts,{KQ001=3,KQ002=4,KQ003=2,KQ004=1})
assert(Run.startCombat(r,'cultist_solo'));local s=r.combat;eq(#s.hand,5);eq(s.energy,3);eq(s.characterOwnerEnd,'keqing');eq(s.keqingResource.infusion,0);eq(s.keqingResource.wedgeUntil,nil);eq(s.keqingResource.relicUsed,false)
s.enemies[1].hp=100;s.enemies[1].maxHp=100
local setup=pick(s,'KQ003');assert(Run.play(r,setup.uid,1));eq(s.energy,2);eq(s.player.block,4);eq(s.keqingResource.relicUsed,true);eq(s.keqingResource.wedgeUntil,s.turn+1)
local recast=pick(s,'KQ003');assert(Run.play(r,recast.uid,1));eq(s.energy,1);eq(s.player.block,4);eq(s.keqingResource.infusion,2);eq(s.keqingResource.wedgeUntil,nil)
local burst=pick(s,'KQ004');assert(Run.play(r,burst.uid,1));eq(s.energy,0);eq(s.keqingResource.infusion,1)
-- Reward uses the actual persistent UID and upgrade identity across a fresh fight.
s.player.hp=33;C.damage(s,s.player,s.enemies[1],999,true);assert(Run.finishCombat(r));eq(r.hp,33)
r.rewards.cards={'KQ003'};r.rewards.cardUpgrades={true};r.rewards.cardResolved=false;assert(Run.claimCardReward(r,1));local acquired=r.deck[#r.deck];eq(acquired.upgraded,true);local deckUid=acquired.uid
assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'));s=r.combat;eq(s.player.hp,33);eq(s.keqingResource.infusion,0);eq(s.keqingResource.relicUsed,false);eq(s.keqingResource.wedgeUntil,nil)
local c;for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.deckUid==deckUid then c=table.remove(pile,i);s.hand[#s.hand+1]=c;break end end;if c then break end end;assert(c);eq(c.upgraded,true)
s.enemies[1].hp=100;local before=C.copy(r);local resource,deck,hand,card=s.keqingResource,r.deck,s.hand,c;local Paid=require('abyss_keqing_paid_cards');local dispatch=Paid.dispatch
Paid.dispatch=function(...)local value=dispatch(...);error('after actual Keqing stage')end
eq(pcall(Run.play,r,c.uid,1),false);Paid.dispatch=dispatch;same(r,before);eq(s.keqingResource,resource);eq(r.deck,deck);eq(s.hand,hand);eq(s.hand[#s.hand],card);assert(Run.play(r,c.uid,1));eq(s.enemies[1].hp,93);eq(s.player.block,4)
-- Terminal reward-publication failure restores the entire outer Run graph.
local strike=pick(s,'KQ001');s.enemies[1].hp=1;before=C.copy(r);local finish=Run.finishCombat;local hit=false
Run.finishCombat=function(run)local result=finish(run);hit=true;error('after rewards')end
eq(pcall(Run.play,r,strike.uid,1),false);Run.finishCombat=finish;assert(hit);same(r,before);eq(r.deck,deck);assert(Run.play(r,strike.uid,1));eq(r.phase,'reward')
assert(Run.leaveCombatRewards(r));before=C.copy(r);local new=C.new
C.new=function(...)new(...);error('late init failure')end
eq(pcall(Run.startCombat,r,'cultist_solo'),false);C.new=new;same(r,before);eq(r.deck,deck);assert(Run.startCombat(r,'cultist_solo'));eq(r.combat.keqingResource.infusion,0);eq(r.combat.keqingResource.relicUsed,false);eq(r.combat.keqingResource.wedgeUntil,nil)
for _,enabled in ipairs({false,true})do local x=Run.new(D,42,{experimental=true,candidateLifecycle={kind='keqing',relicEnabled=enabled}});assert(Run.startCombat(x,'cultist_solo'));eq(x.combat.keqingResource.relicEnabled,enabled)end
for _,bad in ipairs({'true',0,{}})do eq(pcall(Run.new,D,42,{experimental=true,candidateLifecycle={kind='keqing',relicEnabled=bad}}),false)end
same(D,original)
print('KEQING_RUN_STARTER_PASS actual source starter/three encounters/paid relic/reset/UID/outer transactions')
