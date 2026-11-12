local AimArrow=require("abyss_battle_aim_arrow")
local CardGlow=require('abyss_battle_card_glow')
-- Card faces, placement and drag trajectory only. The host owns input validity
-- and commands; the core supplies costs, previews and playability.
local Combat = require("abyss_combat")
local Run = require("abyss_run")
local Theme = require("abyss_theme")
local CardSkin = require('abyss_card_skin')
local CardDisplay = require("abyss_card_display")
local number = require("abyss_numbers").integer
local C, L = Theme.color, Theme.layout
local titleInk=Theme.presentationProfile=='official-assets-first' and Theme.officialAssets.battleCardTitleInk or Theme.cardSkin.text.title
local bannerTints=Theme.presentationProfile=='official-assets-first' and Theme.officialAssets.battleBannerByRarity
local D = L.cardDrag
local typeNames = { attack = "攻击", skill = "技能", power = "能力", status = "状态", curse = "诅咒" }
local M = {}
local function bannerInk(definition)
    if bannerTints then return bannerTints[definition.rarity]or bannerTints.basic end
    return C.rarityBand[definition.rarity]or C.rarityBand.basic
end
local ribbonColours=setmetatable({},{__mode='k'})
local function paintRibbon(box,tone,tint)
    local ribbon=assert(box:GetChild('nativeRibbon'),'official battle ribbon is required')
    if ribbonColours[box]==tone then return end
    for _,part in ipairs(ribbon:GetChildren())do
        if part.name:match('^face')then tint(part,tone)end
    end
    ribbonColours[box]=tone
end
-- Shared by the hand and read-only combat piles using the same native face.
function M.paintBanner(box,definition,tint)
    tint(box:GetChild('nameBand'),bannerInk(definition))
    if Theme.presentationProfile=='official-assets-first' then
        tint(assert(box:GetChild('nativeBannerRight'),'official battle banner is required'),bannerInk(definition))
        paintRibbon(box,bannerInk(definition),tint)
    end
end
local function canAimCard(card,battle)
    if card.playable then return true end
    if card.blockReason~='invalid_target' or not card.instance or not battle then return false end
    for index in ipairs(battle.enemies)do
        if Combat.canPlay(battle,card.instance.uid,index)then return true end
    end
    return false
end
local function touchSourceAim(g)
    return g.touchScreen and Theme.presentationProfile=='official-assets-first'
end
local function aimStart(g,x,y,height)
    -- A touch-carried card is lifted above the finger. Starting there folds the
    -- official arrow back down onto the finger and makes its tangent point up.
    if touchSourceAim(g) then
        return g.origin[1],g.origin[2]+height/2
    end
    return x,y+height/2
end

local function lerpSnap(value, target, dt, rate, threshold)
    local nextValue=value+(target-value)*math.min(1,dt*rate)
    return math.abs(nextValue-target)<threshold and target or nextValue
end
local function sourceAimPosition(g,previous,y,dt)
    local x,cy=previous and previous.x or g.origin[1],previous and previous.y or g.origin[2]
    local threshold=Theme.canvas.base[1]/1920
    return lerpSnap(x,0,dt or 0,6,threshold),lerpSnap(cy,y,dt or 0,6,threshold)
end
local function draggedScale(previous,sourceAim,dt)
    local step=sourceAim and (dt or 0) or 1/60
    return previous and previous.scale and lerpSnap(previous.scale,D.scale,step,7.5,0.003) or D.scale
end

local function handTarget(count, index, hot, point)
    local restAngle=-(index-(count-1)/2)*L.hand.arcDegrees
    -- The safe-area clamp can lift the selected pose farther than hoverLift.
    -- Keep the real idle anchor so hover cannot shift its world hit rectangle.
    return {x=point[1],y=point[2],scale=hot and Theme.motion.hoverScale or 1,
        angle=hot and 0 or restAngle,restAngle=restAngle,
        baseY=point.baseY,hitWidth=point.hitWidth}
end

