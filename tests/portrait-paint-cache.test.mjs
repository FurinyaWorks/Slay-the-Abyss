import test from 'node:test';
import {withPortraitVm} from './helpers/portrait-runtime-vm.mjs';

const ready=`
for i=1,500 do a:tick();if a:status().battle.phase=='ready'then break end end
assert(a:status().battle.phase=='ready','portrait did not become ready')
`;

test('stable portrait ticks and poses stop rewriting fallback visibility',()=>withPortraitVm(`
local setter=fallback.SetVisible;local calls=0
fallback.SetVisible=function(self,value)calls=calls+1;return setter(self,value)end
a=Portraits.new(stage,nil,{battlePortrait=true});a:sync('battle',false,false,'ironclad')
${ready}
local completed=calls
for i=1,300 do a:tick();a:battlePose(i/300,0,1,1)end
assert(calls==completed,'stable portrait paint repeated fallback visibility')
assert(not fallback.visible and figure.SetAnchoredPositionValue[1]==1,'pose or fallback changed')
`,{runtimeV2:true}));

for(const mode of ['false','throw'])test(`fallback visibility retries ${mode} without caching a rejected write`,()=>withPortraitVm(`
a=Portraits.new(stage,nil,{battlePortrait=true});a:sync('battle',false,false,'ironclad')
local setter=fallback.SetVisible;local calls=0
fallback.SetVisible=function(self,value)
 if not value then calls=calls+1;if calls==1 then ${mode==='false'?'return false':"error('synthetic visibility failure')"} end end
 return setter(self,value)
end
${ready}
for i=1,4 do a:tick()end
assert(calls==2 and not fallback.visible,'rejected visibility was cached or repeatedly resubmitted')
`,{runtimeV2:true}));

test('a foreign fallback writer invalidates the visibility cache',()=>withPortraitVm(`
a=Portraits.new(stage,nil,{battlePortrait=true});a:sync('battle',false,false,'ironclad')
${ready}
fallback:SetVisible(true)
a:tick();assert(not fallback.visible,'foreign fallback writer was not corrected')
`,{runtimeV2:true}));

test('ready visibility release reentry restores the native fallback and invalidates old paint',()=>withPortraitVm(`
local setter=fallback.SetVisible;local released=false;local calls=0
fallback.SetVisible=function(self,value)
 calls=calls+1
 if not value and a:status().battle.phase=='ready' and not released then released=true;a:release()end
 return setter(self,value)
end
a=Portraits.new(stage,nil,{battlePortrait=true});a:sync('battle',false,false,'ironclad')
for i=1,500 do a:tick();if released then break end end
assert(released and a:status().battle.phase=='released' and fallback.visible and not figure.visible,
 'reentrant release lost the native fallback')
local completed=calls;for i=1,20 do a:tick()end
assert(calls==completed,'released fallback kept repainting')
`,{runtimeV2:true}));

test('engine teardown during a fallback setter forbids later native writes',()=>withPortraitVm(`
local setter=fallback.SetVisible;local ended=false;local calls=0
fallback.SetVisible=function(self,value)
 calls=calls+1
 if not value and a:status().battle.phase=='ready' and not ended then ended=true;a:onEngineDestroy()end
 return setter(self,value)
end
a=Portraits.new(stage,nil,{battlePortrait=true});a:sync('battle',false,false,'ironclad')
for i=1,500 do a:tick();if ended then break end end
assert(ended and a:status().battle.phase=='destroyed')
local completed=calls;a:tick();a:battlePose(1,1,1,1);a:release();a:sync('map',false,false,'ironclad')
assert(calls==completed,'engine teardown kept painting fallback controls')
`,{runtimeV2:true}));

const bounded=`
local rows={};for i=1,60 do rows[i]=Asset.battle133.rows[i]end
Asset.battle133.rows=rows;Asset.battle133.count=60;Asset.battle133.renderProfile='bounded-2d-v1'
Asset.battle133.cache=false;Asset.battle133.runtimeV2=true
Asset.battle133.sourceSha256=string.rep('a',64);Asset.battle133.jsonSha256=string.rep('b',64)
`;

test('bounded original portrait builds at most sixty images and caches across page changes',()=>withPortraitVm(`
${bounded}
a=Portraits.new(stage,nil,{battlePortrait=true});a:sync('battle',false,false,'ironclad')
${ready}
assert(#Images()==60 and #controls==62,'bounded profile control inventory mismatch')
local total=#controls;a:sync('map',false,false,'ironclad');assert(LiveCount()==total and not figure.visible)
a:sync('battle',false,false,'ironclad');a:tick();assert(#controls==total and figure.visible)
a:release();assert(LiveCount()==0)
`,{runtimeV2:true}));

for(const [label,mutation]of [
 ['count zero','Asset.battle133.count=0;Asset.battle133.rows={}'],
 ['count above sixty','Asset.battle133.count=61;Asset.battle133.rows[61]=Asset.battle133.rows[1]'],
 ['source digest missing',"Asset.battle133.sourceSha256='not-a-digest'"],
 ['data digest missing',"Asset.battle133.jsonSha256='not-a-digest'"],
 ['wrong root','Asset.battle133.root[3]=134'],
 ['missing row','table.remove(Asset.battle133.rows)'],
])test(`bounded profile rejects ${label}`,()=>withPortraitVm(`
${bounded}
${mutation}
assert(not pcall(Portraits.new,stage,nil,{battlePortrait=true}),'invalid bounded profile accepted')
`,{runtimeV2:true}));
