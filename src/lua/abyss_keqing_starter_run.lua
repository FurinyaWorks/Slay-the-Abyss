-- Explicit offline candidate launcher. No formal character or natural pool registration.
local Copy=require('abyss_copy').copy
local Source=require('abyss_keqing_starter_source')
local Run=require('abyss_run')
local M={}
function M.new(data,seed)
 local d=Copy(data);local known={};for _,card in ipairs(d.cards.cards)do known[card.id]=true end
 for _,card in ipairs(Source.definitions())do
  assert(not known[card.id],'Keqing starter definition collision')
  card.color='keqing_candidate';card.sourceId=card.id;card.reviewStatus='HOLD';card.productionEnabled=false
  d.cards.cards[#d.cards.cards+1]=card
 end
 local deck={};for _,instance in ipairs(Source.deck(false))do deck[#deck+1]=instance.cardId end
 d.cards.starter_deck.cards=deck
 d.rules.player.maxHp=60;d.rules.player.energyPerTurn=3;d.rules.player.drawPerTurn=5;d.rules.player.maxHand=10;d.rules.player.startingRelics={}
 local run=Run.new(d,seed,{experimental=true,candidateLifecycle={kind='keqing',relicEnabled=true}})
 run.keqingStarterExperiment={sourceCommit='89d898c',productionEnabled=false,virtualEquipment=true,relicEffect='first_setup_fixed_block_4'}
 return run
end
return M
