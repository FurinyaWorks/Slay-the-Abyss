// Run one sample per fresh node --expose-gc process. No browser rendering or GPU claim.
import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';import assert from'node:assert/strict';
const [file,sdkFile,out,scope='full']=process.argv.slice(2);assert(file&&sdkFile&&out&&!fs.existsSync(out));assert(global.gc,'Use node --expose-gc');
const sdk=await import(pathToFileURL(path.resolve(sdkFile))),start=performance.now();
const {save,sha256,bytes}=(()=>{const b=fs.readFileSync(file);return{save:JSON.parse(b),sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length}})();
const parseMs=performance.now()-start;global.gc();
const find=(n,name)=>n.name===name?n:(n.children??[]).map(c=>find(c,name)).find(Boolean);
const all=n=>[n,...(n.children??[]).flatMap(all)],bg=find(save.assets.server.root,'menuRedBackground');assert(bg);
const project=scope==='background'?{...save.assets.server,root:bg}:save.assets.server;
const before=process.memoryUsage(),t=performance.now();
const session=sdk.Gr(project,scope==='background'?{canvasId:'pc-16-9'}:{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});
const sdkMs=performance.now()-t;
if(scope==='full')assert(session.runtime.logs.some(l=>l.text==='ABYSS_UI ready'));
global.gc();const after=process.memoryUsage();const ticks=[];
for(let i=0;i<120;i++){const t=performance.now();sdk.dn(session,1/60);if(i>=30)ticks.push(performance.now()-t)}
ticks.sort((a,b)=>a-b);
const report={scope:'Actual Simulator SDK '+scope+' construction; not GPU/official FPS',sha256,bytes,parseMs,sdkMs,heapDelta:after.heapUsed-before.heapUsed,rssDelta:after.rss-before.rss,heapAfter:after.heapUsed,rssAfter:after.rss,peakRssBytes:process.resourceUsage().maxRSS*1024,backgroundControls:all(bg).length,stepP95Ms:ticks[Math.floor(ticks.length*.95)]};
for(const r of session.runtimes)r.destroy();fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
