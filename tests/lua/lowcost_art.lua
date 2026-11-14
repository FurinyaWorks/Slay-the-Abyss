local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Art=require('abyss_lowcost_art')
local Theme=require('abyss_theme')
local root=F.Viewport.apply(F.control({children=F.Layout}),1280,720)
local icon=root:GetChild('relicBar'):GetChild('slot1'):GetChild('icon')
local pool=icon.parent:GetChild('iconArt')
local platform={imageSource='static',color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end}
local writes=0
for _,shape in pairs(pool.children)do local set=shape.SetImage;shape.SetImage=function(self,...)writes=writes+1;return set(self,...)end end
local relics=0
for id,asset in pairs(Theme.lowCostArt.relic.assets)do
 assert(Art.paint(icon,'relic',id,42,platform),id)
 assert(pool.visible and not icon.visible)
 for i=0,15 do assert(pool:GetChild('shape'..i).visible==(i<#asset.shapes),id..' stale shape '..i)end
 local before=writes;assert(Art.paint(icon,'relic',id,42,platform));assert(writes==before,'cached shape writes')
 relics=relics+1
end
assert(not Art.paint(icon,'relic','unknown',42,platform));assert(not pool.visible and icon.visible)
local first=pool:GetChild('shape0');local original=first.SetImage
local calls=0;first.SetImage=function()calls=calls+1;return false end
assert(not Art.paint(icon,'relic','calling_bell',42,platform));assert(icon.visible and not pool.visible)
assert(not Art.paint(icon,'relic','calling_bell',42,platform) and calls==1,'failed source must not retry each frame')
first.SetImage=original;Art.hide(icon)
local reentered=false
first.SetImage=function(self,...)
 if not reentered then reentered=true;assert(Art.paint(icon,'relic','runic_cube',42,platform))end
 return original(self,...)
end
assert(not Art.paint(icon,'relic','snecko_eye',42,platform));assert(not pool.visible and icon.visible,'uncertain nested setter must keep a visible fallback')
assert(Art.paint(icon,'relic','runic_cube',42,platform));assert(pool.visible and not icon.visible)
assert(pool:GetChild('shape0').imageId==Theme.lowCostArt.relic.assets.runic_cube.shapes[1].image,'newer owner must repaint after a stale write')
first.SetImage=original
local originalColor=platform.color
Art.hide(icon);local colorNested=false
platform.color=function(...)
 if not colorNested then colorNested=true;assert(Art.paint(icon,'relic','runic_cube',42,platform))end
 return originalColor(...)
end
assert(not Art.paint(icon,'relic','snecko_eye',42,platform))
assert(icon.visible and not pool.visible,'color factory reentry must revoke uncertain pixels')
platform.color=originalColor;assert(Art.paint(icon,'relic','runic_cube',42,platform))
local oldMeta=getmetatable(first);local newMeta={}
for key,value in pairs(oldMeta)do newMeta[key]=value end
local fieldNested=false
newMeta.__newindex=function(control,key,value)
 if key=='imageColor' and not fieldNested then
  fieldNested=true;assert(Art.paint(icon,'relic','calling_bell',42,platform))
 end
 rawset(control,key,value)
end
rawset(first,'imageColor',nil);setmetatable(first,newMeta);Art.hide(icon)
assert(not Art.paint(icon,'relic','snecko_eye',42,platform))
assert(icon.visible and not pool.visible,'native color field reentry must revoke uncertain pixels')
setmetatable(first,oldMeta);assert(Art.paint(icon,'relic','calling_bell',42,platform))
local actor=F.control(F.Templates.AbyssMonsterActor)
local portrait=actor:GetChild('portrait');local enemies=0
for id,asset in pairs(Theme.lowCostArt.enemy.assets)do
 assert(Art.paint(portrait,'enemy',id,160,platform),id)
 Art.pose(actor,3,4,1.1,.9,{r=255,g=255,b=255,a=102},.5,platform)
 local art=actor:GetChild('portraitArt');assert(art.x==3 and art.y==4)
 assert(math.abs(art.localScaleX-1.76)<.001)
 local alpha=art:GetChild('shape0').imageColor.a;assert(alpha==51,'dim/death alpha must reach native art')
 Art.dim(portrait,.4);Art.pose(actor,3,4,1,1,{r=255,g=255,b=255,a=255},.5,platform)
 assert(art:GetChild('shape0').imageColor.a==51,'aim dim must compose with feedback alpha')
 Art.dim(portrait,1)
 enemies=enemies+1
end
local Relics=require('abyss_relic_view_ui')
local view=Relics.new(root:GetChild('relicPanel'),root:GetChild('relicBar'),'click',platform,function()return ''end,function()end,function()end,'map')
for id in pairs(Theme.lowCostArt.relic.assets)do
 local run={data=F.Data,relics={id},phase='map',relicCounters={}}
 view:refreshBar(run,true);assert(pool.visible and not icon.visible,'production bar '..id)
 assert(view:open(run,1));assert(root:GetChild('relicPanel'):GetChild('single'):GetChild('iconArt').visible,'production details '..id)
 view:close()
end
-- Exercise the actual battle renderer and then its independent feedback writer.
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local host,ui,panel,event=H.setup({'strike','strike','strike'},{'cultist','jaw_worm'})
event('card1','down',7);event('card1','drag',7,-300,100)
assert(ui.gesture and ui.gesture.moving and ui.selected,'real drag must be active')
ui:render()
local box=F.actorControl(panel,'enemy1')
local figure=box:GetChild('portraitArt');assert(figure.visible and not box:GetChild('portrait').visible)
assert(figure:GetChild('shape0').imageColor.a==102,'real untargeted enemy art must dim: '..tostring(figure:GetChild('shape0').imageColor.a)..' selected='..tostring(ui.selected)..' busy='..tostring(ui.busy))
ui.feedback:update(.1)
assert(figure:GetChild('shape0').imageColor.a==102,'feedback animation must preserve target dim')
ui.gesture=nil;ui.selected=nil;ui:render()
assert(figure:GetChild('shape0').imageColor.a==255,'leaving target mode restores full art alpha')
Art.pose(box,9,7,1.2,.8,{r=255,g=255,b=255,a=255},.5)
Art.pose(box,11,8,1.3,.7,{r=255,g=255,b=255,a=255},.5)
local poseScale=figure.localScaleX;ui:render()
assert(figure.x==11 and figure.y==8 and figure.localScaleX==poseScale,'ordinary render must preserve the latest feedback pose even with a cached tint')
assert(figure:GetChild('shape0').imageColor.a==127,'ordinary render must preserve death fade alpha')
print('LOWCOST_ART_PASS '..relics..' '..enemies)
