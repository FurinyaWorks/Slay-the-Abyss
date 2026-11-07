-- Locked native camera -> centered, Y-up stage coordinates. No entity/rule writes.
local M={}
function M.body(feet,body,camera,uiHeight)
 local yaw,pitch=math.rad(camera.yaw),math.rad(camera.pitch)
 local sy,cy,sp,cp=math.sin(yaw),math.cos(yaw),math.sin(pitch),math.cos(pitch)
 local focal=(uiHeight or camera.canvas[2])/2/math.tan(math.rad(camera.fieldOfView)/2)
 local left,right,bottom,top=math.huge,-math.huge,math.huge,-math.huge
 for _,side in ipairs({-1,1})do for _,height in ipairs({0,body.height})do
  local x,y,z=feet[1]+side*body.width/2-camera.focus[1],feet[2]+height-camera.focus[2],feet[3]-camera.focus[3]
  local depth=camera.distance+x*sy*cp-y*sp+z*cy*cp
  assert(depth>0,'native actor behind camera')
  local px,py=(x*cy-z*sy)*focal/depth,(x*sy*sp+y*cp+z*cy*sp)*focal/depth
  left,right,bottom,top=math.min(left,px),math.max(right,px),math.min(bottom,py),math.max(top,py)
 end end
 return {x=(left+right)/2,y=(bottom+top)/2,width=right-left,height=top-bottom}
end
return M
