-- Locked native camera -> centered, Y-up stage coordinates. No entity/rule writes.
local M={}
local function finite(value)return type(value)=='number' and value==value and value>-math.huge and value<math.huge end
local function vector(value,name)
 assert(type(value)=='table' and #value==3,'native projection needs '..name..' vec3')
 local result={}
 for i=1,3 do assert(finite(value[i]),'non-finite native projection '..name);result[i]=value[i]end
 return result
end
local function cross(a,b)return {a[2]*b[3]-a[3]*b[2],a[3]*b[1]-a[1]*b[3],a[1]*b[2]-a[2]*b[1]}end
local function dot(a,b)return a[1]*b[1]+a[2]*b[2]+a[3]*b[3]end
local function scaled(value)
 local scale=math.max(math.abs(value[1]),math.abs(value[2]),math.abs(value[3]))
 assert(scale>0,'singular native projection basis')
 return {value[1]/scale,value[2]/scale,value[3]/scale},scale
end
function M.fromSamples(samples)
 assert(type(samples)=='table','native projection samples missing')
 local origin=vector(samples.origin,'origin')
 local right=vector(samples.rightStep,'rightStep')
 local up=vector(samples.upStep,'upStep')
 local forward=vector(samples.forward,'forward')
 local r,rs=scaled(right)
 local u,us=scaled(up)
 local f,fs=scaled(forward)
 local rows={cross(u,f),cross(f,r),cross(r,u)}
 local det=dot(r,rows[1])
 assert(finite(det) and math.abs(det)>1e-10,'singular native projection basis')
 local scales={rs,us,fs}
 for index,row in ipairs(rows)do
  for axis=1,3 do
   row[axis]=row[axis]/det/scales[index]
   assert(finite(row[axis]),'non-finite native projection inverse')
  end
 end
 local norm=math.sqrt(dot(r,r))
 return {origin=origin,rightStep=right,upStep=up,forward=forward,inverse=rows,
  rightUnit={r[1]/norm,r[2]/norm,r[3]/norm}}
end
function M.viewport(point,basis)
 local p=vector(point,'world point')
 if not basis.inverse then basis=M.fromSamples(basis)end
 local d={p[1]-basis.origin[1],p[2]-basis.origin[2],p[3]-basis.origin[3]}
 local a,b,c=dot(basis.inverse[1],d),dot(basis.inverse[2],d),dot(basis.inverse[3],d)
 assert(finite(a) and finite(b) and finite(c),'non-finite native projection coefficients')
 assert(c>0,'native actor behind camera')
 local x,y=.5+.1*a/c,.5+.1*b/c
 assert(finite(x) and finite(y),'non-finite native viewport position')
 return {u=x,v=y,depth=c}
end
local function dimensions(camera,uiHeight,uiWidth)
 local width,height=uiWidth or camera.canvas[1],uiHeight or camera.canvas[2]
 assert(finite(width) and finite(height) and width>0 and height>0,'invalid native UI dimensions')
 return width,height
end
local function nativeBody(feet,body,camera,uiHeight,uiWidth)
 local basis=camera.nativeBasis
 if not basis.inverse then basis=M.fromSamples(basis)end
 local width,height=dimensions(camera,uiHeight,uiWidth)
 local left,right,bottom,top=math.huge,-math.huge,math.huge,-math.huge
 for _,side in ipairs({-1,1})do for _,level in ipairs({0,body.height})do
  local offset=side*body.width/2
  local point={feet[1]+basis.rightUnit[1]*offset,feet[2]+basis.rightUnit[2]*offset+level,feet[3]+basis.rightUnit[3]*offset}
  local uv=M.viewport(point,basis)
  local x,y=(uv.u-.5)*width,(uv.v-.5)*height
  left,right,bottom,top=math.min(left,x),math.max(right,x),math.min(bottom,y),math.max(top,y)
 end end
 return {x=(left+right)/2,y=(bottom+top)/2,width=right-left,height=top-bottom}
end
function M.body(feet,body,camera,uiHeight,uiWidth)
 feet=vector(feet,'feet')
 assert(type(body)=='table' and finite(body.width) and finite(body.height) and body.width>0 and body.height>0,'invalid native body dimensions')
 if camera.nativeBasis then return nativeBody(feet,body,camera,uiHeight,uiWidth)end
 local _,height=dimensions(camera,uiHeight,uiWidth)
 for _,value in ipairs({camera.yaw,camera.pitch,camera.distance,camera.fieldOfView})do assert(finite(value),'non-finite native camera')end
 vector(camera.focus,'camera focus')
 assert(camera.fieldOfView>0 and camera.fieldOfView<180,'invalid native field of view')
 local yaw,pitch=math.rad(camera.yaw),math.rad(camera.pitch)
 local sy,cy,sp,cp=math.sin(yaw),math.cos(yaw),math.sin(pitch),math.cos(pitch)
 local focal=height/2/math.tan(math.rad(camera.fieldOfView)/2)
 local left,right,bottom,top=math.huge,-math.huge,math.huge,-math.huge
 for _,side in ipairs({-1,1})do for _,level in ipairs({0,body.height})do
  local x,y,z=feet[1]+side*body.width/2-camera.focus[1],feet[2]+level-camera.focus[2],feet[3]-camera.focus[3]
  local depth=camera.distance+x*sy*cp-y*sp+z*cy*cp
  assert(depth>0,'native actor behind camera')
  local px,py=(x*cy-z*sy)*focal/depth,(x*sy*sp+y*cp+z*cy*sp)*focal/depth
  left,right,bottom,top=math.min(left,px),math.max(right,px),math.min(bottom,py),math.max(top,py)
 end end
 return {x=(left+right)/2,y=(bottom+top)/2,width=right-left,height=top-bottom}
end
return M
