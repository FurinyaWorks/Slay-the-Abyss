local Detail=require('abyss_node_ui_reward_detail')
local Data=require('abyss_data')
local Theme=require('abyss_theme')
local function control()
 return {visible=false,text='',SetVisible=function(self,value)self.visible=value end}
end
local panel=control();panel.children={}
for _,key in ipairs({'name','description','relatedName','relatedDescription'})do panel.children[key]=control()end
function panel:GetChild(key)return assert(self.children[key],key)end
local action={enabled=true}
local owner={visible=true,run={data=Data,gold=123},map={},view={},actions={eye=action,bell={},cube={}},presentation={}}
local touch=false
local detail=Detail.new(owner,panel,{touchScreen=function()return touch end})
local eye=assert(Detail.related(owner,'snecko_eye'))
assert(eye.name=='混乱' and eye.description:find('0至3',1,true))
assert(eye.description:find('X费',1,true) and eye.description:find('不可打出',1,true))
local bell=assert(Detail.related(owner,'calling_bell'))
assert(bell.name:find('诅咒',1,true) and bell.description:find('无法打出',1,true))
assert(bell.description:find('无法从牌组中移除',1,true))
assert(Detail.related(owner,'runic_cube')==nil)
detail:set('eye','异蛇之眼','战斗开始时获得混乱。',eye)
detail:set('bell','召唤之钟','获得钟之诅咒。',bell)
detail:set('cube','符文立方体','每次失去生命时抽1张牌。')
detail:enter('eye')
assert(panel.visible and panel:GetChild('relatedName').text=='混乱')
assert(panel:GetChild('relatedDescription').text==eye.description)
assert(owner.run.gold==123 and owner.run.data==Data)
detail:enter('bell')
assert(panel:GetChild('relatedName').text==bell.name)
assert(panel:GetChild('relatedDescription').text==bell.description)
detail:enter('cube')
assert(not panel:GetChild('relatedName').visible and not panel:GetChild('relatedDescription').visible)
assert(panel:GetChild('relatedName').text=='' and panel:GetChild('relatedDescription').text=='')
detail:exit('cube');assert(not panel.visible)
-- Touch inspection exposes the same linked definition and consumes its tap.
touch=true;detail:enter('eye');assert(not panel.visible)
detail:down('eye',{touchId=7});detail:update(Theme.layout.statusInfo.delay+.01)
assert(panel.visible and panel:GetChild('relatedDescription').text==eye.description)
assert(not detail:consume('eye',{touchId=8}));assert(detail:consume('eye',{touchId=7}))
assert(not detail:consume('eye',{touchId=7}))
detail:exit('eye')
-- Replacement actions, views and runs cannot reopen stale descriptions.
touch=false;owner.actions.eye={};detail:enter('eye');assert(not panel.visible)
detail:down('bell',{touchId=9});owner.view={};detail:update(1);assert(not panel.visible)
owner.run={data=Data};detail:enter('bell');assert(not panel.visible)
-- Candidate-local content and approved presentation own the wording.
owner.run={data={statuses={statuses={{id='confusion',name='混乱测试',description='当前状态定义'}}},cards=Data.cards}}
assert(Detail.related(owner,'snecko_eye').description=='当前状态定义')
owner.presentation.curse_of_the_bell={name='当前诅咒',text='当前中文牌面'}
assert(Detail.related(owner,'calling_bell').name=='诅咒 · 当前诅咒')
assert(Detail.related(owner,'calling_bell').description=='当前中文牌面')
-- The production list passes associations along with the actual reward row.
local function rowControl()
 local c=control();c.children={}
 function c:GetChild(key)
  self.children[key]=self.children[key] or rowControl();return self.children[key]
 end
 function c:SetAnchoredPosition()end
 function c:SetLocalScale()end
 function c:SetSizeDelta()end
 return c
end
owner.run={data=Data};owner.presentation={};owner.view={}
local treasure=rowControl()
treasure.children.details=panel
local list=require('abyss_node_ui_treasure_list')
list.render({self=owner,node={roomKind='boss_treasure'},details=detail,
 show=function(c,value)c:SetVisible(value)end,state=function()end,picture=function()end,
 relicName=function(id)return id end,relicText=function(id)return id..'说明'end,
 action=function(key)owner.actions[key]={}end},treasure,{
 {id='snecko_eye',kind='relic',available=true,slot=1},
 {id='calling_bell',kind='relic',available=true,slot=2},
 {id='runic_cube',kind='relic',available=true,slot=3},
},true,nil,function()return function()error('inspection must never claim')end end)
detail:enter('treasureView/rewardItem1')
assert(panel:GetChild('relatedDescription').text==eye.description)
detail:enter('treasureView/rewardItem2')
assert(panel:GetChild('relatedDescription').text==bell.description)
detail:enter('treasureView/rewardItem3')
assert(not panel:GetChild('relatedDescription').visible)
print('TREASURE_KEYWORD_DETAILS_PASS')
