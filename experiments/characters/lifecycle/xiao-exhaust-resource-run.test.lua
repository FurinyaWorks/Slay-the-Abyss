package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,Run,D,eq,same=H.C,H.Run,H.Data,H.eq,H.same
local F=require('abyss_xiao_exhaust_reward_run');local Pool=require('abyss_card_pool')
local allowed={};for _,d in ipairs(require('abyss_xiao_exhaust_reward_catalog').definitions())do allowed[d.id]=true end
local function victory(seed)
 local r=F.new(D,seed);assert(Run.startCombat(r,'cultist_solo'));C.damage(r.combat,r.combat.player,r.combat.enemies[1],999,true);return r
end
local old=Pool.prepareRewards
for _,mode in ipairs({'afterSample','empty','prismatic','drift'})do
 local r=victory(42);local count=Pool.rewardCount;local definition
 if mode=='empty'then Pool.rewardCount=function()return 0 end elseif mode=='prismatic'then r.relics[#r.relics+1]='prismatic_shard'elseif mode=='drift'then for _,d in ipairs(r.data.cards.cards)do if d.id=='xiao_candidate_x22'then definition=d;d.runNativeABI=true end end
 else Pool.prepareRewards=function(owner)local a,b,c,d=old(owner);error('after real Xiao sample')end end
 local b=C.copy(r);local combat,deck,rng=r.combat,r.deck,r.cardRng
 assert(not pcall(Run.finishCombat,r));same(r,b);assert(r.combat==combat and r.deck==deck and r.cardRng==rng)
 Pool.prepareRewards=old;Pool.rewardCount=count;if mode=='prismatic'then table.remove(r.relics)elseif mode=='drift'then definition.runNativeABI=nil end;assert(Run.finishCombat(r))
end
local seen={};local beforeData=C.copy(D)
for seed=42,53 do
 local r=victory(seed);local ids,rng,offset,ups=Pool.prepareRewards(r);local before=C.copy(r);local ids2,rng2,offset2,ups2=Pool.prepareRewards(r);same(r,before);same(ids,ids2);same(rng,rng2);same(ups,ups2);eq(offset,offset2)
 assert(Run.finishCombat(r));same(Run.rewardOptions(r),ids);same(r.cardRng,rng);eq(r.cardRarityOffset,offset);same(r.rewards.cardUpgrades,ups)
 local unique={};for _,id in ipairs(ids)do assert(allowed[id]and not unique[id]);unique[id]=true;seen[id]=true end
 local id,up,uid=ids[1],r.rewards.cardUpgrades[1],r.nextDeckUid
 assert(Run.leaveCombatRewards(r));assert(Run.reopenCombatRewards(r));same(Run.rewardOptions(r),ids)
 -- Real obtain completed before a fault: claim's outer transaction restores the exact graph.
 local obtain=Run.obtainCard;local reached=false;local b=C.copy(r);local deck,flow,rewards=r.deck,r.nodeFlow,r.rewards
 Run.obtainCard=function(...)local result=obtain(...);reached=true;error('after actual reward obtain')end
 local ok,result,reason=pcall(Run.claimCardReward,r,1);Run.obtainCard=obtain;assert(ok and result==false and reason=='transaction_failed');assert(reached);same(r,b);assert(r.deck==deck and r.nodeFlow==flow and r.rewards==rewards)
 local claimRng=C.copy(r.cardRng);assert(Run.claimCardReward(r,1));same(r.cardRng,claimRng);local permanent=r.deck[#r.deck];eq(permanent.uid,uid);eq(permanent.cardId,id);eq(permanent.upgraded,up)
 b=C.copy(r);eq(Run.claimCardReward(r,1),false);same(r,b)
 assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'));local s=r.combat;local card
 for _,pile in ipairs({s.hand,s.draw,s.discard})do for i,v in ipairs(pile)do if v.deckUid==uid then card=table.remove(pile,i);break end end;if card then break end end
 assert(card);s.hand[#s.hand+1]=card;s.energy=10;s.enemies[1].hp=100;s.enemies[1].maxHp=100
 assert(Run.play(r,card.uid,1));local found=false;for _,pile in ipairs({s.discard,s.exhaust})do for _,v in ipairs(pile)do if v==card then found=true end end end;assert(found)
end
local r=victory(77);assert(Run.finishCombat(r));local b=C.copy(r.deck);assert(Run.claimCardReward(r,0));same(r.deck,b)
r=F.new(D,42);r.encounterTier='boss';local boss=Pool.prepareRewards(r);eq(#boss,2);assert(boss[1]~=boss[2]);for _,id in ipairs(boss)do assert(id=='xiao_candidate_x17'or id=='xiao_candidate_x18')end
same(D,beforeData);local n=0;for _ in pairs(seen)do n=n+1 end
print('XIAO_EXHAUST_GENERATED_REWARD_RUN_PASS 12 actual sampled claim/UID/paid; '..n..' observed IDs; controlled victory/hand/energy fixtures')
print('XIAO_EXHAUST_REWARD_RUN_TRANSACTION_PASS settlement/claim/skip/RNG/domain/bossRareShort')
