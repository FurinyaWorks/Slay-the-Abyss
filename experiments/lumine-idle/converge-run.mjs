// One fresh backend at a time; all cases reuse the actual-GIL and #621 probes.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';import {createHash} from 'node:crypto';
const [name,asset,parent='build/lumine-final-baseline/a4ae5949-7f2f-45d1-a3b5-7166bc236360/candidate.json',frames='1',mode='legacy-probe']=process.argv.slice(2);
assert(name&&asset&&/^[a-z0-9-]+$/.test(name));
const out=path.resolve('.artifacts/lumine-convergence-20261111/'+name);assert(!fs.existsSync(out),'use a fresh case name');fs.mkdirSync(out,{recursive:true});
const sdk='F:/New folder/.worktrees/ui-lifecycle/.artifacts/task-100-1/final/v25/sdk-harness/sdk-export-only/actual-session.mjs';
const web='F:/New folder/.worktrees/pr588-playable/.artifacts/battle-repair-20261111/snapshot-private-web-v2';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(script,args,log)=>new Promise((resolve,reject)=>{
 const fd=fs.openSync(out+'/'+log+'.log','w'),p=spawn(process.execPath,[script,...args],{stdio:['ignore',fd,fd],windowsHide:true});fs.closeSync(fd);
 const timer=setTimeout(()=>{p.kill();reject(Error(script+' timeout'))},240000);
 p.once('error',e=>{clearTimeout(timer);reject(e)});p.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error(script+' failed '+code+'; see '+out+'/'+log+'.log'))});
});
const started=Date.now();let server;const receipt={name,asset,parent,startedAt:new Date().toISOString(),status:'running',frames:Number(frames),mode};
try{
 await run('experiments/lumine-idle/derive.mjs',[parent,asset,out+'/gil'],'derive');
 await run('scripts/native-candidate-preview.mjs',[out+'/gil/candidate.json',out+'/preview'],'readback');
 await run('experiments/lumine-idle/fixtures.mjs',[out+'/preview'],'fixture');
 await run('experiments/lumine-idle/benchmark.mjs',[out+'/preview/hud.save.json',sdk,out+'/sdk.json','--quick'],'sdk');
 const fd=fs.openSync(out+'/server.log','w');server=spawn(process.execPath,['experiments/lumine-idle/serve.mjs','--web-dir',web,'--scenario-dir',out+'/preview','--candidate',out+'/gil/candidate.json','--output',out+'/service','--port','0'],{stdio:['ignore',fd,fd],windowsHide:true});fs.closeSync(fd);
 for(let i=0;i<240&&!fs.existsSync(out+'/service/service.json');i++){
  if(server.exitCode!==null)throw Error('server exited '+server.exitCode);await new Promise(r=>setTimeout(r,500));
 }
 assert(fs.existsSync(out+'/service/service.json'),'server did not become ready');
 await run('experiments/lumine-idle/browser-benchmark.mjs',[out+'/preview',out+'/service/service.json',out+'/browser',...(mode==='fixed-drag'?['--fixed-drag']:[])],'browser');
 await run('experiments/lumine-idle/capture.mjs',[out+'/service/service.json',out+'/visual',frames],'capture');
 receipt.status='measured';receipt.gilSha256=hash(out+'/gil/candidate.gil');receipt.saveSha256=hash(out+'/preview/hud.save.json');
 receipt.sdk=out+'/sdk.json';receipt.browser=out+'/browser/report.json';receipt.visual=out+'/visual/receipt.json';
}catch(e){receipt.status='failed';receipt.error=String(e.stack);process.exitCode=1;}
finally{
 server?.kill();receipt.elapsedMs=Date.now()-started;receipt.finishedAt=new Date().toISOString();
 fs.writeFileSync(out+'/case.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}
