package.path='src/lua/?.lua;'..package.path
local P=require('abyss_native_projection')
local function near(a,b,epsilon)assert(math.abs(a-b)<=(epsilon or 1e-9),tostring(a)..' ~= '..tostring(b))end
local function rejects(fn,fragment)
 local ok,why=pcall(fn)
 assert(not ok and tostring(why):find(fragment,1,true),tostring(why))
end
-- Calibration source: .artifacts/native-visual-high-20261108/probe-log.json,
-- sourceHash 612895c1be93fb97a7daae689d34d00f91544b47202365d4618a572e9c99a8ad.
-- That print stream rounds world/UV values; the comparison allows 1e-5 UV.
local origin={-9.93229,3.80776,-3}
local forward={.99323,-.11618,0}
local norm=math.sqrt(forward[1]^2+forward[2]^2)
for i=1,3 do forward[i]=forward[i]/norm end
local right={0,0,-1}
local up={-forward[2],forward[1],0}
local samples={origin=origin,forward=forward,rightStep={},upStep={}}
for i=1,3 do samples.rightStep[i]=right[i]*.1/.73649235;samples.upStep[i]=up[i]*.1/1.30254762 end
local basis=P.fromSamples(samples)
local observed={
 {{0,.300065,0},.284915,.204553},
 {{3.2,.300065,0},.335738,.310365},
 {{0,.300065,3.2},.0554905,.204553},
 {{0,2.00006,0},.280699,.417056},
}
for _,row in ipairs(observed)do
 local uv=P.viewport(row[1],basis)
 near(uv.u,row[2],1e-5);near(uv.v,row[3],1e-5)
 assert(uv.depth>0)
end
local c=origin
local point={}
for i=1,3 do point[i]=c[i]+forward[i]+samples.rightStep[i] end
local uv=P.viewport(point,basis);near(uv.u,.6);near(uv.v,.5)
for i=1,3 do point[i]=c[i]+forward[i]+samples.upStep[i]end
uv=P.viewport(point,basis);near(uv.u,.5);near(uv.v,.6)
local skew={origin={2,3,4},rightStep={1,.5,0},upStep={0,2,.5},forward={.2,0,1}}
local skewPoint={}
for i=1,3 do skewPoint[i]=skew.origin[i]+1.25*skew.rightStep[i]-.75*skew.upStep[i]+2*skew.forward[i]end
uv=P.viewport(skewPoint,P.fromSamples(skew));near(uv.u,.5625);near(uv.v,.4625)
local detached=P.fromSamples(skew);skew.origin[1]=999;skew.rightStep[1]=999
near(detached.origin[1],2);near(detached.rightStep[1],1)
local camera={nativeBasis=basis,canvas={1280,720}}
local feet,body={0,.300065,0},{width=1,height=1.7}
local rect=P.body(feet,body,camera)
assert(rect.width>80 and rect.height>100,'native body uses camera-right width rather than world-X depth')
local resized=P.body(feet,body,camera,960,1280)
near(resized.x,rect.x);near(resized.width,rect.width)
near(resized.y,rect.y*4/3);near(resized.height,rect.height*4/3)
local wide=P.body(feet,body,camera,720,1920)
near(wide.x,rect.x*1.5);near(wide.width,rect.width*1.5)
near(wide.y,rect.y);near(wide.height,rect.height)
local raw=P.body(feet,body,{nativeBasis=samples,canvas={1280,720}})
near(raw.x,rect.x);near(raw.width,rect.width)
local behind={}
for i=1,3 do behind[i]=origin[i]-forward[i]*3 end
rejects(function()P.viewport(behind,basis)end,'behind camera')
rejects(function()P.viewport(origin,basis)end,'behind camera')
rejects(function()P.body(behind,body,camera)end,'behind camera')
rejects(function()P.viewport({0,0/0,0},basis)end,'non-finite')
rejects(function()P.body(feet,{width=math.huge,height=1},camera)end,'body dimensions')
rejects(function()P.body(feet,body,camera,720,math.huge)end,'UI dimensions')
rejects(function()P.fromSamples({origin={0,math.huge,0},forward={0,0,1},rightStep={1,0,0},upStep={0,1,0}})end,'non-finite')
rejects(function()P.fromSamples({origin={0,0,0},forward={0,0,1},rightStep={0,0,0},upStep={0,1,0}})end,'singular')
rejects(function()P.fromSamples({origin={0,0,0},forward={0,0,1},rightStep={1,0,0},upStep={2,0,0}})end,'singular')
rejects(function()P.fromSamples({origin={0,0,0},forward={0,0,1},rightStep={1,0,0},upStep={1,1e-12,0}})end,'singular')
-- Legacy fixed-camera consumers keep their original path and stage-height semantics.
local legacy={focus={3,1.3,0},distance=10,fieldOfView=42,yaw=0,pitch=12,canvas={1280,720}}
local old=P.body({3.2,.4,0},body,legacy)
local oldResize=P.body({3.2,.4,0},body,legacy,960,1280)
near(oldResize.x,old.x*4/3);near(oldResize.height,old.height*4/3)
print('NATIVE_PROJECTION_PASS inverse sampled basis / four recorded UV points / skew matrix / camera-right body / resize / singular-nonfinite-behind rejection / legacy compatibility (offline replay of recorded calibration)')
