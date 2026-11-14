-- Current native host contract; artwork and actor templates use distinct bindings.
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Asset=require('abyss_menu_background_asset')
assert(Asset.renderProfile=='background-budget-v1' and Asset.data.cache==true)
assert(Asset.data.count==#Asset.data.rows and Asset.data.count==4500)
local M={F=F,Asset=Asset}
function M.new()
 Asset.imagePrefabId,Asset.containerPrefabId=987654,987655
 local self={attempts=0,created={},destroyed=0,live=0,updates=false,sceneCreated=0,totalCreated=0}
 self.canvas=F.control({children=F.Layout});self.root=F.Viewport.apply(self.canvas,1280,720)
 self.host=assert(self.root:GetChild('officialBackground'))
 local api=F.monsterActors()
 package.loaded.abyss_monster_actor_binding={enabled=true,templateIndex=api.templateIndex,
  containerTemplateIndex=api.containerTemplateIndex,powerTemplateIndex=api.powerTemplateIndex}
 local function native(c)
  function c:SetActive(v)F.setEngineActive(self,v)end
  return c
 end
 native(self.host)
 for _,name in ipairs({'menuPanel','characterPanel','battlePanel'})do
  native(assert(self.root:GetChild(name):GetChild('lowpolyScene')))
 end
 Enum={ImageSource={StaticReference='static'},ImageType={Stretch='stretch'},CursorEventType={CursorClick='click'},
  Device={Controller='controller',MobileController='mobileController',Mobile='mobile'}}
 Color=setmetatable({FromRGBA=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end},
  {__call=function(_,r,g,b,a)return {r=r,g=g,b=b,a=a}end})
 game={InstantiateClientUIControl=function(index,parent)
  if index==1 or index==2 or index==3 then return api.instantiate(index,parent)end
  assert(index==Asset.imagePrefabId or index==Asset.containerPrefabId,'unknown native template index')
  local backgroundOwned=parent==self.host or parent.backgroundOwned==true
  -- Count/inject failures only for the standalone victory subtree; page scenes
  -- still use their real owner, templates and native lifecycle independently.
  if backgroundOwned then
   self.attempts=self.attempts+1
   if self.failCreate then error('native create diagnostic')end
  else
   assert(parent.name=='lowpolyScene' or parent.sceneOwned,'page artwork must retain its separate subtree')
   self.sceneCreated=self.sceneCreated+1
  end
  local c=native(F.control({name='backgroundPrimitive',kind=index==Asset.imagePrefabId and 'image' or 'container'},parent))
  c.backgroundOwned=backgroundOwned;c.sceneOwned=not backgroundOwned
  if backgroundOwned then self.created[#self.created+1]=c;self.live=self.live+1 end
  self.totalCreated=self.totalCreated+1;parent.children['artPrimitive'..self.totalCreated]=c
  return c
 end,DestroyClientUIControl=function(c)
  assert(c.alive~=false,'double native destroy')
  if c.backgroundOwned and self.failDestroy then error('native destroy diagnostic')end
  if c.backgroundOwned then self.destroyed=self.destroyed+1;self.live=self.live-1 end
  return api.destroy(c)
 end,GetUICanvasSize=function()return 1280,720 end,IsTestPlay=function()return true end,
 GetDevice=function()return 'desktop'end,GetCursorUIPos=function()return 0,0 end}
 script={object=self.canvas,GetParam=function(_,name)assert(name=='nativeBgmEnabled');return false end,
  EnableUpdate=function(_,v)self.updates=v end}
 function self:startEntry()
  local GameUI=require('abyss_game_ui');local original=GameUI.new
  GameUI.new=function(...)self.ui=original(...);return self.ui end
  dofile('src/lua/abyss_ui.lua');OnStart();GameUI.new=original
  assert(self.updates and self.ui,'actual native entry did not start')
 end
 function self:openVictory()
  assert(F.start(self.ui));assert(self.attempts==0,'ordinary play eagerly created artwork')
  for _=1,80 do
   if not self.ui.starting and not self.ui.prologue:covering()and not self.ui.pageReveal:covered()then break end
   OnUpdate(0.05)
  end
  assert(self.ui.run and not self.ui.starting and not self.ui.prologue:covering()and not self.ui.pageReveal:covered(),'native artwork opening did not finish')
  assert(self.sceneCreated>0,'background flag must retain its actual page artwork owner')
  self.ui.run.phase='victory';self.ui.run.nodeFlow={complete=true,result='boss_treasure_complete'};self.ui:refresh()
  assert(self.root:GetChild('menuPanel'):GetChild('result'):GetChild('viewEasterEgg'):GetChild('hit').click())
 end
 function self:engineDestroy()
  api.destroy(self.canvas)
  for _,c in ipairs(self.created)do assert(c.alive==false,'engine left an owned primitive alive')end
  self.live=0
 end
 return self
end
return M
