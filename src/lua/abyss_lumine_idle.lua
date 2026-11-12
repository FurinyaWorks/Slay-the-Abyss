-- Approved source-locked deformation. Static spans live in the shared portrait cache.
local M={}
local SOURCE='32830a9ab3f0b181202205bba59447efe660ce3225ab26f32943c54753a105de'
function M.enabled(data)return data.renderProfile=='approved-idle-v1'end
function M.validate(data)
    assert(data.motion==nil or data.motion=='static','invalid approved idle motion mode')
    assert(data.samplesPerCycle==nil or data.samplesPerCycle==20,'invalid approved idle sampling')
    assert(data.sourceSha256==SOURCE and (data.width==133 or data.width==210)
        and data.height==math.floor(data.width*585/640+.5) and data.period==2.2
        and data.count>0 and data.count<=8192 and #data.rows==data.count
        and #data.bandByRow==data.count and #data.bands<=24,'invalid approved idle candidate')
    local previous=0
    for i,row in ipairs(data.rows)do
        local band=data.bandByRow[i]
        assert(band>=1 and band<=#data.bands and band%1==0 and band>=previous
            and #row==18 and row[1]==100001,'invalid idle band')
        previous=band
    end
end
function M.sample(data,clock)
    local rate=30
    if data.samplesPerCycle then rate=data.samplesPerCycle/data.period end
    local sample=math.floor(clock*rate+1e-9)
    return sample,sample/rate
end
-- Same period, first-order horizontal-band approximation of the approved field.
-- Wind is sampled at the canvas center; this is not a frame-exact GIF replay.
local function field(y,phase)
    if y>=490 then return 0,0 end
    local s=math.max(0,math.min(1,(585-y)/470))
    local weight=s*s*(3-2*s)
    local wind=math.exp(-.5*((320-106)/113)^2-.5*((y-330)/200)^2)
    return (8.8*math.sin(phase)+5.2*math.sin(phase-.58)*wind)*weight,
        (-8.3*(.5-.5*math.cos(phase))+1.7*wind*math.sin(phase-.85))*weight
end
function M.paint(data,pages,clock,idle,write)
    local phase=clock/data.period*math.pi*2
    for index,page in pairs(pages)do
        local y=data.bands[index]
        local dx,dy,scale=0,0,1
        if idle then
            dx,dy=field(y,phase)
            local _,before=field(y-.01,phase)
            local _,after=field(y+.01,phase)
            scale=1+(after-before)/.02
        end
        local factor=data.height/585
        local center=data.height/2-y*factor
        write(page,'SetAnchoredPosition',dx*factor,-dy*factor-(scale-1)*center)
        write(page,'SetLocalScale',1,scale,1)
    end
end
return M
