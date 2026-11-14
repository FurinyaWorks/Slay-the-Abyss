-- Small authored illustrations on existing icon/Actor owners; no gameplay state.
local Theme=require('abyss_theme')
local M={}
local painted=setmetatable({},{__mode='k'})
local function poolFor(icon)
 local parent=icon and icon.parent
 if not parent or parent.alive==false then return nil end
 local ok,pool=pcall(parent.GetChild,parent,icon.name..'Art')
 return ok and pool or nil
end
local function visible(control,value)return control:SetVisible(value)~=false end
local function current(pool,icon,state)
 return painted[pool]==state and pool.alive~=false and icon.alive~=false
  and icon.parent==state.parent and pool.parent==state.parent
end
local function check(pool,icon,state)
 if current(pool,icon,state)then return end
 local newer=painted[pool]
 if newer and pool.alive~=false and icon.alive~=false then
  newer.ready=false;visible(pool,false);visible(icon,true)
 end
 error('artwork ownership changed')
end
local function colour(pool,icon,state,control,r,g,b,a)
 local value=state.color(r,g,b,a);check(pool,icon,state)
 control.imageColor=value;check(pool,icon,state)
end
function M.paint(icon,kind,id,size,platform)
 local pool=poolFor(icon);if not pool then return false end
 local registry=Theme.lowCostArt and Theme.lowCostArt[kind]
 local asset=registry and registry.assets[id]
 if not asset or not platform.imageSource or not platform.color then
  painted[pool]=nil;visible(pool,false);visible(icon,true);return false
 end
 local old=painted[pool]
 if old and old.failed and old.asset==asset and old.size==size and old.source==platform.imageSource and old.color==platform.color then return false end
 if old and old.ready and old.asset==asset and old.size==size and old.source==platform.imageSource and old.color==platform.color then
  local ok=pcall(function()
   local accepted=visible(pool,true);check(pool,icon,old);assert(accepted)
   accepted=visible(icon,false);check(pool,icon,old);assert(accepted)
  end)
  if not ok and current(pool,icon,old)then old.ready=false;visible(pool,false);visible(icon,true)end
  return ok and current(pool,icon,old)
 end
 local token={asset=asset,size=size,source=platform.imageSource,color=platform.color,parent=icon.parent,pose=old and old.pose,dim=old and old.dim}
 painted[pool]=token
 local function owned()return current(pool,icon,token)end
 local function call(control,method,...)
  check(pool,icon,token)
  local accepted=control[method](control,...);check(pool,icon,token)
  assert(accepted~=false,'artwork setter rejected')
 end
 local ok=pcall(function()
  -- The imported sibling already shares the icon's authored anchor position.
  -- Native handles need not expose initial x/y getters before their first write.
  call(pool,'SetVisible',false)
  call(pool,'SetLocalScale',size/100,size/100,1)
  for i=1,registry.capacity do
   local control=pool:GetChild('shape'..(i-1));local shape=asset.shapes[i]
   if shape then
    call(control,'SetImage',platform.imageSource,shape.image)
    call(control,'SetAnchoredPosition',shape.x,shape.y);call(control,'SetSizeDelta',shape.w,shape.h)
    call(control,'SetLocalRotation',0,0,shape.rotation or 0)
    local c=shape.colour;colour(pool,icon,token,control,c.r,c.g,c.b,c.a or 255)
   end
   call(control,'SetVisible',shape~=nil)
  end
  call(pool,'SetVisible',true);call(icon,'SetVisible',false)
 end)
 if not ok and owned()then token.failed=true;visible(pool,false);visible(icon,true)end
 if ok and owned()then token.ready=true;return true end
 return false
end
function M.hide(icon,restore)
 local pool=poolFor(icon);if pool then painted[pool]=nil;visible(pool,false);if restore~=false then visible(icon,true)end end
end
function M.scale(icon,scale)
 local pool=poolFor(icon);local state=pool and painted[pool]
 if state then pool:SetLocalScale(state.size/100*scale,state.size/100*scale,1)end
end
function M.pose(box,x,y,sx,sy,tone,alpha)
 local icon=box:GetChild('portrait');local pool=poolFor(icon);local state=pool and painted[pool]
 if not state or not state.ready then return end
 local opacity=(state.dim or 1)*alpha
 local key=table.concat({tone.r,tone.g,tone.b,tone.a or 255,opacity},':')
 local ok=pcall(function()
  local accepted=pool:SetAnchoredPosition(x,y);check(pool,icon,state);assert(accepted~=false)
  accepted=pool:SetLocalScale(state.size/100*sx,state.size/100*sy,1);check(pool,icon,state);assert(accepted~=false)
  state.pose={x=x,y=y,sx=sx,sy=sy,tone=tone,alpha=alpha}
  if state.tone==key then return end
  for i,shape in ipairs(state.asset.shapes)do
   local c=shape.colour
   colour(pool,icon,state,pool:GetChild('shape'..(i-1)),math.floor(c.r*tone.r/255),math.floor(c.g*tone.g/255),
    math.floor(c.b*tone.b/255),math.floor((c.a or 255)*(tone.a or 255)/255*opacity))
  end
  state.tone=key
 end)
 if not ok and current(pool,icon,state)then state.ready=false;visible(pool,false);visible(icon,true)end
end
function M.dim(icon,alpha)
 local pool=poolFor(icon);local state=pool and painted[pool]
 if state then state.dim=alpha end
end
function M.refresh(box,tone)
 local icon=box:GetChild('portrait');local pool=poolFor(icon);local state=pool and painted[pool]
 if not state or not state.ready then return end
 local pose=state.pose
 if pose then M.pose(box,pose.x,pose.y,pose.sx,pose.sy,pose.tone,pose.alpha)
 else M.pose(box,icon.x or 0,icon.y or 0,icon.localScaleX or 1,icon.localScaleY or 1,tone,1)end
end
return M
