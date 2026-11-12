-- TASK-4.7 owned-relic art slots: a top-bar disc row plus a read-only detail
-- overlay. Each entry is icon disc + Chinese name + status chip + effect text.
-- Icons bind Theme.icon.relic[id]; placeholder ids are swapped by data only.
local Theme=require('abyss_theme')
local Controller=require('abyss_controller')
local Hooks=require('abyss_relic_hooks')
local Rewards=require('abyss_relic_rewards')
local M={}
local rarityNames={starter='初始遗物',common='普通遗物',uncommon='罕见遗物',rare='稀有遗物',
    boss='首领遗物',shop='商店遗物',special='特殊遗物'}
local function iconId(value)if type(value)=='table'then value=value.id end return type(value)=='number' and value or nil end
function M.icon(id,battle)
    local local_=Hooks.localId(id)
    if battle and Theme.presentationProfile=='official-assets-first' then
        local icons=Theme.officialAssets.battleRelicIcons
        local override=icons and (iconId(icons[local_]) or iconId(icons[id]))
        if override then return override end
    end
    return iconId(Theme.icon.relic[local_]) or iconId(Theme.icon.relic[id]) or iconId(Theme.icon.node.treasure)
end
local function counterValue(run,id)
    local local_=Hooks.localId(id)
    local function read(counters)return counters and (counters[local_]~=nil and counters[local_] or counters[id])end
    local v=run.phase=='combat' and run.combat and read(run.combat.relicCounters) or nil
    if v==nil then v=read(run.relicCounters)end
    return local_,v
end
local function spentCounter(id,value)
    if id=='ancient_tea_set' then return false end
    if value==-2 then return true end
    if type(value)~='number' or value>0 then return false end
    return id=='omamori' or id=='matryoshka' or id=='winged_greaves' or id=='nloths_mask'
end
-- Counter meanings differ per relic, so only well-understood ones get wording.
function M.status(run,id)
    local local_,v=counterValue(run,id)
    if type(v)~='number' then return nil end
    if local_=='neows_lament' then return v==-2 and '已耗尽' or ('剩余 '..v..' 场') end
    if local_=='maw_bank' then return v==-2 and '已失效' or nil end
    if local_=='ancient_tea_set' then return v==-2 and '已蓄能' or nil end
    if local_=='lizard_tail' then return v==-2 and '已耗尽' or v==-1 and '剩余 1 次' or nil end
    if local_=='omamori' or local_=='matryoshka' or local_=='winged_greaves' or local_=='nloths_mask' then
        return v<=0 and '已耗尽' or ('剩余 '..v..' 次')
    end
    if v==-2 then return '已耗尽' end
    if v>=0 then return '计数 '..v end
    return nil
end
-- Pure bar plan: true = show relic i, '+N' = overflow chip, false = hidden.
function M.barCells(total,count)
    local cells={}
    for i=1,count do
        if total>count and i==count then cells[i]='+'..(total-count+1)
        else cells[i]=i<=total end
    end
    return cells
