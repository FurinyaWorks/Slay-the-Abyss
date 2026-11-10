// Explicit room fixtures over source-generated full GameUI and the actual SDK.
// No natural RNG, official GIL, GPU FPS or device acceptance is claimed.
// Generate the input with map-game.mjs <new-directory>, then pass game.save.json,
// the verified actual-session.mjs SDK export and a new replay output directory.
// --special-only collects Neow, long potion copy and Match without the 20 cycles.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [file,sdk,out]=process.argv.slice(2);
const specialOnly=process.argv.includes('--special-only');
if(!out)throw Error('Usage: node experiments/art-tech-lab/event-game-measure.mjs <game.save.json> <actual-session.mjs> <new-output-directory>');
fs.mkdirSync(out,{recursive:false});
const save=JSON.parse(fs.readFileSync(file));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const initialSaveHash=hash(file),initialSdkHash=hash(sdk);
const {Gr,dn,vi,wi,pa,Me,d,ya}=await import(pathToFileURL(path.resolve(sdk)));
const begin=performance.now(),session=Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'mobile-16-9',language:'LanguageChs'});
try {
const mounted=session.runtime.mountedScripts.find(s=>/abyss_ui(?:\.lua)?$/.test(s.path));assert(mounted);
const L=mounted.env,enc=s=>new TextEncoder().encode(s);
const top=d.lua_gettop(L);d.lua_getglobal(L,enc('OnUpdate'));
let exposed=false;for(let i=1;i<40;i++){const k=d.lua_getupvalue(L,-1,i);if(!k)break;if(Buffer.from(k).toString()==='view'){d.lua_setglobal(L,enc('__EVENT_GAME'));exposed=true;break}d.lua_pop(L,1)}d.lua_settop(L,top);assert(exposed);
function clean(){assert(!session.runtime.logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed|prepare_failed|command_failed/.test(l.text)),JSON.stringify(session.runtime.logs.slice(-8)));}
function chunk(s){try{session.runtime.runChunk(L,s,'EVENT_GAME_FIXTURE');clean();}catch(error){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({source:s,error:error.message,logs:session.runtime.logs.slice(-15)},null,2));throw new Error('Fixture failed; see '+path.join(out,'failure.json'));}}
function tick(n=2){for(let i=0;i<n;i++)dn(session,1/60);clean();}
function native(suffix){const rows=[];function walk(n,p=''){p+='/'+n.name;if(p.endsWith('/'+suffix))rows.push(n);for(const c of n.children??[])walk(c,p)}for(const root of session.runtime.roots)walk(root);assert.equal(rows.length,1,suffix);return rows[0];}
function point(suffix){const n=native('stage/nodePanel/'+suffix+'/hit'),boxes=wi(session),box=boxes.get(n.Id),matrix=pa(session,boxes).get(n.Id);assert(box&&matrix,suffix);return Me(matrix,box.centerX,box.centerY);}
function tap(suffix){try{const p=point(suffix);vi(session,'move',p.x,p.y);vi(session,'down',p.x,p.y);tick(1);vi(session,'up',p.x,p.y);tick(1);}catch(error){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({pointer:suffix,error:error.message,logs:session.runtime.logs.slice(-15)},null,2));throw new Error('Pointer failed; see '+path.join(out,'failure.json'));}}
const captures=[];
function capture(name){tick();const state=ya(session,{inspect:true,view:true,paint:true});assert(state.scene.nodes.length>60,'empty scene '+name);fs.writeFileSync(path.join(out,name+'.state.json'),JSON.stringify(state));captures.push({name,controls:session.runtime.controlsById.size,sceneNodes:state.scene.nodes.length,sceneRevision:state.scene.revision});fs.writeFileSync(path.join(out,'capture-index.json'),JSON.stringify({status:'in-progress',captures},null,2));console.log('CAPTURE '+name);}
chunk('__EVENT_GAME.seed=42;assert(__EVENT_GAME:start());assert(__EVENT_GAME:selectCharacter("traveler"));assert(__EVENT_GAME:selectElement("ironclad"));assert(__EVENT_GAME:confirmCharacter())');tick(30);
if(specialOnly){capture('neow-opening');const p=point('eventView/option1');vi(session,'move',p.x,p.y);capture('neow-hover');vi(session,'down',p.x,p.y);capture('neow-down');vi(session,'move',-100,-100);vi(session,'up',-100,-100);tick();tap('eventView/option1');capture('neow-blessings');}
chunk('for i=1,6 do if __EVENT_GAME.mode~="node"then break end;assert(__EVENT_GAME.nodeUI:press("eventView/option1"));__EVENT_GAME:update(0)end;assert(__EVENT_GAME.mode=="map")');
chunk(`
local C=require('abyss_combat');local Run=require('abyss_run');local Map=require('abyss_map');local Nodes=require('abyss_nodes')
function __EVENT_CORE()
 local r=__EVENT_GAME.run;local state={map=Map.snapshot(__EVENT_GAME.map)}
 for _,key in ipairs({'hp','maxHp','gold','deck','relics','potions','nodeFlow','phase','act','floor','roomGeneration','seed','cardRng','miscRng','eventRng','relicPool','treasureRng','shopRng','unknown'})do state[key]=C.copy(r[key])end
 return state
end
function __EVENT_EQUAL(a,b)
 if type(a)~=type(b)then return false end;if type(a)~='table'then return a==b end
 for k,v in pairs(a)do if not __EVENT_EQUAL(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
function __EVENT_STAGE(kind,id,act,gold,hp)
 local v=__EVENT_GAME;local source=C.copy(v.data)
 source.rules.events.encounterId=id
 local r=Run.new(source,42,id=='match_game' and {experimental=true,campaign=true,character='ironclad'} or nil);r.act=act or 1;r.gold=gold or 120;r.hp=hp or 41
 if id=='we_meet_again' and __EVENT_LONG_TRADE then r.potions={'entropic_brew'}end
 local m=Map.generate(r.data,42,r.act)
 local entered=false
 for attempt=1,20 do
  local choices=Map.available(m);assert(#choices>0,'fixture route exhausted')
  for _,node in ipairs(choices)do if node.type==kind then local ok,why=Nodes.enter(r,m,node.id);assert(ok,why);entered=true;break end end
  if entered then break end
  assert(Map.choose(m,choices[1].id))
 end
 assert(entered,'fixture missing room')
 v.nodeUI:setVisible(false)
 v.run,v.map=r,m;v.mapUI.map=m;v.nodeUI.run,v.nodeUI.map=r,m;v.battleUI.run=r
 v.routeOpen=false;v.characterOpen=false;v:refresh()
 assert(v.mode=='node' and r.phase=='node')
 assert(v.nodeUI.run==r and v.nodeUI.map==m and v.nodeUI.root.visible,'fixture host owner/visibility mismatch')
 if id then assert(r.nodeFlow.event.id==id)end
 print('EVENT_FIXTURE '..kind..' '..tostring(id)..' act='..r.act..' floor='..r.floor)
end
`);
const stage=(kind,id,act=1,gold=120,hp=41)=>{chunk(`__EVENT_STAGE('${kind}',${id?`'${id}'`:'nil'},${act},${gold},${hp})`);tick();};
if(specialOnly){
 chunk('__EVENT_LONG_TRADE=true');stage('event','we_meet_again');capture('we-meet-again-long-potion');
 stage('event','match_game');capture('match-intro');tap('eventView/option1');capture('match-rules');tap('eventView/option1');capture('match-board');tap('pickerView/forgeGrid/card1');capture('match-reveal');
 const warmControls=session.runtime.controlsById.size;for(const runtime of session.runtimes)for(const root of [...runtime.roots])runtime.destroyControl(root);assert.equal(session.runtime.controlsById.size,0);clean();
 assert.equal(hash(file),initialSaveHash);assert.equal(hash(sdk),initialSdkHash);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',scope:'Special-screen supplement: actual full GameUI SDK projections and pointers; forced encounter fixtures, not natural RNG/device evidence',captures,warmControls,releasedControls:0,sourceStable:true,saveSha256:initialSaveHash,sdkSha256:initialSdkHash,logs:session.runtime.logs},null,2));for(const runtime of session.runtimes)runtime.destroy();console.log('EVENT_SPECIAL_PASS '+path.resolve(out));process.exit(0);
}
// Save the first reviewable baseline before exercising any transactions.
stage('event','cleric');capture('cleric');
stage('event','we_meet_again');capture('we-meet-again');
stage('event','the_library',2);capture('library-intro');
stage('event','designer',2);tap('eventView/option1');chunk('assert(__EVENT_GAME.run.nodeFlow.event.stage=="choice");for i=1,4 do assert(__EVENT_GAME.nodeUI.root:GetChild("eventView"):GetChild("option"..i).visible)end');capture('designer-four-options');
function pointerStates(prefix,suffix){chunk('__EVENT_POINTER_CORE=__EVENT_CORE()');const p=point(suffix);vi(session,'move',p.x,p.y);capture(prefix+'-hover');vi(session,'down',p.x,p.y);capture(prefix+'-down');vi(session,'move',-100,-100);vi(session,'up',-100,-100);tick();chunk('assert(__EVENT_EQUAL(__EVENT_POINTER_CORE,__EVENT_CORE()),"pointer preview changed gameplay")');}
pointerStates('designer','eventView/option2');
stage('event','cleric',1,35);chunk('assert(not __EVENT_GAME.nodeUI.actions["eventView/option2"].enabled)');capture('cleric-disabled');pointerStates('cleric-disabled','eventView/option2');
fs.writeFileSync(path.join(out,'baseline-ready.json'),JSON.stringify({scope:'Explicit fixture selection via real Nodes.enter; not natural encounter probability evidence',captures},null,2));
// Cleric: native pointer pays exactly 35, heals, then returns to the map.
stage('event','cleric');chunk('__EVENT_BEFORE_GOLD=__EVENT_GAME.run.gold;__EVENT_BEFORE_HP=__EVENT_GAME.run.hp');tap('eventView/option1');
chunk('print("CLERIC_ACTUAL "..__EVENT_GAME.run.gold.." "..__EVENT_GAME.run.hp.." "..__EVENT_GAME.nodeUI.notice);assert(__EVENT_GAME.run.gold==__EVENT_BEFORE_GOLD-35 and __EVENT_GAME.run.hp>__EVENT_BEFORE_HP)');capture('cleric-paid-result');
tap('confirm');chunk('assert(__EVENT_GAME.mode=="map")');capture('cleric-return-map');
stage('event','scrap_ooze');capture('scrap-ooze');tap('eventView/option1');capture('scrap-ooze-search');
// Library uses its real twenty-card offer and mandatory card selection.
stage('event','the_library',2);tap('eventView/option1');capture('library-picker');
tap('pickerView/card1');capture('library-selected');tap('confirm');capture('library-result');
tap('eventView/option1');chunk('assert(__EVENT_GAME.mode=="map")');
// Designer always offers full service, whose first operation is a paid purge.
stage('event','designer',2);tap('eventView/option1');chunk('__EVENT_BEFORE_GOLD=__EVENT_GAME.run.gold;__EVENT_BEFORE_DECK=#__EVENT_GAME.run.deck');tap('eventView/option3');capture('designer-paid-picker');
chunk('assert(__EVENT_GAME.run.gold==__EVENT_BEFORE_GOLD-90)');tap('pickerView/card1');tap('confirm');
chunk('assert(#__EVENT_GAME.run.deck==__EVENT_BEFORE_DECK-1)');capture('designer-result');tap('eventView/option1');chunk('assert(__EVENT_GAME.mode=="map")');
stage('shop');capture('shop');tap('shopView/card1');capture('shop-selected');
stage('camp',null,1,120,20);capture('camp');tap('campView/forge');capture('camp-forge-grid');tap('pickerView/forgeGrid/card1');capture('camp-forge-preview');tap('confirm');tick(150);capture('camp-forge-result');
stage('treasure');capture('treasure-closed');tap('treasureView/chest');tick(150);capture('treasure-open');
chunk('__EVENT_IDLE_CORE=__EVENT_CORE()');
let revision=ya(session,{view:true}).scene.revision;const frames=[];
for(let i=0;i<120;i++){tick(1);const state=ya(session,{view:true,sceneRev:revision});frames.push(state);revision=state.scene.revision;}
chunk('assert(__EVENT_EQUAL(__EVENT_IDLE_CORE,__EVENT_CORE()),"idle preview frames changed gameplay")');
fs.writeFileSync(path.join(out,'treasure-open.frames.json'),JSON.stringify(frames));
// Twenty complete host page switches, each with an actual paid event command.
const reports=[];
for(let i=0;i<20;i++){
 const start=performance.now();stage('event','cleric');tap('eventView/option1');tap('confirm');
 chunk('assert(__EVENT_GAME.mode=="map" and __EVENT_GAME.run.gold==85)');
 reports.push({cycle:i+1,wallMs:performance.now()-start,controls:session.runtime.controlsById.size});
}
assert.equal(new Set(reports.slice(1).map(r=>r.controls)).size,1,'event/map roundtrips grew native handles');
const warmControls=session.runtime.controlsById.size;
for(const runtime of session.runtimes)for(const root of [...runtime.roots])runtime.destroyControl(root);
assert.equal(session.runtime.controlsById.size,0,'GameUI roots left native-model handles');clean();
assert.equal(hash(file),initialSaveHash,'save source changed during replay');assert.equal(hash(sdk),initialSdkHash,'SDK changed during replay');
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',scope:'Source-generated full GameUI, actual Simulator SDK, pointer-dispatched transactions; explicit fixtures (seed42 and forced encounterId), not natural RNG/GIL/device evidence; CPU wall time, not GPU FPS',saveSha256:initialSaveHash,sdkSha256:initialSdkHash,sourceStable:true,idleFrames:frames.length,idleGameplayUnchanged:true,pointerPreviewGameplayUnchanged:true,snapshotScope:'Map.snapshot plus hp/maxHp/gold/deck/relics/potions/nodeFlow/phase/act/floor/roomGeneration/seed/cardRng/miscRng/eventRng/relicPool/treasureRng/shopRng/unknown; excludes advancing elapsedSeconds and presentation clocks',totalMs:performance.now()-begin,captures,roundtrips:reports,warmControls,releasedControls:session.runtime.controlsById.size,logs:session.runtime.logs},null,2));
for(const runtime of session.runtimes)runtime.destroy();
console.log('EVENT_GAME_PASS '+path.resolve(out));
} catch(error) {
 const cleanupErrors=[];
 for(const runtime of session.runtimes)for(const root of [...runtime.roots])try{runtime.destroyControl(root);}catch(cleanupError){cleanupErrors.push(cleanupError.message);}
 const releasedControls=session.runtime.controlsById.size;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'failed',error:error.message,saveSha256:initialSaveHash,sdkSha256:initialSdkHash,releasedControls,cleanupErrors,logs:session.runtime.logs},null,2));
 for(const runtime of session.runtimes)try{runtime.destroy();}catch(cleanupError){console.error(cleanupError.message);}
 process.exitCode=1;console.error(error.message);
}
