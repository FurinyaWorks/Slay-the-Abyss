-- Diagnostic startup only: explicit history input, never account progression.
local evidenceCreate=M.new
function M.new(root,data,presentation,event,platform)
 local scenario='two'
 local History=require('abyss_neow_history');local priorRead=History.read
 History.read=function()return{bossCount=scenario=='four' and 1 or 0,source='offline-explicit-history-fixture'}end
 local host=evidenceCreate(root,data,presentation,event,platform)
 host.seed=42
 assert(host:start());assert(host:selectCharacter('traveler'))
 assert(host:selectElement('ironclad'));assert(host:confirmCharacter())
 History.read=priorRead
 assert(host.run.nodeFlow and host.run.nodeFlow.event.id=='neow')
 host:refresh()
 print('OFFLINE_STS_NEOW_FIXTURE scenario='..scenario..' explicitBossHistory='..(scenario=='four' and 1 or 0))
 return host
end
