import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {buildNativeCandidate,generatedRuntimeModules} from '../scripts/build-native-candidate.mjs';
import {buildUI} from '../scripts/build-ui.mjs';
import {auditUiBuildArgs} from '../scripts/audit-native-candidate.mjs';
import {artFeatureReceipt} from '../scripts/art-features.mjs';
import {compareNativeCandidate} from '../scripts/native-candidate-audit.mjs';
import {runLua} from '../scripts/test-lua.mjs';

const flags={cards:false,menuBackground:true,selectionAvatar:true,battlePortrait:true,monsters:false};
const require=createRequire(import.meta.url);
async function profile(){
 assert.ok(existsSync('scripts/ui-profile.mjs'),'candidate UI profile generator is missing');
 return import('../scripts/ui-profile.mjs');
}
test('native lifecycle requires explicit bounded non-release opt-in before creating outputs',async()=>{
 for(const options of [{nativePageLifecycle:true},{nativePageLifecycle:'true'},
  {nativePageLifecycle:true,lightweight2d:'true'},
  {nativePageLifecycle:true,lightweight2d:true,releaseCandidate:true}]){
  await assert.rejects(buildNativeCandidate(options),/native page lifecycle/i);
  assert.throws(()=>buildUI('build/must-not-create-native-pages',undefined,options),/native page lifecycle/i);
 }
});
test('enabled native lifecycle cannot omit its generated policy module',async()=>{
 await assert.rejects(buildNativeCandidate({nativePageLifecycle:true,lightweight2d:true,artFeatures:flags,
  generatedModules:{}}),/native page lifecycle.*generated/i);
});
test('the actual generated profile toggles independently of art and card geometry',async t=>{
 const p=await profile(),dir=mkdtempSync(join(tmpdir(),'native-page-build-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 buildUI(dir,undefined,{lightweight2d:true,artFeatures:flags});
 assert.equal(readFileSync(join(dir,'abyss_ui_profile.lua'),'utf8'),p.uiProfileSource(false));
 const unchanged=Object.fromEntries(['game-ui.json','game-ui-templates.json','abyss_art_features.lua','abyss_traveler_portrait_assets.lua'].map(name=>[name,readFileSync(join(dir,name),'utf8')]));
 buildUI(dir,undefined,{lightweight2d:true,artFeatures:flags,nativePageLifecycle:true});
 assert.equal(readFileSync(join(dir,'abyss_ui_profile.lua'),'utf8'),p.uiProfileSource(true));
 for(const [name,source]of Object.entries(unchanged))assert.equal(readFileSync(join(dir,name),'utf8'),source,name+' changed with lifecycle factor');
});
test('profile source defaults off, uses a separate generated runtime module and rejects conflicting CLI input',async()=>{
 const p=await profile();
 assert.match(p.uiProfileSource(),/nativePageLifecycle=false/);
 assert.match(p.uiProfileSource(true),/nativePageLifecycle=true/);
 assert.equal(generatedRuntimeModules.abyss_ui_profile,'scripts/build-ui.mjs');
 assert.deepEqual(p.uiProfileArgs(['x','--native-page-lifecycle']),{args:['x'],nativePageLifecycle:true});
 for(const args of [['--native-page-lifecycle=false'],['--native-page-lifecycle','--native-page-lifecycle'],['--native-page-lifecycle-unknown']])
  assert.throws(()=>p.uiProfileArgs(args),/native page lifecycle/i);
});
test('receipt digest and native source audit reject a flipped runtime policy',async()=>{
 const p=await profile(),off=p.uiProfileReceipt(false),on=p.uiProfileReceipt(true);
 assert.equal(p.uiProfileFromReceipt({}),false,'old frozen receipts remain default off');
 assert.equal(p.uiProfileFromReceipt({uiProfile:off}),false);
 assert.throws(()=>p.uiProfileFromReceipt({uiProfile:{...off,nativePageLifecycle:true}}),/digest/i);
 assert.throws(()=>p.uiProfileFromReceipt({uiProfile:on}),/bounded/i);
 const receipt={experimentalProfile:'bounded-2d-v1',artFeatures:artFeatureReceipt(flags),uiProfile:on,
  officialBackground:{},officialPortraits:{renderProfile:'bounded-2d-v1',inputs:[]}};
 // Exercise the existing pinned rebuild selector with a complete portrait receipt.
 const {lightweightInventory}=await import('../scripts/lightweight-2d-profile.mjs');
 const {portraitRuntimeInputs}=await import('../scripts/official-portraits.mjs');
 receipt.officialPortraits={...lightweightInventory(),inputs:portraitRuntimeInputs(flags).map(path=>({path}))};
 assert.ok(auditUiBuildArgs(receipt).includes('--native-page-lifecycle'));
 assert.ok(!auditUiBuildArgs({...receipt,uiProfile:off}).includes('--native-page-lifecycle'));
 const f=JSON.parse(readFileSync('tests/fixtures/native-candidate-audit/readback-slice.json'));
 const input={...f,sourceSha:f.provenance.sourceCommit,candidateBefore:f.provenance.candidateSha256,
  candidateAfter:f.provenance.candidateSha256,bgm:true};
 input.expected.modules.push({name:'abyss_ui_profile',source:p.uiProfileSource(false)});
 input.actual.scripts.scripts.push({name:'abyss_ui_profile',file:'abyss_ui_profile.lua',source:p.uiProfileSource(true)});
 assert.ok(compareNativeCandidate(input).issues.some(i=>i.code==='MODULE_MISMATCH'&&i.detail==='abyss_ui_profile'));
});

function lua(body){
 assert.ok(existsSync('src/lua/abyss_native_pages.lua'),'native page lifecycle helper is missing');
 const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari'),L=lauxlib.luaL_newstate();
 lualib.luaL_openlibs(L);
 const source=`
 local Pages=(function() ${readFileSync('src/lua/abyss_native_pages.lua','utf8')} end)()
 local nativeCalls,tail={},0
 local states,controls={},{}
 local function control(name)
  local state={active=true};local c={SetVisible=function()tail=tail+1 end}
  state.setter=function(_,value)
   nativeCalls[#nativeCalls+1]={name,value}
   if state.before then state.before() end
   state.active=value
   return state.result
  end
  setmetatable(c,{__index=function(_,key)
   if key=='active' then if state.read then state.read() end;return state.active end
   if key=='SetActive' then return state.setter end
  end,__newindex=function(self,key,value)assert(key~='active','native active is read only');rawset(self,key,value)end})
  states[name]=state;controls[name]=c;return c
 end
 for _,name in ipairs({'nodePanel','choicePanel','battlePanel','mapPanel'})do control(name)end
 local owner={mode='menu',choiceUI={visible=false},battleUI={setActive=function()end},mapUI={setVisible=function()end},nodeUI={setVisible=function()end}}
 local function child(name)return assert(controls[name],'missing '..name)end
 local require=function(name)if name=='abyss_native_pages'then return Pages end
  if name=='abyss_numbers'then return {integer=tostring}end;return {} end
 local View=(function() ${readFileSync('src/lua/abyss_game_ui_view.lua','utf8')} end)()
 local function visibility(enabled)
  return View.refreshPageVisibility({SetVisible=function()tail=tail+1 end},owner,function()end,child,function()end,enabled)
 end
 ${body}
 `;
 try{const status=lauxlib.luaL_dostring(L,to_luastring(source));assert.equal(status,lua.LUA_OK,status===lua.LUA_OK?'':to_jsstring(lua.lua_tostring(L,-1)));}
 finally{lua.lua_close(L);}
}
test('disabled View factory preserves old visibility without touching unsupported native API',()=>lua(`
 for _,s in pairs(states)do s.setter=nil;s.read=function()error('disabled read native active')end end
 local refresh=visibility(false);refresh(nil,true,false,false,false)
 assert(#nativeCalls==0 and tail>0)
`));
test('phase and mandatory-choice visibility control independent pages, preserving cache and replacement repair',()=>lua(`
 local refresh=visibility(true);refresh(nil,true,false,false,false)
 assert(#nativeCalls==2 and not controls.nodePanel.active and not controls.choicePanel.active)
 refresh(nil,true,false,false,false);assert(#nativeCalls==2,'stable pair repeated setters')
 states.nodePanel.active=true;refresh(nil,true,false,false,false);assert(#nativeCalls==3)
 control('nodePanel');refresh(nil,true,false,false,false);assert(#nativeCalls==4,'new handle was cached')
 local setter=states.choicePanel.setter;states.choicePanel.setter=function(...)return setter(...)end
 refresh(nil,true,false,false,false);assert(#nativeCalls==5,'new setter was cached')
 owner.run={phase='victory'};owner.mode='victory';refresh(owner.run,true,false,false,false)
 assert(#nativeCalls==5 and not controls.nodePanel.active and not controls.choicePanel.active,'hidden result pages activated')
 owner.mode='node';refresh(owner.run,false,false,false,false);assert(#nativeCalls==6 and controls.nodePanel.active and not controls.choicePanel.active)
 owner.choiceUI.visible=true;refresh(owner.run,false,false,false,false);assert(#nativeCalls==7 and controls.choicePanel.active)
 owner.mode='battle';refresh(owner.run,false,false,false,false);assert(#nativeCalls==8 and not controls.nodePanel.active and controls.choicePanel.active)
 owner.choiceUI.visible=false;refresh(owner.run,false,false,false,false);assert(#nativeCalls==9 and not controls.choicePanel.active)
 owner.run=nil;refresh(nil,true,false,false,false);assert(#nativeCalls==9)
`));
for(const kind of ['false','throw'])test(`failed ${kind} native write preserves error and retries without a success cache`,()=>lua(`
 local refresh=visibility(true);local attempts=0;local token={}
 states.nodePanel.setter=function(_,value)
  attempts=attempts+1;states.nodePanel.active=value
  if attempts==1 then ${kind==='false'?'return false':'error(token,0)'} end
 end
 local ok,why=pcall(refresh,nil,true,false,false,false);assert(not ok and tail==0)
 ${kind==='throw'?'assert(why==token,\'error identity changed\')':''}
 refresh(nil,true,false,false,false)
 assert(attempts==2 and #nativeCalls==1 and not controls.nodePanel.active and not controls.choicePanel.active,
  'failed write was cached despite unchanged native identity and already-applied value')
`));
test('unsupported second page is refused before mutating the first; partial rejection cannot reach old tail',()=>lua(`
 local refresh=visibility(true);local original=states.choicePanel.setter;states.choicePanel.setter=nil
 assert(not pcall(refresh,nil,true,false,false,false));assert(#nativeCalls==0 and tail==0)
 states.choicePanel.setter=function()return false end
 assert(not pcall(refresh,nil,true,false,false,false));assert(#nativeCalls==1 and tail==0)
 states.choicePanel.setter=original;refresh(nil,true,false,false,false);assert(#nativeCalls==2)
`));
test('swallowed synchronous refresh reentry cannot accept stale cache or continue old visibility',()=>lua(`
 local refresh=visibility(true)
 states.nodePanel.before=function()pcall(refresh,nil,true,false,false,false)end
 local ok,why=pcall(refresh,nil,true,false,false,false)
 assert(not ok and tostring(why):find('reentry',1,true) and tail==0)
 states.nodePanel.before=nil;refresh(nil,true,false,false,false)
 assert(not controls.nodePanel.active and not controls.choicePanel.active)
`));
test('cross-page setter mutation is rejected by final pair readback',()=>lua(`
 local refresh=visibility(true);states.choicePanel.before=function()states.nodePanel.active=true end
 local ok,why=pcall(refresh,nil,true,false,false,false)
 assert(not ok and tostring(why):find('pair readback',1,true) and tail==0)
`));
test('getter changing Run during final sweep is rejected after the sweep',()=>lua(`
 local refresh=visibility(true);local reads=0
 states.choicePanel.read=function()reads=reads+1;if reads==3 then owner.run={}end end
 local ok,why=pcall(refresh,nil,true,false,false,false)
 assert(not ok and tostring(why):find('run changed',1,true) and tail==0)
`));
for(const field of ['mode','choice'])for(const at of ['setter','final getter'])test(`${field} policy drift in ${at} refuses stale activation`,()=>lua(`
 local refresh=visibility(true);local reads=0
 local function drift() ${field==='mode'?"owner.mode='node'":"owner.choiceUI.visible=true"} end
 ${at==='setter'?'states.nodePanel.before=drift':"states.choicePanel.read=function()reads=reads+1;if reads==3 then drift()end end"}
 local ok,why=pcall(refresh,nil,true,false,false,false)
 assert(not ok and tostring(why):find('policy changed',1,true) and tail==0)
`));
test('enabled Host refreshes inactive choice handles, activates mandatory Warcry, confirms legally and deactivates',()=>{
 const dir=mkdtempSync(join(tmpdir(),'native-page-host-')),file=join(dir,'host.lua');
 try{
  writeFileSync(file,`
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local canvas=F.control({children=F.Layout});local root=F.Viewport.apply(canvas,1280,720)
local active,calls={},0
for _,name in ipairs({'nodePanel','choicePanel'})do
 local page=root:GetChild(name);local prior=getmetatable(page);active[page]=true
 setmetatable(page,{__index=function(c,key)if key=='active'then return active[c]end;return prior.__index(c,key)end,
  __newindex=function(c,key,value)assert(key~='active','active is readonly');return prior.__newindex(c,key,value)end})
 page.SetActive=function(c,value)active[c]=value;F.setEngineActive(c,value);calls=calls+1 end
end
local ui=F.GameUI.new(root,F.Data,F.Presentation,'click',{seed=42,imageSource='static',nativePageLifecycle=true,
 color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end,readNeowHistory=function()return {bossCount=0}end})
root.ui=ui
assert(calls==2 and not root:GetChild('nodePanel').active and not root:GetChild('choicePanel').active)
assert(F.start(ui));assert(ui.mode=='node' and ui.run.nodeFlow.event.stage=='neow_intro')
assert(calls==3 and root:GetChild('nodePanel').active and not root:GetChild('choicePanel').active)
assert(F.click(root,'nodePanel','eventView/option1'));assert(F.click(root,'nodePanel','eventView/option2'))
assert(ui.run.maxHp==88);assert(F.click(root,'nodePanel','eventView/option1'));assert(ui.mode=='map')
assert(not root:GetChild('nodePanel').active and not root:GetChild('choicePanel').active)
-- Deterministic permanent-deck fixture using an existing Geo card; not natural acquisition.
ui.run.deck={};for i=1,12 do ui.run.deck[i]={uid=i,cardId='warcry',upgraded=false}end;ui.run.nextDeckUid=13
assert(ui.mapUI:choose(F.Nodes.available(ui.run,ui.map)[1].id));assert(ui.run.phase=='combat')
ui:update(0.01);assert(calls==4 and not root:GetChild('nodePanel').active and not root:GetChild('choicePanel').active)
local choice=root:GetChild('choicePanel');local setVisible=choice.SetVisible;local refreshedInactive=false
choice.SetVisible=function(c,value)if value and not c.active then refreshedInactive=true end;return setVisible(c,value)end
for _=1,80 do ui:update(1/60)end -- Run the actual opening-hand animation before input.
local played=ui.run.combat.hand[1].uid
F.click(root,'battlePanel','card1');assert(ui.battleUI.selected==played,'visible card was not selected')
F.click(root,'battlePanel','playArea') -- Battle UI event callbacks deliberately return nil.
assert(ui.run.combat.pendingHandChoice and ui.choiceUI.visible and choice.active and choice.activeInHierarchy)
assert(refreshedInactive,'did not exercise original refresh-before-activation ordering')
local pending=ui.run.combat.pendingHandChoice
assert(ui:openExit());assert(not choice.active and ui.run.combat.pendingHandChoice==pending)
assert(ui:closeExit());assert(choice.active and ui.run.combat.pendingHandChoice==pending)
local selected=ui.choiceUI.cards[1].uid
F.click(root,'choicePanel','card1');assert(ui.choiceUI.selected[1]==selected)
F.click(root,'choicePanel','confirm')
assert(not ui.run.combat.pendingHandChoice and not ui.choiceUI.visible and not choice.active)
assert(ui.run.combat.draw[#ui.run.combat.draw].uid==selected,'mandatory command did not move the selected UID')
print('NATIVE_PAGE_FIRST_RUN 1 passed')
`);
  const result=runLua(file,{timeout:30000});
  assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/NATIVE_PAGE_FIRST_RUN 1 passed/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
