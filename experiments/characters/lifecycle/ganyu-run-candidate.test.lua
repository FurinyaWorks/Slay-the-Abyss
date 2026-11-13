package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Run=require('abyss_run');local Native=require('abyss_ganyu_native_cards')
local function fresh(relic)
 local option={experimental=true,candidateLifecycle={kind='ganyu',relicEnabled=relic}}
 local r=Run.new(D,42,option);for _,d in ipairs(Native.definitions().cards)do r.data.cards.cards[#r.data.cards.cards+1]=C.copy(d)end
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
 local run=fresh(relic);assert(Run.startCombat(run,'cultist_solo'));eq(run.combat.characterCandidate,'ganyu');eq(run.combat.ganyuRelicEnabled,relic)
 run.combat.ganyuResource.charge=2;finishFixture(run)
 -- Explicit fixed reward fixture, not registration into natural reward pools.
 run.rewards.cards={'ganyu_lab_01'};run.rewards.cardUpgrades={true};run.rewards.cardResolved=false
 assert(Run.claimCardReward(run,1));local acquired=run.deck[#run.deck];local uid=acquired.uid;eq(acquired.upgraded,true)
 assert(Run.leaveCombatRewards(run));assert(Run.startCombat(run,'cultist_solo'));local battle=run.combat
 eq(battle.ganyuResource.charge,0);eq(battle.ganyuRelicEnabled,relic);local card=get(run,uid);eq(card.upgraded,true);eq(card.deckUid,uid)
 battle.enemies[1].hp=1;local before=C.copy(run);local deck,resource,config=run.deck,battle.ganyuResource,run.candidateLifecycle
 local finish=Run.finishCombat;local reached=false
 Run.finishCombat=function(r)local result=finish(r);reached=true;error('after actual Run reward publication')end
 eq(pcall(Run.play,run,card.uid,1),false);Run.finishCombat=finish;assert(reached);same(run,before);eq(run.combat,battle);eq(run.deck,deck);eq(battle.ganyuResource,resource);eq(run.candidateLifecycle,config)
 assert(Run.play(run,card.uid,1));assert(run.phase~='combat');eq(run.deck[#run.deck].uid,uid);eq(run.deck[#run.deck].upgraded,true)
 assert(Run.leaveCombatRewards(run));assert(Run.startCombat(run,'cultist_solo'));eq(run.combat.ganyuResource.charge,0);eq(get(run,uid).deckUid,uid)
end
-- An error after real Combat creation is part of the candidate Run-start command.
do
 local run=fresh(false);local before=C.copy(run);local cfg,deck,data=run.candidateLifecycle,run.deck,run.data;local new=C.new;local hit=false
 C.new=function(...)local state=new(...);hit=true;error('after real candidate battle init')end
 eq(pcall(Run.startCombat,run,'cultist_solo'),false);C.new=new;assert(hit);same(run,before);eq(run.candidateLifecycle,cfg);eq(run.deck,deck);eq(run.data,data)
 assert(Run.startCombat(run,'cultist_solo'))
end
for _,bad in ipairs({false,'yes',{kind='ganyu',relicEnabled=1},{kind='xiao',relicEnabled=false},{kind='ganyu',relicEnabled=false,other=true}})do
 eq(pcall(Run.new,D,42,{experimental=true,candidateLifecycle=bad}),false)
end
for _,options in ipairs({{candidateLifecycle={kind='ganyu',relicEnabled=false}},{experimental=true,character='ironclad',candidateLifecycle={kind='ganyu',relicEnabled=false}},{experimental=true,campaign=true,campaignProfile='competition-two-act',candidateLifecycle={kind='ganyu',relicEnabled=false}}})do eq(pcall(Run.new,D,42,options),false)end
for _,flag in ipairs({'yes',1,false})do local run=fresh(false);run.experimentalCandidate=flag;local before=C.copy(run);eq(pcall(Run.startCombat,run,'cultist_solo'),false);same(run,before)end
local ordinary=Run.new(D,42);assert(Run.startCombat(ordinary,'cultist_solo'));eq(ordinary.combat.characterCandidate,nil);eq(ordinary.candidateLifecycle,nil)
print('GANYU_RUN_CANDIDATE_PASS acquisition UID upgraded cross-battle reset Run.play reward rollback and start snapshot')
