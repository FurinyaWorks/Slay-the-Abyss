-- One publication boundary; preparation continues behind an opaque input cover.
local M={}
function M.registerSource(platform,page)
    if platform and platform.presentationPage then platform.presentationPage(page)end
end
function M.basePage(mode)
    return ({battle='battlePanel',node='nodePanel',map='mapPanel'})[mode] or 'menuPanel'
end
local function same(a,b,except)
    if not a or not b then return false end
    for key,value in pairs(a)do if key~=except and b[key]~=value then return false end end
    for key,value in pairs(b)do if key~=except and a[key]~=value then return false end end
    return true
end
local function reject(gate,message)
    if gate.error~=message then print('ABYSS_PAGE_REVEAL failed page='..tostring(gate.intent.page)..' epoch='..gate.epoch..' reason='..message)end
    gate.error=message;gate.state='failed';gate.armed=nil;return false
end
local function pageFor(owner)
    if owner.characterOpen and not (owner.deckUI and owner.deckUI.visible) then return 'characterPanel'end
    for _,entry in ipairs({{owner.deckUI,'deckPanel'},{owner.potionUI,'potionPanel'},{owner.choiceUI,'choicePanel'}})do
        if entry[1] and entry[1].visible then return entry[2]end
    end
    if owner.routeOpen then return 'mapPanel'end
    return M.basePage(owner.mode)
end
local function overlayVersion(owner,page)
    if page=='deckPanel' then return owner.deckUI.openSession,owner.deckUI.detailPages,owner.deckUI.detailPage,owner.deckUI.contentRevision end
    if page=='choicePanel' then return owner.choiceUI.context,nil,owner.choiceUI.page end
end
function M.intent(owner)
    local run=owner.run or {};local page=pageFor(owner)
    local selection=owner.characterSelection or {};local character=selection.info or {}
    local node=owner.nodeUI or {};local flow=run.nodeFlow or {};local event=flow.event or {}
    local battle=owner.battleUI or {}
    local revision,details,detailPage,content=overlayVersion(owner,page)
    return {page=page,mode=owner.mode,run=owner.run,phase=run.phase,
        battle=run.combat,node=run.nodeFlow,characterOpen=owner.characterOpen==true,
        character=character.id,characterDeck=selection.deckOpen==true,act=run.act,floor=run.floor,
        nodeMode=node.mode,picker=node.picker,eventStage=event.stage,event=flow.event,neow=flow.roomKind=='neow',opened=node.opened,
        nodePage=node.page,pickPage=node.pickPage,relicPage=node.relicPage,complete=flow.complete,
        rewards=run.phase=='reward' and battle.rewardScreen or nil,
        overlayRevision=revision,details=details,detailPage=detailPage,overlayContent=content}
end
local function sameOwner(a,b)
    if not a or not b then return false end
    for _,key in ipairs({'page','mode','run','phase','battle','node','characterOpen','character','characterDeck','act','floor','overlayRevision'})do
        if a[key]~=b[key]then return false end
    end
    return true
end
local function sameNeowText(a,b)
    local stages={neow_intro=true,neow_blessing=true,neow_result=true}
    return a.neow and b.neow and a.event==b.event and stages[a.eventStage] and stages[b.eventStage]
        and a.picker==b.picker and a.nodeMode==b.nodeMode
end
local function canUpdate(a,b)
    if not sameOwner(a,b)then return false end
    if a.page=='deckPanel'then return a.overlayContent~=b.overlayContent and same(a,b,'overlayContent')end
    return a.page=='nodePanel' and sameNeowText(a,b)
end
local function readiness(ready,intent)
    local ok,value,reason=pcall(ready,intent)
    return ok and value==true and not reason,not ok and tostring(value) or reason
end
function M.new(cover,ready,onIntent)
    assert(cover and type(ready)=='function','page reveal requires cover and readiness source')
    local gate={epoch=0,state='preparing',tick=0}
    function gate:covered()return self.state~='visible' end
    function gate:request(intent)
        if same(intent,self.intent)then return false end
        self.painting=nil
        self.epoch=self.epoch+1;self.intent=intent;self.state='preparing';self.armed=nil;self.error=nil
        if onIntent then onIntent(self.epoch)end
        print('ABYSS_PAGE_REVEAL preparing page='..tostring(intent.page)..' epoch='..self.epoch)
        cover:SetVisible(true);cover:SetAsLastSibling();return true
    end
    function gate:begin(intent)
        local fast=self.state=='visible' and canUpdate(intent,self.intent)
        if not fast then self:request(intent)end
        self.painting={epoch=self.epoch,intent=intent,fast=fast,changed=not same(intent,self.intent)}
    end
    function gate:finish(intent)
        local ticket=self.painting
        if not ticket or not same(ticket.intent,intent)then self:request(intent);return false end
        if ticket.epoch~=self.epoch then return false end
        if not ticket.fast or not ticket.changed then self.painting=nil;return false end
        -- Only the explicit post-paint caller can use readiness for new leases.
        local value,reason=readiness(ready,intent)
        if self.painting~=ticket or ticket.epoch~=self.epoch then return false end
        self.painting=nil
        if reason or value~=true then
            self:request(intent)
            if reason then return reject(self,tostring(reason))end
            return false
        end
        self.epoch=self.epoch+1;self.intent=intent;self.armed=nil;self.error=nil
        if onIntent then onIntent(self.epoch)end
        print('ABYSS_PAGE_REVEAL updated page='..tostring(intent.page)..' epoch='..self.epoch)
        return true
    end
    function gate:paint(raise)
        cover:SetVisible(self:covered())
        if self:covered() and raise then cover:SetAsLastSibling()end
        local message=cover:GetChild('message')
        if message then message.text=self.error and '画面暂未准备完成，可返回菜单。' or '正在准备画面…'end
    end
    function gate:step(intent)
        self.tick=self.tick+1;self:request(intent)
        if self.state=='visible'then return false end
        local ticket=self.epoch
        local value,reason=readiness(ready,intent)
        if ticket~=self.epoch then return false end
        if reason then return reject(self,tostring(reason))end
        if value~=true then self.state='preparing';self.armed=nil;return false end
        -- Confirm on the next real scheduler turn, after asynchronous owners ran.
        if self.armed and self.armed.epoch==ticket and self.armed.tick<self.tick then
            self.state='visible';self.armed=nil;self.error=nil;cover:SetVisible(false)
            print('ABYSS_PAGE_REVEAL visible page='..tostring(intent.page)..' epoch='..ticket);return true
        end
        self.state='ready';self.armed={epoch=ticket,tick=self.tick};return false
    end
    return gate
end
return M
