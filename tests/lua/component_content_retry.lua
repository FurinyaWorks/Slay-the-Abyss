local Bridge=require('abyss_component_bridge')
local scaleFailure,positionFailure,imageFailure,sizeFailure=false,false,false,false
local calls={scale=0,position=0,image=0,size=0}
local created={}
local onShow
local function control(name)
    local node={name=name,alive=true,children={},visible=true,anchorMinX=.5,anchorMaxX=.5,sizeDeltaX=100}
    function node:GetChild(key)assert(self.alive);return self.children[key]end
    function node:GetChildren()local list={};for _,child in pairs(self.children)do list[#list+1]=child end;return list end
    function node:SetVisible(value)
        if value and self.name=='menuPanel' and onShow then local callback=onShow;onShow=nil;callback()end
        self.visible=value;return true
    end
    function node:SetAnchorMin()return true end
    function node:SetAnchorMax()return true end
    function node:SetPivot()return true end
    function node:SetLocalRotation()return true end
    function node:SetSizeDelta()calls.size=calls.size+1;return not sizeFailure end
    function node:SetLocalScale()calls.scale=calls.scale+1;return not scaleFailure end
    function node:SetAnchoredPosition()calls.position=calls.position+1;return not positionFailure end
    function node:SetImage(_,id)calls.image=calls.image+1;if imageFailure then return false end;self.imageId=id;return true end
    return node
end
local stage,menu,anchor=control('stage'),control('menuPanel'),control('fill')
stage.children.menuPanel=menu;menu.children.fill=anchor;anchor.children.__kitOriginal=control('__kitOriginal')
local imageSpec={name='fill',kind='image',contentImage={templateId=1,imageId=100001,imageColor=0xffffffff,fill=true}}
local lateAnchor=control('late');lateAnchor.children.__kitOriginal=control('__kitOriginal');menu.children.late=lateAnchor
local lateSpec={name='late',kind='image',contentImage={templateId=1,imageId=100001,imageColor=0xffffffff}}
local publicationAnchor=control('publicationLate');publicationAnchor.children.__kitOriginal=control('__kitOriginal');menu.children.publicationLate=publicationAnchor
local publicationSpec={name='publicationLate',kind='image',contentImage={templateId=1,imageId=100001,imageColor=0xffffffff}}
local bridge=Bridge.new(stage,{schemaVersion=1,root={name='stage',kind='container',children={
    {name='menuPanel',kind='container',children={imageSpec,lateSpec,publicationSpec}}}},templates={},placements={}},{
    instantiate=function()local item=control('image');created[#created+1]=item;return item end,
    destroy=function(item)item.alive=false;return true end,imageSource=7})
local proxy=bridge.root:GetChild('menuPanel'):GetChild('fill')
if not ABYSS_COMPONENT_SETTER_PROBE then assert(#created==0,'reading hidden controls must not create their content')end
proxy.fillAmount=.8;proxy:SetImage(7,100002)
bridge.root:GetChild('menuPanel'):SetVisible(true)
if not ABYSS_COMPONENT_SETTER_PROBE then bridge:step()end
assert(#created==1 and proxy.fillAmount==.8 and proxy.imageId==100002)
local before=calls.scale
scaleFailure=true
assert(not pcall(function()proxy.fillAmount=.5 end))
assert(proxy.fillAmount==.8 and calls.scale==before+1)
scaleFailure=false;proxy.fillAmount=.5
assert(proxy.fillAmount==.5 and calls.scale==before+2,'same-value retry must reach native setter')
positionFailure=true
assert(not pcall(function()proxy.fillAmount=.3 end));assert(proxy.fillAmount==.5)
positionFailure=false;proxy.fillAmount=.3;assert(proxy.fillAmount==.3)
imageFailure=true
assert(not pcall(function()proxy.imageId=100003 end));assert(proxy.imageId==100002)
imageFailure=false;proxy.imageId=100003;assert(proxy.imageId==100003)
sizeFailure=true;before=calls.scale
assert(proxy:SetSizeDelta(80,20)==false and calls.scale==before,'failed geometry must not commit dependent fill')
sizeFailure=false;assert(proxy:SetSizeDelta(80,20)==true and calls.scale==before+1)
if ABYSS_COMPONENT_SETTER_PROBE then print('PASS content setter failure probes');return end
local late=bridge.root:GetChild('menuPanel'):GetChild('late')
late.imageId=100004
assert(#created==2,'first content lookup after READY may initialize once')
assert(bridge:cancelPage('menuPanel'));assert(not created[1].alive)
bridge.root:GetChild('menuPanel'):SetVisible(true);bridge:step()
assert(#created==4 and proxy.fillAmount==.3 and proxy.imageId==100003,'eviction must retain semantic state and rebind native image')
assert(late.imageId==100004 and not created[2].alive,'late wrapped content must retain a rebuild job after eviction')
bridge.root:GetChild('menuPanel'):SetVisible(false)
onShow=function()bridge.root:GetChild('menuPanel'):GetChild('publicationLate').imageId=100005 end
bridge.root:GetChild('menuPanel'):SetVisible(true)
assert(not menu.visible and bridge:pageState('menuPanel')=='preparing' and #created==4,
    'a cached-page native show callback must register new content as hidden pending work')
bridge:step()
assert(menu.visible and #created==5,'late cache-publication content must mount exactly once under the shared budget')
assert(bridge.root:GetChild('menuPanel'):GetChild('publicationLate').imageId==100005)
bridge:onEngineDestroy();assert(not pcall(function()return proxy.imageId end))
print('PASS content setters false/retry, deferred state, eviction and native rebind')
