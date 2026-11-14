import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {attachOfficialPortraits} from '../scripts/official-portraits.mjs';
import {toLua} from '../scripts/build-lua-data.mjs';
import {withPortraitVm} from './helpers/portrait-runtime-vm.mjs';
import {applyV25PortraitProfile,v25PortraitRuntimeProfile} from '../scripts/v25-portrait-profile.mjs';

const sourceHash='4851e4aae6c43799ec31e2b2ebd06f9b00cf07161f26e71d72a6ec89191ad98e';
const find=(node,name)=>(node.controls??node.children??[]).find(child=>child.name===name);
const build=()=>{const layout=withViewport(gameLayout(),nativeTheme);attachOfficialPortraits(layout,{selectionAvatar:true,battlePortrait:true});return layout;};

test('V25 uses the existing full-body source and frozen 133 artwork, never a replacement silhouette',()=>{
 const folder='art/characters/traveler-geo/portraits/battle133/';
 assert.equal(createHash('sha256').update(readFileSync(folder+'source.png')).digest('hex'),sourceHash);
 assert.equal(createHash('sha256').update(readFileSync(folder+'native-art.json')).digest('hex'),'f8a7af7b079aa5bbb7e16b502b222f1fd7dbfaa2c30f6eef1bf0d76af0a0a248');
 const recipe=JSON.parse(readFileSync(folder+'redraw-recipe.json','utf8'));
 assert.deepEqual(recipe.sourceSize,[1024,1536]);assert.equal(recipe.imageControls,4315);
 assert.equal(recipe.paletteColors,64); // A sampled native drawing, not full-resolution source pixels.
});

test('V25 portrait transform aligns official hosts without changing hit/HUD, readiness or tree membership',()=>{
 const layout=build(),stage=find(layout,'stage'),battle=find(stage,'battlePanel'),hero=find(battle,'hero');
 const details=find(find(stage,'characterPanel'),'details');
 const figure=find(hero,'officialFigure'),selection=find(details,'officialSelectionFigure');
 const before=structuredClone(layout),runtime=v25PortraitRuntimeProfile(nativeTheme);
 applyV25PortraitProfile(layout,nativeTheme);
 assert.deepEqual(figure.position,runtime.battlePosition);assert.deepEqual(figure.scale,[210/133,210/133]);
 assert.deepEqual(selection.position,[273,-239]);assert.deepEqual(selection.scale,[1380/133,1380/133]);
 for(const node of [figure,selection]){assert.deepEqual(node.size,[133,133]);assert.equal(node.visible,false);assert.deepEqual(node.children,[]);}
 // Compare every node after restoring only the explicitly owned presentation fields.
 const restored=structuredClone(layout),restoredStage=find(restored,'stage');
 const restoredHero=find(find(restoredStage,'battlePanel'),'hero'),oldHero=find(find(find(before,'stage'),'battlePanel'),'hero');
 const restoredDetails=find(find(restoredStage,'characterPanel'),'details'),oldDetails=find(find(find(before,'stage'),'characterPanel'),'details');
 for(const [now,old,names] of [[restoredHero,oldHero,['officialFigure','border','plate']],[restoredDetails,oldDetails,['officialSelectionFigure','portraitFrame','floorShadow']]]){
  for(const name of names)now.children[now.children.findIndex(child=>child.name===name)]=structuredClone(find(old,name));
 }
 assert.deepEqual(restored,before);
 assert.equal(find(hero,'border').visible,false);assert.equal(find(hero,'plate').visible,false);
 assert.equal(find(details,'portraitFrame').visible,false);assert.equal(find(details,'floorShadow').visible,false);
});

test('portrait contract is clone-safe, idempotent and disabled hosts are left absent',()=>{
 const layout=build();applyV25PortraitProfile(layout,nativeTheme);const first=structuredClone(layout);
 applyV25PortraitProfile(layout,nativeTheme);assert.deepEqual(layout,first);
 const a=v25PortraitRuntimeProfile(nativeTheme);a.battlePosition[0]=10000;
 assert.notEqual(v25PortraitRuntimeProfile(nativeTheme).battlePosition[0],10000);
 const disabled=withViewport(gameLayout(),nativeTheme),before=structuredClone(disabled);
 applyV25PortraitProfile(disabled,nativeTheme);assert.deepEqual(disabled,before);
});

