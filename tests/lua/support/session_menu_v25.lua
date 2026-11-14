-- JS harness supplies the generated V25 menu layout for this composed fixture.
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Theme=require('abyss_theme')
local spec=require('session_menu_v25_layout')
Theme.presentationProfile='v25-reference'
Theme.layout.v25Menu=spec.frames
local focus
local api={events={Confirm='confirm',Cancel='cancel',Focus='focus'},directions={Left='left',Right='right'},modes={Specified='specified'},
 getFocus=function()return focus end,setFocus=function(c)focus=c end,isController=function()return true end}
local canvas=F.control({children=spec.controls})
local function place(control,definition)
 local p=definition.position or {0,0};control:SetAnchoredPosition(p[1],p[2])
 for _,child in ipairs(definition.children or {})do place(control:GetChild(child.name),child)end
end
place(canvas,{children=spec.controls})
local root=F.Viewport.apply(canvas,1280,720)
local settlements=0
local h=F.GameUI.new(root,F.Data,F.Presentation,'click',{seed=1,prologue=false,controllerApi=api,imageSource='static',
 settle=function()settlements=settlements+1;return true end,
 color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end})
root.ui=h
local function press(panel,name)
 h:update(0);h:syncController()
 local hit=root:GetChild(panel):GetChild(name):GetChild('hit')
 assert(hit.canControllerFocus);focus=hit;return hit.navigationListeners.confirm()
end
local function separated(panel,names)
 for i=1,#names do for j=i+1,#names do
  local a,b=panel:GetChild(names[i]),panel:GetChild(names[j])
  if a.visible and b.visible then
   assert(math.abs(a.y-b.y)>=(a.sizeDeltaY+b.sizeDeltaY)/2,'overlapping menu entries '..names[i]..'/'..names[j])
  end
 end end
end
assert(not root:GetChild('menuPanel'):GetChild('continueRun').visible,'no run has no Continue entry')
assert(F.start(h));assert(press('exitEntry','open'))
separated(root:GetChild('runMenu'),{'resume','help','map','mainMenu','abandon','quit','dismissHint'})
assert(press('runMenu','mainMenu') and h.sessionPaused)
local menu=root:GetChild('menuPanel')
assert(menu:GetChild('continueRun'):GetChild('v25MenuFace'):GetChild('normal').visible)
assert(menu:GetChild('continueRun').visible and menu:GetChild('titleQuit').visible)
separated(menu,{'continueRun','start','titleQuit'})
assert(menu:GetChild('continueRun').x==menu:GetChild('start').x)
assert(menu:GetChild('continueRun').y-menu:GetChild('start').y==menu:GetChild('start').y-menu:GetChild('titleQuit').y)
assert(press('menuPanel','continueRun') and h.mode=='map')
assert(press('exitEntry','open') and press('runMenu','abandon') and press('exitPanel','confirm'))
assert(h.mode=='menu' and not menu:GetChild('continueRun').visible)
-- Minimal title intentionally has no legacy utility/run-menu entry without a
-- run. Its reachable exit is titleQuit, not a forced focus on hidden exitEntry.
assert(not root:GetChild('exitEntry').visible)
assert(press('menuPanel','titleQuit') and h.exitOpen and not h.menuOpen)
assert(not root:GetChild('runMenu').visible)
assert(press('exitPanel','confirm') and settlements==1 and h.settlementRequested)
h:disable()
-- Public native entry: preparation really runs before returning to the title.
local nativeCanvas=F.control({children=spec.controls})
place(nativeCanvas,{children=spec.controls})
local RawGameUI=require('abyss_game_ui')
local native,original=nil,RawGameUI.new
RawGameUI.new=function(...)native=original(...);return native end
script={object=nativeCanvas,GetParam=function()return false end,EnableUpdate=function(self,v)self.updating=v end}
Enum={CursorEventType={CursorClick='click'},ImageSource={StaticReference='static'},Device={Mobile='mobile',Controller='controller',MobileController='mobile-controller'}}
Color=setmetatable({},{__call=function(_,r,g,b,a)return{r=r,g=g,b=b,a=a}end})
local actors=F.monsterActors()
package.loaded.abyss_monster_actor_binding={enabled=true,templateIndex=actors.templateIndex,
 containerTemplateIndex=actors.containerTemplateIndex,powerTemplateIndex=actors.powerTemplateIndex}
local nativeSettlements=0
game={IsTestPlay=function()return false end,GetUICanvasSize=function()return 1280,720 end,
 InstantiateClientUIControl=actors.instantiate,DestroyClientUIControl=actors.destroy,
 GetDevice=function()return 'mobile' end,GetCursorUIPos=function()return 0,0 end,
 ServerSignal=function()return{SendSignal=function()nativeSettlements=nativeSettlements+1 end}end}
local ok,why=pcall(function()dofile('src/lua/abyss_ui.lua');OnStart()end)
RawGameUI.new=original;assert(ok,why)
assert(native,'native captured');assert(script.updating,'native updates enabled');local started,startReason=F.start(native);assert(started,tostring(startReason))
assert(native.prologue and native.prologue:covering(),'native confirmation must retain its real transition')
local function ready()
 for step=0,80 do
  assert(not native.disabled,'native preparation failed')
  local opening=native.prologue:covering()
  local page=native.pageReveal and native.pageReveal:covered()
  if native.run and not opening and not page then return end
  if step<80 then OnUpdate(opening and .05 or 0)end
 end
 error('native session page never became ready')
end
ready()
local nativeRoot=nativeCanvas:GetChild('stage')
local function click(panel,name)
 OnUpdate(0);ready()
 local box=nativeRoot:GetChild(panel):GetChild(name)
 assert(box.visible~=false and nativeRoot:GetChild(panel).visible~=false,'native action hidden')
 return assert(box:GetChild('hit').listeners.click)()
end
local run,map,mode=native.run,native.map,native.mode
assert(click('exitEntry','open') and click('runMenu','mainMenu') and native.sessionPaused)
assert(click('menuPanel','start') and native.navigationAction=='new')
assert(click('exitPanel','cancel') and native.sessionPaused and native.run==run and native.map==map)
assert(not native.prologue:covering(),'cancelled new run must not start another transition')
assert(click('menuPanel','continueRun'));ready()
assert(native.run==run and native.map==map and native.mode==mode and not native.sessionPaused)
assert(nativeSettlements==0,'continue and cancelled new game must not settle the run')
OnDestroy()
print('SESSION_MENU_V25_PASS')