-- Successful geometry belongs to the last binding of a native handle. No view
-- or hand entry is retained by this weak-key table.
local handGeometry=setmetatable({},{__mode='k'})
local function handValues(pose, target)
    local w,h=L.card.size[1],L.card.size[2]
    local r=target.restAngle*math.pi/180
    local c,s=math.abs(math.cos(r)),math.abs(math.sin(r))
    local restH,restW=(h*c+w*s)/2,(w*c+h*s)/2
    local hotH=h*Theme.motion.hoverScale/2
    local hotY=math.max(target.baseY+Theme.motion.hoverLift,-Theme.canvas.base[2]/2+Theme.canvas.safe.y+hotH)
    local low=math.min(target.baseY-restH,hotY-hotH)
    local high=math.max(target.baseY+restH,hotY+hotH)
    local dy,a=(low+high)/2-pose.y,pose.angle*math.pi/180
    local width=math.max(restW*2,w*Theme.motion.hoverScale)
    return {pose.x,pose.y,pose.scale,pose.angle,
        math.sin(a)*dy/pose.scale,math.cos(a)*dy/pose.scale,
        math.min(width,target.hitWidth or width)/pose.scale,(high-low)/pose.scale}
end

local function sameHandValues(first,second)
    for i=1,8 do if first[i]~=second[i] then return false end end
    return true
end
local function writeHandValues(box,hit,v)
    local accepted=box:SetAnchoredPosition(v[1],v[2])~=false
    accepted=box:SetLocalScale(v[3],v[3],1)~=false and accepted
    box.localRotationZ=v[4]
    accepted=hit:SetAnchoredPosition(v[5],v[6])~=false and accepted
    accepted=hit:SetSizeDelta(v[7],v[8])~=false and accepted
    accepted=hit:SetLocalScale(1,1,1)~=false and accepted
    hit.localRotationZ=-v[4]
    return accepted
end
local function applyHandPose(entry,owner)
    local box,pose=entry.box,entry.current
    local hit=box:GetChild('hit')
    local values=handValues(pose,entry.target)
    local painted=handGeometry[box]
    if painted and painted.owner==owner and painted.hit[1]==hit and box.alive~=false
        and hit.alive~=false and sameHandValues(painted.values,values) then return end
    local pending={};handGeometry[box]=pending
    local ok,accepted=pcall(writeHandValues,box,hit,values)
    local current=handGeometry[box]==pending
    handGeometry[box]=nil
    if not ok then error(accepted,0) end
    -- A nested setter may replace the pose or finish in a different order.
    if accepted and current and sameHandValues(values,handValues(entry.current,entry.target)) then
        handGeometry[box]={owner=owner,values=values,hit=setmetatable({hit},{__mode='v'})}
    end
end

local function advancePose(entry, dt, fast)
    local pose,target=entry.current,entry.target
    for _=1,fast and 2 or 1 do
        pose.x=lerpSnap(pose.x,target.x,dt,6,Theme.canvas.base[1]/1920)
        pose.y=lerpSnap(pose.y,target.y,dt,6,Theme.canvas.base[1]/1920)
    end
    pose.scale=lerpSnap(pose.scale,target.scale,dt,7.5,0.003)
    pose.angle=lerpSnap(pose.angle,target.angle,dt,12,0.003)
end

local function pileMembership(battle)
    local result={}
    for _,name in ipairs({"draw","discard","exhaust"}) do
        for _,card in ipairs(battle and battle[name] or {}) do result[card.uid]=name end
    end
    return result
end

