local Pages=require('abyss_component_pages')
local failHide,throwHide,failDestroy=false,false,false
local calls=0
local native={alive=true,visible=false}
function native:SetVisible(value)
    if not value and throwHide then error('hide fault')end
    if not value and failHide then return false end
    self.visible=value;return true
end
local scheduler=Pages.new(1,0)
local resets=0
local page=scheduler:add('test',native,function(item)
    calls=calls+1
    if failDestroy then return false end
    item.alive=false;return true
end,function()resets=resets+1 end)
page.jobs={function()page.resources[#page.resources+1]={alive=true}end,function()end}
scheduler:request(page,true);scheduler:step()
assert(page.state=='preparing' and #page.resources==1 and not native.visible)
failDestroy=true
assert(not scheduler:cancel(page) and page.state=='failed' and #page.resources==1)
assert(not scheduler:retry(page) and #page.resources==1,'failed cleanup must retain strong ownership')
failDestroy=false;failHide=true
assert(not scheduler:retry(page) and page.state=='failed' and #page.resources==0,
    'hide rejection must still attempt resource cleanup and preserve failed state')
failHide=false;throwHide=true
assert(not scheduler:retry(page) and page.state=='failed' and page.error:find('hide fault'))
throwHide=false;assert(scheduler:retry(page))
scheduler:request(page,true);scheduler:step();scheduler:step()
assert(page.state=='visible')
failHide=true
assert(scheduler:request(page,false)==false and page.state=='failed')
assert(not page.requested,'rejected hide must stop accepting input intent')
assert(scheduler:preparing(),'a failed hide must keep all other page input blocked')
local other=scheduler:add('other',{SetVisible=function()return true end},function()return true end,function()end)
local advanced=false;other.jobs={function()advanced=true end}
scheduler:request(other,true);scheduler:step()
assert(not advanced,'another page must not advance while the previous native page cannot hide')
failHide=false;assert(scheduler:retry(page))
assert(calls==4 and resets>=2)
scheduler:destroy()
assert(page.native==nil and #page.jobs==0 and #page.resources==0 and page.reset==nil,
    'external page or proxy references must not pin an engine-owned subtree')
print('PASS page cleanup false/throw, retry ownership, partial cancellation and destruction reference release')

-- Native setters run their callback before committing the supplied value.
-- Every case uses the production 4/2 budgets and the real scheduler.
local function publicationFixture()
    local f={scheduler=Pages.new(4,2),hooks={},created=0,destroyed=0,resets=0,shows=0,hides=0}
    f.native={alive=true,visible=false}
    function f.native:SetVisible(value)
        assert(self.alive,'no input after engine teardown')
        if value then f.shows=f.shows+1 else f.hides=f.hides+1 end
        local hook=value and f.hooks.show or f.hooks.hide
        if hook then hook()end
        self.visible=value -- The native call resumes after any reentrant intent.
        return true
    end
    f.page=f.scheduler:add('page',f.native,function(item)
        f.destroyed=f.destroyed+1
        if f.hooks.destroy then f.hooks.destroy(item)end
        item.alive=false;return true
    end,function()
        f.resets=f.resets+1
        if f.hooks.reset then f.hooks.reset()end
    end)
    f.page.jobs={function()
        f.created=f.created+1;f.page.resources[#f.page.resources+1]={alive=true}
    end}
    return f
end
do
    local f=publicationFixture()
    f.hooks.show=function()assert(f.scheduler:cancel(f.page))end
    f.scheduler:request(f.page,true);f.scheduler:step()
    assert(not f.page.requested and f.page.state=='unprepared' and not f.native.visible,
        'late SetVisible(true) must not overwrite synchronous cancellation')
    assert(#f.page.resources==0 and f.created==f.destroyed and f.resets==1)
end
do
    local f=publicationFixture()
    f.hooks.show=function()f.native.alive=false;f.scheduler:destroy()end
    f.scheduler:request(f.page,true);f.scheduler:step()
    assert(f.page.state=='destroyed' and f.page.native==nil and not f.page.requested,
        'a returned native show must not revive a destroyed scheduler')
    assert(f.shows==1 and f.destroyed==0,'engine-owned subtree teardown must not issue late input or individual destroys')
end
do
    local f=publicationFixture()
    f.hooks.show=function()
        assert(f.shows==1,'same-value request must not recurse into native publication')
        assert(f.scheduler:request(f.page,true));f.scheduler:step()
    end
    f.scheduler:request(f.page,true);f.scheduler:step()
    assert(f.page.state=='visible' and f.native.visible and f.shows==1 and f.created==1)
end
do
    local f=publicationFixture()
    f.hooks.show=function()
        f.hooks.show=nil
        f.scheduler:request(f.page,false);f.scheduler:request(f.page,true)
    end
    f.scheduler:request(f.page,true);f.scheduler:step()
    assert(f.page.requested and f.page.state=='unprepared' and not f.native.visible and f.page.cursor==1,
        'new intent must survive old show, while its resources are rebuilt under budget')
    f.scheduler:step()
    assert(f.page.state=='visible' and f.native.visible and f.created==2 and f.destroyed==1)
end
do
    local f=publicationFixture();local late=0
    f.hooks.show=function()
        f.hooks.show=nil
        for _=1,5 do f.page.jobs[#f.page.jobs+1]=function()late=late+1 end end
    end
    f.scheduler:request(f.page,true);f.scheduler:step()
    assert(f.page.state=='preparing' and not f.native.visible and late==0,
        'content registered during native publication must not become READY early')
    f.scheduler:step();assert(late==4 and not f.native.visible,'late content shares the production four-job budget')
    f.scheduler:step();assert(late==5 and f.page.state=='visible' and f.native.visible and f.created==1)
end
do
    local f=publicationFixture()
    f.scheduler:request(f.page,true);f.scheduler:step()
    local before=f.hides
    f.hooks.hide=function()
        assert(f.hides-before<=2,'hide/cancel reentry must not recursively call the native setter')
        assert(f.scheduler:cancel(f.page))
    end
    assert(f.scheduler:request(f.page,false))
    assert(f.page.state=='unprepared' and not f.native.visible and f.destroyed==1 and f.resets==1)
end
do
    local f=publicationFixture();local late={alive=true}
    f.scheduler:request(f.page,true);f.scheduler:step()
    f.hooks.destroy=function()
        f.hooks.destroy=nil
        assert(f.scheduler:cancel(f.page))
        f.page.resources[#f.page.resources+1]=late
    end
    assert(not f.scheduler:cancel(f.page),'new resources during cleanup must be retained, not silently lost')
    assert(f.page.state=='failed' and #f.page.resources==1 and f.page.resources[1]==late and late.alive)
    assert(f.scheduler:retry(f.page));assert(not late.alive and f.destroyed==2 and #f.page.resources==0)
end
do
    local f=publicationFixture()
    f.scheduler:request(f.page,true);f.scheduler:step()
    f.hooks.reset=function()f.scheduler:request(f.page,true)end
    assert(f.scheduler:cancel(f.page))
    assert(f.page.state=='unprepared' and f.page.requested and not f.native.visible,
        'cleanup reset callback must retain the next intent without recursively publishing it')
    f.hooks.reset=nil;f.scheduler:step();assert(f.page.state=='visible' and f.created==2)
end
do
    local f=publicationFixture();local late={alive=true}
    f.scheduler:request(f.page,true);f.scheduler:step()
    f.hooks.reset=function()
        f.hooks.reset=nil;f.page.resources[#f.page.resources+1]=late
    end
    assert(not f.scheduler:cancel(f.page),'resources allocated during reset must not escape into unprepared state')
    assert(f.page.state=='failed' and #f.page.resources==1 and f.page.resources[1]==late and late.alive)
    assert(f.scheduler:retry(f.page));assert(not late.alive and #f.page.resources==0)
end
do
    local f=publicationFixture()
    f.scheduler:request(f.page,true);f.scheduler:step()
    -- Bridge's visible/cached content lookups register permanent rebuild jobs
    -- after already creating that content. They are not new pending work.
    f.page.jobs[#f.page.jobs+1]=function()error('completed cached job must not run twice')end
    f.scheduler:request(f.page,false);f.scheduler:request(f.page,true)
    assert(f.page.state=='visible' and f.created==1 and f.native.visible)
end
print('PASS publication late cancel/destroy/new intent/same intent, late content budget and cleanup reentry (4/2)')
