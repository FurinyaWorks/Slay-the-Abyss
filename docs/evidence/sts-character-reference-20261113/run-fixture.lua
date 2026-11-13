-- Offline evidence only: use the production selection commands, never start a Run.
local evidenceCreate=M.new
function M.new(root,data,presentation,event,platform)
 local host=evidenceCreate(root,data,presentation,event,platform)
 local scenario='blessing'
 host.seed=42
 assert(host:start());assert(host:selectCharacter('traveler'));assert(host:selectElement('ironclad'))
 assert(host.characterOpen and not host.run,'selection fixture must not create a run')
 print('OFFLINE_STS_CHARACTER_FIXTURE scenario='..scenario..' seed=42 selection-only')
 return host
end
