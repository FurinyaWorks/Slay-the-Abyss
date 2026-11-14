import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';
import {createRequire}from'node:module';import {pathToFileURL}from'node:url';
import {createHash}from'node:crypto';import{gzipSync}from'node:zlib';
import{patchRendererTicker}from'../../../experiments/noncombat-review/renderer-ticker-patch.mjs';
const input=path.resolve(process.argv[2]??'.artifacts/sts-neow-reference-20261113/current');
const output=path.resolve(process.argv[3]??'docs/evidence/sts-neow-reference-20261113/visual-current');
assert(!fs.existsSync(output),'fresh screenshot output required');fs.mkdirSync(output,{recursive:true});
const workspace=path.join(input,'workspace');fs.mkdirSync(workspace,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),source=JSON.parse(fs.readFileSync(path.join(input,'receipt.json')));
for(const item of Object.values(source.scenarios)){
 const bytes=fs.readFileSync(path.join(input,item.file));assert.equal(hash(bytes),item.sha256);fs.writeFileSync(path.join(workspace,item.file),bytes);
}
process.env.PRIVATE_SNAPSHOT_EXTENSION='1';process.env.PRIVATE_SNAPSHOT_TRACE=path.join(input,'snapshot-trace.jsonl');process.env.QXQY_PLAY_TIMEOUT_MS='60000';
const web='F:/New folder/.artifacts/simulator-runtime/web';
const tickerRenderer=patchRendererTicker(fs.readFileSync(web+'/dist/public/play-renderer.js','utf8'));
// Count completed frontend render lifecycle passes, separately from SDK frames.
// The counter observes the existing ticker update; it does not step Lua.
const renderer=tickerRenderer.replaceAll('this.app.ticker.update(performance.now())','(()=>{this.app.ticker.update(performance.now());globalThis.__evidenceRenderPasses=(globalThis.__evidenceRenderPasses??0)+1})()')
 .replaceAll('this.app?.ticker.update(performance.now())','(()=>{this.app?.ticker.update(performance.now());globalThis.__evidenceRenderPasses=(globalThis.__evidenceRenderPasses??0)+1})()');
