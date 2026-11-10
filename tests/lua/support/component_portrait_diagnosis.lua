-- H1 uses the same complete original art for baseline and candidate. The
-- component-kit actor is not substituted for these 4315 original primitives.
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local asset=require('abyss_traveler_portrait_assets')
assert(asset.battle133.runtimeV2 and #asset.battle133.rows==4315)
local root=F.control({name='stage',kind='container',children={
    {name='battlePanel',kind='container',children={{name='hero',kind='container',children={
        {name='officialFigure',kind='container'},{name='portrait',kind='image'}}}}}}})
local panel=root:GetChild('battlePanel');panel:SetVisible(true)
local figure=panel:GetChild('hero'):GetChild('officialFigure')
panel:GetChild('hero'):SetVisible(true)
figure.active=true
figure.SetActive=function(self,value)self.active=value;F.setEngineActive(self,value)end
local images,created,groups,groupCounts={},{},{},{}
Enum={ImageSource={StaticReference='static'},ImageType={Stretch=2}}
Color={FromRGBA=function(...)return {...}end}
game={InstantiateClientUIControl=function(index,parent)
    local item=F.control({name='diagnosis'..(#images+1),kind=index==41 and 'image' or 'container'},parent)
    item.active=true
    item.SetActive=function(self,value)self.active=value;F.setEngineActive(self,value)end
    created[#created+1]=item;item.diagnosisId=#created
    if index==41 then
        images[#images+1]=item
        if not groupCounts[parent]then groups[#groups+1]=parent;groupCounts[parent]=0 end
        groupCounts[parent]=groupCounts[parent]+1
    end
    return item
end,DestroyClientUIControl=function()error('diagnosis must retain the original full-source art')end}
local portraits=require('abyss_traveler_portraits').new(root,nil,{battlePortrait=true})
portraits:sync('battle',false,false,'ironclad')
local firstVisible,firstComplete,partialFrames=nil,nil,0
local resumed=false
local function visibleInHierarchy(control)
    if not control.activeInHierarchy then return false end
    while control do
        if control.visible==false then return false end
        control=control.parent
    end
    return true
end
for frame=1,500 do
    portraits:tick()
    local phase=portraits:status().battle.phase
    if phase=='revealing' and not resumed then
        portraits:sync('map',false,false,'ironclad')
        assert(not figure.visible,'paused portrait must be hidden')
        portraits:sync('battle',false,false,'ironclad');resumed=true
        if ABYSS_EXPECT_ATOMIC then assert(not figure.visible,'resuming reveal must not expose partial art')end
    end
    local visible=0
    -- Every primitive is set visible at creation; active/visible container
    -- boundaries determine publication. Count groups without ignoring the
    -- host's visibility (activeInHierarchy alone observes activation only).
    for _,group in ipairs(groups)do if visibleInHierarchy(group)then visible=visible+groupCounts[group]end end
    assert(phase~='failed' and phase~='release_failed')
    if visible>0 and not firstVisible then firstVisible=frame end
    if visible>0 and visible<4315 then partialFrames=partialFrames+1 end
    if visible==4315 then firstComplete=frame;break end
end
assert(firstVisible and firstComplete and #images==4315 and resumed)
assert(portraits:status().battle.phase=='ready','complete art must become READY')
if ABYSS_EXPECT_ATOMIC then
    assert(firstVisible==firstComplete and partialFrames==0,'candidate must reveal the original complete art atomically')
else
    assert(firstVisible<firstComplete and partialFrames>0,'frozen H1 negative control must expose partial original art')
end
print('H1_PORTRAIT_DIAGNOSIS rows=4315 firstVisibleFrame='..firstVisible..' firstCompleteFrame='..firstComplete..' partialFrames='..partialFrames)
local function valueText(value)
    if type(value)~='table'then return tostring(value)end
    local values={};for _,part in ipairs(value)do values[#values+1]=valueText(part)end
    return '['..table.concat(values,',')..']'
end
print('PORTRAIT_FINAL_STATE_BEGIN')
for _,item in ipairs(created)do
    local values={tostring(item.diagnosisId),tostring(item.parent.diagnosisId or 0)}
    for _,key in ipairs({'kind','imageId','imageType','imageColor','anchorMin','anchorMax','pivot','size',
        'scale','rotation','x','y','visible','active','raised'})do values[#values+1]=valueText(item[key])end
    print(table.concat(values,'|'))
end
print('HOST|'..valueText(figure.scale)..'|'..valueText(figure.rotation)..'|'..valueText(figure.x)..'|'..valueText(figure.y))
print('PORTRAIT_FINAL_STATE_END')
print('PASS same-source portrait reveal; no artwork, count, layout or primitive state reduction')
