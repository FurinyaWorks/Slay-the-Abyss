-- One scheduler owns hidden preparation. A job is one indivisible native
-- component, not a promise of a bounded amount of engine time.
local M={}
local function accepted(value)assert(value~=false,'component page visibility rejected')end
local function hide(page)accepted(page.native:SetVisible(false))end
local function cleanup(page)
    if page.executing then
        page.pendingCleanup=true;page.state='unprepared'
        local ok,reason=pcall(hide,page)
        if not ok then page.error=tostring(reason)end
        return ok
    end
    local hidden,hideError=pcall(hide,page)
    local remaining={}
    for _,entry in ipairs(page.resources)do
        if entry.alive~=false then
            local ok,result=pcall(page.destroy,entry)
            if not ok or result==false or entry.alive~=false then remaining[#remaining+1]=entry end
        end
    end
    page.resources=remaining
    if #remaining>0 then page.state='failed';return false end
    page.reset();page.cursor=1;page.state='unprepared'
    if not hidden then page.error=tostring(hideError);page.state='failed';return false end
    return true
end
function M.new(budget,cacheLimit)
    assert(type(budget)=='number' and budget>=1 and budget%1==0,'invalid component preparation budget')
    local scheduler={pages={},order={},budget=budget,cacheLimit=cacheLimit or 2,tick=0}
    function scheduler:add(name,native,destroy,reset)
        assert(not self.pages[name],'duplicate component page')
        local page={name=name,native=native,destroy=destroy,reset=reset,jobs={},resources={},
            cursor=1,state='unprepared',requested=false,lastUsed=0}
        hide(page);self.pages[name]=page;self.order[#self.order+1]=page
        return page
    end
    function scheduler:request(page,visible)
        assert(type(visible)=='boolean','invalid component page visibility')
        page.requested=visible
        if not visible then
            if page.state=='preparing' or page.state=='failed'then return cleanup(page)end
            local ok,reason=pcall(hide,page)
            if not ok then page.error=tostring(reason);page.state='failed';return false end
            if page.state=='visible' then page.state='cached' end
        elseif page.state=='ready' or page.state=='cached' then
            local ok,reason=pcall(function()accepted(page.native:SetVisible(true))end)
            if not ok then page.error=tostring(reason);page.state='failed';return false end
            page.state='visible';page.lastUsed=self.tick
        end
        return true
    end
    function scheduler:step()
        if self.dead then return self.budget end
        self.tick=self.tick+1
        -- A rejected hide may leave an engine page visible. Keep the complete
        -- loading cover and all callbacks blocked until explicit cleanup/retry.
        for _,page in ipairs(self.order)do if page.state=='failed'then return self.budget end end
        local budgetLeft=self.budget
        for _,page in ipairs(self.order)do
            if page.requested and (page.state=='unprepared' or page.state=='preparing')then
                page.state='preparing'
                while budgetLeft>0 and page.jobs[page.cursor]do
                    budgetLeft=budgetLeft-1
                    page.executing=true
                    local ok,reason=pcall(page.jobs[page.cursor])
                    page.executing=false
                    if self.dead then return budgetLeft end
                    if page.pendingCleanup then
                        page.pendingCleanup=false;cleanup(page)
                        break
                    end
                    if not ok then
                        page.error=tostring(reason);cleanup(page);page.state='failed'
                        break
                    end
                    page.cursor=page.cursor+1
                end
                if page.state=='preparing' and not page.jobs[page.cursor]then
                    page.state='ready';self:request(page,true)
                end
                if page.state=='failed'then return budgetLeft end
            end
        end
        local cached={}
        for _,page in ipairs(self.order)do if page.state=='cached'then cached[#cached+1]=page end end
        table.sort(cached,function(a,b)return a.lastUsed<b.lastUsed end)
        for index=1,#cached-self.cacheLimit do cleanup(cached[index])end
        return budgetLeft
    end
    function scheduler:preparing()
        for _,page in ipairs(self.order)do
            if page.state=='failed' or page.requested and page.state~='visible'then return true end
        end
        return false
    end
    function scheduler:failure()
        for _,page in ipairs(self.order)do
            if page.state=='failed'then return page.name..': '..tostring(page.error or 'component cleanup rejected')end
        end
    end
    function scheduler:retry(page)
        assert(self.pages[page.name]==page,'foreign component page')
        if page.state~='failed'then return false end
        if not cleanup(page)then return false end
        page.error=nil;return true
    end
    function scheduler:cancel(page)
        assert(self.pages[page.name]==page,'foreign component page')
        page.requested=false
        return cleanup(page)
    end
    function scheduler:destroy()
        self.dead=true
        -- Parent engine owns the native subtree; only drop borrowed references.
        for _,page in ipairs(self.order)do
            page.native,page.destroy,page.reset=nil,nil,nil
            page.resources,page.jobs,page.records={},{},{}
        end
        self.pages={};self.order={}
    end
    return scheduler
end
return M
