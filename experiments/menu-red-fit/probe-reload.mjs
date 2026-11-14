// Reproduce stop -> immediate start through the real HTTP/SDK service, one
// isolated hidden process at a time. Only the probe's health response adds GC
// memory inspection; the application, SDK and request lifecycle stay unchanged.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{spawn,execFileSync}from'node:child_process';import{createHash}from'node:crypto';
const [oldSave,newSave,outArg,sdk,web,bootstrap]=process.argv.slice(2);assert(bootstrap&&outArg);const out=path.resolve(outArg);assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),pause=ms=>new Promise(r=>setTimeout(r,ms)),sid='reload-probe';
const oldSource=execFileSync('git',['show','66a35042459d9186ee36a0e224c795340399b580:experiments/menu-red-fit/serve.mjs'],{encoding:'utf8',windowsHide:true});
const newSource=fs.readFileSync('experiments/menu-red-fit/serve.mjs','utf8'),reports=[];
for(const [label,source,save]of [['old',oldSource,oldSave],['new',newSource,newSave]]){
 const dir=path.join(out,label);fs.mkdirSync(dir);const anchor='saveSha256:receipt?.saveSha256';assert.equal(source.split(anchor).length-1,1);
 const instrumented=source.replace(anchor,anchor+',probeState:{active:sessions.size,parked:parked?1:0,parkedSdkMs:parked?.__startMs??null,memory:(()=>{global.gc();return process.memoryUsage()})()}');
 const script=path.join(dir,'serve.mjs');fs.writeFileSync(script,instrumented);
 const env={...process.env,MENU_REVIEW_SDK:path.resolve(sdk),MENU_REVIEW_PORT:'0',MENU_REVIEW_SESSION:sid,MENU_REVIEW_AUTO_ATTACH:'1'};delete env.MENU_REVIEW_IMAGE_CACHE;delete env.MENU_REVIEW_ASSET_BASE;delete env.MENU_REVIEW_PRELOAD;
 const child=spawn(process.execPath,['--expose-gc','--import',bootstrap,script,path.resolve(web),path.resolve(save),path.join(dir,'service')],{cwd:process.cwd(),env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 const exited=new Promise(r=>child.once('exit',r));child.stdout.pipe(fs.createWriteStream(path.join(dir,'stdout.log')));child.stderr.pipe(fs.createWriteStream(path.join(dir,'stderr.log')));
 try{
  const file=path.join(dir,'service/service.json');let ready=false;
  for(let i=0;i<600;i++){if(fs.existsSync(file)){ready=true;break}if(child.exitCode!==null)throw Error(label+' service failed');await pause(100)}assert(ready,'Service ready timeout');
  const service=JSON.parse(fs.readFileSync(file)),base=service.url;
  const health=async()=>{const r=await fetch(base+'/menu-health');assert(r.ok);return r.json()};
  const api=async(action,args={})=>{const r=await fetch(base+'/editor/api/play',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:sid,action,args}),signal:AbortSignal.timeout(60000)}),v=await r.json();assert(r.ok&&v.ok,JSON.stringify(v));return v.value};
  const initial=await health();assert.equal(initial.probeState.active,0);assert.equal(initial.probeState.parked,1);
  const attached=await api('start');assert(attached.previewAttachedPreloaded);
  await api('stop');const start=performance.now();await api('start');const restartReplyMs=performance.now()-start;
  await pause(300);const after=await health();assert.equal(after.probeState.active,1);assert.equal(after.probeState.parked,label==='old'?1:0,'Reload must not leave an extra full runtime');
  const restartToObservedStableMs=performance.now()-start;
  let mobileSingleRuntime=null;
  if(label==='new'){
   await api('stop');await pause(300);const parkedAgain=await health();assert.equal(parkedAgain.probeState.parked,1);
   await api('start',{canvasId:'mobile-16-9'});const mobile=await health();assert.equal(mobile.probeState.active,1);assert.equal(mobile.probeState.parked,0);mobileSingleRuntime=true;
  }
  const report={label,saveSha256:hash(fs.readFileSync(save)),originalServiceSha256:hash(source),instrumentedServiceSha256:hash(instrumented),initial:initial.probeState,after:after.probeState,restartReplyMs,restartToObservedStableMs,mobileSingleRuntime,scope:'One local HTTP stop/start reproduction; GC heap sample and 300ms observation wait included; not official/device load or GPU performance'};
  reports.push(report);console.log(JSON.stringify(report));
 }finally{child.kill();await exited;}
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',samples:1,reports},null,2));
