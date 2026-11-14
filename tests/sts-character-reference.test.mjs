import test from'node:test';import assert from'node:assert/strict';
import{mkdtempSync,readFileSync,writeFileSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';
import{gameLayout}from'../scripts/game-ui-layout.mjs';import{withViewport}from'../scripts/viewport-layout.mjs';
import{nativeTheme}from'../scripts/native-ui-theme.mjs';
import{applyOfficialAssets,officialAssetsTheme}from'../scripts/official-assets-layout.mjs';
import{attachOfficialPortraits,approvedBattleIdle,writePortraitModule,portraitRuntimeInventory,portraitModule}from'../scripts/official-portraits.mjs';
import{withPortraitVm}from'./helpers/portrait-runtime-vm.mjs';
import{stsCharacterPortraitProfile}from'../scripts/sts-character-select-layout.mjs';
import{createRequire}from'node:module';import{toLua,luaString}from'../scripts/build-lua-data.mjs';
const child=(n,k)=>(n?.children??n?.controls??[]).find(c=>c.name===k);
const all=n=>[n,...(n.children??n.controls??[]).flatMap(all)];
test('original PC selection preserves actual role handles and replaces the constellation with the shared battle slot',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=withViewport(gameLayout(),theme);attachOfficialPortraits(layout);
 const panel=child(child(layout,'stage'),'characterPanel'),roles=['traveler','character1','character2','character3','character4'];
 const handles=roles.map(k=>child(child(panel,k),'hit'));
 applyOfficialAssets([layout],theme);
 roles.forEach((name,i)=>assert.strictEqual(child(child(panel,name),'hit'),handles[i]));
 assert(!all(panel).some(n=>n.name==='selectedInitial'),'no first-glyph portrait surrogate');
 assert.equal(child(panel,'v25Roster').visible,false,'no fabricated locked characters or constellation row');
 assert.equal(child(panel,'title').visible,false,'PC reference has no invented page heading');
 assert(child(panel,'stsCharacter'));
 const first=child(panel,'traveler'),spec=theme.layout.stsCharacter;
 assert.deepEqual(first.position,[spec.roster.origin[0]-640,360-spec.roster.origin[1]]);
 assert(all(child(first,'hit')).filter(n=>n.name==='bust').every(n=>n.visible===false));
 const details=child(panel,'details');assert.equal(child(details,'portraits').visible,false);
 for(const name of ['cancel','confirm']){
  const button=child(panel,name),frame=spec.rectangles[name];assert.deepEqual(button.size,frame.slice(2));
  assert(child(child(button,'hit'),'normal').children.some(n=>n.name==='v25Flag'));
 }
});
test('selection producer references one battle idle literal and authenticates its source schema',t=>{
 const dir=mkdtempSync(join(tmpdir(),'sts-selection-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const source=writePortraitModule(dir,{officialAssets:true});
 assert.match(source,/selectionUses='battleApprovedIdle'/);assert.match(source,/selectionProfile=/);
 assert.equal(source.split('battleApprovedIdle=').length,2,'one shared source literal');
 assert.doesNotMatch(source,/battlePixel=/);
 const inventory=portraitRuntimeInventory(dir),selected=inventory.assets.find(a=>a.asset.endsWith('selection-crop'));
 const battle=inventory.assets.find(a=>a.asset==='traveler-geo/idle-approved-v1');
 assert.equal(selected.sourceSha256,battle.sourceSha256);assert.equal(selected.images,approvedBattleIdle().count);
 assert(!inventory.assets.some(a=>a.asset.includes('avatar96')||a.asset.includes('temporary-pixel')));
 writeFileSync(join(dir,portraitModule+'.lua'),source.replace("selectionUses='battleApprovedIdle'","selectionUses='battlePixel'"));
 assert.throws(()=>portraitRuntimeInventory(dir),/selection schema/);
 writeFileSync(join(dir,portraitModule+'.lua'),source.replace(/^selectionProfile=.*\r?\n/m,''));
 assert.throws(()=>portraitRuntimeInventory(dir),/selection crop schema/);
 const invalid=structuredClone(nativeTheme);invalid.layout.stsCharacter.portrait.crop.right=1000;
 assert.throws(()=>stsCharacterPortraitProfile(invalid),/crop must stay inside/);
});
const detailsSetup=`
local portrait=tree();rawset(portrait,'sizeDeltaX',100)
local preview=tree({officialSelectionFigure=tree(),portraitFrame=portrait,
 portraits=tree({traveler_ironclad=control('image')}),portraitNote=control('text')})
stage:GetChild('characterPanel').children.details=preview
`;
test('half-body crop uses actual idle rows, keeps lower body out and retains the approved idle cache',()=>withPortraitVm(`
local data=Asset.battleApprovedIdle
assert(Asset.selectionUses=='battleApprovedIdle' and data.width==210 and data.height==192)
local crop=Asset.selectionProfile.crop
local bad=pcall(function()Portraits.createController(figure,data,210,Asset,{crop={left=220,right=300,bottom=0,top=96}})end)
assert(not bad and LiveCount()==0,'out-of-source crop produced a ready blank portrait')
local c=Portraits.createController(figure,data,210,Asset,{crop=crop})
assert(c:begin());local attempts=0
for frame=1,300 do for i=1,64 do if c:status().phase=='building'then attempts=attempts+1 end;c:step();if c:status().phase=='ready'then break end end;if c:status().phase=='ready'then break end end
assert(c:status().phase=='ready',tostring(c:status().reason))
assert(#Images()>0 and #Images()<data.count,'did not crop the shared full-body rows')
assert(attempts<=LiveCount()+1,'cropped invisible rows spent native creation budget')
for _,image in ipairs(Images())do
 local x,y,w,h
 for _,row in ipairs(image.trace)do
  if row[1]=='SetAnchoredPosition'then x,y=row[2],row[3]end
  if row[1]=='SetSizeDelta'then w,h=row[2],row[3]end
 end
 assert(x-w/2>=crop.left and x+w/2<=crop.right and y-h/2>=crop.bottom and y+h/2<=crop.top,'native row escaped source crop')
end
local count=LiveCount();c:pose(0,0,1,1,.1,'idle');assert(LiveCount()==count,'idle rebuilt cropped rows')
assert(c:pause() and c:begin() and LiveCount()==count,'reopening rebuilt the shared source')
assert(c:release() and LiveCount()==0)
`,{officialAssets:true}));
test('page readiness waits only for required current portrait owners and reports real failures',()=>withPortraitVm(`
${detailsSetup}
local p=Portraits.new(stage,nil,{selectionAvatar=true,battlePortrait=true})
assert(p:readyForPage('menu',false,nil),'hidden artwork held the menu')
assert(p:sync('menu',true,false,'ironclad'))
assert(not p:readyForPage('menu',true,'ironclad'),'building selection was ready')
for i=1,300 do p:tick(1/60);if p:readyForPage('menu',true,'ironclad')then break end end
assert(p:readyForPage('menu',true,'ironclad'),'same battle idle crop did not finish')
assert(p:status().avatar.phase=='disabled','a second avatar asset was built')
assert(p:sync('battle',false,false,'ironclad'))
assert(not p:readyForPage('battle',false,'ironclad'),'unbuilt battle was ready')
for i=1,300 do p:tick(1/60);if p:readyForPage('battle',false,'ironclad')then break end end
assert(p:readyForPage('battle',false,'ironclad'),'hidden selection held battle readiness')
p:release();figure.SetSizeDelta=function()error('native figure rejected')end
p:sync('battle',false,false,'ironclad')
local ready,reason=p:readyForPage('battle',false,'ironclad');assert(not ready and reason,'failed owner was ready')
`,{officialAssets:true}));
test('real character view shows only admitted controls and preserves confirm disable state',()=>{
 const f=createRequire(import.meta.url)('fengari'),L=f.lauxlib.luaL_newstate();f.lualib.luaL_openlibs(L);
 const theme={...nativeTheme,presentationProfile:'official-assets-first'};
 const script=`
local theme=${toLua(theme)}
local roles={'hutao','arlecchino','furina','raiden','traveler'}
local elements={'ironclad','silent','defect','watcher'}
local deps={abyss_theme=theme,abyss_character_select={characters=roles,elements=elements},abyss_numbers={integer=tostring},abyss_card_display={},abyss_card_skin={}}
require=function(name)return assert(deps[name],name)end
local View=assert(load(${luaString(readFileSync('src/lua/abyss_character_select_view.lua','utf8'))}))()
local function node()
 local n={children={},visible=true}
 function n:GetChild(k)if not self.children[k]then self.children[k]=node()end;return self.children[k]end
 function n:SetVisible(value)self.visible=value end
 return n
end
local panel=node()
for _,full in ipairs({false,true})do for _,can in ipairs({false,true})do
 local state={character='traveler',element='ironclad',deckOpen=false,info={name='旅行者',maxHp=80,gold=99,relics={},deck={},deckSize=0}}
 function state:allowsCharacter(id)return full or id=='traveler'end
 function state:allowsElement(id)return full or id=='ironclad'end
 function state:canConfirm()return can end
 View.render(panel,state,{})
 for i,id in ipairs(roles)do
  local box=panel:GetChild(i==5 and 'traveler' or 'character'..i)
  assert(box.visible==(full or id=='traveler'),'invented or hidden admitted role '..id)
 end
 local hit=panel:GetChild('confirm'):GetChild('hit')
 assert(hit.interactable==can and hit.raycastTarget==can,'confirmation bypassed admission')
 assert(panel:GetChild('details'):GetChild('portraits').visible==false,'old large pixel portrait revived')
end end
`;
 try{const code=f.lauxlib.luaL_dostring(L,f.to_luastring(script));assert.equal(code,0,code===0?'':f.to_jsstring(f.lua.lua_tostring(L,-1)));}finally{f.lua.lua_close(L);}
});
