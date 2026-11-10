-- Offline map subsystem fixture. Uses production generation, permissions,
-- clipping and pointer handling; room completion is explicitly simulated.
local UI=require('abyss_map_ui')
local Map=require('abyss_map')
local Data=require('abyss_data')
local view,map
function OnStart()
 map=Map.generate(Data,42)
 view=UI.new(script.object,map,function(node)return Map.choose(map,node.id)end,Enum.CursorEventType.CursorClick,{cursor=Enum.CursorEventType})
 local w,h=game.GetUICanvasSize();view:resize(w,h)
 script:EnableUpdate(true)
 print('MAP_PREVIEW ready')
end
function OnUpdate(dt)if view then view:update(dt)end end
function MapPreviewContinue()view:setNavigationEnabled(true);view:focusCurrent()end
function MapPreviewVisible(value)view:setVisible(value)end
function MapPreviewScroll(value)view:setScroll(value)end
function MapPreviewAct(act)
 map=Map.generate(Data,42,act)
 view.map=map;view:setNavigationEnabled(true);view:focusCurrent()
end
function MapPreviewStatus()
 return {floor=map.floor,current=map.currentNodeId,path=map.path,scroll=view.scroll,visible=view.visible,slots=view.slots,enabled=view.navigationEnabled,act=map.act}
end
