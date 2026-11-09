-- One scheduler owns preparation and publication. Native calls may synchronously
-- change intent; only the still-current publication may commit the visible state.
local M={}
local function accepted(value)assert(value~=false,'component page visibility rejected')end
local function current(self,page)return not self.dead and self.pages[page.name]==page end
local function busy(page)return page.executing or page.publishing or page.hiding or page.cleaning end
local function hide(self,page)
    if not current(self,page)then return false,'retired component page'end
    if page.hiding then return true end
    page.hiding=true
    local native=page.native
    local ok,reason=pcall(function()accepted(native:SetVisible(false))end)
    page.hiding=false
    return ok,reason
end
local function destroyPrevious(self,page,previous)
    for _,entry in ipairs(previous)do
        if entry.alive~=false then
            local ok,result=pcall(page.destroy,entry)
            if not current(self,page)then return false end
            if not ok or result==false or entry.alive~=false then page.resources[#page.resources+1]=entry end
        end
    end
    return true
end
local function cleanup(self,page)
    if not current(self,page)then return false end
    if busy(page)then page.pendingCleanup=true;return true end
    page.cleaning=true;page.pendingCleanup=false
    -- Freeze the old ledger. Reentrant additions stay strongly owned in the
    -- new ledger and fail closed for an explicit retry, never a recursive walk.
    local previous=page.resources;page.resources={}
    local hidden,reason=hide(self,page)
    if not current(self,page)then return false end
    if not destroyPrevious(self,page,previous)then return false end
    if #page.resources>0 then
        page.cleaning=false;page.state='failed';page.error='component cleanup retained resources';return false
    end
    local reset,resetError=pcall(page.reset)
    if not current(self,page)then return false end
    page.cleaning=false;page.pendingCleanup=false;page.cursor=1;page.state='unprepared'
    if #page.resources>0 then page.error='component reset retained resources';page.state='failed';return false end
    if not hidden or not reset then page.error=tostring(not hidden and reason or resetError);page.state='failed';return false end
    return true
end
local function publicationFailed(self,page,reason)
    cleanup(self,page)
    if current(self,page)then page.state='failed';page.error=tostring(reason)end
    return false
end
local function publish(self,page)
    if not current(self,page)then return false end
    if busy(page)then return true end
    local epoch,jobCount=page.epoch,#page.jobs
    -- A cache hit is not yet published during the native call. Semantic content
    -- discovered by its callbacks must queue hidden work instead of mounting as
    -- if this page were already visible/cached.
    page.state='ready';page.publishing=true
    local native=page.native
    local ok,reason=pcall(function()accepted(native:SetVisible(true))end)
    page.publishing=false
    if not current(self,page)then return false end
    if not ok then return publicationFailed(self,page,reason)end
    if page.pendingCleanup or page.epoch~=epoch or not page.requested then
        page.pendingCleanup=false
        return cleanup(self,page)
    end
    if #page.jobs>jobCount then
        -- A semantic lookup during SetVisible registered new hidden work.
        -- Previously completed/cache jobs remain complete; only the new tail
        -- is prepared under the next step's shared budget.
        page.cursor=jobCount+1;page.state='preparing'
        local hidden,hideError=hide(self,page)
        if not current(self,page)then return false end
        if not hidden then return publicationFailed(self,page,hideError)end
        if page.pendingCleanup or page.epoch~=epoch then return cleanup(self,page)end
        return true
    end
    page.state='visible';page.lastUsed=self.tick
    return true
end
local function prepare(self,page,budgetLeft)
    page.state='preparing'
    while budgetLeft>0 and page.jobs[page.cursor]do
        budgetLeft=budgetLeft-1;page.executing=true
        local ok,reason=pcall(page.jobs[page.cursor])
        page.executing=false
        if not current(self,page)then return budgetLeft end
        if page.pendingCleanup then page.pendingCleanup=false;cleanup(self,page);break end
        if not ok then publicationFailed(self,page,reason);break end
        page.cursor=page.cursor+1
    end
    if page.state=='preparing' and not page.jobs[page.cursor]then page.state='ready';publish(self,page)end
    return budgetLeft
end
local function step(self)
    if self.dead then return self.budget end
    self.tick=self.tick+1
    for _,page in ipairs(self.order)do if page.state=='failed'then return self.budget end end
    local budgetLeft=self.budget
    for _,page in ipairs(self.order)do
        if page.requested then
            if page.state=='unprepared' or page.state=='preparing'then budgetLeft=prepare(self,page,budgetLeft)
            elseif page.state=='ready' or page.state=='cached'then publish(self,page)end
        end
        if self.dead or page.state=='failed'then return budgetLeft end
    end
    local cached={}
    for _,page in ipairs(self.order)do if page.state=='cached'then cached[#cached+1]=page end end
    table.sort(cached,function(a,b)return a.lastUsed<b.lastUsed end)
    for index=1,#cached-self.cacheLimit do cleanup(self,cached[index])end
    return budgetLeft
end
local function deferIntent(page,visible,changed)
    if not busy(page)then return false end
    if not visible and (changed or page.publishing or page.executing)then page.pendingCleanup=true end
    return true
end
function M.new(budget,cacheLimit)
    assert(type(budget)=='number' and budget>=1 and budget%1==0,'invalid component preparation budget')
    cacheLimit=cacheLimit or 2
    assert(type(cacheLimit)=='number' and cacheLimit>=0 and cacheLimit%1==0,'invalid component cache limit')
    local scheduler={pages={},order={},budget=budget,cacheLimit=cacheLimit,tick=0}
    function scheduler:add(name,native,destroy,reset)
        assert(not self.dead and not self.pages[name],'duplicate or retired component page')
        local page={name=name,native=native,destroy=destroy,reset=reset,jobs={},resources={},
            cursor=1,state='unprepared',requested=false,lastUsed=0,epoch=0}
        self.pages[name]=page;self.order[#self.order+1]=page
        local ok,reason=hide(self,page);assert(ok,reason)
        assert(not self.dead,'component scheduler retired while adding page')
        return page
    end
    function scheduler:request(page,visible)
        if self.dead then return false end
        assert(current(self,page),'foreign component page')
        assert(type(visible)=='boolean','invalid component page visibility')
        local changed=page.requested~=visible
        if changed then page.epoch=page.epoch+1;page.requested=visible end
        if deferIntent(page,visible,changed)then return true end
        if not visible then
            if page.state=='preparing' or page.state=='failed' or page.state=='ready'then return cleanup(self,page)end
            local ok,reason=hide(self,page)
            if not current(self,page)then return false end
            if not ok then page.error=tostring(reason);page.state='failed';return false end
            if page.pendingCleanup then return cleanup(self,page)end
            if page.state=='visible'then page.state='cached'end
        elseif page.state=='ready' or page.state=='cached'then return publish(self,page)end
        return true
    end
    function scheduler:step()
        if self.stepping then return self.budget end
        self.stepping=true
        local ok,result=pcall(step,self)
        self.stepping=false
        if not ok then error(result,0)end
        return result
    end
    function scheduler:preparing()
        for _,page in ipairs(self.order)do
            if busy(page) or page.state=='failed' or page.requested and page.state~='visible'then return true end
        end
        return false
    end
    function scheduler:failure()
        for _,page in ipairs(self.order)do
            if page.state=='failed'then return page.name..': '..tostring(page.error or 'component cleanup rejected')end
        end
    end
    function scheduler:retry(page)
        assert(current(self,page),'foreign component page')
        if page.state~='failed'then return false end
        if not cleanup(self,page)then return false end
        page.error=nil;return true
    end
    function scheduler:cancel(page)
        if self.dead then return false end
        assert(current(self,page),'foreign component page')
        page.epoch=page.epoch+1;page.requested=false
        return cleanup(self,page)
    end
    function scheduler:destroy()
        self.dead=true
        for _,page in ipairs(self.order)do
            page.epoch=page.epoch+1;page.requested=false;page.state='destroyed'
            page.native,page.destroy,page.reset=nil,nil,nil
            page.resources,page.jobs,page.records={},{},{}
        end
        self.pages={};self.order={}
    end
    return scheduler
end
return M
