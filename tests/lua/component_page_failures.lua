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
