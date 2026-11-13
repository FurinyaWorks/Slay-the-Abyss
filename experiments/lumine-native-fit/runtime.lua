-- Experiment only. One lazy native prefab, bounded cache; no per-frame image creation.
local M={}
local budget=0
local instance,host,covered,active=nil,nil,{},false
local metrics={phase='idle',created=0,destroyed=0,activations=0}
local allowed={[0]=true,[400]=true,[800]=true,[1600]=true,[3200]=true}
local function clock()return os.clock()*1000 end
local function call(control,method,...)
    assert(type(control[method])=='function' and control[method](control,...)~=false,'fit setter rejected '..method)
end
local function show(control,wanted)
    assert(control:SetActive(wanted)~=false,'fit active rejected')
    assert(control:SetVisible(wanted)~=false,'fit visible rejected')
end
local function restore()
    for _,entry in ipairs(covered)do
        if entry.control.alive~=false then entry.control:SetVisible(entry.visible)end
    end
    covered={}
end
function M.release()
    active=false;restore()
    if instance and instance.alive~=false then
        assert(game.DestroyClientUIControl(instance)~=false,'fit destroy rejected')
        metrics.destroyed=metrics.destroyed+1
    end
    instance=nil
    if host and host.alive~=false then show(host,false)end
    metrics.phase='released'
end
function M.configure(value)
    assert(allowed[value],'fit budget must be 0/400/800/1600/3200')
    if value~=budget then M.release();budget=value end
    metrics.budget=budget
end
function M.enabled()return budget~=0 and metrics.phase~='failed' end
function M.status()
    return {phase=metrics.phase,budget=budget,created=metrics.created,destroyed=metrics.destroyed,
        activations=metrics.activations,active=active,readMs=metrics.readMs,createMs=metrics.createMs,
        revealMs=metrics.revealMs,error=metrics.error,cleanupError=metrics.cleanupError,images=metrics.images}
end
local function cover(panel)
    restore()
    local details=panel:GetChild('details')
    local controls={panel:GetChild('v25Background'),panel:GetChild('veil'),panel:GetChild('border'),panel:GetChild('face'),
        details and details:GetChild('officialSelectionFigure'),details and details:GetChild('portraits')}
    for _,control in pairs(controls)do
        if control then covered[#covered+1]={control=control,visible=control.visible~=false};control:SetVisible(false)end
    end
end
local function batchBuild(binding,rows)
    instance=assert(game.InstantiateClientUIControl(binding.templateIndex,host),'fit root unavailable')
    call(instance,'SetSizeDelta',1280,720)
    local page,batchCount=nil,0
    local index=1
    while index<=#rows do
        if not page or batchCount>=60 then
            page=assert(game.InstantiateClientUIControl(binding.templateIndex,instance),'fit page unavailable')
            call(page,'SetSizeDelta',1280,720);show(page,true);batchCount=0
        end
        local remaining=#rows-index+1
        local size=remaining>=60 and 60 or remaining>=10 and 10 or 1
        local batch=assert(game.InstantiateClientUIControl(binding.batchTemplates[tostring(size)],page),'fit batch unavailable')
        batchCount=batchCount+1
        for j=0,size-1 do
            local r=rows[index];local c=assert(batch:GetChild('image'..j),'fit batch child unavailable')
            if r[1]~=100003 then call(c,'SetImage',Enum.ImageSource.StaticReference,r[1])end
            call(c,'SetAnchoredPosition',r[2],r[3]);call(c,'SetSizeDelta',r[4],r[5])
            if r[6]~=.5 or r[7]~=.5 then call(c,'SetPivot',r[6],r[7])end
            if r[8]~=1 or r[9]~=1 then call(c,'SetLocalScale',r[8],r[9],1)end
            call(c,'SetLocalRotation',r[10],r[11],r[12]);c.imageColor=Color.FromRGBA(r[13],r[14],r[15],255)
            if r[16]==1 then c.enableMask=true;call(c,'SetFillHorizontal',Enum.ImageFillHorizontalType.Right,.5)
            else c.enableMask=false;call(c,'SetFillUnused')end
            index=index+1
        end
    end
end
function M.sync(stage,wanted)
    wanted=budget~=0 and wanted==true
    if not wanted then
        if active then active=false;restore();if host then show(host,false)end end
        return
    end
    if metrics.phase=='failed' then return end
    local panel=assert(stage:GetChild('characterPanel'))
    host=assert(panel:GetChild('lumineFitHost'))
    if not instance then
        local ok,err=pcall(function()
            local started=clock()
            -- Binding metadata is read only on first actual selection. Geometry lives
            -- in a native template; its upfront asset parsing is measured at startup.
            local binding=require('abyss_lumine_fit_binding')[tostring(budget)]
            assert(binding and binding.images<=budget,'fit binding invalid')
            local rotations=binding.rotationModule and require(binding.rotationModule) or {}
            local rows=binding.dataModule and require(binding.dataModule)
            metrics.readMs=clock()-started;metrics.images=binding.images
            started=clock();metrics.phase='creating'
            if rows then batchBuild(binding,rows)
            else instance=assert(game.InstantiateClientUIControl(binding.templateIndex,host),'fit template unavailable')end
            for _,row in ipairs(rotations)do
                local batch=assert(instance:GetChild('batch'..row[1]),'fit batch missing')
                local control=assert(batch:GetChild('image'..row[2]),'fit image missing')
                assert(control:SetLocalRotation(row[3],row[4],row[5])~=false,'fit single-axis rotation rejected')
            end
            metrics.created=metrics.created+1;metrics.createMs=clock()-started
            started=clock();show(host,true);show(instance,true)
            metrics.revealMs=clock()-started;metrics.phase='ready'
            print('LUMINE_FIT ready budget='..budget..' images='..binding.images..' readMs='..metrics.readMs
                ..' createMs='..metrics.createMs..' revealMs='..metrics.revealMs)
        end)
        if not ok then
            metrics.error=tostring(err)
            local clean,why=pcall(M.release)
            if not clean then metrics.cleanupError=tostring(why)end
            if host then pcall(host.SetVisible,host,false);pcall(host.SetActive,host,false)end
            metrics.phase='failed'
            print('LUMINE_FIT failed '..tostring(err));return
        end
    end
    local ok,why=pcall(function()
        if not active then metrics.activations=metrics.activations+1;show(host,true)end
        active=true;cover(panel)
    end)
    if not ok then
        metrics.error=tostring(why);local clean,err=pcall(M.release)
        if not clean then metrics.cleanupError=tostring(err)end
        if host then pcall(host.SetVisible,host,false);pcall(host.SetActive,host,false)end
        metrics.phase='failed';print('LUMINE_FIT failed '..tostring(why))
    end
end
return M
