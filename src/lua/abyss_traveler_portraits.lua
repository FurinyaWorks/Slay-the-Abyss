--[=[
MIT License

Copyright (c) 2026 LiuL

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
]=]
-- Two frozen Lumine hosts only. No rules, timers, fitting or original OnStart.
-- Property order follows Primitive's MIT runtime, copyright 2026 LiuL.
local M = {}
local owners = setmetatable({}, {__mode='k'})
local CANCELLED = {}
local function integer(n) return type(n)=='number' and n>0 and n<math.huge and n%1==0 end
local function compactProfile(data)
    return data.renderProfile=='compact-v1' or data.renderProfile=='bounded-2d-v1'
end
local function digest(value)
    return type(value)=='string' and #value==64 and value:match('^[a-f0-9]+$')~=nil
end
local function validateBounded(data,width)
    assert(data.width==width and integer(data.count) and data.count<=60 and #data.rows==data.count
        and digest(data.sourceSha256) and digest(data.jsonSha256),'unexpected bounded portrait data')
end
-- Breakthrough low-poly rows: 20 fields, official primitive/sprite IDs, rotX/rotY squash.
local function lowpoly(data)
    return type(data)=='table' and data.renderProfile=='lowpoly-v1' and integer(data.width) and integer(data.height)
        and integer(data.count) and data.count<=2304 and #data.rows==data.count and type(data.jsonSha256)=='string'
end
local function validate(data, width, count, source, json)
    assert(type(data)=='table','unexpected portrait data')
    if data.renderProfile=='bounded-2d-v1' then validateBounded(data,width)
    else
        local compact=compactProfile(data) or data.renderProfile=='selection-budget-v1'
        local expected=compact and data.count or count
        assert(data.width==width and expected>0 and expected<=(compact and 2304 or count) and #data.rows==expected
            and data.sourceSha256==source and data.jsonSha256==json,'unexpected frozen portrait data')
    end
    local r=data.root
    assert(#r==13 and r[1]==0 and r[2]==0 and r[3]==width and r[4]==width and r[5]==.5 and r[6]==.5
        and r[7]==.5 and r[8]==.5 and r[9]==.5 and r[10]==.5 and r[11]==1 and r[12]==1 and r[13]==0,'unexpected portrait ROOT')
