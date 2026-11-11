import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const [servicePath,output,frames='21']=process.argv.slice(2),service=JSON.parse(fs.readFileSync(servicePath));
const out=path.resolve(output);fs.mkdirSync(out,{recursive:true});fs.mkdirSync(out+'/tmp',{recursive:true});
const {chromium}=createRequire('C:/Users/Administrator/AppData/Roaming/npm/node_modules/playwright/package.json')('playwright');
const sid='lumine-capture-'+Date.now(),base=service.url,report={service,kind:'actual-browser-canvas',errors:[],shots:[]};
const api=async(route,body)=>{const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});const v=await r.json();assert(r.ok&&v.ok!==false,JSON.stringify(v));return v.value??v};
await api('/editor/api/load-archive',{sessionId:sid,path:'review-ten.save.json'});
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',env:{...process.env,TEMP:out+'/tmp',TMP:out+'/tmp'},args:['--enable-gpu','--disable-extensions','--disable-features=MediaRouter']});
const context=await browser.newContext({viewport:{width:1400,height:1000}}),page=await context.newPage();
page.on('pageerror',e=>report.errors.push(String(e)));
const find=(n,name)=>{if(Array.isArray(n)){for(const c of n){const r=find(c,name);if(r)return r}return}if(n.name===name)return n;return find(n.children??[],name)};
try{
 const started=performance.now();await page.goto(base+'/editor/play#'+sid);
 await page.addStyleTag({content:'#shell{width:1282px!important;height:722px!important;max-width:none!important;max-height:none!important;flex:none!important}'});
 await page.waitForFunction(()=>{const c=document.querySelector('canvas')?.getBoundingClientRect(),f=parseInt(document.querySelector('#frame')?.textContent.replace(/[^0-9]/g,''));return f>0&&c?.width===1280&&c?.height===720},{},{timeout:90000});
 const state=()=>api('/editor/api/play',{sessionId:sid,action:'get',args:{inspect:true}});
 let s;for(let i=0;i<90;i++){s=await state();const figure=find(s.tree,'officialFigure');if(figure?.visible&&figure.children?.length)break;await page.waitForTimeout(500)}
 assert(find(s.tree,'officialFigure')?.visible,'figure must become visible');report.firstObservedFigureMs=performance.now()-started;
 const canvas=page.locator('canvas').first();report.canvas=await canvas.boundingBox();
 await page.locator('#pause').click();
 s=await state();fs.writeFileSync(out+'/initial.state.json.gz',gzipSync(JSON.stringify(s)));
 report.captureClock='paused browser, two explicit SDK steps of .055s per sample; screenshots excluded from performance';
 for(let i=0;i<Number(frames);i++){
  const name='idle-'+String(i).padStart(2,'0')+'.png',t=performance.now();await canvas.screenshot({path:out+'/'+name});
  report.shots.push({name,atMs:performance.now()-started,simulationOffset:i*.11,captureMs:performance.now()-t,sha256:createHash('sha256').update(fs.readFileSync(out+'/'+name)).digest('hex')});
  if(i+1<Number(frames)){
   const step=await api('/editor/api/play',{sessionId:sid,action:'step',args:{dt:.055}});
   const step2=await api('/editor/api/play',{sessionId:sid,action:'step',args:{dt:.055}});
   const frame=step2.frame??step.frame;
   if(frame!==undefined)await page.waitForFunction(f=>parseInt(document.querySelector('#frame')?.textContent.replace(/[^0-9]/g,''))>=f,frame,{timeout:30000});
   await page.waitForTimeout(60);
  }
 }
 s=await state();fs.writeFileSync(out+'/final.state.json.gz',gzipSync(JSON.stringify(s)));
 report.faults=s.faults??[];report.status='captured-awaiting-visual-review';
}catch(e){report.status='failed';report.error=String(e.stack);process.exitCode=1;try{await page.screenshot({path:out+'/failure.png'})}catch{}}
finally{await context.close();await browser.close();report.stop=await api('/editor/api/play',{sessionId:sid,action:'stop',args:{}});fs.writeFileSync(out+'/receipt.json',JSON.stringify(report,null,2));console.log(JSON.stringify({out,status:report.status,error:report.error,firstObservedFigureMs:report.firstObservedFigureMs,shots:report.shots.length,errors:report.errors}));}
