// Exercise the actual GIL Lua through the installed Simulator pointer API.
// Snapshot reads verify appearance; their cost is not counted as frame time.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';import path from 'node:path';import {createHash} from 'node:crypto';
const [saveArg,sdkArg,outArg]=process.argv.slice(2);assert(saveArg&&sdkArg&&outArg&&!fs.existsSync(outArg));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sdk=await import(pathToFileURL(path.resolve(sdkArg))),save=JSON.parse(fs.readFileSync(saveArg));
const report={scope:'Actual Simulator Lua, native pointer and step API. No official device/GPU measurement.',saveSha256:sha(saveArg),sdkSha256:sha(sdkArg),alphas:[],stepMs:[],status:'running'};
let session;
try{
 session=sdk.Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});
 assert(session.runtime.logs.some(l=>l.text==='ABYSS_UI ready'),'current candidate must actually start');
 const native=p=>p.split('/').reduce((n,key)=>{const a=n.children.filter(c=>c.name===key);assert.equal(a.length,1,p);return a[0]},session.runtime.roots[0]);
 const hit=native('stage/menuPanel/start/hit'),line=native('stage/menuPanel/start/menuAccent/line');
 const boxes=sdk.wi(session),box=boxes.get(hit.Id),matrix=sdk.pa(session,boxes).get(hit.Id),point=sdk.Me(matrix,box.centerX,box.centerY);
 const frame=()=>{const t=performance.now();sdk.dn(session,1/60);report.stepMs.push(performance.now()-t)};
 function alpha(){
  const snapshot=sdk.ya(session,{inspect:true});
  const find=nodes=>{for(const n of nodes){if(n.id===line.Id)return n;const r=find(n.children??[]);if(r)return r}};
  const a=find(snapshot.tree);assert(a);return a.imageColor>>>24;
 }
 const reveal=(()=>{const find=n=>n.name==='pageReveal'?n:n.children.map(find).find(Boolean);return session.runtime.roots.map(find).find(Boolean)})();
 for(let i=0;reveal?.visible&&i<180;i++)frame();
 assert(!reveal?.visible,'the current application must finish its existing page reveal');
 frame();const idle=alpha();report.idleAlpha=idle;
 sdk.vi(session,'move',point.x,point.y);assert.equal(alpha(),idle,'enter is continuous before the next update');
 for(let i=0;i<3;i++){frame();report.alphas.push(alpha())}
 assert(report.alphas[0]>idle&&report.alphas[0]<255);
 assert(report.alphas[2]>report.alphas[0]);
 const reversed=alpha();sdk.vi(session,'move',5,5);assert.equal(alpha(),reversed,'retarget from the current value');
 frame();report.reversedAlpha=alpha();assert(report.reversedAlpha<reversed&&report.reversedAlpha>idle);
 for(let i=0;i<12;i++)frame();assert.equal(alpha(),idle,'leave settles');
 const before=session.runtime.controlsById.size;
 for(let i=0;i<20;i++){
  sdk.vi(session,'move',point.x,point.y);frame();sdk.vi(session,'move',5,5);frame();
 }
 assert.equal(session.runtime.controlsById.size,before,'hover does not allocate native controls');
 report.controls=before;report.logs=session.runtime.logs;
 assert(!report.logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed/.test(l.text)));
 for(const runtime of session.runtimes)for(const root of [...runtime.roots])runtime.destroyControl(root);
 report.remainingControls=session.runtime.controlsById.size;assert.equal(report.remainingControls,0);
 report.status='pass';
}catch(error){report.status='failed';report.error=String(error.stack);process.exitCode=1;}
finally{
 report.logs=session?.runtime.logs??[];for(const r of session?.runtimes??[])r.destroy();
 assert.equal(sha(saveArg),report.saveSha256);fs.writeFileSync(outArg,JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,alphas:report.alphas,error:report.error}));
}
