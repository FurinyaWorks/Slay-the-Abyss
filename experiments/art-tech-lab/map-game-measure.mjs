import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const [file,sdk,out]=process.argv.slice(2),save=JSON.parse(fs.readFileSync(file));
const {Gr,dn,vi,wi,pa,Me,d,ya}=await import(pathToFileURL(sdk));
const begin=performance.now(),session=Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'mobile-16-9',language:'LanguageChs'});
console.log({initMs:performance.now()-begin,controls:session.runtime.controlsById.size,logs:session.runtime.logs});
const mounted=session.runtime.mountedScripts.find(s=>/abyss_ui(?:\.lua)?$/.test(s.path));assert(mounted);
const L=mounted.env,enc=s=>new TextEncoder().encode(s);
function expose(fn,key,name){const top=d.lua_gettop(L);d.lua_getglobal(L,enc(fn));for(let i=1;i<40;i++){const k=d.lua_getupvalue(L,-1,i);if(!k)break;if(Buffer.from(k).toString()===key){d.lua_setglobal(L,enc(name));d.lua_settop(L,top);return}d.lua_pop(L,1)}throw Error('missing '+key)}
expose('OnUpdate','view','__MAP_GAME');
const chunk=s=>session.runtime.runChunk(L,s,'MAP_GAME_OBSERVER');
chunk('assert(__MAP_GAME); __MAP_GAME.seed=42; assert(__MAP_GAME:start()); assert(__MAP_GAME:selectCharacter("traveler")); assert(__MAP_GAME:selectElement("ironclad")); assert(__MAP_GAME:confirmCharacter()); print("MAP_GAME_MODE "..tostring(__MAP_GAME.mode))');
for(let i=0;i<30;i++)dn(session,1/60);
chunk('print("MAP_GAME_FINAL "..tostring(__MAP_GAME.mode).." "..tostring(__MAP_GAME.run and __MAP_GAME.run.phase))');
chunk('for i=1,6 do if __MAP_GAME.mode~="node" then break end;assert(__MAP_GAME.nodeUI:press("eventView/option1")); __MAP_GAME:update(0)end; assert(__MAP_GAME.mode=="map"); print("MAP_GAME_ROUTE_READY")');
console.log(session.runtime.logs.slice(-7));
assert(!session.runtime.logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed|prepare_failed|command_failed/.test(l.text)),'GameUI runtime fault');
const initial=ya(session,{inspect:true,view:true,paint:true});
fs.writeFileSync(out+'.state.json',JSON.stringify(initial));
let revision=initial.scene.revision;
const frames=[];for(let i=0;i<120;i++){dn(session,1/60);const frame=ya(session,{view:true,sceneRev:revision});frames.push(frame);revision=frame.scene.revision;}
fs.writeFileSync(out+'.frames.json',JSON.stringify(frames));
function native(suffix){const rows=[];function walk(n,p=''){p+='/'+n.name;if(p.endsWith('/'+suffix))rows.push(n);for(const c of n.children??[])walk(c,p)}for(const root of session.runtime.roots)walk(root);assert.equal(rows.length,1,suffix);return rows[0];}
function tap(node){const boxes=wi(session),box=boxes.get(node.Id),matrix=pa(session,boxes).get(node.Id),p=Me(matrix,box.centerX,box.centerY);vi(session,'move',p.x,p.y);vi(session,'down',p.x,p.y);dn(session,1/60);vi(session,'up',p.x,p.y);dn(session,1/60);}
const reports=[],clock=performance.now();
// Real map input enters a real combat; the game owns both rules and state.
const panel=native('stage/mapPanel');
const available=panel.children.flatMap(g=>g.children??[]).find(n=>/^node\d+$/.test(n.name)&&n.visible&&n.children.find(c=>c.name==='hit')?.visible);
assert(available);tap(available.children.find(c=>c.name==='hit'));
for(let i=0;i<180;i++)dn(session,1/60);
chunk('assert(__MAP_GAME.mode=="battle" and __MAP_GAME.run.phase=="combat"); local v=__MAP_GAME; __MAP_ROUTE_ID=v.map.currentNodeId; __MAP_ROUTE_HP=v.run.hp; __MAP_ROUTE_GOLD=v.run.gold; __MAP_ROUTE_COMBAT=v.run.combat; __MAP_ROUTE_ENERGY=v.run.combat.energy; __MAP_ROUTE_HAND=#v.run.combat.hand');
for(let i=0;i<20;i++){
 const start=performance.now();chunk('assert(__MAP_GAME:openMenu())');tap(native('stage/runMenu/map/hit'));
 chunk('assert(__MAP_GAME.routeOpen)');
 if(i===0)fs.writeFileSync(out+'.selected.state.json',JSON.stringify(ya(session,{view:true,paint:true})));
 tap(native('stage/mapPanel/previewBack/hit'));
 chunk('local v=__MAP_GAME;assert(not v.routeOpen and v.mode=="battle");assert(v.map.currentNodeId==__MAP_ROUTE_ID and v.run.hp==__MAP_ROUTE_HP and v.run.gold==__MAP_ROUTE_GOLD and v.run.combat==__MAP_ROUTE_COMBAT and v.run.combat.energy==__MAP_ROUTE_ENERGY and #v.run.combat.hand==__MAP_ROUTE_HAND)');
 reports.push({cycle:i+1,wallMs:performance.now()-start,controls:session.runtime.controlsById.size});
}
assert.equal(new Set(reports.slice(1).map(r=>r.controls)).size,1,'GameUI map roundtrips grew controls');
assert(!session.runtime.logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed|prepare_failed|command_failed/.test(l.text)),'GameUI replay runtime fault');
const warmControls=session.runtime.controlsById.size;
for(const runtime of session.runtimes)for(const root of [...runtime.roots])runtime.destroyControl(root);
assert.equal(session.runtime.controlsById.size,0,'GameUI roots left native-model handles');
assert(!session.runtime.logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed|prepare_failed|command_failed/.test(l.text)),'GameUI destruction runtime fault');
fs.writeFileSync(out,JSON.stringify({status:'passed',scope:'Source-generated full GameUI integration, no GIL or device claim; explicit seed42 and legal selection/Neow/map/combat/menu commands',totalMs:performance.now()-begin,mapCombatRoundtripsMs:performance.now()-clock,roundtrips:reports,warmControls,releasedControls:session.runtime.controlsById.size,logs:session.runtime.logs},null,2));
for(const runtime of session.runtimes)runtime.destroy();
