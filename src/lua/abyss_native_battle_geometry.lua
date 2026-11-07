-- One local arena owns projections. Shadow actors resolve the same immutable actor ID.
local M={}
local enabled=false
local actors=setmetatable({},{__mode='k'})
local ids=setmetatable({},{__mode='v'})
local function finite(value)return type(value)=='number' and value==value and value>-math.huge and value<math.huge end
function M.configure(value)
 enabled=value==true
 if not enabled then M.clear()end
end
function M.enabled()return enabled end
function M.clear()
 actors=setmetatable({},{__mode='k'});ids=setmetatable({},{__mode='v'})
end
function M.bind(actor,rect)
 assert(type(actor)=='table' and type(actor.id)=='string','native geometry needs an actor identity')
 for _,key in ipairs({'x','y','width','height'})do assert(finite(rect[key]),'invalid native projection '..key)end
 assert(rect.width>0 and rect.height>0,'native projection must have a positive area')
 local width,height=rect.width,rect.height
 local healthWidth=math.max(100,math.min(140,width))
 local healthY=height/2+18
 local g={native=true,x=rect.x,y=rect.y,portrait=math.max(width,height),
  hitX=rect.x,hitY=rect.y,hitWidth=width,hitHeight=height,
  nameX=0,nameY=healthY+26,sourceScale=1,
  healthX=0,healthY=healthY,healthTextY=healthY+1,healthWidth=healthWidth,healthHeight=14,
  blockX=-healthWidth/2-24,blockY=healthY,blockTextY=healthY+1,blockWidth=44,blockHeight=40,
  intentX=0,intentY=healthY+72,intentWidth=80,intentHeight=80,intentHitWidth=64,intentHitHeight=64}
 local record={geometry=g};actors[actor]=record;ids[actor.id]=record
 return g
end
function M.get(actor)
 if not enabled or not actor then return nil end
 local record=actors[actor] or ids[actor.id]
 return record and record.geometry
end
function M.unbind(actor)
 local record=actors[actor]
 if record and ids[actor.id]==record then ids[actor.id]=nil end
 actors[actor]=nil
end
return M
