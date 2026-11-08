-- Own prebuilt decorative template roots only; no card text, inputs or rules.
-- Roots start hidden. Allocation may reenter Lua; an optional ready(control)
-- gates asynchronously built pixels without retaining an old presentation look.
local M={}
local function alive(control)
    if type(control)~='table' and type(control)~='userdata' then return false end
    local ok,value=pcall(function()return control.alive end)
    return ok and value~=false
end
local function invoke(control,name,value)
    if not alive(control)then return false end
    local ok,result=pcall(function()
        local method=control[name]
        if type(method)~='function'then return false end
        return method(control,value)
    end)
    return ok and result~=false and alive(control)
end
local function weak(value)return setmetatable({value},{__mode='v'})end
local function pairAlive(list)return alive(list[1]) and alive(list[2])end
local function templateId(value)
    return type(value)=='number' and value>0 and value<math.huge and value%1==0
end
local function templatePair(config,definition)
    if type(definition)~='table'then return nil end
    local kind=definition.type
    if kind~='attack' and kind~='skill' and kind~='power'then return nil end
    local variants=type(config.variants)=='table' and config.variants[kind]
    local shell=type(variants)=='table' and variants[definition.rarity or 'common']
    if templateId(shell) and templateId(config.manaTemplateId)then return shell,config.manaTemplateId end
