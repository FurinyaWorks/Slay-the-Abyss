-- Paint the existing pooled aim controls; no input or card state ownership.
-- Pan 2026-10-31: restore the star-chain TargetArrow (e7098ac) over the dense
-- continuous shaft (fb1ce50) — the dense line tested worse on device.
local Theme=require("abyss_theme")
local D,C=Theme.layout.cardDrag,Theme.color
local M={}
local function originalArrow(layer,aiming,sx,sy,ex,ey,enemy,tint,lock)
    local style=Theme.officialAssets.battleAim
    local n=D.aimDots
    local cx,cy=sx-(ex-sx)/4,ey+(ey-sy)/2
    local colour=enemy and style.locked or style.idle
    for i=1,n-1 do
        local dot=layer:GetChild('aim'..i)
        dot:SetVisible(aiming==true)
        if aiming then
            local t,u=(i-1)/n,1-(i-1)/n
            local size=D.aimDot[1]+(D.aimDot[2]-D.aimDot[1])*t
            dot:SetAnchoredPosition(u*u*sx+2*u*t*cx+t*t*ex,u*u*sy+2*u*t*cy+t*t*ey)
            dot:SetSizeDelta(size,size);dot.localRotationZ=0;tint(dot,colour)
        end
    end
    local head=layer:GetChild('aim'..n);head:SetVisible(aiming==true)
    if not aiming then return end
    local t=math.min(1,math.max(0,lock or 0))
    local spring=1-2^(-10*t)*math.cos(t*math.pi*6)
    local scale=enemy and 1+(style.lockScale-1)*spring or 1
    head:SetAnchoredPosition(ex,ey);head:SetSizeDelta(style.headSize,style.headSize)
    head:SetLocalScale(scale,scale,1)
    head.localRotationZ=math.atan(ey-cy,ex-cx)*180/math.pi-90
    tint(head:GetChild('tip'),colour);tint(head:GetChild('stem'),colour)
end
-- STS TargetArrow behaviour: the dot chain flows along a quadratic Bezier toward
-- the target (phase advances with dt), the last dot pins to the end point, and the
-- control point sits behind the start / above the end (aimBend) for a soft arc.
function M.render(layer, aiming, sx, sy, ex, fy, enemy, tint, phase, lock)
    if Theme.presentationProfile=='official-assets-first' then
        return originalArrow(layer,aiming,sx,sy,ex,fy,enemy,tint,lock)
    end
    phase = phase or 1
    local n = D.aimDots
    local bend = D.aimBend or {0, 0}
    local cx, cy = sx - (ex-sx)*bend[1], fy + (fy-sy)*bend[2]
    for i = 1, n do
        local dot = layer:GetChild("aim" .. i)
        local t = i == n and 1 or (i-1+phase)/n
        dot:SetVisible(aiming == true)
        if aiming then
            local u = 1-t
            local size = D.aimDot[1] + (D.aimDot[2]-D.aimDot[1])*t
            dot:SetAnchoredPosition(u*u*sx + 2*u*t*cx + t*t*ex, u*u*sy + 2*u*t*cy + t*t*fy)
            dot:SetSizeDelta(size, size)
            -- Light polish: stars stay upright (no leftover rotation from the shaft
            -- variant); gold trail whose tail turns red once an enemy is locked.
            dot.localRotationZ = 0
            tint(dot, (enemy and t > 0.6) and C.danger or C.goldBright)
        end
    end
end
return M
