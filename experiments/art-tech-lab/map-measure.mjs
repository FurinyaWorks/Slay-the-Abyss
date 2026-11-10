import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [file,sdk,out]=process.argv.slice(2);
const {Gr,vi,dn,wi,pa,Me,d,ya}=await import(pathToFileURL(sdk));
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const report={scope:'Production map subsystem in Simulator SDK; room completion explicitly simulated; CPU wall time, not GPU or official device FPS',saveSha256:hash(file),sdkSha256:hash(sdk),stages:[],samples:[],logs:[]};
const save=JSON.parse(fs.readFileSync(file));let session,L;
const enc=s=>new TextEncoder().encode(s);
function call(code){const before=session.runtime.logs.length;session.runtime.runChunk(L,code,'MAP_MEASUREMENT');const errors=session.runtime.logs.slice(before).filter(l=>l.level==='lua-error');assert(!errors.length,JSON.stringify(errors));}
function luaValue(index,depth=0){assert(depth<12);const t=d.lua_type(L,index);if(t===0)return null;if(t===1)return d.lua_toboolean(L,index);if(t===3)return d.lua_tonumber(L,index);if(t===4)return Buffer.from(d.lua_tolstring(L,index)).toString();if(t!==5)return '<type-'+t+'>';const o={},abs=d.lua_absindex(L,index);d.lua_pushnil(L);while(d.lua_next(L,abs)!==0){const k=luaValue(-2,depth+1);o[k]=luaValue(-1,depth+1);d.lua_pop(L,1)}return o;}
function status(){const top=d.lua_gettop(L);d.lua_getglobal(L,enc('MapPreviewStatus'));assert.equal(d.lua_pcall(L,0,1,0),0);const v=luaValue(-1);d.lua_settop(L,top);return v;}
function times(a){const s=[...a].sort((x,y)=>x-y),q=p=>s[Math.max(0,Math.ceil(s.length*p)-1)];return {n:s.length,p50:q(.5),p95:q(.95),p99:q(.99),max:s.at(-1)};}
function stage(name,fn){const start=performance.now(),at=report.samples.length;fn();report.stages.push({name,ms:performance.now()-start,steps:times(report.samples.slice(at)),controls:session.runtime.controlsById.size});}
function step(){const t=performance.now();dn(session,1/60);report.samples.push(performance.now()-t);}
function controls(){const result=[];function walk(n,p=''){p=p+'/'+n.name;result.push({node:n,path:p});for(const c of n.children??[])walk(c,p)}for(const root of session.runtime.roots)walk(root);return result;}
function tap(n){const boxes=wi(session),box=boxes.get(n.Id),matrix=pa(session,boxes).get(n.Id),p=Me(matrix,box.centerX,box.centerY);vi(session,'move',p.x,p.y);vi(session,'down',p.x,p.y);step();vi(session,'up',p.x,p.y);step();}
try{
 const t=performance.now();session=Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'mobile-16-9',language:'LanguageChs'});
 const mounted=session.runtime.mountedScripts.find(s=>/map-preview(?:\.lua)?$/.test(s.path));assert(mounted,JSON.stringify({mounted:session.runtime.mountedScripts.map(s=>({path:s.path,alive:s.alive})),logs:session.runtime.logs}));L=mounted.env;
 assert(session.runtime.logs.some(l=>l.text==='MAP_PREVIEW ready'),JSON.stringify(session.runtime.logs));
 report.coldMs=performance.now()-t;
 // The production JSON encoder exports stringify, not a test reimplementation.
 stage('steady-240-updates',()=>{for(let i=0;i<240;i++)step()});
 stage('twenty-hide-show-cycles',()=>{const counts=[];for(let i=0;i<20;i++){call('MapPreviewVisible(false)');step();call('MapPreviewVisible(true)');step();counts.push(session.runtime.controlsById.size)}assert.equal(new Set(counts).size,1);report.cycleControls=counts});
 stage('twenty-scroll-roundtrips',()=>{for(let i=0;i<20;i++){call('MapPreviewScroll(400)');step();call('MapPreviewScroll(0)');step()}});
 stage('real-pointer-choices',()=>{report.choices=[];for(let i=0;i<6;i++){call('MapPreviewContinue()');const before=status();const hit=controls().find(x=>/\/node\d+\/hit$/.test(x.path)&&x.node.visible&&x.node.parent?.visible);assert(hit,'no actual hit');tap(hit.node);const after=status();assert.equal(after.floor,before.floor+1,'pointer did not choose legal next node');report.choices.push({before,after});}});
 stage('act2-real-generated-map',()=>{call('MapPreviewAct(2)');step();report.act2=status();assert.equal(report.act2.act,2)});
 stage('boss-viewport',()=>{call('MapPreviewScroll(880)');step();fs.writeFileSync(out+'.boss.state.json',JSON.stringify(ya(session,{view:true,paint:true})));});
 stage('destroy-roots',()=>{for(const runtime of session.runtimes)for(const root of [...runtime.roots])runtime.destroyControl(root);assert.equal(session.runtime.controlsById.size,0)});
 report.status='passed';
}catch(e){report.status='failed';report.error=String(e.stack);process.exitCode=1}
finally{report.logs=session?.runtime.logs??[];report.faults=report.logs.filter(l=>l.level==='lua-error');report.sourceStable=hash(file)===report.saveSha256;
 if(report.faults.length||!report.sourceStable){report.status='failed';report.error=report.error??'Runtime faults or measurement source changed';process.exitCode=1;}
 for(const r of session?.runtimes??[])r.destroy();fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,error:report.error,coldMs:report.coldMs,stages:report.stages,faults:report.faults.length}));}
