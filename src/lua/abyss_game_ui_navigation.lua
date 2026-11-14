-- Session navigation keeps the live Run in memory; it is never a save file.
local NeowHistory=require('abyss_neow_history')
local M={}
function M.hasRun(self)
    return self.run~=nil and self.run.phase~='victory' and self.run.phase~='defeat'
        and not self.settlementRequested
end
local function blocked(self)
    return self.disabled or self.characterOpen or self.controlsOpen or self.routeOpen
        or self.settlementRequested or self.settlementBusy or self.easterEggOpen
end
local function dismiss(self,owner)
    self.exitOpen,self.menuOpen,self.exitError,self.navigationAction=false,false,nil,nil
    owner.exitGeneration=owner.exitGeneration+1
    owner.menuGeneration=owner.menuGeneration+1
end
function M.install(self,owner,neowHistory)
    self.returnToMainMenu=function(_)
        if blocked(self) or not M.hasRun(self) or self.sessionPaused or not self.menuOpen then return false end
        -- Keep battle presentation, node result, reward/choice tokens and RNG in place.
        self.sessionPaused=true
        dismiss(self,owner);self:refresh();return true
    end
    self.continueRun=function(_)
        if blocked(self) or self.exitOpen or not self.sessionPaused or not M.hasRun(self) then return false end
        self.sessionPaused=false
        dismiss(self,owner);self:refresh();return true
    end
    self.requestNavigation=function(_,action)
        if blocked(self) or (action~='abandon' and action~='new') or not M.hasRun(self) then return false end
        if action=='abandon' and not self.menuOpen then return false end
        if action=='new' and self.mode~='menu' then return false end
        self.navigationAction,self.exitOpen,self.menuOpen=action,true,false
        owner.exitGeneration=owner.exitGeneration+1
        self:refresh();return true,'confirmation_required'
    end
    self.confirmNavigation=function(_)
        if blocked(self) or not self.exitOpen or not self.navigationAction or not M.hasRun(self) then return false end
        local action=self.navigationAction
        NeowHistory.finish(neowHistory,self.run,'abandon')
        self.battleUI.feedback:cancel()
        self.battleUI.run,self.nodeUI.run,self.nodeUI.map,self.mapUI.map=nil,nil,nil,nil
        self.nodeUI.result,self.nodeUI.notice=nil,''
        self.run,self.map,self.runSeed,self.presentedBattle=nil,nil,nil,nil
        self.sessionPaused=false
        if self.choiceUI then self.choiceUI:close() end
        self.deckUI:close();self.potionUI:close()
        dismiss(self,owner);self:refresh()
        if action=='new' then return self:start() end
        return true,'run_abandoned'
    end
end
return M
