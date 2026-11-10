local Portraits=require('abyss_traveler_portraits')
Enum={ImageSource={StaticReference='static'},ImageType={Stretch=2}}
Color={FromRGBA=function(...)return {...}end}
for _,nativeLifecycle in ipairs({false,true})do
    for _,failure in ipairs({'false','throw','cancel','destroy'})do
        local states=setmetatable({},{__mode='k'})
        local all,adapter,host,armed={},nil,nil,false
        local methods={}
        function methods:SetVisible(value)
            if self==host and value and armed then
                armed=false
                if failure=='false'then return false end
                if failure=='throw'then error('injected final-show failure')end
                if failure=='cancel'then
                    adapter:release()
                    assert(not adapter:begin(),'an in-flight generation must finish cancellation before restart')
                    -- Native calls can resume and commit after the release
                    -- callback hid the host. The old call must reconcile it.
                    states[self].visible=true
                    return true
                end
                adapter:destroy()
                for control in pairs(states)do states[control].alive=false end
                return true
            end
            assert(states[self].alive);states[self].visible=value;return true
        end
        function methods:SetActive(value)assert(states[self].alive);states[self].active=value;return true end
        function methods:SetImage(_,id)self.imageId=id;return true end
        for _,method in ipairs({'SetAnchorMin','SetAnchorMax','SetPivot','SetSizeDelta','SetLocalScale',
            'SetLocalRotation','SetAnchoredPosition','SetAsLastSibling'})do methods[method]=function()return true end end
        local function control(parent)
            local instance=setmetatable({parent=parent},{
                __index=function(self,key)
                    if states[self][key]~=nil then return states[self][key]end
                    return methods[key]
                end,
                __newindex=function(self,key,value)
                    assert(key~='alive' and key~='active' and key~='visible','engine observations are read-only')
                    rawset(self,key,value)
                end})
            states[instance]={alive=true,active=true,visible=false};all[#all+1]=instance
            return instance
        end
        local destroyed=0
        game={InstantiateClientUIControl=function(_,parent)return control(parent)end,
            DestroyClientUIControl=function(item)states[item].alive=false;destroyed=destroyed+1;return true end}
        host=control()
        local rows={}
        for index=1,301 do rows[index]={100001,0,0,10,10,.5,.5,.5,.5,.5,.5,1,1,0,255,255,255,255}end
        adapter=Portraits.createController(host,{width=133,rows=rows,runtimeV2=true,cache=true},133,
            {imagePrefabId=41,containerPrefabId=73},{nativeLifecycle=nativeLifecycle})
        assert(adapter:begin())
        for _=1,400 do adapter:step();if adapter:status().phase=='revealing'then break end end
        assert(adapter:status().phase=='revealing' and not host.visible)
        assert(adapter:pause());assert(adapter:begin())
        assert(not host.visible,'resume must preserve the complete-art publication boundary')
        adapter:step();assert(adapter:status().phase=='revealing' and not host.visible,'first four groups must remain hidden')
        armed=true;adapter:step()
        local state=adapter:status()
        assert(state.owned==0 and not host.visible,'failed/cancelled final publication must not retain or expose partial art')
        if failure=='cancel'then
            assert(state.phase=='released' and destroyed==#all-1)
            assert(adapter:begin(),'cancelled reveal must be restartable')
            for _=1,400 do adapter:step();if adapter:status().phase=='ready'then break end end
            assert(adapter:status().phase=='ready' and host.visible)
        elseif failure=='destroy'then
            assert(state.phase=='destroyed' and destroyed==0,'engine teardown must not individually destroy borrowed controls')
            assert(not adapter:begin())
        else assert(state.phase=='failed' and destroyed==#all-1)end
    end
end
print('PASS portrait final publication false/throw, reentrant cancellation/restart and engine teardown; both lifecycle modes')
