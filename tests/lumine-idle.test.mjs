import test from 'node:test';
import {withPortraitVm} from './helpers/portrait-runtime-vm.mjs';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {approvedBattleIdle,writePortraitModule,portraitRuntimeInventory,portraitModule} from '../scripts/official-portraits.mjs';
import {toLua} from '../scripts/build-lua-data.mjs';
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

test('official battle publishes only the source-locked approved idle and rejects a missing or changed pack',t=>{
 const dir=mkdtempSync(join(tmpdir(),'approved-idle-build-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const asset=approvedBattleIdle();assert.equal(asset.count,7303);assert.equal(asset.bands.length,18);
 const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
 assert.equal(hash('art/characters/traveler-geo/idle-approved-v1/lumine_static_approved.png'),asset.sourceSha256);
 assert.equal(hash('art/characters/traveler-geo/idle-approved-v1/lumine_idle_approved.gif'),'0449a8b3094f0a628f493b27157ae2d8b27d646ceb9541f6f5e9ce98a9ebeff1');
 const source=writePortraitModule(dir,{officialAssets:true,selectionAvatar:false,battlePortrait:true});
 const row=portraitRuntimeInventory(dir).assets.find(a=>a.asset==='traveler-geo/idle-approved-v1');
 assert.equal(row.images,7303);assert.equal(row.pages,18);assert.equal(row.periodSeconds,2.2);
 assert(!portraitRuntimeInventory(dir).assets.some(a=>a.asset==='temporary-pixel-traveler'));
 const file=join(dir,portraitModule+'.lua');
 writeFileSync(file,source.replace(/^battleApprovedIdle=.*\r?\n/m,''));
 assert.throws(()=>portraitRuntimeInventory(dir),/battle idle differs/);
 writeFileSync(file,source.replace('battleApprovedIdle={','battleApprovedIdle={motion="static",'));
 assert.throws(()=>portraitRuntimeInventory(dir),/battle idle differs/);
});

test('approved band idle replaces whole-body breathing while hit and action poses remain owned by feedback',()=>withPortraitVm(setup+`
c:pose(19,-4,.9,.9,1/60,'idle')
local position=figure.trace[#figure.trace-1]
assert(position[1]=='SetAnchoredPosition' and position[2]==0 and position[3]==0,'old ActorMotion idle was stacked')
local scale=figure.trace[#figure.trace]
assert(scale[1]=='SetLocalScale' and scale[2]==210/133 and scale[3]==210/133,'old whole-body idle scale remained')
c:pose(19,-4,.9,.9,0,'action')
position=figure.trace[#figure.trace-1]
assert(position[2]==19 and position[3]==-4,'real action pose was replaced')
assert(c:pause());local writes=#figure.trace;c:pose(0,0,1,1,.1,'idle');assert(#figure.trace==writes)
assert(c:release() and LiveCount()==0)
`));

test('official runtime refuses a missing approved figure even when the old pixel payload is still present',()=>withPortraitVm(`
assert(Asset.selectionUses=='lowpolyLumine')
Asset.battlePixel={count=57} -- Retained historical payload must not become a fallback.
Asset.battleApprovedIdle=nil
local ok,err=pcall(function()Portraits.new(stage,nil,{battlePortrait=true,selectionAvatar=false})end)
assert(not ok and tostring(err):find('official battle requires the approved Lumine idle',1,true),'runtime silently restored the pixel placeholder')
assert(LiveCount()==0,'missing approved figure created a substitute')
`,{officialAssets:true,runtimeV2:true}));

test('the adopted full asset creates its measured native rows once and releases the complete cache',t=>{
 const data=approvedBattleIdle(),dir=mkdtempSync(join(tmpdir(),'idle-native-count-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 writePortraitModule(dir,{officialAssets:true,selectionAvatar:false,battlePortrait:true});
 const row=portraitRuntimeInventory(dir).assets.find(a=>a.asset==='traveler-geo/idle-approved-v1');
 const expected=row.images+row.groups+row.pages;
 withPortraitVm(`
local data=${toLua(data)}
Idle.validate(data)
local c=Portraits.createController(figure,data,210,Asset,{retryFailedOnPause=true})
assert(c:begin());local frames=0
-- step is exactly one native attempt; the existing owner shares 64 per frame.
while c:status().phase~='ready' and frames<300 do
 frames=frames+1;for i=1,64 do c:step();if c:status().phase=='ready'then break end end
end
assert(c:status().phase=='ready','approved full figure never became ready: '..tostring(c:status().phase)..' '..tostring(c:status().reason)..' live='..LiveCount()..' frames='..frames)
assert(#Images()==7303 and LiveCount()==${expected},'reported native cache differs from actual creation')
for i=1,120 do c:pose(2,3,1.1,1.1,1/60,'idle')end
assert(#Images()==7303 and LiveCount()==${expected},'idle recreated images')
assert(c:pause());assert(c:begin());assert(LiveCount()==${expected},'cache was rebuilt across scene boundary')
assert(c:release() and LiveCount()==0,'complete source cache was not released')
`);
 t.diagnostic(JSON.stringify({images:row.images,groups:row.groups,bands:row.pages,ownedControls:expected,scope:'actual portrait controller on native API fixture; not SDK/official/device performance'}));
});
