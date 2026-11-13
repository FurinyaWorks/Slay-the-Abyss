-- Explicit experimental Run context; never infers a role from cards or pools.
local M={}
function M.copy(option)
 assert(type(option)=='table'and getmetatable(option)==nil,'invalid run candidate lifecycle')
 for k in pairs(option)do assert(k=='kind'or k=='relicEnabled','unknown run candidate field')end
 assert(option.kind=='ganyu'and type(option.relicEnabled)=='boolean'
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
return M
