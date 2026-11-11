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
const report={kind:'sdk-natural-noncombat',scope:'actual GIL scripts, read-only state query, native pointer commands',saveSha256:hash(savePath),sdkSha256,deviceVerified:false,gpuFpsMeasured:false,parseMs,stages:[],status:'running'};let session,L,rootScript;
const enc=s=>new TextEncoder().encode(s);
function expose(fn,key,name){const top=d.lua_gettop(L);d.lua_getglobal(L,enc(fn));let found=false;for(let i=1;i<50;i++){const k=d.lua_getupvalue(L,-1,i);if(!k)break;if(Buffer.from(k).toString()===key){d.lua_setglobal(L,enc(name));found=true;break}d.lua_pop(L,1)}d.lua_settop(L,top);assert(found,'missing actual-script upvalue '+key)}
function luaValue(index,depth=0){assert(depth<12);const type=d.lua_type(L,index);if(type===0)return null;if(type===1)return d.lua_toboolean(L,index);if(type===3)return d.lua_tonumber(L,index);if(type===4)return Buffer.from(d.lua_tolstring(L,index)).toString();if(type!==5)return '<type-'+type+'>';const result={},abs=d.lua_absindex(L,index);d.lua_pushnil(L);while(d.lua_next(L,abs)!==0){const key=luaValue(-2,depth+1);result[key]=luaValue(-1,depth+1);d.lua_pop(L,1)}return result}
function status(){const top=d.lua_gettop(L);d.lua_getglobal(L,enc('__BATTLE_STATUS'));assert.equal(d.lua_pcall(L,0,1,0),0,'status query failed');const value=luaValue(-1);d.lua_settop(L,top);return value}
function native(p){let n=session.runtime.roots[0];for(const name of p.split('/')){const a=n.children.filter(c=>c.name===name);assert.equal(a.length,1,'native path '+p);n=a[0]}return n}
function point(p){const n=native(p),boxes=wi(session),box=boxes.get(n.Id),matrix=pa(session,boxes).get(n.Id);assert(box&&matrix);return Me(matrix,box.centerX,box.centerY)}
const stepTimes=[],pointerEvents=[];
function step(){const t=performance.now();dn(session,1/60);stepTimes.push(performance.now()-t)}
function pointer(type,p){
 const started=performance.now();
 try{return vi(session,type,p.x,p.y)}
 finally{pointerEvents.push({type,x:p.x,y:p.y,elapsedMs:performance.now()-started});}
}
function tap(p){const xy=typeof p==='string'?point(p):p;pointer('move',xy);pointer('down',xy);step();pointer('up',xy);step()}
function drain(){for(let i=0;i<600;i++){const s=status();if(!s.busy)return s;step()}throw Error('feedback did not settle')}
function timing(values){const sorted=[...values].sort((a,b)=>a-b),q=p=>sorted[Math.max(0,Math.ceil(sorted.length*p)-1)];return {samples:sorted.length,p50:q(.5),p95:q(.95),p99:q(.99),max:sorted.at(-1)}}
function stage(name,fn){
 const before=session?.runtime.controlsById.size??0,t=performance.now(),at=stepTimes.length,inputAt=pointerEvents.length;
 const result=fn(),inputs=pointerEvents.slice(inputAt);
 report.stages.push({name,elapsedMs:performance.now()-t,controlsBefore:before,controlsAfter:session?.runtime.controlsById.size??0,
  steps:stepTimes.length-at,sdkStepMs:timing(stepTimes.slice(at)),pointerEvents:inputs,
  pointerHandlerMs:timing(inputs.map(event=>event.elapsedMs)),memory:process.memoryUsage(),state:result});
 return result;
}
try{
 stage('cold-initialize',()=>{
  session=Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});
  rootScript=session.runtime.mountedScripts.find(s=>/abyss_ui(?:\.lua)?$/.test(s.path));assert(rootScript?.alive);L=rootScript.env;expose('OnUpdate','view','__BATTLE_VIEW');expose('OnDestroy','portraits','__BATTLE_PORTRAITS');
  session.runtime.runChunk(L,`function __BATTLE_STATUS()
   local v=__BATTLE_VIEW;local p=__BATTLE_PORTRAITS:status()
   return {mode=v.mode,characterOpen=v.characterOpen,phase=v.run and v.run.phase,hp=v.run and v.run.hp,maxHp=v.run and v.run.maxHp,gold=v.run and v.run.gold,event=v.run and v.run.node and v.run.node.event and v.run.node.event.stage,portraits=p}
  end`,'READ_ONLY_NONCOMBAT_STATUS');assert(session.runtime.logs.some(l=>l.text==='ABYSS_UI ready'));return status();
 });
 function ready(){for(let i=0;i<900;i++){const s=status();if(s.portraits.selection?.phase==='ready')return s;step()}throw Error('selection not ready')}
 stage('menu-idle-120',()=>{for(let i=0;i<120;i++)step();return status()});
 stage('first-selection-ready',()=>{tap('stage/menuPanel/start/hit');assert(status().characterOpen);return ready()});
 stage('selection-idle-120',()=>{for(let i=0;i<120;i++)step();return status()});
 stage('selection-return-20',()=>{const counts=[];for(let i=0;i<20;i++){tap('stage/characterPanel/cancel/hit');assert(!status().characterOpen);tap('stage/menuPanel/start/hit');ready();counts.push(session.runtime.controlsById.size)}assert(counts.every(n=>n===counts[0]),'selection controls leaked');return {counts,state:status()}});
 stage('confirm-neow-intro',()=>{tap('stage/characterPanel/confirm/hit');assert(!status().characterOpen);return status()});
 stage('neow-intro-idle-120',()=>{for(let i=0;i<120;i++)step();return status()});
 stage('neow-offers',()=>{tap('stage/nodePanel/eventView/option1/hit');return status()});
 stage('neow-hp-blessing',()=>{const before=status();tap('stage/nodePanel/eventView/option2/hit');const after=status();assert.equal(after.maxHp,before.maxHp+8);return after});
 stage('neow-to-map',()=>{tap('stage/nodePanel/eventView/option1/hit');return status()});
 function descendants(n){return [n,...n.children.flatMap(descendants)]}
 stage('map-to-battle',()=>{for(let i=0;i<30;i++)step();const n=session.runtime.roots.flatMap(descendants).find(n=>/^node\d+$/.test(n.name)&&n.visible&&n.children.some(c=>c.name==='hit'&&c.visible));if(!n){report.mapNodes=session.runtime.roots.flatMap(descendants).filter(n=>/^node\d+$/.test(n.name)).map(n=>({name:n.name,visible:n.visible,hit:n.children.find(c=>c.name==='hit')?.interactable,keys:Object.keys(n).slice(0,15)}))}assert(n,'reachable map node');const target=n.children.find(c=>c.name==='hit');const boxes=wi(session),box=boxes.get(target.Id),matrix=pa(session,boxes).get(target.Id);tap(Me(matrix,box.centerX,box.centerY));for(let i=0;i<200;i++)step();const state=status();assert.equal(state.mode,'battle');assert.equal(state.phase,'combat');return state});
 stage('root-destroy',()=>{for(const runtime of session.runtimes)for(const root of [...runtime.roots])runtime.destroyControl(root);assert.equal(session.runtime.controlsById.size,0);assert.equal(rootScript.alive,false);return {controls:0}});
 report.status='pass';report.sdkStepMs=timing(stepTimes);report.logs=session.runtime.logs;
}catch(error){report.status='failed';report.error=String(error.stack);console.log(report.error);process.exitCode=1}
finally{report.logs=session?.runtime.logs??[];report.faults=report.logs.filter(l=>l.level==='lua-error'||/ABYSS_UI failed|prepare_failed|command_failed/.test(l.text));report.sourceStable=hash(savePath)===report.saveSha256&&hash(sdkPath)===sdkSha256;report.sdkStepMs=timing(stepTimes);report.pointerEvents=pointerEvents;if(report.faults.length||!report.sourceStable){report.status='failed';process.exitCode=1}for(const runtime of session?.runtimes??[])try{runtime.destroy()}catch{}fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(output)}
