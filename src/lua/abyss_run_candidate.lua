-- Explicit experimental Run context; never infers a role from cards or pools.
local M={}
function M.copy(option)
 assert(type(option)=='table'and getmetatable(option)==nil,'invalid run candidate lifecycle')
 for k in pairs(option)do assert(k=='kind'or k=='relicEnabled','unknown run candidate field')end
 assert((option.kind=='ganyu'or option.kind=='xiao'or option.kind=='keqing')and type(option.relicEnabled)=='boolean'
  or option.kind=='zhongli'and option.relicEnabled==false,'unsupported run candidate lifecycle')
 return {kind=option.kind,relicEnabled=option.relicEnabled}
end
function M.initialize(run,options)
 if not options or options.candidateLifecycle==nil then return end
 assert(options.experimental==true and options.character==nil and not run.character
  and run.campaignProfile~='competition-two-act'and not run.data.originalV4Rules
  and not run.data.experimentalCharacter,'incompatible run candidate profile')
 run.candidateLifecycle=M.copy(options.candidateLifecycle)
 run.experimentalCandidate=true
end
function M.forCombat(run)
 if run.candidateLifecycle==nil and run.experimentalCandidate==nil then return nil end
 assert(run.experimentalCandidate==true and not run.character
  and run.campaignProfile~='competition-two-act'and not run.data.originalV4Rules
  and not run.data.experimentalCharacter,'invalid experimental run candidate')
 return M.copy(run.candidateLifecycle)
end
-- Current Zhongli lifecycle is single-actor only. Reject known native population
-- growth instead of admitting a battle that will become unrecoverable after split.
local growingIds={acid_slime_l=true,spike_slime_l=true,slime_boss=true,
 reptomancer=true,gremlin_leader=true,the_collector=true,collector=true,bronze_automaton=true}
local growingOps={reptomancerSummon=true,enemyBronzeSpawn=true,enemyTorchSpawn=true,enemyTorchRevive=true,enemyRally=true}
function M.stableZhongliEnemy(enemy)
 if type(enemy)~='table'then return false end
 if growingIds[enemy.definitionId or enemy.id]then return false end
 local ai=enemy.ai or{}
 if ai.splitEnemy or ai.splitEnemies or ai.splitCount then return false end
 for _,intent in ipairs(enemy.intents or{})do
  if intent.kind=='split'then return false end
  for _,effect in ipairs(intent.effects or{})do if growingOps[effect.op]then return false end end
 end
 return true
end
return M