test('V25 runtime keeps reference offset/scale through begin, attack pose, cancel, pause and next battle',()=>{
 const profile=v25PortraitRuntimeProfile(nativeTheme);
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(profile)}
a=Portraits.new(stage,nil,{battlePortrait=true})
a:sync('battle',false,false,'ironclad')
assert(figure.SetAnchoredPositionValue[1]==Asset.v25PortraitProfile.battlePosition[1] and figure.SetAnchoredPositionValue[2]==Asset.v25PortraitProfile.battlePosition[2],'begin lost V25 base')
assert(math.abs(figure.SetLocalScaleValue[1]-210/133)<.000001,'begin restored old portrait size')
for i=1,500 do a:tick();if a:status().battle.phase=='ready'then break end end
assert(a:status().battle.phase=='ready')
a:battlePose(12,-4,1.2,.9)
assert(figure.SetAnchoredPositionValue[1]==Asset.v25PortraitProfile.battlePosition[1]+12 and figure.SetAnchoredPositionValue[2]==Asset.v25PortraitProfile.battlePosition[2]-4)
assert(math.abs(figure.SetLocalScaleValue[1]-1.2*210/133)<.000001)
a:battlePose(0,0,1,1)
assert(figure.SetAnchoredPositionValue[1]==Asset.v25PortraitProfile.battlePosition[1] and figure.SetAnchoredPositionValue[2]==Asset.v25PortraitProfile.battlePosition[2])
a:battlePose(7,5,1.1,1.1)
a:sync('map',false,false,'ironclad');assert(not figure.visible)
a:sync('battle',false,false,'ironclad')
assert(math.abs(figure.SetLocalScaleValue[1]-210/133)<.000001 and figure.visible)
assert(figure.SetAnchoredPositionValue[1]==Asset.v25PortraitProfile.battlePosition[1] and figure.SetAnchoredPositionValue[2]==Asset.v25PortraitProfile.battlePosition[2],'cached begin retained previous battle pose')
`,{runtimeV2:true});
});

test('V25 selection uses the same frozen full-body drawing even when legacy lowpoly and budget assets exist',()=>{
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
local selectionHost=tree();local frame=tree();frame:SetSizeDelta(440,440)
local note=tree();note.text=''
stage.children.characterPanel.children.details=tree({officialSelectionFigure=selectionHost,portraitFrame=frame,
 portraits=tree({traveler_ironclad=tree()}),portraitNote=note})
a=Portraits.new(stage,nil,{selectionAvatar=true})
a:sync('menu',true,false,'ironclad')
assert(a:status().selection.total==#Asset.battle133.rows,'V25 selected lowpoly/budget replacement')
assert(selectionHost.SetAnchoredPositionValue[1]==273 and selectionHost.SetAnchoredPositionValue[2]==-239)
assert(math.abs(selectionHost.SetLocalScaleValue[1]-1380/133)<.000001,'legacy portraitFrame size overwrote V25 selection')
`);
});

