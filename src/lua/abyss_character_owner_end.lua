-- Explicit offline-candidate lifecycle only. No class/menu/catalog registration.
local Act3=require('abyss_act3_powers')
local Resource=require('abyss_keqing_resources')
local M={ownerEndIds={keqing_owner_end_probe=true}}
for id in pairs(Act3.ownerEndIds)do M.ownerEndIds[id]=true end
function M.init(state,option)
 if option==nil then return end
 assert(type(option)=='table'and getmetatable(option)==nil,'invalid candidate lifecycle option')
 for key in pairs(option)do assert(key=='kind'or key=='relicEnabled','unknown candidate lifecycle option')end
 if option.kind=='zhongli'then
  assert(option.relicEnabled==false and not state.originalV4,'Zhongli relic/lifecycle not enabled')
  state.experimentalMechanics=true;state.characterCandidate='zhongli'
  state.zhongliCandidate={battleId='paid-candidate',jade=0,lastOwnerEnd=0}
  for _,id in ipairs({'zl_candidate_pillar','zl_candidate_repair'})do
   state.catalog.statuses[id]={id=id,priority=5,stack='intensity',decay='none',kind='buff'}
  end
  return
 end
 if option.kind=='xiao'then
  assert(type(option.relicEnabled)=='boolean'and not state.originalV4,'invalid Xiao candidate option')
  state.experimentalMechanics=true;state.characterCandidate='xiao'
  state.xiao={relicUsed=false,startingRelic=option.relicEnabled,reservedEnergy=0}
  state.catalog.statuses.xiao_mask={id='xiao_mask',priority=5,kind='buff',stack='intensity',decay='none'}
  return
 end
 if option.kind=='ganyu'then
  assert(type(option.relicEnabled)=='boolean'and not state.originalV4,'invalid Ganyu lifecycle option')
  state.experimentalMechanics=true;state.characterCandidate='ganyu';state.ganyuRelicEnabled=option.relicEnabled
  state.ganyuResource=require('abyss_ganyu_resources').initial()
  return
 end
 assert(option.kind=='keqing'and type(option.relicEnabled)=='boolean'and not state.originalV4,'unsupported candidate lifecycle option')
 state.experimentalMechanics=true;state.characterOwnerEnd='keqing'
 state.keqingResource=Resource.new(option.relicEnabled,{bonusPerHit=2,relicBlock=4})
 state.catalog.statuses.keqing_owner_end_probe={id='keqing_owner_end_probe',kind='buff',stack='none',decay='none',priority=5}
 state.player.statuses.keqing_owner_end_probe=1
 state.player.powerOrder={'keqing_owner_end_probe'}
end
function M.active(state)
 if state.characterOwnerEnd==nil then return false end
 assert(state.characterOwnerEnd=='keqing'and state.experimentalMechanics==true
  and not state.originalV4,'unsupported candidate lifecycle')
 assert(state.player.statuses.keqing_owner_end_probe==1,'missing lifecycle marker')
 return true
end
function M.extension(state)
 if require('abyss_xiao_lifecycle_host').active(state)then return require('abyss_xiao_lifecycle_host')end
 if require('abyss_zhongli_owner_end').active(state)then return require('abyss_zhongli_owner_end')end
 return M.active(state)and M or Act3
end
function M.ownerEndPlan(state,id,amount)
 if id~='keqing_owner_end_probe'then return Act3.ownerEndPlan(state,id,amount)end
 assert(M.active(state)and amount==1,'invalid lifecycle marker')
 return {bottom={{op='keqingOwnerEnd',turn=state.turn}}}
end
function M.apply(state,effect)
 assert(M.active(state)and effect.turn==state.turn,'stale owner-end action')
 assert(state.keqingOwnerEndTurn~=effect.turn,'duplicate owner-end action')
 local nextResource=Resource.ownerEnd(state.keqingResource,effect.turn)
 state.keqingResource=nextResource;state.keqingOwnerEndTurn=effect.turn
 return true
end
return M
