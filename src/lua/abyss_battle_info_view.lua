-- Detail pagination and native layout. This module neither handles input nor changes combat.
local Actors = require("abyss_actor")
local Theme = require("abyss_theme")
local number = require("abyss_numbers").integer
local M = {}
local UnitView=require("abyss_battle_unit_view")
local C, L, S = Theme.color, Theme.layout, Theme.space
local I = L.statusInfo

local function openPage(paging)
    paging.page = {items = {}, rows = 0, sections = 0}
    paging.pages[#paging.pages + 1] = paging.page
    paging.used = 0
end

local function needsPage(page, used, head, height, budget)
    return page.rows > 0 and (page.rows >= I.rows or used + head + height > budget
        or head > 0 and page.sections >= I.sections)
end

local function sectionLabel(paging, section, continued)
    local page = paging.page
    page.items[#page.items + 1] = {label = section.label .. (continued and "（续）" or ""), colour = section.colour}
    page.sections, paging.used = page.sections + 1, paging.used + I.section
end

function M.paginator(lines)
    local function appendSection(paging, section)
        local labelled, continued = false, false
        for _, row in ipairs(section.rows) do
            row.textLines, row.noteLines = lines(row.text,paging.width,paging.font), lines(row.note,paging.width,paging.font)
            local height = I.name + (row.textLines + row.noteLines) * I.line + I.entryGap
            local head = section.label and not labelled and I.section or 0
            if needsPage(paging.page, paging.used, head, height, paging.budget) then
                openPage(paging)
                continued, labelled = labelled, false
            end
            if section.label and not labelled then
                sectionLabel(paging, section, continued)
                labelled = true
            end
            local page = paging.page
            page.items[#page.items + 1] = {row = row}
            page.rows, paging.used = page.rows + 1, paging.used + height
        end
    end

    return function(card,width,font)
        local room = Theme.canvas.base[2] - L.topBar.height - S.s - Theme.canvas.safe.y
        local heading=card.keywordOnly and 0 or I.header+I.summary+I.divider
        local paging = {pages = {}, used = 0, width=width,font=font,budget = room - I.pad * 2 - heading - I.footer}
        openPage(paging)
        for _, section in ipairs(card.sections) do appendSection(paging, section) end
        return paging.pages
    end
end

local function footerText(info, pages)
    return not info.transient and (#pages > 1 and "第 " .. info.page .. "/" .. #pages .. " 页 · 点按卡片翻页"
        or "点按任意处关闭") or #pages > 1 and "共 " .. #pages .. " 页 · 点击查看全部" or nil
end

local function pageHeight(card, page, footer)
    local body = card.empty and I.section or 0
    for _, item in ipairs(page.items) do
        body = body + (item.label and I.section or I.name + (item.row.textLines + item.row.noteLines) * I.line + I.entryGap)
    end
    local heading=card.keywordOnly and 0 or I.header+I.summary+I.divider
    return I.pad * 2 + heading + body + (footer and I.footer or 0)
end

local function place(panel, name, x, y, width, height)
    local part = panel:GetChild(name)
    part:SetAnchoredPosition(x, y)
    if width then part:SetSizeDelta(width, height) end
    return part
end

local function detailActor(battle, info)
    return info and battle and (info.index == 0 and battle.player or battle.enemies[info.index])
end

function M.new(self, child, enemyPosition, describeInfo, paginate, tint, ink, picture)
    local textStyles={}
    local function readingSize(control,name,font)
        local original=textStyles[name]
        if not original then
            original={font=control.fontSize or Theme.font.reading,minimum=control.minimumFontSize or Theme.font.minimum}
            textStyles[name]=original
        end
        control.fontSize=font or original.font
        control.minimumFontSize=font and math.min(original.minimum,font) or original.minimum
    end
    local function handAnchor(battle,info)
        if not (info.transient and info.kind=='card')then return end
        for slot,card in ipairs(battle.hand)do
            if card.uid==info.uid then
                local pose=self.cardPositions[card.uid]
                if not pose then return end
                local box=child('card'..slot)
                local r=(box.localRotationZ or 0)*math.pi/180
                local w,h=L.card.size[1]*(box.localScaleX or 1),L.card.size[2]*(box.localScaleY or 1)
                return {x=pose[1],y=pose[2],halfW=(math.abs(math.cos(r))*w+math.abs(math.sin(r))*h)/2,
                    halfH=(math.abs(math.cos(r))*h+math.abs(math.sin(r))*w)/2}
            end
        end
    end
    local function pageGeometry(battle, info, height, anchor, width, font)
        local x, portrait
        if anchor then
            local right=anchor.x+anchor.halfW+I.cardHoverGap
            local left=anchor.x-anchor.halfW-I.cardHoverGap
            local limit=Theme.canvas.base[1]/2-Theme.canvas.safe.x
            x=(anchor.x>Theme.canvas.base[1]/4 or right+width>limit) and left-width/2 or right+width/2
        elseif info.index == 0 then
            x, portrait = L.player.position[1], L.player.portrait
            x = x + portrait / 2 + S.l + I.width / 2
        else
            local enemyX, _, size = enemyPosition(battle, info.index)
            x, portrait = enemyX - size / 2 - S.l - I.width / 2, size
        end
        width=width or I.width
        local edge = Theme.canvas.base[1] / 2 - Theme.canvas.safe.x - width / 2
        x = math.max(-edge, math.min(edge, x))
        local top = Theme.canvas.base[2] / 2 - L.topBar.height - S.s
        local heroY=L.player.position[2]+UnitView.noticeLift(battle.player,L.player.portrait,L.player.position[2],true)
        local unitY = info.index == 0 and heroY or select(5,enemyPosition(battle,info.index)) or L.enemyRow.y
        local cardTop=anchor and anchor.y+anchor.halfH or unitY+portrait/2
        local y = math.min(top - height / 2, cardTop - height / 2)
        y = math.max(-Theme.canvas.base[2] / 2 + Theme.canvas.safe.y + height / 2, y)
        return {x = x, y = y, height = height, width=width,reading=font,line = L.nativeText.lineHeight, inner = width - I.pad * 2,
            left = x - width / 2 + I.pad, right = x + width / 2 - I.pad,
            cursor = y + height / 2 - I.pad, sections = 0, rows = 0}
    end

    local function frame(panel, card, geometry)
        local x, y, height = geometry.x, geometry.y, geometry.height
        place(panel, "shadow", x + S.s, y - S.s, geometry.width + S.border * 2, height + S.border * 2)
        place(panel, "border", x, y, geometry.width + S.border * 2, height + S.border * 2)
        place(panel, "plate", x, y, geometry.width, height)
        place(panel, "page", x, y, geometry.width, height)
        tint(place(panel, "accent", x, y + height / 2 - I.accent / 2, geometry.width, I.accent), card.accent)
    end

    local function header(panel, card, geometry)
        panel:GetChild('title'):SetVisible(not card.keywordOnly)
        panel:GetChild('tag'):SetVisible(not card.keywordOnly and not geometry.reading)
        if card.keywordOnly then return end
        local titleWidth=geometry.inner-(geometry.reading and 0 or I.tagWidth)
        local title = place(panel, "title", geometry.left + titleWidth / 2, geometry.cursor - I.header / 2,titleWidth,geometry.line)
        title.text = card.title
        local tag = place(panel, "tag", geometry.right - I.tagWidth / 2, geometry.cursor - I.header / 2)
        tag:SetVisible(not geometry.reading)
        tag.text = card.tag
        ink(tag, card.accent)
        geometry.cursor = geometry.cursor - I.header
    end

    local function vitals(panel, card, geometry, summary, mid, glyph)
        local left, inner, line = geometry.left, geometry.inner, geometry.line
        place(panel, "hpIcon", left + glyph / 2, mid)
        place(panel, "summary", left + glyph + S.xs + (inner / 2 - glyph - S.xs) / 2, mid, inner / 2 - glyph - S.xs, line)
        summary.text = "生命 " .. number(card.hp) .. "/" .. number(card.maxHp)
        ink(summary, C.text)
        place(panel, "blockIcon", left + inner / 2 + glyph / 2, mid)
        local guard = place(panel, "guard", left + inner / 2 + glyph + S.xs + (inner / 2 - glyph - S.xs) / 2, mid, inner / 2 - glyph - S.xs, line)
        guard.text = "格挡 " .. number(card.block)
        ink(guard, card.block > 0 and C.block or C.textMuted)
        tint(panel:GetChild("blockIcon"), card.block > 0 and C.block or C.textMuted)
    end

    local function summaryLine(panel, card, geometry)
        for _,name in ipairs({'summary','rule'})do panel:GetChild(name):SetVisible(not card.keywordOnly)end
        if card.keywordOnly then
            for _,name in ipairs({'hpIcon','blockIcon','guard'})do panel:GetChild(name):SetVisible(false)end
            return
        end
        local mid, glyph = geometry.cursor - I.summary / 2, Theme.font.label
        local summary = panel:GetChild("summary")
        for _, name in ipairs({"hpIcon", "blockIcon", "guard"}) do panel:GetChild(name):SetVisible(card.hp ~= nil) end
        if card.hp then
            vitals(panel, card, geometry, summary, mid, glyph)
        else
            place(panel, "summary", geometry.x, mid, geometry.inner, geometry.line)
            summary.text = card.subtitle
            ink(summary, C.textDim)
        end
        geometry.cursor = geometry.cursor - I.summary
        place(panel, "rule", geometry.x, geometry.cursor - I.divider / 2,geometry.inner,S.hairline)
        geometry.cursor = geometry.cursor - I.divider
    end

    local function emptySection(panel, card, geometry)
        if card.empty then
            geometry.sections = 1
            local label = place(panel, "section1", geometry.x + S.xs + S.s, geometry.cursor - I.section / 2)
            label.text = card.empty
            ink(label, C.textMuted)
            panel:GetChild("sectionMark1"):SetVisible(false)
            panel:GetChild("section1"):SetVisible(true)
            geometry.cursor = geometry.cursor - I.section
        end
    end

    local function section(panel, item, geometry)
        geometry.sections = geometry.sections + 1
        local mark = place(panel, "sectionMark" .. geometry.sections, geometry.left + S.xs / 2, geometry.cursor - I.section / 2)
        local label = place(panel, "section" .. geometry.sections, geometry.x + S.xs + S.s, geometry.cursor - I.section / 2,geometry.inner,geometry.line)
        tint(mark, item.colour)
        label.text = item.label
        ink(label, item.colour)
        mark:SetVisible(true)
        label:SetVisible(true)
        geometry.cursor = geometry.cursor - I.section
    end

    local function detailRow(panel, row, geometry, textX)
        geometry.rows = geometry.rows + 1
        local i = geometry.rows
        local icon = place(panel, "icon" .. i, geometry.left + I.icon / 2, geometry.cursor - I.name / 2)
        picture(icon, row.icon and type(row.icon) == "number" and row.icon
            or row.status and Theme.icon.status[row.status]
            or Theme.icon.intent[row.icon or row.intent] or Theme.icon.intent.unknown)
        tint(icon, row.colour)
        local name = place(panel, "name" .. i, textX, geometry.cursor - I.name / 2,geometry.inner-I.icon-I.gap,geometry.line)
        name.text = row.name
        ink(name, row.colour)
        local rowTag = place(panel, "tag" .. i, geometry.right - I.tagWidth / 2, geometry.cursor - I.name / 2)
        rowTag.text = row.tag or ""
        geometry.cursor = geometry.cursor - I.name
        local text = place(panel, "text" .. i, textX, geometry.cursor - row.textLines * I.line / 2,
            geometry.inner - I.icon - I.gap, math.max(geometry.line, row.textLines * I.line + I.line))
        text.text = row.text
        readingSize(text,'text'..i,geometry.reading)
        geometry.cursor = geometry.cursor - row.textLines * I.line
        local note = place(panel, "note" .. i, textX, geometry.cursor - row.noteLines * I.line / 2,
            geometry.inner - I.icon - I.gap, math.max(geometry.line, row.noteLines * I.line + I.line))
        note.text = row.note or ""
        readingSize(note,'note'..i,geometry.reading)
        geometry.cursor = geometry.cursor - row.noteLines * I.line - I.entryGap
        for _, part in ipairs({icon, name, rowTag, text, note}) do part:SetVisible(true) end
        note:SetVisible(row.note ~= nil)
    end

    local function pageItems(panel, card, page, geometry)
        emptySection(panel, card, geometry)
        local textX = geometry.left + I.icon + I.gap + (geometry.inner - I.icon - I.gap) / 2
        for _, item in ipairs(page.items) do
            if item.label then section(panel, item, geometry)
            else detailRow(panel, item.row, geometry, textX) end
        end
    end

    local function hideUnused(panel, geometry)
        for i = geometry.sections + 1, I.sections do
            panel:GetChild("sectionMark" .. i):SetVisible(false)
            panel:GetChild("section" .. i):SetVisible(false)
        end
        for i = geometry.rows + 1, I.rows do
            for _, name in ipairs({"icon", "name", "tag", "text", "note"}) do panel:GetChild(name .. i):SetVisible(false) end
        end
    end

    local function finish(panel, info, geometry, footer)
        local more = panel:GetChild("more")
        more:SetVisible(footer ~= nil)
        more:SetAnchoredPosition(geometry.x, geometry.y - geometry.height / 2 + I.pad + I.footer / 2)
        more.text = footer or ""
        more:SetSizeDelta(geometry.inner,geometry.line)
        panel:SetVisible(true)
        panel:GetChild("hit"):SetVisible(not info.transient)
        panel:GetChild("page"):SetVisible(not info.transient)
        panel.disableCursorEventPassthrough = not info.transient
        panel:SetAsLastSibling()
    end

    local function transientHand(info)return info and info.transient and info.kind=='card'end
    local function positionContext(battle,info,positionOnly)
        if positionOnly and not transientHand(info)then return nil,true end
        local anchor=info and battle and handAnchor(battle,info)
        if positionOnly and anchor and info.sideAnchor then
            local prior=info.sideAnchor
            if prior.x==anchor.x and prior.y==anchor.y and prior.halfW==anchor.halfW and prior.halfH==anchor.halfH then return anchor,true end
        end
        return anchor,false
    end
    local function describedCard(battle,info)
        local actor = detailActor(battle, info)
        if not actor or actor.id~=info.id or not Actors.isPresent(actor)then return end
        return describeInfo(battle,info,actor)
    end
    return function(battle,positionOnly)
        local panel, info = child("statusInfo"), self.info
        local anchor,skip=positionContext(battle,info,positionOnly)
        if skip then return end
        local card=describedCard(battle,info)
        if not card then
            self.info = nil
            panel:SetVisible(false)
            return
        end
        if transientHand(info) and not anchor then
            self.info=nil;panel:SetVisible(false);return
        end
        local width=anchor and I.cardHoverWidth or I.width
        local font=anchor and I.cardHoverFont or nil
        local pages = paginate(card,width,font)
        info.page = math.max(1, math.min(info.page or 1, #pages))
        info.pages = #pages
        local page = pages[info.page]
        local footer = footerText(info, pages)
        local geometry = pageGeometry(battle, info, pageHeight(card, page, footer),anchor,width,font)
        frame(panel, card, geometry)
        header(panel, card, geometry)
        summaryLine(panel, card, geometry)
        pageItems(panel, card, page, geometry)
        hideUnused(panel, geometry)
        finish(panel, info, geometry, footer)
        info.sideAnchor=anchor
    end
end

return M
