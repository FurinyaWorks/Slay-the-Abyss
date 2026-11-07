-- Only the two Run-owned pages; native state, not Lua controller visibility.
local M = {}
local function current(state,ticket,owner,run,mode,choiceVisible)
    local visible=owner.choiceUI and owner.choiceUI.visible==true or false
    assert(state.epoch==ticket and owner.run==run,'ABYSS_UI_PAGES UNAVAILABLE reentry/run changed')
    assert(owner.mode==mode and visible==choiceVisible,'ABYSS_UI_PAGES UNAVAILABLE page policy changed')
end
local function preflight(pages,child)
    for _,page in ipairs(pages) do
        local node=child(page.name)
        assert(node and type(node.SetActive)=='function' and type(node.active)=='boolean',
            'ABYSS_UI_PAGES UNAVAILABLE native SetActive/active '..page.name)
        if page.node~=node or page.setter~=node.SetActive then page.active=nil end
        page.node=node;page.setter=node.SetActive
    end
end
local function apply(page,wanted,state,ticket,owner,run,mode,choiceVisible)
    if page.active==wanted and page.node.active==wanted then return false end
    page.active=nil;state.busy=true
    local ok,result=pcall(page.setter,page.node,wanted)
    state.busy=false
    if not ok then print('ABYSS_UI_PAGES UNAVAILABLE native throw '..page.name);error(result,0) end
    assert(result~=false,'ABYSS_UI_PAGES UNAVAILABLE SetActive returned false '..page.name)
    current(state,ticket,owner,run,mode,choiceVisible)
    assert(page.node.active==wanted,'ABYSS_UI_PAGES UNAVAILABLE active readback mismatch '..page.name)
    current(state,ticket,owner,run,mode,choiceVisible)
    page.active=wanted
    return true
end
function M.new(child,owner)
    local pages={{name='nodePanel'},{name='choicePanel'}}
    local state={epoch=0,busy=false}
    return function(run)
        state.epoch=state.epoch+1;local ticket=state.epoch
        assert(not state.busy,'ABYSS_UI_PAGES UNAVAILABLE synchronous reentry')
        local changed=false
        local mode,choiceVisible=owner.mode,owner.choiceUI and owner.choiceUI.visible==true or false
        pages[1].wanted=run~=nil and mode=='node'
        pages[2].wanted=run~=nil and choiceVisible
        current(state,ticket,owner,run,mode,choiceVisible)
        preflight(pages,child)
        current(state,ticket,owner,run,mode,choiceVisible)
        for _,page in ipairs(pages) do
            local applied=apply(page,page.wanted,state,ticket,owner,run,mode,choiceVisible)
            current(state,ticket,owner,run,mode,choiceVisible)
            changed=applied or changed
        end
        current(state,ticket,owner,run,mode,choiceVisible)
        for _,page in ipairs(pages) do
            assert(page.node.active==page.wanted,'ABYSS_UI_PAGES UNAVAILABLE final pair readback '..page.name)
            current(state,ticket,owner,run,mode,choiceVisible)
        end
        current(state,ticket,owner,run,mode,choiceVisible)
        if changed then print('ABYSS_UI_PAGES mode='..tostring(mode)..' nodeNativeActive='..tostring(pages[1].wanted)..' choiceNativeActive='..tostring(pages[2].wanted)) end
    end
end
return M
