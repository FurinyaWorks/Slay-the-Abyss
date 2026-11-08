-- Semantic controls retain their native API; original visual trees are private
-- siblings of non-drawing legacy image anchors, never semantic children.
local M={}
-- fillAmount is also read back by UnitView's hpGhost update. Keep that state
-- on the empty anchor; neither the source artwork nor its mask is rewritten.
local imageFields={imageColor=true,imageId=true,imageType=true,fillAmount=true}
local imageMethods={SetImage=true}
local function weakKeys()return setmetatable({},{__mode='k'})end
local function active(owner,record)
    assert(not owner.dead and record.native and record.native.alive~=false,'retired component bridge')
    assert(not record.failed,record.failed)
end
local function allocation(owner)
    assert(not owner.dead,'retired component bridge')
    assert(not owner.allocationFailure,'component allocation halted: '..tostring(owner.allocationFailure))
end
local function pendingCount(owner)
    local count=0
    for native in pairs(owner.failedBusiness)do
        if native.alive==false then owner.failedBusiness[native]=nil else count=count+1 end
    end
    return count
end
local function cleanupBusiness(owner,api,native)
    -- The new business root is already in the strong ledger, even when source
    -- attachment failed before a proxy could be returned to its caller.
    if native.alive==false then owner.failedBusiness[native]=nil;return true end
    local hidden,hideResult=pcall(function()return native:SetVisible(false)end)
    local cleaned,result=pcall(api.destroy,native)
    local observed,dead=pcall(function()return native.alive==false end)
    if cleaned and result~=false and observed and dead then owner.failedBusiness[native]=nil end
    return hidden and hideResult~=false and cleaned and result~=false and observed and dead,
        tostring(not hidden and hideResult or not cleaned and result or 'business cleanup rejected')
end
local function childSpec(spec,name)
    local found
    for _,candidate in ipairs(spec.children or {})do
        if candidate.name==name then assert(not found,'duplicate semantic child '..name);found=candidate end
    end
    return found
end
local function hidden(name)return name=='__kitOriginal'end
local function colour(owner,value)
    if type(value)~='number' or not owner.api.color then return value end
    local alpha=math.floor(value/16777216)%256
    return owner.api.color(math.floor(value/65536)%256,math.floor(value/256)%256,value%256,alpha)
end
local function stretch(owner,record,control)
    local commands={{'SetAnchorMin',0,0},{'SetAnchorMax',1,1},{'SetPivot',.5,.5},
        {'SetAnchoredPosition',0,0},{'SetSizeDelta',0,0},{'SetLocalScale',1,1,1},{'SetLocalRotation',0,0,0}}
    for _,command in ipairs(commands)do
        assert(control[command[1]](control,table.unpack(command,2))~=false,'content image geometry rejected')
        active(owner,record)
    end
end
local function fixedFillAnchor(record)
    assert(record.native.anchorMinX==record.native.anchorMaxX,'content fill requires fixed horizontal anchors')
end
local function guardFillAnchor(record,key,value)
    if not record.content or not record.spec.contentImage.fill then return end
    if key=='SetAnchorMin' or key=='anchorMinX'then
        assert(value==record.native.anchorMaxX,'content fill requires fixed horizontal anchors')
    elseif key=='SetAnchorMax' or key=='anchorMaxX'then
        assert(value==record.native.anchorMinX,'content fill requires fixed horizontal anchors')
    end
end
local function contentFill(owner,record,value)
    fixedFillAnchor(record)
    assert(type(value)=='number' and value>=0 and value<=1,'content fill must be within 0..1')
    local image=record.content
    image:SetLocalScale(value,1,1);active(owner,record)
    image:SetAnchoredPosition((value-1)*record.native.sizeDeltaX/2,0);active(owner,record)
    record.sidecar.fillAmount=value
end
local function initializeContent(owner,record)
    local spec,api=record.spec.contentImage,owner.api
    local ok,reason=pcall(function()
        allocation(owner)
        assert(record.spec.kind=='image' and type(spec.templateId)=='number','invalid content image binding')
        assert(api.imageSource~=nil,'missing content image source API')
        if spec.fill then fixedFillAnchor(record)end
        local host=assert(record.native:GetChild('__kitOriginal'),'missing content image host')
        stretch(owner,record,host)
        local image=assert(api.instantiate(spec.templateId,host),'content image instantiate rejected')
        record.content=image;owner.failedBusiness[image]=true
        active(owner,record);stretch(owner,record,image)
        image:SetImage(api.imageSource,spec.imageId);active(owner,record)
        image.imageColor=colour(owner,spec.imageColor);active(owner,record)
        image:SetVisible(true);active(owner,record)
        if spec.fill then contentFill(owner,record,1)end
        owner.failedBusiness[image]=nil
    end)
    if not ok then
        record.failed,owner.allocationFailure=tostring(reason),tostring(reason)
        if record.content then cleanupBusiness(owner,api,record.content)end
        error(reason,0)
    end
end
local function basicContent(record)
    local id=record.content.imageId
    return id>=100001 and id<=100006
