-- Screen slots are presentation only. Every entry retains its core index/ID.
local Actors=require('abyss_actor')
local SourceGeometry=require('abyss_monster_source_geometry')
local Theme=require('abyss_theme')
local number=require('abyss_numbers').integer
local M={}
local L=Theme.layout
local function pendingFeedback(feedback,actor)
 if not feedback then return false end
 local current=feedback.current
 return feedback.escaping[actor.id] or feedback.dying[actor.id]
  or current and current.kind=='death' and current.detail.target==actor.id and not feedback.deaths[actor.id]
  or feedback.busy and not actor.escaped and not feedback.deaths[actor.id]
end
function M.slots(battle,feedback)
 local rows={}
 for index,actor in ipairs(battle.enemies)do
  if Actors.isPresent(actor)or pendingFeedback(feedback,actor)then
   rows[#rows+1]={index=index,id=actor.id,actor=actor}
  end
 end
 return rows
end
function M.find(battle,index,feedback)
 local rows=M.slots(battle,feedback)
 for slot,entry in ipairs(rows)do if entry.index==index then return entry,slot,#rows end end
end
-- AbstractMonster: drawX=WIDTH*.75+offsetX*xScale, drawY=340*yScale+offsetY*yScale.
-- Native anchored coordinates are centered and Y-up. Control slots never enter this transform.
-- The official native hand/status rectangles need a larger reserved lower lane
-- than the original atlas sprites. The theme owns that presentation adaptation.
M.floorY=Theme.presentationProfile=='official-assets-first' and L.enemyRow.nativeFloorY or L.enemyRow.floorY or 400
function M.powerLayout(g,mobile)
 local scale=g.sourceScale
 local icon=48*scale*(mobile and 1.17 or 1)
 local countY=-(mobile and 22 or 18)*scale
 local pitch=(mobile and 55 or 48)*scale
 local firstX=g.healthX-g.hitWidth/2+10*scale
 local columns,rowPitch=math.huge,0
 if Theme.presentationProfile=='official-assets-first' then
  local left=math.max(icon/2,(g.statusCountWidth or L.nativeText.lineHeight)-22*scale)
  local right=math.max(icon/2,22*scale)
  pitch=math.max(pitch,left+right)+L.statusIcon.gap
  columns=math.max(1,math.min(L.statusIcon.perRow,math.floor(((g.statusWidth or g.hitWidth)-left-right)/pitch)+1))
  firstX=g.healthX-(g.statusWidth or g.hitWidth)/2+left
  -- The top-aligned 40px native box has transparent leading below the text.
  -- Its 1.2em line fits inside the icon after compact lower-right placement.
  rowPitch=icon+L.statusIcon.gap
 else countY=countY-L.nativeText.lineHeight/2 end
 return {icon=icon,countX=22*scale,countY=countY,pitch=pitch,columns=columns,
  hitHeight=48*scale,firstX=firstX,rowPitch=rowPitch,
  firstY=g.healthY-math.max(g.healthHeight,Theme.font.small)/2-Theme.space.s-icon/2}
end
local function statusCountWidth(actor)
 local width=L.nativeText.lineHeight
 for _,entry in ipairs(Actors.statusView(actor))do
  width=math.max(width,utf8.len(number(entry.sourceAmount or entry.amount))*Theme.font.small)
 end
 return width
end
local function presentationScale(source,bottom,sy)
 if Theme.presentationProfile~='official-assets-first' then return sy end
 local hud=Theme.officialAssets.battleHud
 local top=hud.y-hud.height/2-Theme.space.s
 local line=math.max(L.nativeText.lineHeight,L.intent.size)
 local ceiling=top-line-Theme.space.xs
 return math.min(sy,math.max(1,ceiling-bottom)/math.max(source.width,source.height,source.hbY+source.height))
end
function M.geometry(actor)
 local source=SourceGeometry.resolve(actor)
 local sx,sy=Theme.canvas.base[1]/1920,Theme.canvas.base[2]/1080
 local x=(1440+source.x)*sx-Theme.canvas.base[1]/2
 local bottom=(M.floorY+source.y)*sy-Theme.canvas.base[2]/2
 local bodyScale=presentationScale(source,bottom,sy)
 local portrait=math.max(source.width,source.height)*bodyScale
 local hitX,hitBottom=x+source.hbX*bodyScale,bottom+source.hbY*bodyScale
 local rootY=bottom+portrait/2
 return {x=x,y=rootY,portrait=portrait,
  hitX=hitX,hitY=hitBottom+source.height*bodyScale/2,hitWidth=source.width*bodyScale,hitHeight=source.height*bodyScale,
  statusWidth=source.width*sx,statusCountWidth=Theme.presentationProfile=='official-assets-first' and statusCountWidth(actor)or L.nativeText.lineHeight,
  nameX=hitX-x,nameY=hitBottom-36*sy-rootY,sourceScale=sy,
  healthX=hitX-x,healthY=hitBottom-18*sy-rootY,healthTextY=hitBottom-17*sy-rootY,healthHeight=20*sy,
  blockX=hitX-source.width*bodyScale/2-14*sx-x,blockY=hitBottom-14*sy-rootY,blockTextY=hitBottom-16*sy-rootY,
  blockWidth=64*sx,blockHeight=64*sy,
  intentX=hitX-x+(actor.definitionId=='gremlin_nob' and -30*sx or 0),
  -- Full-bleed native glyphs and their 40px text line must clear both art and hitbox.
  intentY=math.max(portrait/2,hitBottom+source.height*bodyScale-rootY)+math.max(L.nativeText.lineHeight,L.intent.size)/2+Theme.space.xs,
  intentWidth=128*sx,intentHeight=128*sy,
  intentHitWidth=64*sx,intentHitHeight=64*sy}

end
function M.rowY(_,_,actor)return M.geometry(actor).y end
function M.position(_,_,actor)
 local g=M.geometry(actor)
 return g.x,L.battleUnit.nameWidth,g.portrait,g.hitWidth,g.y
end
local function fade(value,dt,speed)
 -- Exact decay preserves the [0,1] state domain for any legal frame delta.
 -- Euler overshoot made alpha negative after a long frame; exp10Out then
 -- exponentiated that state into an infinite native name Y coordinate.
 if value~=0 then value=value*math.exp(-dt*speed);if value<.01 then value=0 end end
 return value
end
function M.exp10Out(a)return 1-(2^(-10*a)-2^-10)/(1-2^-10)end
-- blocked: dying OR dragging a non-ENEMY hovered card.
-- hbAlpha multiplication occurs after geometry, exactly as original renderName.
function M.nameStep(timer,alpha,dt,bodyHovered,blocked,hbAlpha)
 -- Repeated inspection must reveal the complete name immediately, not replay a fade-in.
 timer=bodyHovered and 1 or fade(timer,dt,12)
 if blocked then return timer,alpha,nil end
 alpha=bodyHovered and 1 or fade(alpha,dt,3)
 local yOffset=-8*M.exp10Out(alpha)
 return timer,alpha*(hbAlpha or 1),yOffset
end
return M