-- A render can follow a complete draw command, hiding its intermediate shuffle.
-- Inspect only newly committed events; an old shuffle cannot redirect a later recovery.
local function reshuffledOrigins(battle,tail)
    if not battle or not battle.events then return {},tail end
    local events,first,origins=battle.events,1,{}
    for index=#events,1,-1 do if events[index]==tail then first=index+1;break end end
    for index=first,#events do
        local event=events[index]
        if event.kind=='reshuffle'and event.frame then
            for _,card in ipairs(event.frame.draw)do origins[card.uid]=true end
        end
    end
    return origins,events[#events]
end

local function cardDefinition(data, battle, instance, id)
    local definition = instance and Combat.cardDefinition(battle, instance)
    if definition then return definition end
    for _, card in ipairs(data.cards.cards) do
        if card.id == id then return card end
    end
end

local function repeatCount(definition, instance)
    return instance and definition.repeatable and (instance.upgrades or 1) or nil
end

local function costText(definition)
    if definition.cost == -2 then return "" end
    if definition.costMode == "all_energy" then return "X" end
    return number(definition.cost)
end

local function missingFace(data,id)
    local metadata=(data.cards.sourcePools and data.cards.sourcePools.cardSourceMetadata or {})[id] or {}
    local text='此卡牌尚未实装，无法领取。可选择其他卡牌或跳过。'
    return {type=metadata.type or 'status',rarity=metadata.rarity},
        {name=metadata.sourceId or id,text=text,upgradeText=text}
end

local function rewardFace(context,definition,display,id,slot)
    local missing=not definition or not display
    local upgraded=context.run.rewards.cardUpgrades and context.run.rewards.cardUpgrades[slot]
    if missing then definition,display=missingFace(context.data,id)
    elseif upgraded then
        definition=Combat.copy(definition)
        for key,value in pairs(definition.upgrade or {})do definition[key]=Combat.copy(value)end
    end
    return definition,display,missing,upgraded
end

local function handMetadata(battle)
    if battle then return battle.turn,#battle.hand end
end
local function localBattle(view)
    local run=view.run
    if Theme.presentationProfile~='official-assets-first' or not view.active or view.busy
        or view.displayBattle or view.potionAim or not run or run.phase~='combat' then return end
    local battle=run.combat
    if not battle or battle.phase~='player'then return end
    return battle
end
local function matchingHand(view,battle,geometry)
    if battle~=geometry.battle or view.viewRun~=view.run or view.viewBattle~=battle or battle.turn~=geometry.turn
        or #battle.hand~=geometry.count or view.canvasWidth~=geometry.width or view.canvasHeight~=geometry.height then return false end
    for i,instance in ipairs(battle.hand)do
        local pose=geometry.poses[instance.uid]
        if not pose or pose.box.alive==false or pose.box~=geometry.child('card'..i)then return false end
    end
    return true
end
local function raiseHand(view,battle,poses)
    local top
    for i,instance in ipairs(battle.hand)do
        local box=poses[instance.uid].box;box:SetAsLastSibling()
        if instance.uid==view.selected or i==view.hover then top=box end
    end
    if top then top:SetAsLastSibling()end
end
local function refreshHandHover(view,geometry,previous,nextSlot)
    local battle=localBattle(view)
    if not battle or not matchingHand(view,battle,geometry) or view.info or view.carry
        or view.gesture and view.gesture.moving then return false end
    -- Existing pose entries are UI geometry, never cached combat values.
    -- Core commands/feedback still use the unchanged full renderer.
    for _,slot in pairs({previous,nextSlot})do
        local instance=battle.hand[slot]
        if instance then
            local hot=slot==view.hover or instance.uid==view.selected
            view.cardPositions[instance.uid]=geometry.handPose(geometry.poses[instance.uid].box,instance,#battle.hand,slot-1,hot)
        end
    end
    raiseHand(view,battle,geometry.poses)
    return true
end
local function localAimBattle(view,geometry,g)
    local battle=localBattle(view)
    if not g or not battle or not matchingHand(view,battle,geometry)then return end
    if g~=view.gesture and g~=view.carry or g.run~=view.run or g.battle~=battle
        or g.turn~=battle.turn or not g.moving or view.selected~=g.uid then return end
    local instance=battle.hand[g.slot]
    if not instance or instance.uid~=g.uid then return end
    return battle
end
local function currentAim(view,dragTarget)
    local explicit=view.cardAim
    if explicit then
        if explicit.previewReady() then return explicit.uid,explicit.slot end
        view.cardAim=nil
    end
    local held = view.gesture or view.carry
    if held and held.moving then
        local _, target = dragTarget(held)
        return held.uid, target
    end
end
local function bodyText(view,card,battle,aimUid,aimTarget)
    local instance, definition, display = card.instance, card.definition, card.display
    if instance and definition.originalV4 and view.busy then return "效果结算中" end
    if not instance then
        if card.missing then return display.text end
        return CardDisplay.permanentText(display,definition,{upgraded=card.upgraded==true})
    end
    -- The core previews upgrade, growth and every current modifier;
    -- a card being aimed shows the value for that target.
    local target = instance.uid == aimUid and aimTarget or nil
    local preview = Combat.cardPreview(battle, instance, target)
    return CardDisplay.combatText(display, definition, instance, preview,battle,target)
end
function M.new(view, controls)
    local child, show = controls.child, controls.show
    local ink, tint, picture = controls.ink, controls.tint, controls.picture
    local placeCard, placeReward = controls.placeCard, controls.placeReward
    local dragTarget, dragPose, enemyPosition = controls.dragTarget, controls.dragPose, controls.enemyPosition
    local handBattle,handPoses,previousPiles=nil,{},{}
    -- Ten physical hand slots own their native animation handles until explicit
    -- release. Weak leaf caches alone cannot retire Tweens after userdata GC.
    local glowBoxes={}
    local handGeometryOwner={}
    local handWidth,handHeight,handTurn,handCount,openingHand,eventTail
    local recentDrawOrigins={}
    local function syncHandViewport(current)
        if current~=handBattle or view.canvasWidth~=handWidth or view.canvasHeight~=handHeight then
            -- Resizing invalidates a captured drag. Its old display coordinates
            -- cannot survive after the capture layer has been removed.
            openingHand=current~=handBattle and current~=nil
            handBattle,handPoses,previousPiles=current,{},{}
            eventTail=nil
            handWidth,handHeight=view.canvasWidth,view.canvasHeight
        end
    end
    local function handPose(box,instance,count,index,hot)
        -- placeCard and drag write the same native geometry outside this cache.
        handGeometry[box]=nil
        local point=placeCard(box,count,index,hot)
        local target=handTarget(count,index,hot,point)
        local entry=handPoses[instance.uid]
        if not entry then
            entry={current={x=target.x,y=target.y,scale=target.scale,angle=target.angle}}
            if previousPiles[instance.uid]or openingHand then
                -- AbstractPlayer.draw/CardGroup.moveToHand start at the draw pile,
                -- at .12 against the source's ordinary .75 hand scale.
                local pile=previousPiles[instance.uid]
                if pile=='discard'and recentDrawOrigins[instance.uid]then pile='draw'end
                local start=pile=='discard'and L.discardPile.position
                    or pile=='exhaust'and{L.topBar.exhaustIcon[1],L.topBar.y}or L.drawPile.position
                entry.current={x=start[1],y=start[2],scale=0.12/0.75,angle=0}
            end
            handPoses[instance.uid]=entry
        end
        entry.box,entry.target,entry.visible=box,target,true
        applyHandPose(entry,handGeometryOwner)
        return {entry.current.x,entry.current.y}
    end
    local function writeName(box, card)
        local instance = card.instance
        CardDisplay.writeTitle(box:GetChild("name"), card.display.name, card.upgraded,
            repeatCount(card.definition, instance),box:GetChild("type"),
            typeNames[card.definition.type] or card.definition.type)
        ink(box:GetChild("name"), titleInk)
    end

    local function writeDetails(box, card, battle, aimUid, aimTarget)
        local definition, enabled = card.definition, card.playable
        local text = bodyText(view,card,battle,aimUid,aimTarget)
        CardDisplay.writeBody(box:GetChild("label"), text,box)
        ink(box:GetChild("label"), Theme.cardSkin.text.body or C.text)
        box:GetChild("cost").text = card.missing and '—' or costText(definition)
        ink(box:GetChild("cost"), enabled and C.energy or C.danger)
        tint(box:GetChild("costDisc"), enabled and C.energy or C.energyEmpty)
    end

    local function writeFrame(box, card, hovered)
        local definition, enabled = card.definition, card.playable
        tint(box:GetChild("border"), (card.selected or hovered) and C.goldBright
            or enabled and (C.rarity[definition.rarity] or C.line) or C.line)
        -- The title banner and its rule carry rarity, as on the original cards.
        M.paintBanner(box,definition,tint)
        tint(box:GetChild("nameRule"), C.rarity[definition.rarity] or C.line)
        tint(box:GetChild("artPlate"), enabled and (C.cardType[definition.type] or C.panelRaised) or C.panelSunken)
        CardDisplay.writeArt(box:GetChild("art"), definition, picture,box)
        if view.active==false then CardDisplay.clearNativeArt(box)
        else CardDisplay.writeNativeArt(box,definition,card.display.nativeArt,controls.platform,box:GetChild('art'),
            card.instance and card.instance.uid)end
    end

    local function place(box, card, context, i)
        local pose
        if context.reward and not context.fighting then
            pose = placeReward(box, #context.rewards, i, view.rewardView.cards[i], view.hover == i)
        else
            local count = context.fighting and #context.battle.hand or #context.rewards
            local hot=card.selected==true or context.active and view.hover==i
            pose=card.instance and handPose(box,card.instance,count,i-1,hot) or placeCard(box,count,i-1,hot)
        end
        if card.instance then view.cardPositions[card.instance.uid] = pose end
    end

    local function slotCard(context, instance, id, slot)
        local definition=cardDefinition(context.data, context.battle, instance, id)
        local display=context.presentation[id]
        local missing,upgraded
        if context.reward then definition,display,missing,upgraded=rewardFace(context,definition,display,id,slot)
        else assert(display,'missing card presentation '..id);upgraded=instance and instance.upgraded end
        local playable,reason=not missing and context.reward,nil
        if not missing and not context.reward then
            playable,reason=Combat.canPlay(context.battle,instance.uid,view.target)
        end
        return {
            instance = instance,
            definition = definition,display = display,missing=missing,upgraded=upgraded,
            -- Temporary busy/overlay input locks must not invent rule warnings.
            playable = playable,enabled = context.active and playable,blockReason=reason,
            selected = instance and instance.uid == view.selected,
        }
    end

    local function writeSkin(box,card,context,hovered)
        local base=card.instance and context.battle.catalog.cards[card.instance.cardId] or card.definition
        local printed=card.upgraded and base.upgrade and base.upgrade.cost or base.cost
        CardSkin.apply(box,card.definition,controls.platform,{dim=not card.playable,selected=card.selected or hovered,
            cost=card.definition.cost,baseCost=printed,blockReason=card.blockReason,surfaceScope='battle'})
        if Theme.presentationProfile=='official-assets-first' then
            local rim=assert(box:GetChild('nativePlayableRim'),'official playable rim is required')
            local ready=context.active and canAimCard(card,context.battle)
            rim:SetVisible(ready)
            CardGlow.bind(box,rim,ready,controls.platform,card.selected,card.instance and card.instance.uid or 'preview')
        end
    end

    local function renderSlot(context, i, aimUid, aimTarget)
        local box = child("card" .. i)
        if Theme.presentationProfile=='official-assets-first' then
            if glowBoxes[i] and glowBoxes[i]~=box then CardGlow.clear(glowBoxes[i])end
            glowBoxes[i]=box
        end
        local instance = context.fighting and context.battle.hand[i]
        local id = instance and instance.cardId or context.rewards[i]
        box:SetVisible(id ~= nil and id ~= false)
        if not id then CardGlow.clear(box);CardDisplay.clearNativeArt(box);return end
        local card = slotCard(context, instance, id, i)
        writeName(box, card)
        writeDetails(box, card, context.battle, aimUid, aimTarget)
        local hovered = view.hover == i and (context.reward or context.active)
        writeFrame(box, card, hovered)
        writeSkin(box,card,context,hovered)
        place(box, card, context, i)
        return card, (card.selected or hovered) and box or nil
    end

    local function renderCards(data, presentation, battle, fighting, active, reward, picking)
        local context = { data = data, presentation = presentation, battle = battle, fighting = fighting,run=view.run,
            active = active, reward = reward, rewards = picking and Run.rewardOptions(view.run) or {} }
        local aimUid, aimTarget = currentAim(view,dragTarget)
        local current=fighting and view.run and view.run.combat
        syncHandViewport(current)
        handTurn,handCount=handMetadata(current)
        recentDrawOrigins,eventTail=reshuffledOrigins(fighting and battle,eventTail)
        for _,entry in pairs(handPoses) do entry.visible=false end
        view.cardPositions = {}
        local playable, selectedBox = false, nil
        for i = 1, 10 do
            local card, hotBox = renderSlot(context, i, aimUid, aimTarget)
            if card then playable = playable or card.enabled end
            selectedBox = hotBox or selectedBox
        end
        for uid,entry in pairs(handPoses) do if not entry.visible then handPoses[uid]=nil end end
        previousPiles=pileMembership(fighting and battle)
        openingHand=false
        if selectedBox then selectedBox:SetAsLastSibling() end
        return playable
    end
    local function geometryPorts()
        return {battle=handBattle,turn=handTurn,count=handCount,width=handWidth,height=handHeight,poses=handPoses,child=child,handPose=handPose}
    end
    local function refreshHover(previous,nextSlot)
        return refreshHandHover(view,geometryPorts(),previous,nextSlot)
    end

    -- Only the drawn reading frame is constrained; targeting and release still
    -- use the untouched pointer. Cost/title native lines extend past the body.
    local function readableDragPosition(x, y, scale)
        local card = L.card
        local w, h, d = card.size[1], card.size[2], card.costDisc
        local cx = -w/2+d/2-card.trim.costOverhang
        local cy = h/2-d/2+card.trim.costOverhang
        local radius = math.max(d+card.trim.costRing,L.nativeText.lineHeight)/2
        local tx, ty = card.title.position[1], card.title.position[2]
        local titleH = math.max(card.nameBand,L.nativeText.lineHeight)/2
        local left = math.min(-w/2,cx-radius,tx-card.title.width/2)*scale
        local right = math.max(w/2,cx+radius,tx+card.title.width/2)*scale
        local bottom = math.min(-h/2,cy-radius,ty-titleH)*scale
        local top = math.max(h/2,cy+radius,ty+titleH)*scale
        local sx, sy = Theme.canvas.base[1]/2-Theme.canvas.safe.x, Theme.canvas.base[2]/2-Theme.canvas.safe.y
        return math.max(-sx-left,math.min(sx-right,x)), math.max(-sy-bottom,math.min(sy-top,y))
    end

    local function placeDraggedCard(box, g, aiming, dt)
        handGeometry[box]=nil
        local x, y = dragPose(g)
        local h = L.card.size[2] * D.scale
        local entry=handPoses[g.uid]
        local prev=entry and entry.current
        local sourceAim=aiming and not g.touchScreen and Theme.presentationProfile=='official-assets-first'
        -- Mouse carry parks under the line. A held finger keeps its continuous
        -- pickup pose; the reticle remains the authoritative pointer/target.
        if aiming and not g.touchScreen then
            local floor = -Theme.canvas.base[2]/2 + Theme.canvas.safe.y + h/2
            x, y = g.origin[1], math.max(floor,(g.touchScreen and 260 or 126)*g.sourceScale-Theme.canvas.base[2]/2)
            -- AbstractPlayer 1169–1170 parks mouse targeting at WIDTH/2,
            -- 126*scale; AbstractCard 936–937 moves there once per real dt.
            if sourceAim then x,y=sourceAimPosition(g,prev,y,dt) end
        end
        local scale=draggedScale(prev,sourceAim,dt)
        x,y=readableDragPosition(x,y,scale)
        box:SetAnchoredPosition(x, y)
        box:SetLocalScale(scale, scale, 1)
        box.localRotationZ = 0
        if entry then entry.current={x=x,y=y,scale=scale,angle=0} end
        return x, y, h
    end

    -- STS TargetArrow 行为参考：箭头终点在换目标时平滑插值而非瞬移，
    -- 点链沿曲线持续流向目标，锁定时准星轻微收缩脉冲。只读 dragTarget 结果，不改输入规则。
    local aim = {phase = 1, lock = nil, target = nil}
    local function aimEndpoint(g, target, enemy)
        if enemy then
            local tx, _, portrait, _, ty = enemyPosition(g.battle, target)
            ty = ty or L.enemyRow.y
            if aim.target ~= target then
                -- 首次锁定直接落点；敌人之间切换从上次画出的终点出发插值。
                aim.from = not (view.fastMode and touchSourceAim(g)) and (aim.target and aim.ex) and {aim.ex, aim.ey} or nil
                aim.target, aim.lock, aim.blend = target, 0, aim.from and 0 or 1
            end
            local k = aim.blend or 1
            if aim.from and k < 1 then
                local e = 1-(1-k)*(1-k)*(1-k)
                tx, ty = aim.from[1]+(tx-aim.from[1])*e, aim.from[2]+(ty-aim.from[2])*e
            end
            aim.ex, aim.ey = tx, ty
            return tx, ty, portrait + D.reticlePad
        end
        -- 未锁定时终点紧贴手指，避免自由瞄准产生拖尾延迟。
        aim.target, aim.lock, aim.from, aim.ex, aim.ey = nil, nil, nil, nil, nil
        return g.x, g.y, D.aimDot[2] * 2
    end

    local function renderReticle(layer, aiming, ex, ey, ring, enemy)
        local reticle = layer:GetChild("reticle")
        -- Original targeting uses the arrow head and the creature's corner marks.
        reticle:SetVisible(aiming == true and Theme.presentationProfile~='official-assets-first')
        reticle:SetAnchoredPosition(ex, ey)
        reticle:SetSizeDelta(ring, ring)
        tint(reticle, enemy and C.danger or C.textDim)
        -- 锁定脉冲：从 aimLockPulse 倍缩回 1（ease-out），之后极轻呼吸。
        local pulse = 1
        if enemy and aim.lock then
            local p = D.aimLockPulse or {1, 0.18, 0}
            local k = math.min(1, aim.lock/p[2])
            pulse = 1 + (p[1]-1)*(1-k)*(1-k) + (k >= 1 and p[3]*math.sin(aim.lock*6.283) or 0)
        end
        reticle:SetLocalScale(pulse, pulse, 1)
    end

    local function renderPotionDrag(potion)
        local layer=child('dragLayer')
        local _,target,aiming=controls.potionTarget(potion)
        show('dragLayer',true);layer:GetChild('hit'):SetVisible(true);layer.disableCursorEventPassthrough=true
        layer:GetChild('line'):SetVisible(false);layer:GetChild('hint').text=''
        local enemy=target and potion.battle.enemies[target]
        local ex,ey,ring=aimEndpoint(potion,target,enemy)
        renderReticle(layer,aiming,ex,ey,ring,enemy)
        local arrowY=Theme.presentationProfile=='official-assets-first' and ey or ey-(enemy and ring/2 or 0)
        AimArrow.render(layer,aiming,potion.origin[1],potion.origin[2],ex,arrowY,enemy,tint,aim.phase,aim.lock)
        layer:SetAsLastSibling()
    end
    local function renderActivePotion(g)
        local potion=not g and view.potionAim
        if potion and potion.moving then renderPotionDrag(potion);return true end
        return false
    end
    local function renderDrag(valid, target, aiming, resolved, dt)
        local g = view.gesture or view.carry
        if renderActivePotion(g) then return end
        show("dragLayer", g ~= nil and g.moving == true)
        if g and g.moving then
            local box = child("card" .. g.slot)
            if not resolved then valid, target, aiming = dragTarget(g) end
            local x, y, h = placeDraggedCard(box, g, aiming, dt)
            if Theme.presentationProfile=='official-assets-first' then view.cardPositions[g.uid]={x,y} end
            box:GetChild("glow"):SetVisible(valid == true)
            local layer = child("dragLayer")
            -- STS 不画出牌阈线：越线反馈只靠卡牌自身的 glow（AbstractCard.isGlowing 式），不再显示细长金线。
            layer:GetChild('line'):SetVisible(false)
            layer:GetChild('hit'):SetVisible(view.gesture ~= nil)
            layer.disableCursorEventPassthrough = view.gesture ~= nil
            -- 隐藏线仍跟随权威阈值定位（触屏卡面上移 270*scale），只作几何锚点。
            local lineY = g.touchScreen and g.dropStart or math.min(g.hoverStartLine,g.dropStart)
            if g.touchScreen then lineY = lineY + 270*g.sourceScale end
            layer:GetChild('line'):SetAnchoredPosition(0,lineY)
            local enemy = target and g.battle.enemies[target]
            -- Card glow and reticle already say "release to play"; no caption over the card.
            layer:GetChild("hint").text = ""
            -- Dotted arc from the card's top edge to the reticle (or the bare pointer).
            local ex, ey, ring = aimEndpoint(g, target, enemy)
            renderReticle(layer, aiming, ex, ey, ring, enemy)
            local sx, sy = aimStart(g,x,y,h)
            local fy = ey-(enemy and ring/2 or 0)
            if Theme.presentationProfile=='official-assets-first' then fy=ey end
            AimArrow.render(layer, aiming, sx, sy, ex, fy, enemy, tint, aim.phase,aim.lock)
            layer:SetAsLastSibling()
            g.drawn, g.drawnValid, g.drawnTarget, g.drawnAiming = true, valid, target, aiming
        end
    end
    local function advanceAim(held,dt)
        if not held then aim.phase, aim.target, aim.lock, aim.from = 1, nil, nil, nil;return end
        if not (held.moving and held.drawnAiming) then return end
        if view.fastMode and not (Theme.presentationProfile=='official-assets-first' and not held.touchScreen) then return end
        aim.phase = (aim.phase + dt*(D.aimFlow or 0)) % 1
        if aim.lock then aim.lock = aim.lock + dt end
        if aim.blend and aim.blend < 1 then aim.blend = math.min(1, aim.blend + dt/(D.aimRetarget or 0.12)) end
        renderDrag(held.drawnValid, held.drawnTarget, held.drawnAiming, true, dt)
    end
    local function refreshAim(g,valid,target,aiming)
        local battle=localAimBattle(view,geometryPorts(),g)
        if not battle or view.info or not controls.renderAimActors then return false end
        -- Fresh card values for the owned UID; no retained core snapshot/preview.
        local context={data=view.data,presentation=view.presentation,battle=battle,fighting=true,run=view.run,active=true,rewards={}}
        controls.renderAimActors(context)
        local _,top=renderSlot(context,g.slot,g.uid,target)
        if top then top:SetAsLastSibling()end
        renderDrag(valid,target,aiming,true)
        return true
    end
    local function update(dt)
        for i=1,10 do local box=child('card'..i);CardSkin.tick(box,dt);CardGlow.tick(box,dt)end
        if not handBattle or dt<=0 then return end
        local held=view.gesture or view.carry
        advanceAim(held,dt)
        for uid,entry in pairs(handPoses) do
            if not (held and held.moving and held.uid==uid) then
                advancePose(entry,dt,view.fastMode==true)
                applyHandPose(entry,handGeometryOwner)
                view.cardPositions[uid]={entry.current.x,entry.current.y}
            end
        end
    end
    local function destroy()
        for _,box in pairs(glowBoxes)do CardGlow.clear(box)end
        glowBoxes={}
    end
    return { renderCards = renderCards, renderDrag = renderDrag, refreshHover=refreshHover, refreshAim=refreshAim, update = update, destroy=destroy }
end
return M