const {createWebServer}=await import(pathToFileURL(web+'/dist/server.js'));
const server=await createWebServer({host:'127.0.0.1',port:0,workspace}),base=server.url,sid='offline-sts-neow-'+Date.now();
const{composeRectMatrix,identityMatrix,applyMatrix}=await import(pathToFileURL('F:/New folder/.artifacts/art-lab-simulator/studio/ui/layout.js'));
const temp=path.join(input,'browser-temp');fs.mkdirSync(temp,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;
const{chromium}=createRequire('C:/Users/Administrator/AppData/Roaming/npm/node_modules/playwright/package.json')('playwright');
const browserPath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file=>fs.existsSync(file));assert(browserPath,'installed headless browser required');
const report={kind:'headless-current-source-shared-run-hud',createdAt:new Date().toISOString(),sourceClosureSha256:source.sourceClosureSha256,scenarios:source.scenarios,rendererSha256:hash(renderer),browserPath,rendering:'headless Chromium SwiftShader software WebGL; offline SDK fixture; not official import/ready/GPU/device evidence',shots:[],errors:[],resourceResponses:[],requests:[]};
async function api(route,body){const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)}),v=await r.json();assert(r.ok&&v.ok!==false,JSON.stringify(v));return v.value??v;}
function find(n,name){if(Array.isArray(n)){for(const c of n){const r=find(c,name);if(r)return r;}return;}if(n.name===name)return n;return find(n.children??[],name);}
const child=(n,name)=>n?.children?.find(c=>c.name===name);
function geometry(s){const m=new Map();function visit(n,p){const matrix=composeRectMatrix(p,n.box,n);m.set(n.id,matrix);for(const c of n.children??[])visit(c,matrix);}for(const n of s.tree)visit(n,identityMatrix());return m;}
let browser,context,page;
try{
 browser=await chromium.launch({headless:true,executablePath:browserPath,env:{...process.env,TEMP:temp,TMP:temp},args:['--disable-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-extensions','--disable-features=MediaRouter']});
 for(const scenario of process.argv[4]?[process.argv[4]]:['two','four']){
  await api('/editor/api/load-archive',{sessionId:sid,path:source.scenarios[scenario].file});
  context=await browser.newContext({viewport:{width:1400,height:1000}});
  await context.route('**/editor/play-renderer.js',r=>r.fulfill({contentType:'text/javascript',body:renderer}));
  page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)report.resourceResponses.push({status:r.status(),path:new URL(r.url()).pathname});});
  await page.goto(base+'/editor/play#'+sid);await page.addStyleTag({content:'#shell{width:1282px!important;height:722px!important;max-width:none!important;max-height:none!important;flex:none!important}'});
  await page.waitForFunction(()=>{const c=document.querySelector('canvas')?.getBoundingClientRect(),f=parseInt(document.querySelector('#frame')?.textContent?.replace(/[^0-9]/g,''));return document.body.innerText.includes('Playtest error')||f>0&&c?.width===1280&&c?.height===720;},{},{timeout:90000});
  const cv=page.locator('canvas').first(),rect=await cv.boundingBox(),state=()=>api('/editor/api/play',{sessionId:sid,action:'get',args:{inspect:true}});
  const point=(s,n)=>{assert(n,'control must exist');const b=n.box,q=applyMatrix(geometry(s).get(n.id),b.left+b.width/2,b.bottom+b.height/2);return{x:rect.x+q.x/s.canvasWidth*rect.width,y:rect.y+(1-q.y/s.canvasHeight)*rect.height};};
  const tap=async(s,n)=>{const q=point(s,n);report.requests.push({scenario,control:n.name,id:n.id,point:q});await page.mouse.click(q.x,q.y,{delay:120});await page.waitForTimeout(700);};
  const waitState=async(predicate)=>{const deadline=Date.now()+15000;let s;do{await page.waitForTimeout(250);s=await state();if(predicate(s))return s;}while(Date.now()<deadline);assert.fail('runtime state transition timed out');};
  async function shot(name,checks,keepPointer=false){if(!keepPointer)await page.mouse.move(rect.x+650,rect.y+200);await page.waitForTimeout(350);const s=await state();assert(JSON.stringify(s.logs).includes('ABYSS_UI ready'),'SDK readiness missing');assert(JSON.stringify(s.logs).includes('OFFLINE_STS_NEOW_FIXTURE scenario='+scenario),'fixture startup missing');assert(!s.logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed/.test(l.text)),JSON.stringify(s.logs));const before=await page.evaluate(()=>globalThis.__evidenceRenderPasses??0);await page.waitForFunction(n=>(globalThis.__evidenceRenderPasses??0)>=n+3,before,{timeout:15000});const after=await page.evaluate(()=>globalThis.__evidenceRenderPasses);fs.writeFileSync(path.join(output,name+'.state.json.gz'),gzipSync(JSON.stringify(s)));await cv.screenshot({path:path.join(output,name+'.png')});report.shots.push({name,scenario,checks,sha256:hash(fs.readFileSync(path.join(output,name+'.png'))),time:s.time,frame:s.frame,frontendRenderPasses:{before,after}});console.log(name);return s;}
  let s=await shot(scenario+'-intro','intro action reuses measured choice component');
  const event=()=>child(find(s.tree,'nodePanel'),'eventView');
  await tap(s,child(child(event(),'option1'),'hit'));
  s=await waitState(s=>child(child(find(s.tree,'nodePanel'),'eventView'),'option2').visible);
  s=await shot(scenario+'-normal','real seeded Neow options; one baseline and measured body; synthetic history explicitly injected');
  const rows=event().children.filter(n=>/^option[1-4]$/.test(n.name)&&n.visible);
  assert.equal(rows.length,scenario==='four'?4:2,'explicit history fixture option count');
  for(const row of rows){assert.equal(child(row,'title').visible,false);assert.equal(child(row,'description').visible,false);assert(child(row,'stsNeowText').visible);}
  const q=point(s,child(rows[0],'hit'));await page.mouse.move(q.x,q.y);await page.waitForTimeout(600);
  s=await shot(scenario+'-hover-functional-unverified','functional hover retained; original hover fidelity UNVERIFIED',true);
  report.logs=s.logs;await context.close();context=undefined;page=undefined;await api('/editor/api/play',{sessionId:sid,action:'stop',args:{}});
 }
 report.liveTreeDrift=[];
 for(const [p,sha]of Object.entries(source.inputs)){
  const current=hash(fs.readFileSync(p));if(current!==sha)report.liveTreeDrift.push({path:p,snapshotSha256:sha,currentSha256:current});
 }
 report.status='captured-awaiting-image-review';
}catch(error){report.status='failed';report.error=String(error.stack);console.error(report.error);process.exitCode=1;try{await page?.screenshot({path:path.join(output,'failure.png')});fs.writeFileSync(path.join(output,'failure-state.json.gz'),gzipSync(JSON.stringify(await api('/editor/api/play',{sessionId:sid,action:'get',args:{inspect:true}}))));}catch{}}
finally{try{await api('/editor/api/play',{sessionId:sid,action:'stop',args:{}});}catch{}await context?.close();await browser?.close();await server.close();fs.writeFileSync(path.join(output,'render-receipt.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({output,status:report.status,shots:report.shots.length,error:report.error}));}
