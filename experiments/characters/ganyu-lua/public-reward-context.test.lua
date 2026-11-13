-- Author supplements for shared b581688: real reward commands, explicit room fixtures.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local Run=require('abyss_run');local D=require('abyss_data');local F=require('abyss_ganyu_reward_run');local Nodes=require('abyss_nodes');local Pool=require('abyss_card_pool')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;assert(type(b)=='table');for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
for _,question in ipairs({false,true})do
 local r=F.new(D,93);if question then r.relics[#r.relics+1]='question_card'end
 r.floor=16;assert(Run.startCombat(r,'boss_guardian'));eq(r.encounterTier,'boss')
 for _,e in ipairs(r.combat.enemies)do C.damage(r.combat,r.combat.player,e,999,true)end
 assert(Run.finishCombat(r));eq(#r.rewards.cards,1);eq(r.rewards.cards[1],'ganyu_lab_05');eq(r.rewards.cardUpgrades[1],false)
 local uid=r.nextDeckUid;assert(Run.claimCardReward(r,1));eq(r.deck[#r.deck].uid,uid);eq(r.deck[#r.deck].cardId,'ganyu_lab_05')
end
-- Prior boss does not leak boss rarity into Dream Catcher rest. Node state is a deliberate fixture.
local r=F.new(D,94);r.relics[#r.relics+1]='dream_catcher';r.encounterTier='boss';r.phase='node';r.nodeFlow={type='camp',complete=false,upgradesLeft=1};r.hp=20
local old=Pool.prepareRewards;local calls=0
Pool.prepareRewards=function(owner)calls=calls+1;eq(owner.encounterTier,'normal');eq(owner.candidateRewardPool,'ganyu-reviewed-32-v1');return old(owner)end
assert(Nodes.rest(r));Pool.prepareRewards=old;eq(calls,1);local offer=r.nodeFlow.restReward;assert(offer and #offer.cards>0)
for _,id in ipairs(offer.cards)do assert(id:match('^ganyu_lab_'));assert(id~='ganyu_lab_01' and id~='ganyu_lab_02')end
local id=offer.cards[1];local up=offer.cardUpgrades[1]==true;local uid=r.nextDeckUid;assert(Nodes.claimRestReward(r,1));eq(r.deck[#r.deck].uid,uid);eq(r.deck[#r.deck].cardId,id);eq(r.deck[#r.deck].upgraded,up)
-- Failure after rest sampling rolls back the heal, camp choice, RNG, and live references.
local x=F.new(D,95);x.relics[#x.relics+1]='dream_catcher';x.phase='node';x.nodeFlow={type='camp',complete=false,upgradesLeft=1};x.hp=20
local before=C.copy(x);local flow,rng=x.nodeFlow,x.cardRng
local reached=false;Pool.prepareRewards=function(owner)old(owner);reached=true;error('author_after_rest_sample')end
local ok,err=Nodes.rest(x);Pool.prepareRewards=old;assert(reached);eq(ok,false);eq(err,'transaction_failed');same(x,before);assert(x.nodeFlow==flow and x.cardRng==rng);assert(Nodes.rest(x))
print('AUTHOR_REWARD_CONTEXT_PASS 2 real boss-short claims + rest normal-context claim + post-sample rest rollback/retry; controlled boss victories/node fixtures')
