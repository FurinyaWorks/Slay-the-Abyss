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
local h=F.GameUI.new(root,F.Data,F.Presentation,'click',{seed=1,prologue=false,controllerApi=api,imageSource='static',
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
assert(F.start(h));assert(press('exitEntry','open'))
separated(root:GetChild('runMenu'),{'resume','help','map','mainMenu','abandon','quit','dismissHint'})
assert(press('runMenu','mainMenu') and h.sessionPaused)
local menu=root:GetChild('menuPanel')
assert(menu:GetChild('continueRun'):GetChild('v25MenuFace'):GetChild('normal').visible)
assert(menu:GetChild('continueRun').visible and menu:GetChild('titleQuit').visible)
separated(menu,{'continueRun','start','titleQuit'})
assert(press('menuPanel','continueRun') and h.mode=='map')
assert(press('exitEntry','open') and press('runMenu','abandon') and press('exitPanel','confirm'))
assert(h.mode=='menu' and not menu:GetChild('continueRun').visible)
assert(press('exitEntry','open'))
separated(root:GetChild('runMenu'),{'resume','help','map','mainMenu','abandon','quit','dismissHint'})
assert(not root:GetChild('runMenu'):GetChild('mainMenu').visible and not root:GetChild('runMenu'):GetChild('quit').visible)
h:disable()
print('SESSION_MENU_V25_PASS')
