-- Explicit source starter. Jade starts at3; jade damage absorption is NOT implemented.
local Copy=require('abyss_copy').copy
local Source=require('abyss_zhongli_starter_source')
local M={}
function M.new(data,seed,...)
 assert(select('#',...)==0,'Zhongli starter accepts no external configuration')
 local d=Copy(data);local known={};for _,c in ipairs(d.cards.cards)do known[c.id]=true end
 for _,c in ipairs(Source.definitions())do assert(not known[c.id],'Zhongli starter definition collision');d.cards.cards[#d.cards.cards+1]=c end
 d.cards.starter_deck.cards=Source.deck()
 d.rules.player.maxHp=60;d.rules.player.energyPerTurn=3;d.rules.player.drawPerTurn=5;d.rules.player.maxHand=10;d.rules.player.startingRelics={}
 local run=require('abyss_run').new(d,seed,{experimental=true,candidateLifecycle={kind='zhongli',relicEnabled=true}})
 run.zhongliStarterExperiment={sourceVersion=Source.sourceVersion,modelSHA256=Source.modelSHA256,battleSHA256=Source.battleSHA256,
  productionEnabled=false,virtualEquipment=true,battleStartJade=3,damageAbsorptionEnabled=false}
 return run
end
return M