end
local function contentRead(record,key)
    if key=='fillAmount'then return record.sidecar.fillAmount end
    if key=='imageType' and basicContent(record)then return record.sidecar.imageType end
    return record.content[key]
end
local function contentWrite(owner,record,key,value)
    if key=='fillAmount'then
        if record.spec.contentImage.fill then contentFill(owner,record,value)else record.sidecar.fillAmount=value end
    elseif key=='imageId'then record.content:SetImage(owner.api.imageSource,value)
    elseif key=='imageType' and basicContent(record)then record.sidecar.imageType=value
    else record.content[key]=value end
    active(owner,record)
end
local function nativeAt(root,path)
    local current=root
    for name in (path or ''):gmatch('[^/]+')do
        local found
        for _,candidate in ipairs(current:GetChildren())do
            if candidate.name==name then assert(not found,'ambiguous original placement path '..name);found=candidate end
        end
        current=assert(found,'missing original placement path '..name)
    end
    return current
end
local function placement(owner,record,item)
    allocation(owner)
    active(owner,record)
    assert(type(item.templateId)=='number' and item.host=='__kitOriginal','invalid original placement')
    local box=nativeAt(record.native,item.path)
    local host=assert(box:GetChild(item.host),'missing original host')
    assert(not record.hosts[host],'duplicate original placement host')
    record.hosts[host]=true
    if item.position then host:SetAnchoredPosition(item.position[1],item.position[2]);active(owner,record)end
    if item.scale then host:SetLocalScale(item.scale[1],item.scale[2],item.scale[3] or 1);active(owner,record)end
    local original=assert(owner.api.instantiate(item.templateId,host),'original component instantiate rejected')
    active(owner,record)
    assert(original.alive~=false,'original component died while mounting')
    for _,path in ipairs(item.clearTextPaths or {})do
        nativeAt(original,path).text=''
        active(owner,record)
    end
end
local function attach(owner,record,placements)
    if record.attached then return end
    -- Reentry must not instantiate the same source root twice.
    assert(not record.attaching,'recursive original component attachment')
    record.attaching=true
    local ok,reason=pcall(function()
        for _,item in ipairs(placements or {})do if not item.geometrySlot then placement(owner,record,item)end end
    end)
    record.attaching=false
    if not ok then error(reason,0)end
    active(owner,record)
    record.attached=true
end
local wrap
local function unwrap(owner,value)
    local record=owner.proxies[value]
    if not record then return value end
    active(owner,record)
    return record.native
end
local function known(owner,value)
    local record=owner.records[value]
    return record and record.proxy or value
end
local function getChild(owner,record,name)
    active(owner,record)
    if hidden(name)then return nil end
    -- Native GetChild is a nullable search. MapUI probes each partition until
    -- it finds a node; absence from this semantic partition is not corruption.
    local spec=childSpec(record.spec,name)
    if not spec then return nil end
    local native=assert(record.native:GetChild(name),'missing native semantic child '..tostring(name))
    return wrap(owner,native,spec)
end
local function itemSpec(owner,record)
    return assert(owner.binding.templates[record.spec.itemTemplate],'missing semantic grid template')
