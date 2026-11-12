import fs from 'node:fs';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const [savePath,sdkPath,out]=process.argv.slice(2),{Gr,dn}=await import(pathToFileURL(sdkPath));
const bytes=fs.readFileSync(savePath),withScene=JSON.parse(bytes),withoutScene=structuredClone(withScene);
let removed=0;const strip=n=>{const old=n.children??[];n.children=old.filter(c=>c.name!=='menuRuinsScene');removed+=old.length-n.children.length;for(const c of n.children)strip(c)};strip(withoutScene.assets.server.root);assert.equal(removed,1);
const hash=b=>createHash('sha256').update(b).digest('hex'),stat=a=>{a=[...a].sort((a,b)=>a-b);return{n:a.length,p50:a[Math.ceil(a.length*.5)-1],p95:a[Math.ceil(a.length*.95)-1],max:a.at(-1)}};
const report={scope:'sequential paired installed Simulator SDK, same full game; only background subtree removed; not native device FPS',saveSha256:hash(bytes),sdkSha256:hash(fs.readFileSync(sdkPath)),samples:[]};
for(const mode of ['without','with','with','without','without','with']){
 const save=mode==='with'?withScene:withoutScene,t=performance.now(),session=Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'}),startMs=performance.now()-t,steps=[];
 for(let i=0;i<150;i++){const t=performance.now();dn(session,1/60);if(i>=30)steps.push(performance.now()-t)}
 const logs=session.runtime.logs;assert(!logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed/.test(l.text)));
 report.samples.push({mode,startMs,controls:session.runtime.controlsById.size,stepMs:stat(steps)});
 for(const runtime of session.runtimes)runtime.destroy();
}
for(const mode of ['with','without']){const a=report.samples.filter(s=>s.mode===mode);report[mode]={startMs:stat(a.map(s=>s.startMs)),stepP95Ms:stat(a.map(s=>s.stepMs.p95)),controls:a[0].controls}}
report.delta={startMedianMs:report.with.startMs.p50-report.without.startMs.p50,stepP95MedianMs:report.with.stepP95Ms.p50-report.without.stepP95Ms.p50,controls:report.with.controls-report.without.controls};
assert.equal(hash(fs.readFileSync(savePath)),report.saveSha256);fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(report);
