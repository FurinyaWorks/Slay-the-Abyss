package.path='.artifacts/map-final-game3/generated/?.lua;src/lua/?.lua'
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Run=require('abyss_run')
local View=require('abyss_game_ui_view')
local Theme=require('abyss_theme')
local tree=F.control({children=F.Layout})
local root=tree:GetChild('stage') or tree
local child=function(name)return assert(root:GetChild(name),name)end
local platform={imageSource='static',color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end}
local refresh=View.refreshPotionEntry(child,function()return false end,function()return true end,platform)
local run=Run.new(F.Data,42)
local hit=child('potionEntry'):GetChild('open'):GetChild('hit')
local open=child('potionEntry'):GetChild('open')
local function verify(capacity)
 run.potionSlots=capacity
 run.potions[2]='fire_potion'
 refresh(run,true)
 local centre=-250+math.max(0,capacity-3)*21
 assert(open.x==centre and open.y==338,'map capacity-specific position')
 assert(hit.size[1]==capacity*42 and hit.size[2]==44,'map capacity hit bounds')
 assert(open.x-hit.size[1]/2>-320,'map potion hit overlaps live gold right edge')
 for _,state in ipairs({'normal','hover','pressed','disabled'})do
  local v=hit:GetChild(state)
  assert(not v:GetChild('label').visible,'map caption hidden')
  assert(not v:GetChild('entryFace').visible,'map backing hidden')
  for i=1,5 do
   local slot=v:GetChild('slot'..i)
   assert(slot.visible==(i<=capacity),'capacity visibility')
   if i<=capacity then assert(slot.x==(i-(capacity+1)/2)*42,'slot placement')end
   if i==1 then
    local shell=slot:GetChild('emptyShell')
    assert(open.x+slot.x==-292,'leftmost potion moved toward gold')
    assert(open.x+slot.x-shell.sizeDeltaX*.75/2>-320,'leftmost native potion glyph overlaps gold')
   end
  end
  assert(v:GetChild('slot2'):GetChild('bottle').imageId==Theme.icon.potion.fire_potion,'real sparse potion identity')
 end
 refresh(run,false)
 local p=Theme.layout.nativeNode.topBar.potions
 assert(open.x==p[1] and open.y==p[2],'non-map position restored')
 assert(hit.size[1]==p[3] and hit.size[2]==p[4],'non-map hit bounds restored')
 for _,state in ipairs({'normal','hover','pressed','disabled'})do
  local v=hit:GetChild(state)
  assert(v:GetChild('label').visible,'non-map caption restored')
  assert(v:GetChild('entryFace').visible,'non-map backing restored')
  for i=1,5 do assert(not v:GetChild('slot'..i).visible,'non-map slots hidden')end
 end
end
verify(3);verify(5);verify(3)
print('INDEPENDENT_MAP_POTION_CAPACITY_RESTORE_PASS')

-- New visual feedback must observe the same owner as the real command path.
local Map,MapUI=require('abyss_map'),require('abyss_map_ui')
local cursor={CursorDown='down',CursorUp='up',CursorEnter='enter',CursorExit='exit',CursorDrag='drag',CursorEndDrag='endDrag'}
local event=function(id)return{touchId=id,GetUIPos=function()return 640,200 end}end
local function fixture()
 local raw=F.control({children=require('abyss_map_controls').controls})
 local panel=raw:GetChild('stage'):GetChild('mapPanel')
 local map=Map.generate(F.Data,42)
 local ui=MapUI.new(raw,map,function(node)return Map.choose(map,node.id)end,'click',{imageSource='static',color=platform.color,cursor=cursor})
 return ui,F.mapControl(panel,'node1'):GetChild('hit')
end
for _,kind in ipairs({'up','exit','endDrag','enter'})do
 local ui,n=fixture();n.listeners.down(event(11));local fx=ui.roomFx[ui.slots[1]]
 assert(fx.pressed,'owner press must show feedback')
 n.listeners[kind](event(22))
 assert(fx.pressed,'FOREIGN_'..kind..'_CANCELLED_OWNER_PRESS_FEEDBACK')
 assert(not n.click(event(22)),'foreign click must not commit')
 n.listeners.up(event(11));assert(not fx.pressed,'matching up clears visual press');assert(n.click(event(11)),'owner can still commit')
 print('INDEPENDENT_FOREIGN_'..kind..'_PASS')
end
for _,kind in ipairs({'exit','endDrag'})do
 local ui,n=fixture();n.listeners.down(event(11));local fx=ui.roomFx[ui.slots[1]]
 n.listeners[kind](event(11));assert(not fx.pressed,'owner cancel clears press')
 n.listeners.up(event(11));assert(not n.click(event(11)),'owner cancellation cannot commit')
 print('INDEPENDENT_OWNER_'..kind..'_CANCEL_PASS')
end
local ui,n=fixture();local fx=ui.roomFx[ui.slots[1]]
n.listeners.enter(event());assert(fx.hovered,'mouse hover');n.listeners.exit(event());assert(not fx.hovered,'mouse exit')
n.listeners.down(event(11));ui:setVisible(false);assert(not fx.pressed and not fx.hovered,'hide clears feedback')
print('INDEPENDENT_HOVER_HIDE_PASS')
