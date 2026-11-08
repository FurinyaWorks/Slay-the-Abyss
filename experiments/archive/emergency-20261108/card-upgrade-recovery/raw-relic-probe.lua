local C=require('abyss_combat')
local T=require('abyss_warrior_status_cards')
local H=require('abyss_relic_combat_hooks')
assert(getmetatable(C)==nil and getmetatable(T)==nil,'legacy raw API metatables changed')
for _,name in ipairs({'combatBaseCost','validSearingBlowCopy','canUpgrade','upgrade'})do
 assert(type(rawget(C,name))=='function','missing raw Combat '..name)
end
assert(type(rawget(T,'onUpgrade'))=='function','missing raw WarriorStatus onUpgrade')
local fields={};for key,value in next,C do fields[key]=type(value)end
PROBE_GRAPH_WRITE({combat=C,status=T,fields=fields},'complete public raw API',true)
local data=require('abyss_data')
local s=C.new(data,{seed=42,deck={'strike','defend'},enemies={'cultist'},cardRandomSeed='42',shuffleSeed='42'})
s.hand={{cardId='strike',uid=700,upgraded=false},{cardId='defend',uid=701,upgraded=false}}
s.draw={};s.discard={};s.exhaust={}
local original=H.upgradeRandomHand
local calls=0
H.upgradeRandomHand=function(api,state)
 calls=calls+1;assert(api==C and state==s,'real consumer must receive original Combat/state')
 local count=0;for _ in next,api do count=count+1 end
 assert(count==56,'real consumer raw Combat must retain all 56 original fields')
 assert(getmetatable(api)==nil,'real consumer raw Combat must retain nil metatable')
 PROBE_GRAPH_WRITE({api=api,state=state,fields=fields},'real relic caller input',true)
 return original(api,state)
end
require('abyss_card_actions').apply(C,s,{effect={op='relicUpgradeRandomHand'},source=s.player,target=s.player})
H.upgradeRandomHand=original
assert(calls==1,'real effect dispatch must reach relic upgrade callback')
local upgraded=0;for _,card in ipairs(s.hand)do if card.upgraded then upgraded=upgraded+1 end end
assert(upgraded==1,'Warped Tongs upgrades exactly one original hand card')
PROBE_GRAPH_WRITE({api=C,state=s,fields=fields},'real relic upgrade output and RNG',true)
print('RAW_RELIC_REAL_CALLER_PASS 3 complete graph checkpoints')
