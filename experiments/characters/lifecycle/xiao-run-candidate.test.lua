-- Actual explicit Run kind=xiao admission. src-only; fixed acquisition/hand fixtures, not natural pool proof.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Run=require('abyss_run');local Native=require('abyss_xiao_play_bridge')
local function fresh(relic)
 local option={experimental=true,candidateLifecycle={kind='xiao',relicEnabled=relic}}
 local r=Run.new(D,42,option);for _,d in ipairs(Native.definitions())do r.data.cards.cards[#r.data.cards.cards+1]=C.copy(d)end
 assert(r.candidateLifecycle~=option.candidateLifecycle);option.candidateLifecycle.relicEnabled=not relic;eq(r.candidateLifecycle.relicEnabled,relic)
 return r
end
local function finishFixture(run)
 for _,e in ipairs(run.combat.enemies)do C.damage(run.combat,run.combat.player,e,999,true)end
 assert(Run.finishCombat(run))
end
local function get(run,deckUid)
 local s=run.combat;local c
 for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.deckUid==deckUid then c=table.remove(pile,i);break end end end
 assert(c);if #s.hand==10 then s.draw[#s.draw+1]=table.remove(s.hand)end;s.hand[#s.hand+1]=c;return c
end
for _,relic in ipairs({false,true})do
 local run=fresh(relic);assert(Run.startCombat(run,'cultist_solo'));eq(run.combat.xiao.startingRelic,relic)
 run.combat.xiao.relicUsed=true;run.combat.xiao.reservedEnergy=2;run.combat.player.statuses.xiao_mask=2;finishFixture(run)
 -- Explicit fixed reward fixture, not registration into natural reward pools.
 run.rewards.cards={'xiao_candidate_x01'};run.rewards.cardUpgrades={true};run.rewards.cardResolved=false
 assert(Run.claimCardReward(run,1));local acquired=run.deck[#run.deck];local uid=acquired.uid;eq(acquired.upgraded,true)
 assert(Run.leaveCombatRewards(run));assert(Run.startCombat(run,'cultist_solo'));local battle=run.combat
 eq(battle.xiao.reservedEnergy,0);eq(battle.xiao.relicUsed,false);eq(battle.player.statuses.xiao_mask,nil);eq(battle.xiao.startingRelic,relic);local card=get(run,uid);eq(card.upgraded,true);eq(card.deckUid,uid)
 battle.enemies[1].hp=1;local before=C.copy(run);local deck,resource,config=run.deck,battle.xiao,run.candidateLifecycle
 local finish=Run.finishCombat;local reached=false
 Run.finishCombat=function(r)local result=finish(r);reached=true;error('after actual Run reward publication')end
 eq(pcall(Run.play,run,card.uid,1),false);Run.finishCombat=finish;assert(reached);same(run,before);eq(run.combat,battle);eq(run.deck,deck);eq(battle.xiao,resource);eq(run.candidateLifecycle,config)
 assert(Run.play(run,card.uid,1));assert(run.phase~='combat');eq(run.deck[#run.deck].uid,uid);eq(run.deck[#run.deck].upgraded,true)
 assert(Run.leaveCombatRewards(run));assert(Run.startCombat(run,'cultist_solo'));eq(run.combat.xiao.reservedEnergy,0);eq(run.combat.xiao.relicUsed,false);eq(run.combat.player.statuses.xiao_mask,nil);eq(get(run,uid).deckUid,uid)
end
-- An error after real Combat creation is part of the candidate Run-start command.
do
 local run=fresh(false);local before=C.copy(run);local cfg,deck,data=run.candidateLifecycle,run.deck,run.data;local new=C.new;local hit=false
 C.new=function(...)local state=new(...);hit=true;error('after real candidate battle init')end
 eq(pcall(Run.startCombat,run,'cultist_solo'),false);C.new=new;assert(hit);same(run,before);eq(run.candidateLifecycle,cfg);eq(run.deck,deck);eq(run.data,data)
 assert(Run.startCombat(run,'cultist_solo'))
end
print('XIAO_RUN_CANDIDATE_PASS fixed reward UID upgrade cross-battle reset Run.play rollback and start snapshot')
for _,bad in ipairs({'true',1,0,{}})do eq(pcall(Run.new,D,42,{experimental=true,candidateLifecycle={kind='xiao',relicEnabled=bad}}),false)end
-- Actual fixed starter fixture proves paid mask entry and natural owner-end on Run.
for _,relic in ipairs({false,true})do
 local run=fresh(relic);run.deck[1].cardId='xiao_candidate_x04';run.deck[2].cardId='xiao_candidate_x06';run.hp=20
 assert(Run.startCombat(run,'cultist_solo'));local s=run.combat;local entry=get(run,run.deck[1].uid)
 assert(Run.play(run,entry.uid));eq(s.player.hp,18);eq(s.player.statuses.xiao_mask,2);eq(s.xiao.relicUsed,relic)
 assert(Run.endTurn(run));eq(s.player.hp,16);eq(s.player.statuses.xiao_mask,1)
 local exit=get(run,run.deck[2].uid);assert(Run.play(run,exit.uid));eq(s.player.statuses.xiao_mask,nil);eq(s.exhaust[#s.exhaust],exit)
end
print('XIAO_RUN_PAID_MASK_PASS')