end
local function v25Profile(asset)
    local profile=asset.v25PortraitProfile
    if profile==nil then return nil end
    assert(type(profile)=='table' and profile.schemaVersion==1
        and profile.sourceSha256=='4851e4aae6c43799ec31e2b2ebd06f9b00cf07161f26e71d72a6ec89191ad98e'
        and profile.battleDisplay==210 and profile.selectionDisplay==1380,'unexpected V25 portrait profile')
    local fields={schemaVersion=true,sourceSha256=true,battleDisplay=true,selectionDisplay=true,battlePosition=true,selectionPosition=true}
    for key in pairs(profile)do assert(fields[key],'unexpected V25 portrait field')end
    for _,name in ipairs({'battlePosition','selectionPosition'})do
        local position=profile[name]
        assert(type(position)=='table' and #position==2,'unexpected V25 portrait position')
        for _,value in ipairs(position)do
            assert(type(value)=='number' and value==value and math.abs(value)<math.huge,'invalid V25 portrait coordinate')
        end
    end
    local drawing=asset.battle133
    assert(type(drawing)=='table' and drawing.renderProfile~='bounded-2d-v1'
        and drawing.renderProfile~='lowpoly-v1','V25 requires the frozen full-body drawing')
    validate(drawing,133,4315,'ae2161957033d688b1bed1c7ab2ad2891d5f7bf5e34b291f9ecaef7cfa11f880','f8a7af7b079aa5bbb7e16b502b222f1fd7dbfaa2c30f6eef1bf0d76af0a0a248')
    return profile
end
local function controller(host, data, display, templates, options)
    local Asset=templates or require('abyss_traveler_portrait_assets')
    local retryFailedOnPause=type(options)=='table' and options.retryFailedOnPause==true
    local nativeLifecycle=type(options)=='table' and options.nativeLifecycle==true
    local ownerEpoch=type(options)=='table' and options.ownerEpoch or function()return 0 end
    local rotation=type(options)=='table' and options.rotation or 0
    local tint=type(options)=='table' and options.tint
    local base=type(options)=='table' and options.position or nil
    if base then base={base[1],base[2]}end
    assert(host,'missing dedicated portrait host')
    local self,created={},{}
    local phase,generation,nextIndex='idle',0,1
    local page,group,pageIndex,groupIndex=nil,nil,0,0
    local revealGroups,revealIndex,revealedPages={},1,{}
    local working,pending,hiding=false,false,false
    local reason,cleanupFailures=nil,0
    local activationEpoch,nativePaused=0,nil
    local function current(token)return (phase=='building' or phase=='revealing') and generation==token and host.alive~=false end
    local function check(token)if not current(token)then error(CANCELLED,0)end end
    local function hide()
        if phase=='destroyed' or host.alive==false or hiding then return true end
        hiding=true;local ok,result=pcall(host.SetVisible,host,false);hiding=false
        if not ok or result==false then reason=ok and 'host hide rejected' or tostring(result);return false end
        return true
    end
    local function cleanup()
        local old,retained,blocked=created,{},{};created={};cleanupFailures=0
        for i=#old,1,-1 do
            if phase=='destroyed'then created={};return true end
            local node=old[i];local c=node.control
            if c.alive~=false then
                local ok,result=true,true
                if not blocked[c]then ok,result=pcall(game.DestroyClientUIControl,c)end
                if blocked[c] or not ok or result==false then
                    if not blocked[c]then cleanupFailures=cleanupFailures+1;reason=ok and 'destroy rejected' or tostring(result)end
                    if c.alive~=false then retained[#retained+1]=node;blocked[node.parent]=true end
                end
            end
        end
        for i=#retained,1,-1 do created[#created+1]=retained[i]end
        pending=false
        if #created>0 then phase='release_failed';return false end
        return cleanupFailures==0
    end
    local function fail(err)
        if phase=='destroyed'then created={};return end
        phase='failed';generation=generation+1;reason=tostring(err);hide();cleanup()
    end
    -- Official ClientUIBaseControl: active/visible are read-only observations;
    -- SetActive also gates attached scripts. These slots carry no root script.
    -- Only V25 opts into checked boundary transitions; old profiles keep their
    -- original setter ordering. Paused cache is retained, never called released.
    local function nativeTransition(active,visible,reset)
        activationEpoch=activationEpoch+1
        local ticket,revision,stage,owner=activationEpoch,generation,phase,ownerEpoch()
        local function valid()
            if host.alive==false or generation~=revision or phase~=stage or ownerEpoch()~=owner
                or activationEpoch~=ticket then error(CANCELLED,0)end
        end
        local function set(method,property,wanted)
            local setter=host[method];valid()
            assert(type(setter)=='function','V25 portrait native method unavailable: '..method)
            local actual=host[property];valid()
            assert(type(actual)=='boolean','V25 portrait native readback unavailable: '..property)
            if actual~=wanted then assert(setter(host,wanted)~=false,'V25 portrait native setter rejected: '..method);valid()end
            assert(host[property]==wanted,'V25 portrait native readback mismatch: '..property);valid()
        end
        assert(type(host.active)=='boolean','V25 portrait native active unavailable');valid()
        if not active then set('SetVisible','visible',false)end
        set('SetActive','active',active)
        if reset and base then
            assert(host:SetAnchoredPosition(base[1],base[2])~=false,'V25 portrait reset position rejected');valid()
            assert(host:SetLocalScale(display/data.width,display/data.width,1)~=false,'V25 portrait reset scale rejected');valid()
        end
        if reset and type(options)=='table' and options.rotation~=nil then
            assert(host:SetLocalRotation(0,0,rotation)~=false,'V25 portrait reset rotation rejected');valid()
        end
        set('SetVisible','visible',visible);valid()
        nativePaused=not active
    end
    local function reconcileCancellation()
        if phase=='released' and host.alive~=false then
            -- The old native setter may finish after a synchronous release.
            -- Read back/deactivate only the still-live released decoration.
            hide()
            if nativeLifecycle then pcall(nativeTransition,false,false,false)end
        end
    end
    local function transition(active,visible,reset)
        local wasWorking=working;working=true
        local ok,err=pcall(nativeTransition,active,visible,reset)
        if not ok then
            if err~=CANCELLED then fail(err)
            else reconcileCancellation()end
        end
        if pending and not wasWorking then cleanup()end
        working=wasWorking
        return ok
    end
    local function call(token,c,name,...)
        check(token);assert(type(c[name])=='function','missing native method '..name)
        assert(c[name](c,...)~=false,'native method rejected '..name);check(token)
    end
    local function transform(token,c)
        call(token,c,'SetAnchorMin',.5,.5);call(token,c,'SetAnchorMax',.5,.5);call(token,c,'SetPivot',.5,.5)
        call(token,c,'SetSizeDelta',data.width,data.height or data.width);call(token,c,'SetLocalScale',1,1,1)
        call(token,c,'SetLocalRotation',0,0,0);call(token,c,'SetAnchoredPosition',0,0)
    end
    local function create(token,prefab,parent)
        local c=game.InstantiateClientUIControl(prefab,parent)
        if c then created[#created+1]={control=c,parent=parent}end
        check(token);assert(c,'portrait template unavailable');call(token,c,'SetVisible',false)
        return c
    end
    local function rowColour(r)
        if not tint then return Color.FromRGBA(r[15],r[16],r[17],r[18])end
        local luminance=.2126*r[15]+.7152*r[16]+.0722*r[17]
        local function channel(value)return math.floor((luminance+(value-luminance)*tint.saturation)*tint.brightness+.5)end
        return Color.FromRGBA(channel(r[15]),channel(r[16]),channel(r[17]),math.floor(r[18]*tint.opacity+.5))
    end
    local function image(token,c,r)
        local tri=data.renderProfile=='lowpoly-v1'
        assert(tri and #r==20 and integer(r[1]) or #r==18 and r[1]==100001,'unexpected portrait image row')
        if compactProfile(data) or data.rectanglesOnly then
            -- Shared template supplies the white image and identity transforms.
            -- Basic shape 100001 has no imageType field. Its rectangle is sized
            -- directly; gallery nine-slice modes do not apply to this resource.
            call(token,c,'SetSizeDelta',r[4],r[5]);call(token,c,'SetAnchoredPosition',r[2],r[3])
            c.imageColor=rowColour(r);check(token)
            call(token,c,'SetVisible',true);return
        end
        call(token,c,'SetImage',Enum.ImageSource.StaticReference,r[1])
        if r[1]<100001 or r[1]>100006 then
            c.imageType=Enum.ImageType.Stretch;check(token);assert(c.imageType==Enum.ImageType.Stretch,'imageType rejected')
        end
        call(token,c,'SetAnchorMin',r[8],r[9]);call(token,c,'SetAnchorMax',r[10],r[11]);call(token,c,'SetPivot',r[6],r[7])
        call(token,c,'SetSizeDelta',r[4],r[5]);call(token,c,'SetLocalScale',r[12],r[13],1)
        call(token,c,'SetLocalRotation',tri and r[19] or 0,tri and r[20] or 0,r[14]);call(token,c,'SetAnchoredPosition',r[2],r[3])
        c.imageColor=rowColour(r);check(token)
        call(token,c,'SetAsLastSibling');call(token,c,'SetActive',true);call(token,c,'SetVisible',true)
    end
    function self.status(_)
        local nativeActive,known
        if nativeLifecycle then
            local ok,value=pcall(function()if host.alive~=false then return host.active end end)
            known=ok and type(value)=='boolean'
            if known then nativeActive=value end
        end
        return {phase=phase,generation=generation,nextIndex=nextIndex,total=#data.rows,owned=#created,
            retained=phase=='release_failed' and #created or 0,reason=reason,cleanupFailures=cleanupFailures,
            nativeActive=nativeActive,nativeStateKnown=known,nativePaused=nativePaused}
    end
    function self.begin(_)
        if working or phase=='destroyed' or phase=='failed' or phase=='release_failed'then return false end
        if host.alive==false then self:destroy();return false end
        if phase=='building' or phase=='revealing' or phase=='ready'then
            if nativeLifecycle then return transition(true,phase=='ready',true)end
            if data.cache or compactProfile(data) then host:SetActive(true);host:SetVisible(phase=='ready')end
            if base then self:pose(0,0,1,1)end
            return true
        end
        if not integer(Asset.imagePrefabId) or not integer(Asset.containerPrefabId)
            or Asset.imagePrefabId==100001 or Asset.containerPrefabId==100001 then fail('unbound portrait templateIndex');return false end
        generation=generation+1;phase='building';nextIndex=1;pageIndex=0;groupIndex=0;page=nil;group=nil;reason=nil
        revealGroups={};revealIndex=1;revealedPages={}
        local token=generation;working=true
        local ok,err=pcall(function()
            if nativeLifecycle then nativeTransition(true,false,false)
            else call(token,host,'SetVisible',false);call(token,host,'SetActive',true)end
            call(token,host,'SetAnchorMin',.5,.5);call(token,host,'SetAnchorMax',.5,.5);call(token,host,'SetPivot',.5,.5)
            call(token,host,'SetSizeDelta',data.width,data.height or data.width)
            call(token,host,'SetLocalScale',display/data.width,display/data.width,1);call(token,host,'SetLocalRotation',0,0,rotation)
            if base then call(token,host,'SetAnchoredPosition',base[1],base[2])end
            -- Keep the dedicated slot position; never import ROOT offsets into the shared hero/button.
        end)
        if not ok then
            if err~=CANCELLED then fail(err)elseif nativeLifecycle then reconcileCancellation()end
        end
        if pending then cleanup()end;working=false
        return ok and current(token)
    end
    -- Exactly one native creation attempt. The owner shares 64 across BOTH hosts.
    function self.step(_)
        if host.alive==false then self:destroy()end
        if working or (phase~='building' and phase~='revealing')then return false end
        local token=generation;working=true
        if phase=='revealing' then
            local ok,err=pcall(function()
                for _=1,4 do
                    local entry=revealGroups[revealIndex]
                    if not entry then break end
                    if not revealedPages[entry.page] then
                        call(token,entry.page,'SetVisible',true);call(token,entry.page,'SetActive',true);revealedPages[entry.page]=true
                    end
                    call(token,entry.control,'SetVisible',true);call(token,entry.control,'SetActive',true)
                    revealIndex=revealIndex+1
                end
                if revealIndex>#revealGroups then call(token,host,'SetVisible',true);phase='ready'end
            end)
            if not ok then
                if err~=CANCELLED then fail(err)else reconcileCancellation()end
            end
            if pending then cleanup()end;working=false;return ok,'reveal'
        end
        local ok,err=pcall(function()
            local p=math.floor((nextIndex-1)/3600)+1;local g=math.floor((nextIndex-1)/60)+1
            if pageIndex~=p then
                page=create(token,Asset.containerPrefabId,host);transform(token,page);pageIndex=p
                call(token,page,'SetActive',not data.runtimeV2);call(token,page,'SetVisible',not data.runtimeV2)
            elseif groupIndex~=g then
                group=create(token,Asset.containerPrefabId,page);transform(token,group);groupIndex=g
                call(token,group,'SetActive',not data.runtimeV2);call(token,group,'SetVisible',not data.runtimeV2)
                if data.runtimeV2 then revealGroups[#revealGroups+1]={control=group,page=page}end
            else
                local c=create(token,Asset.imagePrefabId,group);image(token,c,data.rows[nextIndex]);nextIndex=nextIndex+1
                if nextIndex>#data.rows then
                    if data.runtimeV2 then phase='revealing'
                    else call(token,host,'SetVisible',true);phase='ready'end
                end
            end
        end)
        if not ok and err~=CANCELLED then fail(err)end
        if phase=='destroyed'then created={} elseif pending then cleanup()end
        working=false;return true
    end
    function self.pause(_)
        -- Only the battle portrait opts into scene-boundary failure recovery.
        -- Other cached adapters retain their explicit-release retry policy.
        if retryFailedOnPause and (phase=='failed' or phase=='release_failed')then return self:release()end
        if not data.cache and not compactProfile(data) then return self:release()end
        if phase=='destroyed' or host.alive==false then return false end
        if nativeLifecycle then return transition(false,false,false)end
        host:SetVisible(false);host:SetActive(false);return true
    end
    function self.release(_)
        if phase=='destroyed'then return true end
        if pending then return true end
        local wasWorking=working;working=true;generation=generation+1;phase='released';pending=true
        local hidden=hide();if wasWorking then return hidden end
        local cleaned=cleanup();working=false;return hidden and cleaned
    end
    function self.pose(_,x,y,sx,sy)
        if host.alive==false then self:destroy();return end
        if working or (phase~='building' and phase~='ready')then return end
        working=true
        local ok,err=pcall(function()
            assert(host:SetAnchoredPosition(x+(base and base[1] or 0),y+(base and base[2] or 0))~=false,'portrait pose rejected')
            if host.alive==false then self:destroy();return end
            if phase=='building' or phase=='ready'then assert(host:SetLocalScale(sx*display/data.width,sy*display/data.width,1)~=false,'portrait scale rejected')end
        end)
        if not ok then fail(err)end
        if phase=='destroyed'then created={} elseif pending then cleanup()end
        working=false
    end
    function self.destroy(_)generation=generation+1;phase='destroyed';pending=false;created={}end
    return self
end
local function activeTargets(mode,characterOpen,stopped,character,preloadSelection)
    if stopped then return {}end
    local choosing=characterOpen==true
    local warm=preloadSelection==true and mode=='menu' and not choosing
    local selection=warm or choosing and character=='ironclad'
    return {avatar=choosing or warm,battle=mode=='battle' and character=='ironclad',selection=selection,cardFan=selection,
        selectScene=choosing or warm,battleScene=mode=='battle',menuScene=mode=='menu' and not choosing}
end
-- cardTemplates: ready-card image/container template indices, used when only the cards flag is on.
function M.new(stage,report,flags,cardTemplates)
    local selecting=type(flags)=='table' and flags.selectionAvatar==true
    local fighting=type(flags)=='table' and flags.battlePortrait==true
    local carding=type(flags)=='table' and flags.cards==true
    local landing=type(flags)=='table' and flags.menuBackground==true
    if not selecting and not fighting and not carding and not landing then return nil end
    if owners[stage]then return owners[stage]end
    local Asset=require('abyss_traveler_portrait_assets')
    local profile=v25Profile(Asset)
    local theme=require('abyss_theme')
    local official=theme.presentationProfile=='official-assets-first'
    local epoch=0
    if carding and not lowpoly(Asset.lowpolyCardFan) then carding=false end
    if landing and not lowpoly(Asset.lowpolyLand) then landing=false end
    if not selecting and not fighting and not carding and not landing then return nil end
    local avatar,battle,selection,details,rows=nil,nil,nil,nil,{}
    local result,resultHost,resultRow,resultOutcome
    local templates=integer(Asset.imagePrefabId) and Asset.imagePrefabId~=100001 and integer(Asset.containerPrefabId) and Asset
        or type(cardTemplates)=='table' and {imagePrefabId=cardTemplates.imageTemplateIndex,containerPrefabId=cardTemplates.containerTemplateIndex}
    if landing and templates then
        -- Bottom-most layout slot (first child): behind every hand/monster/HUD control.
        for _,entry in ipairs({{'selectScene','characterPanel',{'border','face'}},{'battleScene','battlePanel',{}},{'menuScene','menuPanel',{}}})do
            local panel=stage:GetChild(entry[2]);local host=panel and panel:GetChild('lowpolyScene')
            if host then
                local cover={};for _,name in ipairs(entry[3])do cover[#cover+1]=panel:GetChild(name)end
                rows[#rows+1]={name=entry[1],adapter=controller(host,Asset.lowpolyLand,Asset.lowpolyLand.width,templates),fallback=cover,active=false}
            end
        end
    end
    if selecting then
        validate(Asset.avatar96,96,4822,'c30551e1fed1cd7f18c61b67fe0ad0cd6e52c61bfa6ae937ccd9e4c90e7f72bb','93bcf4303d370f7faac2b8289146acfe655bae6dced0abf5257e407d69f748ef')
        local panel=assert(stage:GetChild('characterPanel'))
        local traveler=assert(panel:GetChild('traveler'))
        local bust=assert(traveler:GetChild('hit'):GetChild('normal'):GetChild('bust'))
        avatar=controller(traveler:GetChild('officialAvatar'),Asset.avatar96,assert(bust.sizeDeltaX),Asset,
            profile and {nativeLifecycle=true,ownerEpoch=function()return epoch end})
        details=panel:GetChild('details')
        local host=details and details:GetChild('officialSelectionFigure')
        if host then
            local figure=(profile or official) and Asset.battle133 or lowpoly(Asset.lowpolyHero) and Asset.lowpolyHero or Asset.selection133 or Asset.battle133
            if figure.renderProfile~='lowpoly-v1' then
                validate(figure,133,4315,'ae2161957033d688b1bed1c7ab2ad2891d5f7bf5e34b291f9ecaef7cfa11f880','f8a7af7b079aa5bbb7e16b502b222f1fd7dbfaa2c30f6eef1bf0d76af0a0a248')
            end
            local display=profile and profile.selectionDisplay or assert(details:GetChild('portraitFrame').sizeDeltaX)
            selection=controller(host,figure,display,Asset,profile and {position=profile.selectionPosition,
                nativeLifecycle=true,ownerEpoch=function()return epoch end})
            rows[#rows+1]={name='selection',adapter=selection,fallback={details:GetChild('portraits'):GetChild('traveler_ironclad')},active=false}
        end
        local row={name='avatar',adapter=avatar,fallback={},active=false}
        for _,name in ipairs({'normal','hover','pressed','disabled'})do row.fallback[#row.fallback+1]=traveler:GetChild('hit'):GetChild(name):GetChild('bust')end
        rows[#rows+1]=row
    end
    if carding then
        -- Premium frames + low-poly illustrations fanned under the select details, like the breakthrough GIF.
        local panel=stage:GetChild('characterPanel')
        local parent=panel and panel:GetChild('details')
        if templates and parent and integer(templates.containerPrefabId) then
            local host=game.InstantiateClientUIControl(templates.containerPrefabId,parent)
            if host then
                pcall(host.SetVisible,host,false)
                pcall(host.SetAnchoredPosition,host,0,-250)
                local fan=controller(host,Asset.lowpolyCardFan,Asset.lowpolyCardFan.width,templates)
                rows[#rows+1]={name='cardFan',adapter=fan,fallback={},active=false}
            end
        end
    end
    if fighting then
        validate(Asset.battle133,133,4315,'ae2161957033d688b1bed1c7ab2ad2891d5f7bf5e34b291f9ecaef7cfa11f880','f8a7af7b079aa5bbb7e16b502b222f1fd7dbfaa2c30f6eef1bf0d76af0a0a248')
        local hero=assert(stage:GetChild('battlePanel'):GetChild('hero'))
        battle=controller(hero:GetChild('officialFigure'),Asset.battle133,profile and profile.battleDisplay or official and theme.layout.player.portrait or 400/3,Asset,
            {retryFailedOnPause=true,position=profile and profile.battlePosition or official and theme.officialAssets.battlePortraitPosition,
                nativeLifecycle=profile~=nil,ownerEpoch=function()return epoch end})
        -- UnitView deliberately hides the shipped geometric player placeholder.
        -- Publication failure or pause must not override that presentation policy.
        local icon=require('abyss_theme').icon.player
        rows[#rows+1]={name='battle',adapter=battle,fallback={hero:GetChild('portrait')},active=false,
            fallbackVisible=not(type(icon)=='table' and icon.status=='placeholder')}
    end
    local function resultController(outcome)
        local defeat=outcome=='defeat'
        return controller(resultHost,Asset.battle133,260,Asset,{position={-342.5,defeat and -157 or -56},
            -- CSS -83deg uses screen Y-down; native candidate uses Y-up +83.
            -- Direction, sampled detail and the dim colour remain device-unverified.
            rotation=defeat and 83 or 0,tint={brightness=.45,saturation=.45,opacity=defeat and .30 or .38},
            nativeLifecycle=true,ownerEpoch=function()return epoch end})
    end
    if profile then
        local menu=stage:GetChild('menuPanel');local page=menu and menu:GetChild('result')
        local chrome=page and page:GetChild('v25ResultChrome')
        resultHost=chrome and chrome:GetChild('subject')
        if resultHost then
            resultOutcome='victory';result=resultController(resultOutcome)
            resultRow={name='result',adapter=result,fallback={},active=false};rows[#rows+1]=resultRow
        end
    end
    if #rows==0 then return nil end
    local timeBudget=selecting and Asset.avatar96.runtimeV2 or fighting and Asset.battle133.runtimeV2 or carding or landing
    local self,busy,destroyed,painting={},false,false,false
    local fallbackVisibility=setmetatable({},{__mode='k'})
    local function paintFallback(control,visible,phase)
        local setter=control.SetVisible
        local painted=fallbackVisibility[control]
        if painted and painted.visible==visible and painted.phase==phase and painted.setter==setter
            and control.visible==visible then return end
        -- Invalidate before a native call: rejected or overlapping writes are not promises.
        fallbackVisibility[control]=nil
        local ok,accepted=pcall(setter,control,visible)
        if ok and accepted~=false and control.alive~=false and control.visible==visible then
            fallbackVisibility[control]={visible=visible,phase=phase,setter=setter}
        end
    end
    local function paint()
        if destroyed or painting then return end
        painting=true
        for _,row in ipairs(rows)do
            local s=row.adapter:status();local ready=row.active and s.phase=='ready'
            local fallbackVisible=row.name~='selection' and row.fallbackVisible~=false
            for _,c in ipairs((row.name~='selection' or row.active)and row.fallback or {})do
                if destroyed then painting=false;return end
                if c and c.alive~=false then
                    paintFallback(c,not ready and fallbackVisible,s.phase)
                    if destroyed then painting=false;return end
                    -- A native setter may synchronously release. Its old hide must not win.
                    if ready and (not row.active or row.adapter:status().phase~='ready')then
                        paintFallback(c,fallbackVisible,row.adapter:status().phase)
                    end
                end
            end
            if row.name=='selection' and ready then
                local note=details:GetChild('portraitNote');note.text=note.text:gsub(' · 肖像待补','')
            end
            if row.lastPhase~=s.phase then row.lastPhase=s.phase;if report then pcall(report,'ABYSS_PORTRAIT '..row.name..' phase='..s.phase..' owned='..s.owned..' reason='..tostring(s.reason))end end
        end
        painting=false
    end
    function self.status(_)return {avatar=avatar and avatar:status() or {phase='disabled',owned=0},
        battle=battle and battle:status() or {phase='disabled',owned=0},selection=selection and selection:status(),result=result and result:status(),batchSize=64}end
    function self.syncResult(_,mode,stopped)
        if not result or busy or destroyed then return false end
        busy=true;local token=epoch
        local wanted=not stopped and (mode=='victory' or mode=='defeat')
        if wanted and resultOutcome~=mode then
            resultRow.active=false
            local released=result:release()
            if epoch~=token or destroyed then busy=false;return false end
            if not released then paint();busy=false;return false end
            result=resultController(mode);resultRow.adapter=result;resultOutcome=mode;resultRow.lastPhase=nil
        end
        local accepted=true
        if wanted and not resultRow.active then resultRow.active=true;accepted=result:begin()
        elseif not wanted and resultRow.active then resultRow.active=false;accepted=result:pause()end
        if epoch~=token or destroyed then busy=false;return false end
        local phase=result:status().phase
        local valid=phase~='failed' and phase~='release_failed' and phase~='destroyed'
        paint();busy=false;return accepted~=false and valid and epoch==token and not destroyed
    end
    function self.sync(_,mode,characterOpen,stopped,character,preloadSelection)
        if busy or destroyed then return false end
        busy=true;local token=epoch
        -- V25 opens the selection artwork on demand. The legacy host's warm
        -- hint must not allocate hidden figures during its title screen.
        if profile then preloadSelection=false end
        local wanted=activeTargets(mode,characterOpen,stopped,character,preloadSelection)
        for _,row in ipairs(rows)do
            local accepted=true
            -- MenuView owns result outcome selection; ordinary scene sync may
            -- pause it on departure, but must never publish a default victory
            -- figure while a defeat outcome is still being prepared.
            local resultOwned=row.name=='result' and not stopped and (mode=='victory' or mode=='defeat')
            if not resultOwned then
                if wanted[row.name] and not row.active then row.active=true;accepted=row.adapter:begin()
                elseif not wanted[row.name] and row.active then row.active=false;accepted=row.adapter:pause()end
            end
            if epoch~=token or destroyed then busy=false;return false end
            if profile and accepted==false then paint();busy=false;return false end
        end
        paint();busy=false;return not profile or epoch==token and not destroyed
    end
    -- Prioritize the main selection figure over the small thumbnail.
    local buildOrder=rows
    function self.tick(_)
        if busy or destroyed then return end
        busy=true
        local start=os.clock()
        for i=1,64 do
            local progressed,kind=false,nil
            for _,row in ipairs(buildOrder)do if row.active then
                local advance,phase=row.adapter:step()
                if advance then progressed=true;kind=phase;break end
            end end
            if not progressed or kind=='reveal' or timeBudget and i%8==0 and os.clock()-start>=.008 then break end
        end
        paint();busy=false
    end
    function self.battlePose(_,x,y,sx,sy)
        if busy or destroyed or not battle then return end
        busy=true;battle:pose(x,y,sx,sy);paint();busy=false
    end
    function self.release(_)
        if destroyed then return true end
        epoch=epoch+1;local old=busy;busy=true;local ok=true
        for _,row in ipairs(rows)do row.active=false;if not row.adapter:release()then ok=false end end
        paint();busy=old;return ok
    end
    function self.onEngineDestroy(_)
        epoch=epoch+1;destroyed=true;for _,row in ipairs(rows)do row.active=false;row.adapter:destroy()end
        -- Keep owners[stage] as a weak-key tombstone even before engine alive=false.
    end
    owners[stage]=self;return self
end
M.createController=controller
return M
