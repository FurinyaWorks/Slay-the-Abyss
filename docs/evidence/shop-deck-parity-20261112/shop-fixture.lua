-- Offline evidence startup fixture only. Wrapped production GameUI is intact.
local evidenceCreate=M.new
function M.new(root,data,presentation,event,platform)
 local host=evidenceCreate(root,data,presentation,event,platform)
 host.seed=42
 assert(host:start())
 assert(host:selectCharacter('traveler'))
 assert(host:selectElement('ironclad'))
 assert(host:confirmCharacter())
 if host.run.nodeFlow and host.run.nodeFlow.roomKind=='neow' then
  assert(host.nodeUI:press('eventView/option1'))
  assert(host.nodeUI:press('eventView/option2'))
  assert(host.nodeUI:press('eventView/option1'))
 end
 assert(host.mode=='map','fixture opening must finish on map')
 local Map,Nodes=require('abyss_map'),require('abyss_nodes')
 local shop
 while not shop do
  local choices=Map.available(host.map);assert(#choices>0,'canonical shop route missing')
  for _,node in ipairs(choices)do if node.type=='shop'then shop=node;break end end
  if not shop then assert(Map.choose(host.map,choices[1].id))end
 end
 host.run.floor=host.map.floor
 -- Controlled route traversal did not execute the intervening rooms. Retire
 -- the completed opening flow, whose floor-zero owner cannot match this route.
 host.run.nodeFlow=nil
 assert(Nodes.restoreMap(host.run,host.map));host:refresh()
 -- Startup skips route travel; enter canonical shop rules directly. Later map
 -- preview and return are exercised through real headless pointer input.
 local entered,reason=Nodes.enter(host.run,host.map,shop.id)
 assert(entered,'shop choose: '..tostring(reason))
 host:refresh()
 assert(host.mode=='node' and host.run.nodeFlow.type=='shop')
 host.run.deck={}
 for i=1,17 do host.run.deck[i]={uid=200+i,cardId=i%2==0 and 'defend' or 'bash',upgraded=i==1}end
 host:refresh()
 print('OFFLINE_SHOP_FIXTURE seed=42 permanentDeck=17 node='..tostring(shop.id))
 return host
end
