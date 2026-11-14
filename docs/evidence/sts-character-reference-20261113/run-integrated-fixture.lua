-- Offline observations only; production select/browser commands remain unchanged.
local evidenceCreate=M.new
function M.new(root,data,presentation,event,platform)
 local host=evidenceCreate(root,data,presentation,event,platform)
 local scenario='blessing'
 local creations,randomCalls=0,0
 local Run=require('abyss_run');local createRun=Run.new
 Run.new=function(...)creations=creations+1;return createRun(...)end
 for _,module in ipairs({'abyss_sts_random','abyss_randomxs128','abyss_random'})do
  local random=require(module)
  for name,call in pairs(random)do if type(call)=='function' then
   random[name]=function(...)randomCalls=randomCalls+1;return call(...)end
  end end
 end
 host.seed=42
 assert(host:start());assert(host:selectCharacter('traveler'));assert(host:selectElement('ironclad'))
 local initial=require('abyss_combat').copy(host.characterSelection.info)
 local function same(a,b)
  if type(a)~=type(b)then return false end;if type(a)~='table'then return a==b end
  for k,v in pairs(a)do if not same(v,b[k])then return false end end
  for k in pairs(b)do if a[k]==nil then return false end end;return true
 end
 local function audit()
  assert(not host.run and creations==0 and randomCalls==0,'selection/browser created a Run or used RNG')
  assert(same(initial,host.characterSelection.info),'read-only loadout drift')
  local cards=host.deckUI.cards and #host.deckUI.cards or 0
  if host.deckUI.visible then
   assert(host.deckUI.browserShell and not host.deckUI.pileView and host.deckUI.run.readOnlyPreview,'starter did not use the shared read-only browser')
   assert(cards==initial.deckSize,'starter browser dropped cards')
  end
  print('OFFLINE_CHARACTER_BROWSER_AUDIT run=none runCreations=0 randomCalls=0 loadoutDrift=false browser='..tostring(host.deckUI.visible)..' starterCards='..initial.deckSize..' browserCards='..cards)
 end
 local refresh=host.refresh
 host.refresh=function(self,... )local result=refresh(self,...);audit();return result end
 audit()
 print('OFFLINE_STS_CHARACTER_FIXTURE scenario='..scenario..' seed=42 selection-and-shared-browser')
 return host
end
