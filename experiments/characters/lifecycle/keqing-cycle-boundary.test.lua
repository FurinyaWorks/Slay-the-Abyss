package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local M=require('abyss_keqing_cycle_cards');local Pool=require('abyss_card_pool')
for _,id in ipairs({'KQ041','KQ058'})do for _,mode in ipairs({'gainBefore','debuffBefore','damageThenGain','zeroDamage','negativeStrength'})do
 local d=C.copy(D);for _,c in ipairs(M.definitions().cards)do d.cards.cards[#d.cards.cards+1]=c end
 local s=C.new(d,{deck={id,'defend','defend','defend','defend'},enemies={'cultist'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=true}})
 local card;for _,c in ipairs(s.hand)do if c.cardId==id then card=c end end
 local e=s.enemies[1];e.hp=100;e.maxHp=100
 local hit={op='damage',value=mode=='zeroDamage'and 0 or 6};local gain={op='gainStatus',status='strength',value=5}
 local effects={hit};if mode=='gainBefore'then effects={gain,hit}elseif mode=='debuffBefore'then effects={{op='applyStatus',status='vulnerable',value=1},hit}elseif mode=='damageThenGain'then effects={hit,gain}elseif mode=='negativeStrength'then e.statuses.strength=-6 end
 e.intents={{id='public_probe',kind='attack',effects=effects}};e.intentIndex=1
 local before=C.copy(s)
 if mode=='gainBefore'or mode=='debuffBefore'then eq(pcall(C.play,s,card.uid,1),false);same(s,before)
 else assert(C.play(s,card.uid,1));local active=mode=='damageThenGain';eq(s.player.block,id=='KQ041'and active and 5 or 0);eq(e.hp,100-(id=='KQ041'and 4 or(active and 5 or 9)))end
end end
local r=require('abyss_keqing_utility_reward_run').new(D,42);local count=Pool.rewardCount;Pool.rewardCount=function()return 100 end
local before=C.copy(r);local ids=Pool.prepareRewards(r);Pool.rewardCount=count;eq(#ids,26);same(r,before)
for _,id in ipairs(ids)do assert(id~='KQ041'and id~='KQ058'and id~='KQ061')end
print('KEQING_CYCLE_BOUNDARY_PASS 10 ordered/status/zero intent cases; old26 unchanged')
