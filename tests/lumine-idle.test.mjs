import test from 'node:test';
import {withPortraitVm} from './helpers/portrait-runtime-vm.mjs';
const setup=`
local function row(y)return {100001,0,y,3,3,.5,.5,.5,.5,.5,.5,1,1,0,255,240,210,255}end
local data={renderProfile='approved-idle-v1',width=133,height=122,period=2.2,count=2,
 sourceSha256='32830a9ab3f0b181202205bba59447efe660ce3225ab26f32943c54753a105de',
 rows={row(20),row(-50)},bands={200,535},bandByRow={1,2},cache=true,runtimeV2=true,rectanglesOnly=true}
Idle.validate(data)
watchControl(figure)
local c=Portraits.createController(figure,data,210,Asset,{retryFailedOnPause=true})
assert(c:begin())
for i=1,50 do c:step();if c:status().phase=='ready'then break end end
assert(c:status().phase=='ready')
`;
test('approved idle keeps static images and feet, caches across pause, releases owned controls',()=>withPortraitVm(setup+`
local count=LiveCount();local images=Images();local traces={}
for i,image in ipairs(images)do traces[i]=#image.trace end
local pages={};for _,node in ipairs(controls)do if node.isGroup and node.parent==figure then pages[#pages+1]=node end end
assert(#pages==2)
local foot=pages[2];local before=#foot.trace
for i=1,90 do c:pose(0,1,1,1,1/60,'idle')end
assert(LiveCount()==count,'idle recreated controls')
for i,image in ipairs(images)do assert(#image.trace==traces[i],'idle rewrote an image')end
assert(#foot.trace>before)
for i=before+1,#foot.trace do local r=foot.trace[i]
 if r[1]=='SetAnchoredPosition'then assert(r[2]==0 and r[3]==0,'feet moved')end
 if r[1]=='SetLocalScale'then assert(r[2]==1 and r[3]==1,'feet scaled')end
end
c:pose(19,-4,.9,.9,1/60,'hit')
local trace=figure.trace;local position=trace[#trace-1]
assert(position[1]=='SetAnchoredPosition' and position[2]==19 and position[3]==-4,'hit offset lost')
assert(c:pause());local writes=#foot.trace;c:pose(0,0,1,1,.1,'idle');assert(#foot.trace==writes)
assert(c:begin());assert(LiveCount()==count,'resume rebuilt cache')
assert(c:release());assert(LiveCount()==0,'release leaked controls');assert(c:release())
`));
test('idle setter reentry retires before the next native band write',()=>withPortraitVm(setup+`
local page;for _,node in ipairs(controls)do if node.isGroup and node.parent==figure then page=node;break end end
assert(page);local scaled=0
page.SetAnchoredPosition=function()c:release()end
page.SetLocalScale=function()scaled=scaled+1 end
c:pose(0,0,1,1,.1,'idle')
assert(scaled==0,'continued input after release');assert(LiveCount()==0)
assert(c:status().phase=='released')
`));
test('idle setter pause reentry stops native writes until a later resume',()=>withPortraitVm(setup+`
local page;for _,node in ipairs(controls)do if node.isGroup and node.parent==figure then page=node;break end end
local position=page.SetAnchoredPosition;local scaled=0
page.SetAnchoredPosition=function(self,...)position(self,...);c:pause()end
page.SetLocalScale=function()scaled=scaled+1 end
c:pose(0,0,1,1,.1,'idle')
assert(scaled==0,'continued native scale after synchronous pause')
assert(c:status().phase=='ready' and not figure.visible)
`));
test('static ablation keeps the same cached geometry and preserves whole hit feedback',()=>withPortraitVm(setup.replace('Idle.validate(data)',"data.motion='static';Idle.validate(data)")+`
local before=LiveCount();local pages={}
for _,node in ipairs(controls)do if node.isGroup and node.parent==figure then pages[#pages+1]={node=node,writes=#node.trace}end end
for i=1,120 do c:pose(0,0,1,1,1/60,'idle')end
for _,entry in ipairs(pages)do assert(#entry.node.trace==entry.writes,'static mode rewrote band transforms')end
assert(LiveCount()==before,'static mode changed image ownership')
c:pose(19,-4,.9,.9,1/60,'hit')
local position=figure.trace[#figure.trace-1]
assert(position[1]=='SetAnchoredPosition' and position[2]==19 and position[3]==-4,'static mode dropped hit feedback')
assert(c:release() and LiveCount()==0)
`));
test('approved twenty-sample cycle reduces band writes and still resets on hit immediately',()=>withPortraitVm(setup.replace('Idle.validate(data)',"data.samplesPerCycle=20;Idle.validate(data)")+`
local page;for _,node in ipairs(controls)do if node.isGroup and node.parent==figure then page=node;break end end
local paints=0;local position=page.SetAnchoredPosition
page.SetAnchoredPosition=function(self,...)paints=paints+1;position(self,...)end
local before=LiveCount()
for i=1,120 do c:pose(0,0,1,1,1/60,'idle')end
assert(paints>=18 and paints<=20,'not using the approved twenty-sample cycle')
local count=paints;c:pose(19,-4,.9,.9,0,'hit')
assert(paints==count+1,'hit reset waited for the next idle sample')
assert(LiveCount()==before,'sampling rebuilt images')
assert(c:pause());local writes=paints;c:pose(0,0,1,1,.1,'idle');assert(paints==writes)
assert(c:begin());c:pose(0,0,1,1,0,'idle');assert(paints>writes,'resume lost idle transition')
assert(c:release() and LiveCount()==0)
`));