end
function M.new(config,api)
    config=config or {};api=api or {}
    assert(type(config)=='table' and type(api)=='table','invalid V25 surface configuration')
    local enabled=config.enabled==true
    if enabled then assert(type(api.instantiate)=='function' and type(api.destroy)=='function','missing V25 surface API')end
    -- The weak index contains numeric IDs, never child handles whose parent can
    -- point back to its weak key. Strong roots live in explicit frame leases and
    -- the bounded release-retry queue, both drained by endFrame/release.
    local index=setmetatable({},{__mode='k'})
    local leases,garbage,queued={},{},{}
    local serial,frame,epoch=0,0,0
    local opened,dead,busy,closing,cleaning=false,false,false,false,false
    local self={}
    local function enqueue(list)
        for _,control in ipairs(list)do
            if not queued[control] and alive(control)then
                queued[control]=true;garbage[#garbage+1]=control
            end
        end
    end
    local function drain()
        if cleaning then return false end
        cleaning=true
        local batch=garbage;garbage={}
        for i=#batch,1,-1 do
            local control=batch[i]
            local released=not alive(control)
            if not released then
                invoke(control,'SetVisible',false);invoke(control,'SetActive',false)
                if not alive(control)then released=true
                else
                    local ok,result=pcall(api.destroy,control)
                    released=ok and result~=false
                end
            end
            if released then queued[control]=nil else garbage[#garbage+1]=control end
        end
        cleaning=false
        return #garbage==0
    end
    local function conceal(host)
        local hidden=invoke(host,'SetVisible',false)
        local inactive=invoke(host,'SetActive',false)
        return hidden and inactive
    end
    local function retire(row)
        if leases[row.id]~=row then return end
        leases[row.id]=nil
        local box=row.box[1]
        if box and index[box]==row.id then index[box]=nil end
        local current,pending=row.current,row.pending;row.current={};row.pending={};row.ready=false;row.staged=false
        enqueue(current);enqueue(pending)
        conceal(row.host[1])
    end
    local function orderedRows(predicate)
        local ids={};for id,row in pairs(leases)do if predicate(row)then ids[#ids+1]=id end end
        table.sort(ids);local rows={};for _,id in ipairs(ids)do rows[#rows+1]=leases[id]end
        return rows
    end
    local function current(row,token)
        local valid=alive(row.box[1]) and alive(row.host[1])
        return valid and not dead and opened and epoch==token.epoch and frame==token.frame
            and leases[row.id]==row
    end
    function self.beginFrame(_)
        if dead then return nil end
        frame=frame+1;opened=true;return frame
    end
    local function retain(row,activeScopes)
        if not alive(row.box[1]) or not alive(row.host[1])then return false end
        if not (row.ready and pairAlive(row.current) or row.staged and pairAlive(row.pending))then return false end
        if activeScopes and row.scope then return activeScopes[row.scope]==true end
        return row.used==frame
    end
    function self.endFrame(_,token,activeScopes)
        if token~=nil and token~=frame then return false end
        if activeScopes~=nil and type(activeScopes)~='table'then return false end
        if not opened then return #garbage==0 end
        opened=false
        local old=closing;closing=true
        for _,row in ipairs(orderedRows(function(item)return not retain(item,activeScopes)end))do retire(row)end
        local ok=drain();closing=old;return ok
    end
    function self.release(_,box)
        local old=closing;closing=true
        if box~=nil then
            local row=leases[index[box]];if row then retire(row)end
        else
            epoch=epoch+1;opened=false
            for _,row in ipairs(orderedRows(function()return true end))do retire(row)end
        end
        local ok=drain();closing=old;return ok
    end
    function self.clear(_)return self:release()end
    function self.onDestroy(_)
        dead=true;return self:release()
    end
    local function getHost(box)
        if not alive(box)then return nil end
        local ok,host=pcall(function()return box:GetChild('v25Surface')end)
        if ok and alive(host)then return host end
    end
    local function allocate(row,token,id)
        local ok,control=pcall(api.instantiate,id,row.host[1])
        if ok and alive(control)then row.pending[#row.pending+1]=control end
        if not ok or not alive(control)then return false end
        if not current(row,token)then enqueue({control});return false end
        if not invoke(control,'SetVisible',false) or not current(row,token)then return false end
        return invoke(control,'SetActive',false) and current(row,token)
    end
    local function publish(row,token)
        for _,control in ipairs(row.pending)do
            if not invoke(control,'SetActive',true) or not current(row,token)then return false end
            if not invoke(control,'SetVisible',true) or not current(row,token)then return false end
        end
        local host=row.host[1]
        if not invoke(host,'SetActive',true) or not current(row,token)then return false end
        return invoke(host,'SetVisible',true) and pairAlive(row.pending) and current(row,token)
    end
    local function acquire(box,host)
        local row=leases[index[box]]
        if row and row.host[1]~=host then retire(row);if not drain()then return false end;row=nil end
        if not row then
            serial=serial+1
            row={id=serial,box=weak(box),host=weak(host),current={},pending={}}
            leases[serial]=row;index[box]=serial
        end
        row.used=frame
        return row
    end
    local function reusable(row,shell,mana)
        return row.ready and row.shell==shell and row.mana==mana and pairAlive(row.current)
    end
    local function controlReady(control)
        if not alive(control)then return false,false end
        local ok,ready=pcall(function()
            if type(api.ready)~='function'then return true end
            return api.ready(control)==true
        end)
        local valid=ok and alive(control)
        return valid and ready,valid
    end
    local function pairReady(row,token,list)
        local ready=true
        for i=1,2 do
            if not current(row,token)then return false,false end
            local complete,valid=controlReady(list[i])
            if not valid or not current(row,token)then return false,false end
            if not complete then ready=false end
        end
        if not pairAlive(list) or not current(row,token)then return false,false end
        return ready,true
    end
    local function liveLease(row)
        if not row then return false end
        local valid=alive(row.box[1]) and alive(row.host[1])
        return valid and not dead and leases[row.id]==row
    end
    function self.isReady(_,box)
        local row=leases[index[box]]
        if not liveLease(row) or not reusable(row,row.shell,row.mana)then return false end
        local leaseEpoch,leaseFrame=epoch,frame
        for i=1,2 do
            local ready,valid=controlReady(row.current[i])
            if not ready or not valid then return false end
            if not liveLease(row) or epoch~=leaseEpoch or frame~=leaseFrame then return false end
        end
        return pairAlive(row.current) and liveLease(row)
    end
    local function complete(row,token)
        local ready,valid=pairReady(row,token,row.pending)
        if not valid then return false end
        if not ready then
            return false,conceal(row.host[1]) and current(row,token)
        end
        if not publish(row,token)then return false end
        row.current=row.pending;row.pending={};row.ready=true;row.staged=false
        return true
    end
    local function replace(row,token,shell,mana)
        if not conceal(row.host[1]) or not current(row,token)then return false end
        enqueue(row.pending);row.pending={};row.staged=false;row.ready=false
        if not drain() or not current(row,token)then return false end
        row.shell=shell;row.mana=mana
        if not allocate(row,token,shell) or not allocate(row,token,mana)then return false end
        enqueue(row.current);row.current={};row.ready=false
        if not drain() or not current(row,token)then return false end
        row.staged=true
        return complete(row,token)
    end
    local function reuse(row,token)
        local ready,valid=pairReady(row,token,row.current)
        if not valid then return false end
        local host=row.host[1]
        if not ready then
            row.pending=row.current;row.current={};row.ready=false;row.staged=true
            return false,conceal(host) and current(row,token)
        end
        return invoke(host,'SetActive',true) and current(row,token)
            and invoke(host,'SetVisible',true) and pairAlive(row.current) and current(row,token)
    end
    local function resume(row,token,shell,mana)
        if reusable(row,shell,mana)then return reuse(row,token)end
        if row.staged and row.shell==shell and row.mana==mana then return complete(row,token)end
        return replace(row,token,shell,mana)
    end
    local function apply(box,definition,scope)
        if scope~=nil and (type(scope)~='string' or scope=='')then return false end
        local shell,mana=templatePair(config,definition)
        if not shell or not drain()then return false end
        if not opened then self:beginFrame()end
        local host=getHost(box)
        if not host then return false end
        local row=acquire(box,host)
        if not row then return false end
        row.scope=scope
        local token={epoch=epoch,frame=frame}
        return resume(row,token,shell,mana)
    end
    function self.apply(_,box,definition,scope)
        if not enabled or dead or busy or closing or cleaning then return false end
        busy=true
        local ok,ready,pending=pcall(apply,box,definition,scope)
        if not ok or not ready and not pending then
            local row=leases[index[box]];if row then retire(row)end
            drain()
            -- A setter may release this owner, then complete its stale write.
            -- Re-hide the decoration after it returns, even if its lease is gone.
            local host=getHost(box);if host then conceal(host)end
        end
        busy=false;return ok and ready==true
    end
    return self
end
return M