end
local function perPage()return #Theme.layout.relicView.rows*#Theme.layout.relicView.columns end
function M.new(root,bar,clickEvent,platform,describe,onClose,onSlot,barScope)
    local self={root=root,bar=bar,visible=false,page=1}
    local official=Theme.presentationProfile=='official-assets-first'
    local baseBar=Theme.layout.relicView.bar
    local battleBar=official and assert(Theme.officialAssets.battleRelicBar,'missing official battle relic layout')
    local boundCount=official and battleBar.count or baseBar.count
    local function child(name)return assert(root:GetChild(name),'missing relic control '..name)end
    local function picture(control,id)if platform.imageSource then control:SetImage(platform.imageSource,id)end end
    function self.resetBarHover(_)
        if self.hoverIndex then bar:GetChild('slot'..self.hoverIndex):GetChild('icon'):SetLocalScale(1,1,1)end
        self.hoverIndex=nil
    end
    local function paintCounter(slot,run,id,battle)
        local key,value
        if id then key,value=counterValue(run,id)end
        local numeric=battle and type(value)=='number' and value>=0
        local counter=slot:GetChild('counter')
        counter:SetVisible(not not numeric);counter.text=numeric and tostring(value) or ''
        if official and platform.color then
            local ink=battle and spentCounter(key,value) and 110 or 255
            slot:GetChild('icon').imageColor=platform.color(ink,ink,ink,255)
        end
    end
    function self.entry(_,run,i)
        local id=run.relics[i]
        local definition=Rewards.definition(run,id)
        local description=definition and describe(run,definition.id) or ''
        return {id=id,name=definition and definition.name or '未识别遗物',icon=M.icon(id,self.selectedIndex~=nil and run.phase=='combat'),
            rarity=definition and rarityNames[definition.rarity] or '遗物',
            status=M.status(run,id),description=description~='' and description or '效果说明待补充。'}
    end
    function self.pages()return math.max(1,math.ceil(#(self.run and self.run.relics or {})/perPage()))end
    local function paintFrame(single)
        if Theme.presentationProfile=='official-assets-first' and platform.color then
            local p,f=Theme.color.panelSunken,Theme.color.goldDim
            child('plate').imageColor=single and platform.color(18,30,40,255) or platform.color(p.r,p.g,p.b,p.a or 255)
            child('frame').imageColor=single and platform.color(155,122,78,255) or platform.color(f.r,f.g,f.b,f.a or 255)
        end
    end
    function self.render(_)
        local run,n=self.run,perPage()
        local single=self.selectedIndex~=nil
        child('single'):SetVisible(single)
        local width=single and Theme.layout.relicView.row[1]+Theme.layout.relicView.disc*2 or Theme.layout.relicView.panel[3]
        local height=Theme.layout.relicView.panel[4]
        child('frame'):SetSizeDelta(width,height)
        child('plate'):SetSizeDelta(width-Theme.space.border*2,height-Theme.space.border*2)
        child('contentBlocker'):SetSizeDelta(width,height)
        paintFrame(single)
        child('close'):SetAnchoredPosition(single and width/2-58 or Theme.layout.relicView.close[1],Theme.layout.relicView.close[2])
        child('title').text=single and '遗物详情' or '持有遗物 · '..#run.relics..' 件'
        if single then
            local e=self:entry(run,self.selectedIndex);self.selected=e
            local view=child('single')
            picture(view:GetChild('icon'),e.icon)
            for _,name in ipairs({'name','rarity','description'})do view:GetChild(name).text=e[name]end
            view:GetChild('status').text=e.status or ''
        end
        self.rows={}
        for slot=1,n do
            local row=child('row'..slot)
            local i=(self.page-1)*n+slot
            if not single and i<=#run.relics then
                local e=self:entry(run,i);self.rows[slot]=e
                picture(row:GetChild('slot'):GetChild('icon'),e.icon)
                row:GetChild('name').text=e.name
                row:GetChild('description').text=e.description
                row:GetChild('chip'):SetVisible(e.status~=nil)
                row:GetChild('chip'):GetChild('label').text=e.status or ''
                row:SetVisible(true)
            else row:SetVisible(false) end
        end
        local many=self:pages()>1
        child('previous'):SetVisible(single and self.selectedIndex>1 or not single and many)
        child('next'):SetVisible(single and self.selectedIndex<#run.relics or not single and many)
        for _,name in ipairs({'previous','next'})do
            local frame=Theme.layout.relicView[name]
            child(name):SetAnchoredPosition(single and (name=='previous' and -width/2+112 or width/2-112) or frame[1],frame[2])
        end
        child('pageHint'):SetVisible(not single and many)
        child('pageHint').text=not single and many and ('第 '..self.page..'/'..self:pages()..' 页') or ''
        child('placeholder'):SetVisible(#run.relics==0)
    end
    function self.open(_,run,index)
        if self.visible or not run then return false end
        self:resetBarHover()
        self.visible,self.run=true,run
        self.selectedIndex=(official or run.phase=='combat') and type(index)=='number' and run.relics[index] and index or nil
        self.page=index and math.floor((index-1)/perPage())+1 or 1
        root:SetVisible(true);root:SetAsLastSibling()
        self:render();return true
    end
    function self.close(_)
        if not self.visible then return false end
        self:resetBarHover()
        self.visible,self.run,self.rows,self.selectedIndex,self.selected=false,nil,nil,nil,nil
        root:SetVisible(false);return true
    end
    function self.turn(_,step)
        if self.visible and self.selectedIndex then
            local target=self.selectedIndex+step
            if target<1 or target>#self.run.relics then return false end
            self.selectedIndex=target;self:render();return true
        end
        if not self.visible or self:pages()<2 then return false end
        self.page=(self.page-1+step)%self:pages()+1;self:render();return true
    end
    -- Owned-only tray like the prototype topBar(). Beyond count the last disc
    -- becomes a +N overflow chip that opens the paginated overlay there.
    function self.refreshBar(_,run,visible)
        local relics=run and run.relics or {}
        local style=official and battleBar or baseBar
        self.barInteractive=official and visible and not self.visible or false
        if not self.barInteractive then self:resetBarHover()end
        bar:SetVisible(visible and run~=nil)
        bar:GetChild('tray'):SetVisible(false) -- STS: discs float under the HP row, no tray capsule
        local cells=M.barCells(#relics,style.count)
        for i=1,boundCount do
            local cell=cells[i] or false
            local slot=bar:GetChild('slot'..i)
            slot:SetVisible(cell~=false)
            slot:SetAnchoredPosition(style.origin[1]+style.step*(i-1),style.origin[2])
            local icon,hit=slot:GetChild('icon'),slot:GetChild('hit')
            icon:SetSizeDelta(style.icon,style.icon)
            hit:SetSizeDelta(style.hit or style.step,style.hit or 44)
            for _,name in ipairs({'rim','face'})do slot:GetChild(name):SetVisible(not official)end
            local more=type(cell)=='string'
            icon:SetVisible(not more)
            slot:GetChild('more'):SetVisible(more)
            slot:GetChild('more').text=more and cell or ''
            if cell and not more then picture(icon,M.icon(relics[i],battle))end
            paintCounter(slot,run,cell and not more and relics[i] or nil,official)
        end
    end
    root.disableCursorEventPassthrough=true
    child('blocker'):AddCursorEventListener(clickEvent,function()
        if not self.visible or Controller.pointerBlocked(platform.controller)then return false end
        if self.selectedIndex then onClose()end
        return true
    end)
    child('contentBlocker'):AddCursorEventListener(clickEvent,function()return self.visible end)
    local actions={close=function()return onClose()end,previous=function()return self:turn(-1)end,next=function()return self:turn(1)end}
    for name,action in pairs(actions)do
        local hit=child(name):GetChild('hit')
        hit:AddCursorEventListener(clickEvent,function()
            if Controller.pointerBlocked(platform.controller)then return false end
            return action()
        end)
        Controller.bind(platform.controller,hit,'deck',action,function()return self.visible end)
    end
    local function openSlot(i)
        -- The overflow cell represents a collection, not the relic at its index.
        if bar:GetChild('slot'..i):GetChild('more').visible then return onSlot()end
        return onSlot(i)
    end
    for i=1,boundCount do
        local hit=bar:GetChild('slot'..i):GetChild('hit')
        local cursor=platform.cursorEvents
        if official and cursor and cursor.CursorEnter and cursor.CursorExit then
            hit:AddCursorEventListener(cursor.CursorEnter,function()
                if not self.barInteractive or self.visible or Controller.pointerBlocked(platform.controller)then return false end
                local slot=bar:GetChild('slot'..i)
                if slot.visible==false or slot:GetChild('more').visible then return false end
                self:resetBarHover();self.hoverIndex=i
                slot:GetChild('icon'):SetLocalScale(1.25,1.25,1)
                return true
            end)
            hit:AddCursorEventListener(cursor.CursorExit,function()
                if self.hoverIndex==i then self:resetBarHover()end
                return true
            end)
        end
        hit:AddCursorEventListener(clickEvent,function()
            if Controller.pointerBlocked(platform.controller)then return false end
            return openSlot(i)
        end)
        Controller.bind(platform.controller,hit,barScope,function()return openSlot(i)end)
    end
    return self
end
return M
