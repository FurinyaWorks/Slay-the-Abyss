-- Presentation clock only: the committed Combat frame supplies the turn.
-- Reuses a fixed native tree; no timers, native allocations, input or action waits.
local L=require('abyss_theme').layout.v25TurnNotice
local M={}
local function bezier(t,a,b)return 3*(1-t)^2*t*a+3*(1-t)*t*t*b+t^3 end
local function cssEase(x)
    if x<=0 or x>=1 then return x end
    local lo,hi=0,1
    for _=1,12 do
        local middle=(lo+hi)/2
        if bezier(middle,.25,.25)<x then lo=middle else hi=middle end
    end
    return bezier((lo+hi)/2,.1,1)
end
function M.new(overlay,platform)
    if not L then return nil end
    local root=assert(overlay:GetChild('v25TurnNotice'),'missing V25 turn notice tree')
    local title,subtitle=root:GetChild('title'),root:GetChild('subtitle')
    local titleShadow,subtitleShadow=root:GetChild('titleShadow'),root:GetChild('subtitleShadow')
    local images={}
    for _,name in ipairs({'shade','fadeTop','fadeBottom'})do images[#images+1]={root:GetChild(name),L.shadeInk}end
    for _,side in ipairs({-1,1})do
        local sword=root:GetChild('swords'):GetChild('sword'..side)
        for _,name in ipairs({'edge','blade','tip','guard','handle'})do
            local key=(name=='blade' or name=='tip') and (side<0 and 'left' or 'right') or name
            images[#images+1]={sword:GetChild(name),L.swordInk[key]}
        end
    end
    local lastBattle=setmetatable({},{__mode='v'})
    local age,allowed,shown,lastX,lastAlpha=nil,false,false,nil,nil
    local face,paintedFace,alpha,x=nil,nil,0,0
    local revision,dirty,drawing=0,false,false
    local self={}
    local function color(c,factor)return platform.color(c.r,c.g,c.b,math.floor((c.a or 255)*factor+.5))end
    local function call(ticket,node,method,...)
        if revision~=ticket then return false end
        local fn=node[method]
        if revision~=ticket then return false end
        local result=fn(node,...)
        if revision~=ticket then return false end
        assert(result~=false,'V25 notice setter rejected: '..method)
        return true
    end
    local function put(ticket,node,key,value)
        if revision~=ticket then return false end
        node[key]=value
        return revision==ticket
    end
    local function text(ticket,node,value,px,py)
        return put(ticket,node,'text',value) and call(ticket,node,'SetAnchoredPosition',px,py)
    end
    local function renderFace(ticket)
        local current=face
        local starting=current.turn==1
        local heading=starting and '战斗开始' or '玩家回合'
        local sub='第 '..current.turn..' 回合'
        local px,py=starting and 38.5 or 0,starting and 0 or 13
        if not (text(ticket,title,heading,px,py) and text(ticket,titleShadow,heading,px+1,py-3)
            and text(ticket,subtitle,sub,0,-22) and text(ticket,subtitleShadow,sub,1,-25)
            and call(ticket,subtitle,'SetVisible',not starting) and call(ticket,subtitleShadow,'SetVisible',not starting)
            and call(ticket,root:GetChild('swords'),'SetVisible',starting))then return false end
        paintedFace=current;return true
    end
    local function renderInk(ticket,value)
        for _,entry in ipairs(images)do
            if not put(ticket,entry[1],'imageColor',color(entry[2],value))then return false end
        end
        return put(ticket,title,'fontColor',color(L.titleInk,value))
            and put(ticket,subtitle,'fontColor',color(L.subtitleInk,value))
            and put(ticket,titleShadow,'fontColor',color(L.shadowInk,value))
            and put(ticket,subtitleShadow,'fontColor',color(L.shadowInk,value))
    end
    local function render(ticket)
        if not shown then
            return root.visible==false and revision==ticket or call(ticket,root,'SetVisible',false)
        end
        local wantedX,wantedAlpha=x,alpha
        if paintedFace~=face and not renderFace(ticket)then return false end
        if wantedX~=lastX then
            if not call(ticket,root,'SetAnchoredPosition',L.position[1]+wantedX,L.position[2])then return false end
            lastX=wantedX
        end
        if wantedAlpha~=lastAlpha then
            if not renderInk(ticket,wantedAlpha)then return false end
            lastAlpha=wantedAlpha
        end
        return root.visible==true and revision==ticket or call(ticket,root,'SetVisible',true)
    end
    local function flush()
        if drawing then return end
        drawing=true
        -- Reconcile the latest state after a setter returns from synchronous
        -- cancellation/replacement. Repeated reentry defers to the next update.
        local ok,reason=pcall(function()
            for _=1,2 do
                if root.alive==false then dirty=false;break end
                if not dirty then break end
                dirty=false
                if not render(revision)then dirty=true end
            end
        end)
        drawing=false
        if not ok then dirty=true;error(reason,0)end
    end
    local function changed()
        revision=revision+1;dirty=true;flush()
    end
    function self.reset(_)
        age,shown=nil,false;changed()
    end
    function self.playerTurn(_,turn)
        if not allowed then return end
        assert(type(turn)=='number' and turn>=1 and turn%1==0,'invalid turn notice turn')
        face={turn=turn};age,shown,lastAlpha,lastX=0,true,nil,nil
        alpha,x=0,-L.travel;changed()
    end
    function self.bind(_,battle)
        allowed=battle~=nil
        if not battle then self:reset();return end
        if lastBattle[1]~=battle then lastBattle[1]=battle;self:playerTurn(battle.turn)end
    end
    function self.update(_,dt)
        if not shown then flush();return end
        assert(type(dt)=='number' and dt==dt and dt>=0 and dt<math.huge,'invalid turn notice delta')
        age=age+dt
        local p=age/L.duration
        if p>=1 then self:reset();return end
        local enter=cssEase(math.min(1,p/L.enterEnd))
        local exit=cssEase(math.max(0,(p-L.exitStart)/(1-L.exitStart)))
        alpha,x=enter*(1-exit),-L.travel*(1-enter)+L.travel*exit
        changed()
    end
    return self
end
return M
