// Uses the same exported SDK and pointer/step helpers as PR #582's actual-GIL
// probe. SDK CPU costs are deliberately separate from renderer/device FPS.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [savePath,sdkPath,output]=process.argv.slice(2);
if(!savePath||!sdkPath||!output||fs.existsSync(output))throw Error('Usage: node scripts/measure-official-battle.mjs <fixture.save.json> <existing SDK export.mjs> <new report.json>');
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sdkSha256=hash(sdkPath);
const {Gr,vi,dn,wi,pa,Me,d}=await import(pathToFileURL(path.resolve(sdkPath)));
const parseStart=performance.now(),saveBytes=fs.readFileSync(savePath),save=JSON.parse(saveBytes),parseMs=performance.now()-parseStart;
const fixtureReceiptPath=savePath+'.receipt.json',fixtureReceipt=JSON.parse(fs.readFileSync(fixtureReceiptPath,'utf8'));
assert.equal(fixtureReceipt.kind,'offline-sdk-pressure-fixture');assert.equal(hash(fixtureReceipt.input),fixtureReceipt.inputSha256);
const modified=save.assets.scripts.find(s=>s.path.endsWith(fixtureReceipt.modifiedModule));assert.equal(createHash('sha256').update(modified.source).digest('hex'),fixtureReceipt.fixtureModuleSha256);
const report={kind:'sdk-battle-page-fixture',measurementScope:'offline-fixture-with-injected-gameui',actualGilLuaExact:false,fixtureReceipt,fixtureReceiptSha256:hash(fixtureReceiptPath),deviceVerified:false,gpuFpsMeasured:false,node:process.version,save:path.resolve(savePath),saveSha256:createHash('sha256').update(saveBytes).digest('hex'),sdkSha256,parseMs,stages:[],status:'running'};
let session,L,rootScript;
const enc=s=>new TextEncoder().encode(s);
function expose(fn,key,name){const top=d.lua_gettop(L);d.lua_getglobal(L,enc(fn));let found=false;for(let i=1;i<50;i++){const k=d.lua_getupvalue(L,-1,i);if(!k)break;if(Buffer.from(k).toString()===key){d.lua_setglobal(L,enc(name));found=true;break}d.lua_pop(L,1)}d.lua_settop(L,top);assert(found,'missing actual-script upvalue '+key)}
function luaValue(index,depth=0){assert(depth<12);const type=d.lua_type(L,index);if(type===0)return null;if(type===1)return d.lua_toboolean(L,index);if(type===3)return d.lua_tonumber(L,index);if(type===4)return Buffer.from(d.lua_tolstring(L,index)).toString();if(type!==5)return '<type-'+type+'>';const result={},abs=d.lua_absindex(L,index);d.lua_pushnil(L);while(d.lua_next(L,abs)!==0){const key=luaValue(-2,depth+1);result[key]=luaValue(-1,depth+1);d.lua_pop(L,1)}return result}
function status(){const top=d.lua_gettop(L);d.lua_getglobal(L,enc('__BATTLE_STATUS'));assert.equal(d.lua_pcall(L,0,1,0),0,'status query failed');const value=luaValue(-1);d.lua_settop(L,top);return value}
function native(p){let n=session.runtime.roots[0];for(const name of p.split('/')){const a=n.children.filter(c=>c.name===name);assert.equal(a.length,1,'native path '+p);n=a[0]}return n}
function point(p){const n=native(p),boxes=wi(session),box=boxes.get(n.Id),matrix=pa(session,boxes).get(n.Id);assert(box&&matrix);return Me(matrix,box.centerX,box.centerY)}
const stepTimes=[];
function step(){const t=performance.now();dn(session,1/60);stepTimes.push(performance.now()-t)}
function pointer(type,p){return vi(session,type,p.x,p.y)}
function tap(p){const xy=typeof p==='string'?point(p):p;pointer('move',xy);pointer('down',xy);step();pointer('up',xy);step()}
function drain(){for(let i=0;i<600;i++){const s=status();if(!s.busy)return s;step()}throw Error('feedback did not settle')}
function timing(values){const sorted=[...values].sort((a,b)=>a-b),q=p=>sorted[Math.max(0,Math.ceil(sorted.length*p)-1)];return {samples:sorted.length,p50:q(.5),p95:q(.95),p99:q(.99),max:sorted.at(-1)}}
function stage(name,fn){const before=session?.runtime.controlsById.size??0,t=performance.now(),at=stepTimes.length;const result=fn();report.stages.push({name,elapsedMs:performance.now()-t,controlsBefore:before,controlsAfter:session?.runtime.controlsById.size??0,steps:stepTimes.length-at,sdkStepMs:timing(stepTimes.slice(at)),memory:process.memoryUsage(),state:result});return result}
try{
 stage('cold-initialize',()=>{
  session=Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});
  rootScript=session.runtime.mountedScripts.find(s=>/abyss_ui(?:\.lua)?$/.test(s.path));assert(rootScript?.alive);L=rootScript.env;expose('OnUpdate','view','__BATTLE_VIEW');expose('OnDestroy','portraits','__BATTLE_PORTRAITS');
  session.runtime.runChunk(L,`function __BATTLE_STATUS()
   local v=__BATTLE_VIEW;local c=v.run and v.run.combat;local cards,enemies={},{}
   if c then
    local C=require('abyss_combat')
    for i,card in ipairs(c.hand)do local def=C.cardDefinition(c,card);local plain=C.canPlay(c,card.uid,nil);local target=C.canPlay(c,card.uid,1);cards[i]={uid=card.uid,id=card.cardId,type=def.type,plain=plain,target=target}end
    for i,e in ipairs(c.enemies)do local g=require('abyss_battle_enemy_view').geometry(e);enemies[i]={hp=e.hp,x=g.hitX,y=g.hitY}end
   end
   local discard,pile={},{}
   for _,card in ipairs(c and c.discard or {})do discard[#discard+1]=card.uid end
   for _,card in ipairs(v.deckUI.cards or {})do pile[#pile+1]=card.uid end
   return {phase=v.run and v.run.phase,mode=v.mode,hand=c and #c.hand,energy=c and c.energy,turn=c and c.turn,busy=v.battleUI.busy,selected=v.battleUI.selected,cards=cards,enemies=enemies,deckOpen=v.deckUI.visible,pileKind=v.deckUI.pileKind,discard=discard,pile=pile,routeOpen=v.routeOpen==true,portraits=__BATTLE_PORTRAITS:status()}
  end`,'READ_ONLY_BATTLE_STATUS');
  assert(session.runtime.logs.some(l=>l.text==='ABYSS_UI ready'));return status();
 });
 stage('portrait-ready-feedback-idle',()=>{for(let i=0;i<600;i++){const s=status();if(s.portraits.battle?.phase==='ready'&&!s.busy)return s;step()}throw Error('battle portrait never became ready')});
 stage('steady-120-frames',()=>{for(let i=0;i<120;i++)step();return status()});
 stage('actual-select-cancel',()=>{const before=status();tap('stage/battlePanel/card1/hit');assert(status().selected,'pointer did not select');tap('stage/battlePanel/card1/hit');const after=status();assert(!after.selected);assert.equal(after.hand,before.hand);assert.equal(after.energy,before.energy);return after});
 stage('up-to-three-legal-card-commands',()=>{
  const outcomes=[];
  for(let command=0;command<3;command++){
   const before=drain(),rows=Object.entries(before.cards).sort((a,b)=>Number(a[0])-Number(b[0]));
   const selected=rows.find(([,c])=>c.plain||c.target);if(!selected)break;
   tap('stage/battlePanel/card'+selected[0]+'/hit');const chosen=status();assert(chosen.selected,'no selected card');
   const actual=Object.values(chosen.cards).find(c=>c.uid===chosen.selected);assert(actual,'selection UID lost');
   if(actual.plain)tap('stage/battlePanel/playArea/hit');
   else{const boxes=wi(session),matrices=pa(session,boxes);const hits=native('stage/battlePanel/actorLayer').children.filter(a=>a.visible).map(a=>a.children.find(c=>c.name==='hit')).filter(Boolean).map(n=>{const box=boxes.get(n.Id);return Me(matrices.get(n.Id),box.centerX,box.top-4)}).sort((a,b)=>b.x-a.x);assert(hits.length);tap(hits[0])}
   const after=drain();assert(!Object.values(after.cards).some(c=>c.uid===actual.uid),'real card did not leave hand '+JSON.stringify({before,chosen,after}));outcomes.push({before,after});
  }
  assert(outcomes.length>0,'no card command executed');return {commandsExecuted:outcomes.length,outcomes};
 });
 stage('actual-discard-pile-browse',()=>{const before=drain();tap('stage/battlePanel/discardIcon/hit');const opened=status();assert(opened.deckOpen&&opened.pileKind==='discard');const uids=value=>Object.values(value??{}).sort((a,b)=>a-b);assert.deepEqual(uids(opened.pile),uids(before.discard),'discard browser differs from real combat pile');tap('stage/deckPanel/close/hit');const after=status();assert(!after.deckOpen);assert.equal(after.hand,before.hand);assert.equal(after.energy,before.energy);return {opened,after}});
 stage('actual-end-turn',()=>{const before=drain();if(before.phase==='combat'){tap('stage/battlePanel/endTurn');const after=drain();assert(after.turn>before.turn||after.phase!=='combat','turn did not advance');return after}return before});
 stage('twenty-open-close-cycles',()=>{const counts=[];for(let i=0;i<20;i++){tap('stage/deckEntry/open/hit');assert(status().deckOpen);tap('stage/deckPanel/close/hit');assert(!status().deckOpen);counts.push(session.runtime.controlsById.size)}assert.equal(new Set(counts.slice(1)).size,1,'controls grow after warm cycle');return {counts,state:status()}});
 stage('twenty-route-preview-roundtrips',()=>{const before=drain(),counts=[];for(let i=0;i<20;i++){tap('stage/battlePanel/topBar/battleRoute/hit');assert(status().routeOpen,'route shortcut did not open');tap('stage/mapPanel/previewBack/hit');assert(!status().routeOpen,'route did not return');counts.push(session.runtime.controlsById.size)}const after=status();assert.equal(after.hand,before.hand);assert.equal(after.energy,before.energy);assert.equal(new Set(counts.slice(1)).size,1,'route roundtrip controls grow');return {counts,state:after}});
 stage('engine-root-cleanup',()=>{for(const runtime of session.runtimes)for(const root of [...runtime.roots])runtime.destroyControl(root);assert.equal(session.runtime.controlsById.size,0);assert.equal(rootScript.alive,false);return {liveControls:0}});
 report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack);process.exitCode=1}
finally{
 report.logs=session?.runtime.logs??[];report.faults=report.logs.filter(l=>l.level==='lua-error'||/ABYSS_UI failed|prepare_failed|command_failed/.test(l.text));if(report.faults.length){report.status='failed';process.exitCode=1}
 report.sdkStepMs=timing(stepTimes);
 report.sourceStable=hash(savePath)===report.saveSha256&&hash(sdkPath)===sdkSha256&&hash(fixtureReceiptPath)===report.fixtureReceiptSha256;
 if(!report.sourceStable){report.status='failed';report.error='Measurement inputs changed';process.exitCode=1}for(const runtime of session?.runtimes??[])try{runtime.destroy()}catch{}
 fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,error:report.error,stages:report.stages.map(s=>({name:s.name,elapsedMs:s.elapsedMs,controls:s.controlsAfter})),sdkStepMs:report.sdkStepMs,faults:report.faults.length}));
}
