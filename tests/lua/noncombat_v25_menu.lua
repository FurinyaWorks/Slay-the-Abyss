local Theme=require('abyss_theme')
Theme.presentationProfile='official-assets-first'
Theme.layout.v25Menu={title={90,105.5,760,353},start={-430,-71,292,44}}
local Menu=require('abyss_game_ui_menu_view')
local V25=require('abyss_v25_menu_view')
local function control(name)
 local n={name=name,visible=true,children={},scaleWrites=0}
 function n:GetChild(key)
  if not self.children[key]then self.children[key]=control(key)end
  return self.children[key]
 end
 function n:SetVisible(v)self.visible=v end
 function n:SetSizeDelta(w,h)self.w,self.h=w,h end
 function n:SetAnchoredPosition(x,y)self.x,self.y=x,y end
 function n:SetLocalScale()self.scaleWrites=self.scaleWrites+1 end
 function n:AddCursorEventListener(event,fn)
  self.listeners=self.listeners or {};assert(not self.listeners[event]);self.listeners[event]=fn
 end
 return n
end
local menu=control('menuPanel')
menu:GetChild('emblem').visible=false
menu:GetChild('vista').visible=false
local owner={mode='menu'}
local ctx=Menu.new(owner,menu,{}, {color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end})
Menu.present(ctx)
local start=menu:GetChild('start')
assert(menu:GetChild('settle'):GetChild('border').visible,'menu must not mutate hidden official settlement surfaces')
assert(start:GetChild('label').text=='开始游戏')
assert(start.x==-430 and start.y==-71)
for _=1,120 do Menu.animate(ctx,1/60)end
assert(menu:GetChild('emblem'):GetChild('glow').scaleWrites==0,'hidden legacy glow must remain idle')
assert(menu:GetChild('vista'):GetChild('seal').scaleWrites==0,'hidden legacy vista must remain idle')
V25.pointer(start,'enter',true)
assert(start:GetChild('v25MenuFace'):GetChild('hover').visible)
V25.pointer(start,'down',true)
assert(start:GetChild('v25MenuFace'):GetChild('pressed').visible)
V25.pointer(start,'up',false)
assert(start:GetChild('v25MenuFace'):GetChild('disabled').visible)
owner.mode='victory'
assert(V25.entrance(ctx)==false,'official result keeps its existing presentation')
assert(V25.settlementFrame(ctx,{1,2})[1]==1)
V25.present(ctx,true)
-- Exercise the real menu binding and its pointer transaction, not direct calls
-- to the presentation adapter alone. Quit only opens the existing exit flow.
local Controller=require('abyss_controller')
Controller.bind=function()end
Controller.pointerBlocked=function()return false end
local Input=require('abyss_game_ui_input')
local root=control('stage');root.children.menuPanel=menu
local cursor={CursorEnter='enter',CursorDown='down',CursorUp='up',CursorExit='exit',CursorEndDrag='endDrag'}
owner.mode='menu';owner.deckUI={};owner.potionUI={}
local exits=0
function owner:openExit()exits=exits+1;self.exitOpen=true;return true end
local binder=Input.bindCommand({cursorEvents=cursor},owner,function()return false end,{},'click',{})
Input.installMenu(owner,function(key)return root:GetChild(key)end,'click',function()end,binder,start,menu:GetChild('settle'),root:GetChild('exitEntry'),root:GetChild('exitPanel'))
local quit=menu:GetChild('titleQuit');local events=quit:GetChild('hit').listeners
assert(events and events.enter and events.click,'official quit must receive the real bindings')
events.enter();assert(quit:GetChild('v25MenuFace'):GetChild('hover').visible)
events.down({touchId=1});assert(quit:GetChild('v25MenuFace'):GetChild('pressed').visible)
events.up({touchId=1});assert(events.click({touchId=1}) and exits==1 and owner.exitOpen)
events.enter();assert(quit:GetChild('v25MenuFace'):GetChild('disabled').visible)
assert(not events.click({touchId=1}) and exits==1,'stale click must not reopen exit')
local SelectionView=require('abyss_character_select_view')
local panel=control('characterPanel')
local selection={character='traveler',element='ironclad',info={name='旅行者·荧',maxHp=80,gold=99,deck={},relics={},deckSize=0}}
function selection:allowsCharacter(id)return id=='traveler'end
function selection:allowsElement(id)return id=='ironclad'end
function selection:canConfirm()return true end
SelectionView.render(panel,selection,{})
local details=panel:GetChild('details')
assert(details:GetChild('stats').text=='生命：80/80' and details:GetChild('gold').text=='金币：99',
    'official selection must retain the approved resource labels')
assert(panel:GetChild('hint').text=='','the approved selection has no extra default helper line')
local initial=panel:GetChild('v25Roster'):GetChild('selected'):GetChild('selectedInitial')
assert(initial.text=='荧','Traveler uses the requested release placeholder')
selection.character='raiden';selection.info.name='雷电将军'
SelectionView.render(panel,selection,{})
assert(initial.text=='雷','another character uses its first complete UTF-8 glyph')
selection.character='traveler';selection.info.name='旅行者·荧'
selection.notice='当前无法开始挑战'
SelectionView.render(panel,selection,{})
assert(panel:GetChild('hint').text==selection.notice,'selection errors must remain readable')
selection.notice=nil
SelectionView.render(panel,selection,{portraits={status=function()return{selection={phase='ready'}}end}})
assert(not details:GetChild('portraits'):GetChild('traveler_ironclad').visible,'native selection must retain ownership over the fallback portrait')
local Run=require('abyss_run')
local Data=require('abyss_data')
ctx.data=Data;owner.exitOpen=false;owner.map={floor=1}
owner.battleUI={feedback={deaths={player=false}}}
for _,phase in ipairs({'victory','defeat'})do
 owner.run=Run.new(Data,1);owner.run.phase=phase;owner.mode=phase
 Menu.present(ctx)
 assert(not menu:GetChild('v25MainMenu').visible and not menu:GetChild('titleQuit').visible)
 assert(not start:GetChild('v25MenuFace').visible and not start:GetChild('label').visible)
 assert(start:GetChild('officialResultLabel').visible and start:GetChild('officialResultLabel').text=='重新启程')
 assert(start:GetChild('plate').visible and start:GetChild('border').visible)
 assert(start.w==Theme.layout.nativeMenu.resultRestart[3] and start:GetChild('hit').w==start.w)
 local title=menu:GetChild('title')
 assert(title.w==Theme.layout.nativeMenu.title[3] and title.fontSize==Theme.font.display)
 assert(menu:GetChild('emblem').visible and menu:GetChild('titleBand').visible)
 assert(not menu:GetChild('vista').visible and not menu:GetChild('heroArt').visible)
 assert(menu:GetChild('settle'):GetChild('border').visible,'official settlement border must survive the menu round trip')
 owner.run=nil;owner.mode='menu';Menu.present(ctx)
 assert(menu:GetChild('v25MainMenu').visible and menu:GetChild('titleQuit').visible)
 assert(start:GetChild('v25MenuFace').visible and start:GetChild('label').visible)
 assert(not start:GetChild('officialResultLabel').visible and not start:GetChild('plate').visible)
 assert(start.x==-430 and start.y==-71 and start.w==292)
 assert(title.w==760 and title.fontSize==64)
 assert(not menu:GetChild('emblem').visible and not menu:GetChild('titleBand').visible)
end
print('NONCOMBAT_V25_MENU_PASS 41')