test('V25 title never preloads hidden selection figures even when the legacy host requests warming',()=>{
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
local selectionHost=tree();local frame=tree();frame:SetSizeDelta(440,440)
local note=tree();note.text=''
stage.children.characterPanel.children.details=tree({officialSelectionFigure=selectionHost,portraitFrame=frame,
 portraits=tree({traveler_ironclad=tree()}),portraitNote=note})
local a=Portraits.new(stage,nil,{selectionAvatar=true})
assert(a:sync('menu',false,false,'ironclad',true))
for _=1,20 do a:tick()end
assert(a:status().selection.owned==0 and a:status().avatar.owned==0 and LiveCount()==0,'hidden selection was eagerly built')
assert(a:sync('menu',true,false,'ironclad',true));a:tick()
assert(a:status().selection.owned>0,'visible selection did not begin source drawing')
assert(a:release() and LiveCount()==0)
`,{runtimeV2:true});
});

test('official title uses on-demand selection while partial cancellation and ready cache remain intact',()=>{
 withPortraitVm(`
Theme.presentationProfile='official-assets-first'
local originalClock=os.clock;local tickClock=0;os.clock=function()tickClock=tickClock+.009;return tickClock end
traveler:SetVisible(true) -- Full-source roster is visible; competition hides this parent.
local selectionHost=tree();local frame=tree();rawset(frame,'sizeDeltaX',440)
local note=tree();note.text=''
stage.children.characterPanel.children.details=tree({officialSelectionFigure=selectionHost,portraitFrame=frame,
 portraits=tree({traveler_ironclad=tree()}),portraitNote=note})
local a=Portraits.new(stage,nil,{selectionAvatar=true})
assert(a:sync('menu',false,false,'ironclad',true))
for _=1,120 do a:tick()end
assert(a:status().selection.owned==0 and a:status().avatar.owned==0 and LiveCount()==0,
 'official title eagerly built hidden selection')
assert(a:sync('menu',true,false,'ironclad',true));a:tick()
local partial=a:status().selection;local allocated=LiveCount()
assert(partial.owned>0 and partial.phase=='building' and partial.total==#Asset.battleApprovedIdle.rows)
assert(a:status().avatar.phase=='disabled' and a:status().avatar.owned==0,'official crop allocated a separate avatar')
assert(not selectionHost.visible,'partial official selection was exposed')
assert(a:sync('menu',false,false,'ironclad',true))
for _=1,20 do a:tick()end
assert(LiveCount()==allocated and a:status().selection.nextIndex==partial.nextIndex,
 'cancelled official selection kept building or discarded its cached partial drawing')
assert(not selectionHost.visible and not avatar.visible)
assert(a:sync('menu',true,false,'ironclad',true))
for _=1,1000 do a:tick();if a:status().selection.phase=='ready' then break end end
assert(a:status().selection.phase=='ready' and a:status().avatar.phase=='disabled' and a:status().avatar.owned==0)
local complete=LiveCount();local generation=a:status().selection.generation
assert(selectionHost.visible and not avatar.visible)
for _=1,5 do
 assert(a:sync('menu',false,false,'ironclad',true));for _=1,5 do a:tick()end
 assert(not selectionHost.visible and not avatar.visible and LiveCount()==complete)
 assert(a:sync('menu',true,false,'ironclad',true));a:tick()
 assert(selectionHost.visible and not avatar.visible and a:status().avatar.owned==0 and LiveCount()==complete)
 assert(a:status().selection.generation==generation,'cached official selection was rebuilt')
end
assert(a:release() and LiveCount()==0)
os.clock=originalClock
`,{runtimeV2:true,officialAssets:true});
});

test('official roster visibility never allocates a second avatar and retains the shared selection cache',()=>{
 withPortraitVm(`
Theme.presentationProfile='official-assets-first'
local selectionHost=tree();local frame=tree();rawset(frame,'sizeDeltaX',440)
local note=tree();note.text=''
stage.children.characterPanel.children.details=tree({officialSelectionFigure=selectionHost,portraitFrame=frame,
 portraits=tree({traveler_ironclad=tree()}),portraitNote=note})
traveler:SetVisible(false)
local a=Portraits.new(stage,nil,{selectionAvatar=true})
assert(a:sync('menu',true,false,'ironclad',true))
for _=1,1000 do a:tick();if a:status().selection.phase=='ready' then break end end
for _=1,20 do a:tick()end
assert(a:status().selection.phase=='ready' and selectionHost.visible)
assert(a:status().avatar.phase=='disabled' and a:status().avatar.owned==0,
 'official hidden roster allocated an invisible avatar')
assert(LiveCount()==a:status().selection.owned)
local complete=LiveCount();local generation=a:status().selection.generation;local selected=Images()
traveler:SetVisible(true);assert(a:sync('menu',true,false,'ironclad',true));a:tick()
assert(a:status().avatar.phase=='disabled' and a:status().avatar.owned==0,'visible official roster allocated a duplicate avatar')
traveler:SetVisible(false);assert(a:sync('menu',true,false,'ironclad',true))
for _=1,20 do a:tick()end
assert(not avatar.visible and LiveCount()==complete,'roster visibility changed shared allocation ownership')
assert(a:status().selection.phase=='ready' and selectionHost.visible,'avatar visibility disturbed main art')
traveler:SetVisible(true);assert(a:sync('menu',true,false,'ironclad',true))
for _=1,20 do a:tick()end
assert(a:status().avatar.phase=='disabled' and not avatar.visible)
traveler:SetVisible(false);assert(a:sync('menu',true,false,'ironclad',true));a:tick()
assert(not avatar.visible and LiveCount()==complete)
traveler:SetVisible(true);assert(a:sync('menu',true,false,'ironclad',true));a:tick()
assert(not avatar.visible and LiveCount()==complete and a:status().selection.generation==generation)
for i,image in ipairs(Images())do assert(image==selected[i],'roster visibility replaced cached selection rows')end
assert(a:release() and LiveCount()==0)
`,{runtimeV2:true,officialAssets:true});
});

test('official half-body selection and battle retain independent caches from one approved idle while full-body literals remain available',()=>{
 withPortraitVm(`
local selectionHost=tree();local frame=tree();rawset(frame,'sizeDeltaX',440)
local note=tree();note.text=''
stage.children.characterPanel.children.details=tree({officialSelectionFigure=selectionHost,portraitFrame=frame,
 portraits=tree({traveler_ironclad=tree()}),portraitNote=note})
traveler:SetVisible(false)
assert(Asset.battle133.count==4315 and #Asset.battle133.rows==4315,'full-source figure was replaced')
assert(Asset.battlePixel==nil,'official runtime must not revive the temporary pixel surrogate')
local idle=assert(Asset.battleApprovedIdle)
assert(idle.renderProfile=='approved-idle-v1' and idle.count==7303 and #idle.rows==7303)
assert(#idle.bands==18 and #idle.bandByRow==7303 and idle.samplesPerCycle==20 and idle.period==2.2)
assert(idle.sourceSha256=='32830a9ab3f0b181202205bba59447efe660ce3225ab26f32943c54753a105de')
local a=Portraits.new(stage,nil,{selectionAvatar=true,battlePortrait=true})
assert(a:sync('menu',true,false,'ironclad'))
for _=1,1000 do a:tick();if a:status().selection.phase=='ready' then break end end
local crop=Asset.selectionProfile.crop;local croppedRows=0
for _,r in ipairs(idle.rows)do
 if r[2]+r[4]/2>crop.left and r[2]-r[4]/2<crop.right and r[3]+r[5]/2>crop.bottom and r[3]-r[5]/2<crop.top then croppedRows=croppedRows+1 end
end
assert(croppedRows>0 and croppedRows<idle.count,'selection crop did not retain an actual half-body subset')
assert(a:status().selection.total==idle.count and #Images()==croppedRows,
 'official selection did not crop the shared source rows exactly')
assert(a:status().avatar.phase=='disabled' and a:status().avatar.owned==0)
local selected=Images();local selectedTraces={}
for i,image in ipairs(selected)do
 selectedTraces[i]={};for j,record in ipairs(image.trace)do selectedTraces[i][j]={table.unpack(record)}end
end
assert(a:sync('battle',false,false,'ironclad'))
for _=1,1000 do a:tick();if a:status().battle.phase=='ready' then break end end
local both=Images();local battle=a:status().battle
assert(battle.phase=='ready' and battle.total==7303 and battle.owned==7459,'approved source did not reach its measured native cache')
assert(#both==croppedRows+7303,'selection and approved combat did not keep their exact independent image counts')
for i=1,croppedRows do assert(both[i]==selected[i],'battle replaced the selection cache');Equal(selectedTraces[i],selected[i].trace)end
local generation=battle.generation;local complete=LiveCount()
assert(a:sync('menu',true,false,'ironclad'));a:tick()
assert(a:sync('battle',false,false,'ironclad'));a:tick()
assert(a:status().battle.phase=='ready' and a:status().battle.generation==generation and LiveCount()==complete,'scene reentry rebuilt the approved cache')
local resumed=Images();for i,image in ipairs(both)do assert(resumed[i]==image,'scene reentry replaced a cached image')end
assert(Asset.battle133.count==4315 and #Asset.battle133.rows==4315)
assert(a:release() and LiveCount()==0)
`,{runtimeV2:true,officialAssets:true});
});

test('official selection rejects a missing approved shared idle instead of silently building the old full-body drawing',()=>{
 withPortraitVm(`
local selectionHost=tree();local frame=tree();rawset(frame,'sizeDeltaX',440)
local note=tree();note.text=''
stage.children.characterPanel.children.details=tree({officialSelectionFigure=selectionHost,portraitFrame=frame,
 portraits=tree({traveler_ironclad=tree()}),portraitNote=note})
Asset.battleApprovedIdle=nil
local ok,reason=pcall(Portraits.new,stage,nil,{selectionAvatar=true})
assert(not ok and tostring(reason):find('shared approved battle idle',1,true),
 'official selection silently fell back to 4315 primitives')
assert(LiveCount()==0)
`,{runtimeV2:true,officialAssets:true});
});

test('official selection rejects unmarked or foreign source schema without building a fallback',()=>{
 for(const marker of ['nil',"'battle133'","'battlePixel'"]){
  withPortraitVm(`
local selectionHost=tree();local frame=tree();rawset(frame,'sizeDeltaX',440)
local note=tree();note.text=''
stage.children.characterPanel.children.details=tree({officialSelectionFigure=selectionHost,portraitFrame=frame,
 portraits=tree({traveler_ironclad=tree()}),portraitNote=note})
Asset.selectionUses=${marker}
assert(Asset.battleApprovedIdle and Asset.battleApprovedIdle.count==7303)
local ok,reason=pcall(Portraits.new,stage,nil,{selectionAvatar=true})
assert(not ok and tostring(reason):find('shared approved idle schema',1,true),'unmarked official source was accepted')
assert(LiveCount()==0)
`,{runtimeV2:true,officialAssets:true});
 }
});

test('legacy explicit title warming remains available without the official or V25 profile',()=>{
 withPortraitVm(`
Theme.presentationProfile='legacy'
local selectionHost=tree();local frame=tree();rawset(frame,'sizeDeltaX',440)
local note=tree();note.text=''
stage.children.characterPanel.children.details=tree({officialSelectionFigure=selectionHost,portraitFrame=frame,
 portraits=tree({traveler_ironclad=tree()}),portraitNote=note})
local a=Portraits.new(stage,nil,{selectionAvatar=true})
assert(a:sync('menu',false,false,'ironclad',true));a:tick()
assert(LiveCount()>0 and a:status().selection.owned>0,'legacy explicit warming was removed')
assert(not selectionHost.visible and not avatar.visible)
assert(a:release() and LiveCount()==0)
`,{runtimeV2:true});
});

test('invalid V25 reference identity and bounded replacement fail before host allocation',()=>{
 for(const extra of ["Asset.v25PortraitProfile.sourceSha256=string.rep('0',64)","Asset.v25PortraitProfile.battleDisplay=0", "Asset.battle133.renderProfile='bounded-2d-v1'"]){
  withPortraitVm(`Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}\n${extra}\nlocal ok=pcall(Portraits.new,stage,nil,{battlePortrait=true});assert(not ok,'invalid V25 config accepted');assert(LiveCount()==0)`);
 }
});

test('V25 decorative hosts report actual native activity and retain cached allocations across pause',()=>{
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
local selectionHost=tree();local frame=tree();rawset(frame,'sizeDeltaX',440)
local note=tree();note.text=''
stage.children.characterPanel.children.details=tree({officialSelectionFigure=selectionHost,portraitFrame=frame,
 portraits=tree({traveler_ironclad=tree()}),portraitNote=note})
local calls={};for _,host in ipairs({figure,selectionHost,avatar})do
 local original=host.SetActive;calls[host]=0
 host.SetActive=function(self,value)calls[self]=calls[self]+1;return original(self,value)end
end
a=Portraits.new(stage,nil,{battlePortrait=true,selectionAvatar=true})
assert(a:sync('menu',true,false,'ironclad'))
for i=1,1000 do a:tick();if a:status().selection.phase=='ready' and a:status().avatar.phase=='ready'then break end end
assert(a:status().selection.phase=='ready' and a:status().avatar.phase=='ready')
local owned=LiveCount();assert(owned>0 and selectionHost.active and avatar.active and not figure.active)
assert(a:status().selection.nativeActive==true and a:status().avatar.nativeActive==true)
assert(a:sync('map',false,false,'ironclad'))
assert(not selectionHost.active and not avatar.active and LiveCount()==owned,'pause destroyed cached drawing')
assert(a:status().selection.nativeActive==false and a:status().selection.nativePaused==true)
local total=calls[selectionHost]+calls[avatar]
for i=1,10 do assert(a:sync('map',false,false,'ironclad'));a:tick()end
assert(calls[selectionHost]+calls[avatar]==total and LiveCount()==owned,'inactive global tick rewrote/rebuilt decorative hosts')
assert(a:sync('battle',false,false,'ironclad'));assert(figure.active and not selectionHost.active and not avatar.active)
for i=1,1000 do a:tick();if a:status().battle.phase=='ready'then break end end
assert(a:status().battle.phase=='ready' and a:status().battle.nativeActive==true)
local battleOwned=a:status().battle.owned;assert(battleOwned>0)
assert(a:sync('map',false,false,'ironclad'));assert(not figure.active and a:status().battle.owned==battleOwned)
assert(a:release() and LiveCount()==0,'explicit release lost ownership')
`,{runtimeV2:true});
});

test('V25 skips an already inactive host setter but still reads back the native state',()=>{
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
a=Portraits.new(stage,nil,{battlePortrait=true});assert(a:sync('battle',false,false,'ironclad'))
for i=1,1000 do a:tick();if a:status().battle.phase=='ready'then break end end
figure:SetActive(false)
local original,calls=figure.SetActive,0
figure.SetActive=function(self,value)calls=calls+1;return original(self,value)end
assert(a:sync('map',false,false,'ironclad'))
assert(calls==0 and a:status().battle.nativeActive==false,'native state was not reconciled before writing')
`,{runtimeV2:true});
});

for(const behavior of ['false','mismatch','throw'])test(`V25 activation ${behavior} cannot claim a successful begin`,()=>{
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
figure.SetActive=function()${behavior==='false'?'return false':behavior==='throw'?"error('activation rejected')":'return nil'} end
a=Portraits.new(stage,nil,{battlePortrait=true})
assert(a:sync('battle',false,false,'ironclad')==false,'activation failure reported success')
local status=a:status().battle
assert(status.phase=='failed' and status.reason and status.reason~='' and LiveCount()==0)
assert(not figure.visible and status.nativeActive==false)
`,{runtimeV2:true});
});

test('V25 missing native active readback fails before allocating instead of guessing',()=>{
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
local mt=getmetatable(figure);local index=mt.__index
mt.__index=function(self,key)if key=='active'then return nil end;if type(index)=='function'then return index(self,key)end;return index[key]end
a=Portraits.new(stage,nil,{battlePortrait=true})
assert(a:sync('battle',false,false,'ironclad')==false)
assert(a:status().battle.phase=='failed' and LiveCount()==0 and not figure.visible)
assert(a:status().battle.nativeActive==nil,'unknown native state was fabricated')
`,{runtimeV2:true});
});

test('V25 cached begin cannot resurrect a host after activation setter synchronously releases its owner',()=>{
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
a=Portraits.new(stage,nil,{battlePortrait=true});assert(a:sync('battle',false,false,'ironclad'))
for i=1,1000 do a:tick();if a:status().battle.phase=='ready'then break end end
assert(a:sync('map',false,false,'ironclad'))
local setter,once=figure.SetActive,false
figure.SetActive=function(self,value)
 if value and not once then once=true;assert(a:release())end
 return setter(self,value)
end
assert(a:sync('battle',false,false,'ironclad')==false)
assert(a:status().battle.phase=='released' and LiveCount()==0)
assert(not figure.visible and not figure.active,'late setter resurrected a released host')
`,{runtimeV2:true});
});

test('V25 rejected pause does not claim inactive or stop the owner global update',()=>{
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
a=Portraits.new(stage,nil,{battlePortrait=true});assert(a:sync('battle',false,false,'ironclad'))
for i=1,1000 do a:tick();if a:status().battle.phase=='ready'then break end end
local setter=figure.SetActive
figure.SetActive=function(self,value)if not value then return false end;return setter(self,value)end
assert(a:sync('map',false,false,'ironclad')==false,'rejected native pause reported success')
assert(a:status().battle.phase=='failed' and a:status().battle.nativeActive==true,'failed setter was reported inactive')
figure.SetActive=setter;assert(a:release())
assert(a:sync('battle',false,false,'ironclad'))
for i=1,1000 do a:tick();if a:status().battle.phase=='ready'then break end end
assert(a:status().battle.phase=='ready','global update was stopped by decorative host pause')
`,{runtimeV2:true});
});

test('V25 fresh activation cannot leave a released decorative host active after a late setter return',()=>{
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
a=Portraits.new(stage,nil,{battlePortrait=true})
local setter,once=figure.SetActive,false
figure.SetActive=function(self,value)
 if value and not once then once=true;assert(a:release())end
 return setter(self,value)
end
assert(a:sync('battle',false,false,'ironclad')==false)
assert(a:status().battle.phase=='released' and LiveCount()==0)
assert(not figure.active and not figure.visible,'fresh begin left released decoration active')
`,{runtimeV2:true});
});

const resultHost=`
subject=tree()
stage.children.menuPanel=tree({result=tree({v25ResultChrome=tree({subject=subject})})})
`;
test('V25 result binds frozen fullbody with shared batch budget and retains an inactive cache on pause',()=>{
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
${resultHost}
a=Portraits.new(stage,nil,{battlePortrait=true})
assert(a:syncResult('victory'))
assert(a:status().result.total==4315 and subject.active and not subject.visible)
local old=LiveCount();a:tick();assert(LiveCount()-old<=64,'result escaped shared per-tick creation budget')
for i=1,1000 do a:tick();if a:status().result.phase=='ready'then break end end
assert(a:status().result.phase=='ready' and subject.visible)
Equal(subject.SetAnchoredPositionValue,{-342.5,-56});Equal(subject.SetLocalRotationValue,{0,0,0})
assert(math.abs(subject.SetLocalScaleValue[1]-260/133)<.000001)
assert(#Images()==4315,'result substituted a bounded/lowpoly figure')
local r=Asset.battle133.rows[1];local luminance=.2126*r[15]+.7152*r[16]+.0722*r[17]
local c=Images()[1].imageColor
assert(c[1]==math.floor((luminance+(r[15]-luminance)*.45)*.45+.5) and c[4]==math.floor(r[18]*.38+.5),'reference dim/opacity was not applied to native images')
local cached=LiveCount();assert(a:syncResult('menu'));assert(not subject.active and not subject.visible and LiveCount()==cached)
assert(a:syncResult('victory'));assert(subject.active and subject.visible and LiveCount()==cached)
assert(a:release() and LiveCount()==0)
`,{runtimeV2:true});
});

test('V25 result outcome changes release old tint safely and rebuild defeat under the same bounded owner',()=>{
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
${resultHost}
a=Portraits.new(stage,nil,{battlePortrait=true});assert(a:syncResult('victory'))
for i=1,1000 do a:tick();if a:status().result.phase=='ready'then break end end
local old=Images()[1];assert(a:syncResult('defeat'))
assert(not old.alive and not subject.visible and a:status().result.phase=='building')
for i=1,1000 do a:tick();if a:status().result.phase=='ready'then break end end
Equal(subject.SetAnchoredPositionValue,{-342.5,-157});Equal(subject.SetLocalRotationValue,{0,0,83})
local r=Asset.battle133.rows[1];assert(Images()[1].imageColor[4]==math.floor(r[18]*.3+.5))
assert(a:sync('map',false,false,'ironclad'));assert(not subject.active and not subject.visible)
local cached=LiveCount();a:tick();assert(LiveCount()==cached,'result pause stopped ownership accounting')
assert(a:release() and LiveCount()==0)
`,{runtimeV2:true});
});

test('missing host and legacy profiles never allocate or enable a replacement result subject',()=>{
 withPortraitVm(`
a=Portraits.new(stage,nil,{battlePortrait=true});assert(a:syncResult('victory')==false and a:status().result==nil)
assert(LiveCount()==0)
`);
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
a=Portraits.new(stage,nil,{battlePortrait=true});assert(a:syncResult('defeat')==false and a:status().result==nil)
assert(LiveCount()==0)
`);
});

for(const transition of ['release','onEngineDestroy'])test(`V25 result activation cannot resurrect after synchronous ${transition}`,()=>{
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
${resultHost}
a=Portraits.new(stage,nil,{battlePortrait=true})
local original,once=subject.SetActive,false
subject.SetActive=function(self,value)
 if value and not once then once=true;a:${transition}()end
 return original(self,value)
end
assert(a:syncResult('victory')==false);assert(LiveCount()==0)
assert(a:syncResult('victory')==${transition==='release'?'true':'false'})
${transition==='release'?'assert(a:release())':''}
assert(LiveCount()==0)
`,{runtimeV2:true});
});

test('V25 result rejected activation remains failed on repeated sync and cannot publish or allocate',()=>{
 withPortraitVm(`
Asset.v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(nativeTheme))}
${resultHost}
subject.SetActive=function()return false end
a=Portraits.new(stage,nil,{battlePortrait=true})
assert(a:syncResult('defeat')==false)
assert(a:syncResult('defeat')==false,'failed result reported success on repeated sync')
assert(a:status().result.phase=='failed' and not subject.visible and LiveCount()==0)
`);
});
