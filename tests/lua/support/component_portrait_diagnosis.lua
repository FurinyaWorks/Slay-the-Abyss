-- H1 diagnosis of the existing full-source portrait. This is an observation,
-- not a claim that the component-kit actor has the same visual identity.
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local asset=require('abyss_traveler_portrait_assets')
assert(asset.battle133.runtimeV2 and #asset.battle133.rows==4315)
local root=F.control({name='stage',kind='container',children={
    {name='battlePanel',kind='container',children={{name='hero',kind='container',children={
        {name='officialFigure',kind='container'},{name='portrait',kind='image'}}}}}}})
local panel=root:GetChild('battlePanel');panel:SetVisible(true)
local figure=panel:GetChild('hero'):GetChild('officialFigure')
panel:GetChild('hero'):SetVisible(true)
figure.SetActive=function(self,value)F.setEngineActive(self,value)end
local images={}
Enum={ImageSource={StaticReference='static'},ImageType={Stretch=2}}
Color={FromRGBA=function(...)return {...}end}
game={InstantiateClientUIControl=function(index,parent)
    local item=F.control({name='diagnosis'..(#images+1),kind=index==41 and 'image' or 'container'},parent)
    item.SetActive=function(self,value)F.setEngineActive(self,value)end
    if index==41 then images[#images+1]=item end
    return item
end,DestroyClientUIControl=function()error('diagnosis must retain the original full-source art')end}
local portraits=require('abyss_traveler_portraits').new(root,nil,{battlePortrait=true})
portraits:sync('battle',false,false,'ironclad')
local firstVisible,firstComplete,partialFrames=nil,nil,0
for frame=1,500 do
    portraits:tick()
    local visible=0
    for _,image in ipairs(images)do if image.visible and image.activeInHierarchy then visible=visible+1 end end
    local phase=portraits:status().battle.phase
    assert(phase~='failed' and phase~='release_failed')
    if visible>0 and not firstVisible then firstVisible=frame end
    if visible>0 and visible<4315 then partialFrames=partialFrames+1 end
    if visible==4315 then firstComplete=frame;break end
end
assert(firstVisible and firstComplete and firstVisible<firstComplete and partialFrames>0,
    'H1 hypothesis was not reproduced; do not report progressive reveal without observation')
print('H1_PORTRAIT_DIAGNOSIS rows=4315 firstVisibleFrame='..firstVisible..' firstCompleteFrame='..firstComplete..' partialFrames='..partialFrames)
print('PASS legacy full-source progressive reveal diagnosis; component-kit visual parity remains unverified')