end
local function children(owner,record)
    active(owner,record)
    local result={}
    for _,native in ipairs(record.native:GetChildren())do
        if not hidden(native.name)then
            local existing=owner.records[native]
            local spec=existing and existing.spec or childSpec(record.spec,native.name)
            if not spec and record.spec.itemTemplate then spec=itemSpec(owner,record)end
            assert(spec,'unmapped native semantic child '..tostring(native.name))
            result[#result+1]=wrap(owner,native,spec)
        end
    end
    return result
end
local function find(record,path)
    if not path or path==''then return nil end
    local current=record.proxy
    for name in tostring(path or ''):gmatch('[^/]+')do
        current=current:GetChild(name)
        if not current then return nil end
    end
    return current
end
local function refresh(owner,record,count,callback)
    active(owner,record)
    if count>0 then allocation(owner)end
    assert(type(callback)=='function','grid callback required')
    local spec=itemSpec(owner,record)
    return record.native:RefreshItems(count,function(native,index,...)
        active(owner,record)
        local proxy=wrap(owner,native,spec)
        attach(owner,owner.proxies[proxy],spec.placements)
        active(owner,record)
        return callback(proxy,index,...)
    end)
end
local function forward(owner,record,method,key,...)
    active(owner,record)
    local args=table.pack(...)
    for index=1,args.n do args[index]=unwrap(owner,args[index])end
    guardFillAnchor(record,key,args[1])
    local results=table.pack(method(record.native,table.unpack(args,1,args.n)))
    if key=='SetSizeDelta' and record.content and record.spec.contentImage.fill then
        contentFill(owner,record,record.sidecar.fillAmount)
    end
    for index=1,results.n do results[index]=known(owner,results[index])end
    return table.unpack(results,1,results.n)
end
local function operation(owner,record,key)
    if key=='GetChild'then return function(_,name)return getChild(owner,record,name)end end
    if key=='GetChildren'then return function()return children(owner,record)end end
    if key=='FindChild'then return function(_,path)return find(record,path)end end
    if key=='RefreshItems'then return function(_,count,callback)return refresh(owner,record,count,callback)end end
end
local function read(owner,record,key)
    if key=='alive'then return not owner.dead and record.native~=nil and record.native.alive~=false end
    active(owner,record)
    local method=operation(owner,record,key)
    if method then return method end
    if record.content and imageFields[key]then return contentRead(record,key)end
    if record.spec.kind=='image' and imageFields[key]then return record.sidecar[key]end
    if record.spec.kind=='image' and imageMethods[key]then
        return function(_,...)
            active(owner,record)
            if record.content then return record.content:SetImage(...)end
            record.sidecar[key]=table.pack(...)
        end
    end
    if record.spec.textStyle and record.spec.textStyle[key]~=nil and record.written[key]then
        return record.sidecar[key]
    end
    local value=record.native[key]
    if type(value)=='function'then return function(_,...)return forward(owner,record,value,key,...)end end
    return known(owner,value)
end
local function write(owner,record,key,value)
    active(owner,record)
    guardFillAnchor(record,key,value)
    if record.content and imageFields[key]then contentWrite(owner,record,key,value);return end
    if record.spec.kind=='image' and imageFields[key]
        or record.spec.textStyle and record.spec.textStyle[key]~=nil then
        record.sidecar[key],record.written[key]=value,true
        return
    end
    record.native[key]=unwrap(owner,value)
end
wrap=function(owner,native,spec)
    if not native then return native end
    assert(not owner.dead,'retired component bridge')
    local existing=owner.records[native]
    if existing then
        assert(not existing.failed,existing.failed)
        assert(not spec or existing.spec==spec,'semantic control rebound to another template')
        return existing.proxy
    end
    if not spec then return native end -- E.g. focus held by an unrelated UI.
    local record={native=native,spec=spec,sidecar={},written={},hosts=weakKeys()}
    local proxy=setmetatable({}, {
        __index=function(_,key)return read(owner,record,key)end,
        __newindex=function(_,key,value)write(owner,record,key,value)end,
        __metatable='original component semantic bridge'
    })
    record.proxy=proxy
    owner.records[native],owner.proxies[proxy]=record,record
    if spec.contentImage then initializeContent(owner,record)end
    if spec.textStyle then
        for key,value in pairs(spec.textStyle)do
            assert(key=='fontColor','unsupported source text style '..tostring(key))
            native[key]=colour(owner,value)
            active(owner,record)
        end
    end
    if spec.placements then attach(owner,record,spec.placements)end
    return proxy
end
local function instantiateBusiness(owner,api,index,parent,spec)
    allocation(owner)
    local native=assert(api.instantiate(index,unwrap(owner,parent)),'business component instantiate rejected')
    owner.failedBusiness[native]=true
    local ok,proxy=pcall(function()
        assert(not owner.dead and native.alive~=false,'business component retired while instantiating')
        return wrap(owner,native,spec)
    end)
    if not ok then
        owner.allocationFailure=tostring(proxy)
        local cleaned,reason=cleanupBusiness(owner,api,native)
        error(tostring(proxy)..(cleaned and '' or '; '..reason),0)
    end
    owner.failedBusiness[native]=nil
    return proxy
end
function M.new(stage,binding,api)
    assert(stage and type(binding)=='table' and binding.schemaVersion==1,'invalid component bridge binding')
    assert(type(binding.root)=='table' and type(binding.templates)=='table','missing semantic component tree')
    assert(api and type(api.instantiate)=='function','missing original component instantiate API')
    assert(type(api.destroy)=='function','missing business component destroy API')
    local owner={binding=binding,api=api,records=weakKeys(),proxies=weakKeys(),failedBusiness={}}
    local bridge={}
    bridge.wrap=function(control,spec)return wrap(owner,control,spec)end
    bridge.unwrap=function(control)return unwrap(owner,control)end
    bridge.instantiateBusiness=function(index,parent,templateName)
        allocation(owner)
        local spec=assert(binding.templates[templateName],'missing business component template '..tostring(templateName))
        return instantiateBusiness(owner,api,index,parent,spec)
    end
    function bridge.failedBusinessCount(_)return pendingCount(owner)end
    function bridge.retryFailedBusiness(_)
        for native in pairs(owner.failedBusiness)do cleanupBusiness(owner,api,native)end
        return pendingCount(owner)==0,pendingCount(owner)
    end
    bridge.root=wrap(owner,stage,binding.root)
    function bridge.onEngineDestroy(_)
        if owner.dead then return end
        owner.dead=true
        -- The engine owns the entire parent subtree. Do not walk or individually
        -- destroy source children; invalidate borrowed handles and release refs.
        for _,record in pairs(owner.records)do record.native=nil;record.hosts=nil;record.content=nil end
        owner.records=weakKeys()
        owner.failedBusiness={}
        owner.api,owner.binding=nil,nil
    end
    attach(owner,owner.proxies[bridge.root],binding.placements)
    return bridge
end
return M
