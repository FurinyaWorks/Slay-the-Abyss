-- Offline-only startup fixture. Production files and game rules stay intact.
local evidenceCreate=M.new
function M.new(root,data,presentation,event,platform)
 local host=evidenceCreate(root,data,presentation,event,platform)
 local scenario='blessing'
 host.seed=42
 assert(host:start());assert(host:selectCharacter('traveler'))
 assert(host:selectElement('ironclad'));assert(host:confirmCharacter())
 local Nodes,Map=require('abyss_nodes'),require('abyss_map')
 if scenario=='blessing' then
  if not host.run.nodeFlow then assert(Nodes.beginNeow(host.run,host.map,{bossCount=1}))end
 else
  if host.run.nodeFlow and host.run.nodeFlow.roomKind=='neow' then
   assert(host.nodeUI:press('eventView/option1'))
   assert(host.nodeUI:press('eventView/option2'))
   assert(host.nodeUI:press('eventView/option1'))
  end
 end
 -- A sparse three-slot inventory makes empty, fire and ordinary faces visible.
 host.run.potions={[1]='fire_potion',[3]='strength_potion'}
 host.run.deck={}
 for i=1,17 do host.run.deck[i]={uid=200+i,cardId=i%2==0 and 'defend' or 'bash',upgraded=i==1}end
 if scenario=='battle' then
  assert(host.run.phase=='map');local choices=Map.available(host.map)
  local entered,reason=Nodes.enter(host.run,host.map,choices[1].id)
  assert(entered,tostring(reason));assert(host.run.phase=='combat')
 end
 host:refresh()
 print('OFFLINE_SHARED_HUD_FIXTURE scenario='..scenario..' seed=42 sparsePotions=1,3 permanentDeck=17')
 return host
end
