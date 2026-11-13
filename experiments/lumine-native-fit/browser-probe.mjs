// No desktop input: headless browser, HTTP Simulator events and real browser draw.
// Browser RAF/submission/query times are labelled separately from official device GPU.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const [serviceArg,outArg]=process.argv.slice(2),service=JSON.parse(fs.readFileSync(serviceArg));assert(!fs.existsSync(outArg));fs.mkdirSync(outArg,{recursive:true});
const require=createRequire('C:/Users/Administrator/AppData/Roaming/npm/node_modules/playwright/package.json'),{chromium}=require('playwright');
const {composeRectMatrix,identityMatrix,applyMatrix}=await import(pathToFileURL('F:/New folder/.artifacts/art-lab-simulator/studio/ui/layout.js'));
const executable=process.env.LUMINE_BROWSER??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';assert(fs.existsSync(executable));
const temp=path.resolve(outArg+'/tmp');fs.mkdirSync(temp);
const browser=await chromium.launch({headless:true,executablePath:executable,env:{...process.env,TEMP:temp,TMP:temp},args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--disable-extensions']});
const report={scope:'Headless installed browser, existing full-game Simulator. HTTP native pointer events; RAF intervals, CPU draw submissions and optional WebGL elapsed queries. Not official client/mobile GPU.',probeSha256:createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex'),service,candidateSha256:service.candidateSha256,saveSha256:service.saveSha256,executable,cases:[],status:'running'};
const find=(nodes,name)=>{for(const n of nodes){if(n.name===name)return n;const found=find(n.children??[],name);if(found)return found;}};
function geometry(s){const m=new Map();function visit(n,p){const t=composeRectMatrix(p,n.box,n);m.set(n.id,t);for(const c of n.children??[])visit(c,t);}for(const n of s.tree)visit(n,identityMatrix());return m;}
async function api(sid,action,args={}){const r=await fetch(service.url+'/editor/api/play',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:sid,action,args}),signal:AbortSignal.timeout(60000)});const v=await r.json();assert(r.ok&&v.ok!==false,JSON.stringify(v));return v.value;}
try{
 for(const budget of [0,800,1600,3200]){
  const sid='lumine-'+budget,context=await browser.newContext({viewport:{width:1400,height:1000}}),page=await context.newPage(),result={budget,errors:[]};report.cases.push(result);page.on('pageerror',e=>result.errors.push(String(e)));
  try{
   const start=performance.now();await page.goto(service.url+'/editor/play#'+sid);await page.addStyleTag({content:'#shell{width:1282px!important;height:722px!important;max-width:none!important;max-height:none!important;flex:none!important}'});
   await page.waitForFunction(()=>parseInt(document.querySelector('#frame')?.textContent.replace(/[^0-9]/g,''))>0,{},{timeout:60000});result.navigationToFirstFrameMs=performance.now()-start;
   await page.evaluate(async()=>{
    const {PixiPlayRenderer}=await import('/editor/play-renderer.js'),old=PixiPlayRenderer.prototype.applyScene;
    window.__FIT_BROWSER__={draws:[],drawTimes:[],gpu:[],disjoint:false,pending:[]};
    PixiPlayRenderer.prototype.applyScene=async function(...args){
     const p=window.__FIT_BROWSER__;p.renderer=this;p.scene=args[0];
     const r=this.app?.renderer;
     if(r&&!r.__fitProbe){r.__fitProbe=true;const original=r.render,canvas=document.querySelector('canvas'),gl=canvas?.getContext('webgl2')??canvas?.getContext('webgl');
      const debug=gl?.getExtension('WEBGL_debug_renderer_info');p.gpuRenderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
      const ext=gl?.getExtension('EXT_disjoint_timer_query_webgl2');p.querySupported=!!ext&&typeof gl.createQuery==='function';
      r.render=function(...a){
       const t=performance.now();let query;
       if(p.querySupported&&p.pending.length<30){query=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,query);}
       const answer=original.apply(this,a);
       if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);p.pending.push(query);}
       p.draws.push(performance.now()-t);p.drawTimes.push(performance.now());
       if(p.querySupported){p.disjoint=p.disjoint||!!gl.getParameter(ext.GPU_DISJOINT_EXT);for(let i=p.pending.length-1;i>=0;i--){const q=p.pending[i];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){p.gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);p.pending.splice(i,1);}}}
       return answer;
      };
     }
     return old.apply(this,args);
    };
   });
   let state=await api(sid,'get',{inspect:true});const menu=find(state.tree,'menuPanel'),hit=find([menu],'start').children.find(c=>c.name==='hit'),matrix=geometry(state).get(hit.id),point=applyMatrix(matrix,hit.box.left+hit.box.width/2,hit.box.bottom+hit.box.height/2);
   const trigger=performance.now();await api(sid,'pointer',{type:'move',x:point.x,y:point.y});await api(sid,'pointer',{type:'down',x:point.x,y:point.y});await api(sid,'step',{dt:1/60});await api(sid,'pointer',{type:'up',x:point.x,y:point.y});await api(sid,'step',{dt:1/60});
   for(let i=0;i<150;i++){state=await api(sid,'get',{inspect:true});const panel=find(state.tree,'characterPanel');if(panel?.visible&&!(find([panel],'hint')?.text??'').includes('正在载入'))break;await api(sid,'step',{dt:1/30});}
   result.httpToModelMs=performance.now()-trigger;const panel=find(state.tree,'characterPanel');assert(panel?.visible,'Selection did not open');assert(!state.logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed|LUMINE_FIT failed/.test(l.text)));
   await page.waitForFunction(()=>window.__FIT_BROWSER__?.renderer?.nodes?.size>0,{},{timeout:30000});
   await page.waitForTimeout(800);await page.locator('canvas').first().screenshot({path:path.join(outArg,'browser-'+budget+'.png')});
   result.probe=await page.evaluate(async()=>{
    const p=window.__FIT_BROWSER__;p.draws=[];p.drawTimes=[];p.gpu=[];const frames=[];let prior=performance.now();
    await new Promise(resolve=>{function frame(t){frames.push(t-prior);prior=t;if(frames.length>=180)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);});
    return {gpuRenderer:p.gpuRenderer,querySupported:p.querySupported,gpuDisjoint:p.disjoint,gpuElapsedMs:p.disjoint?[]:p.gpu,cpuDrawSubmissionMs:p.draws,actualDrawIntervalsMs:p.drawTimes.slice(1).map((t,i)=>t-p.drawTimes[i]),rafIntervalMs:frames,visibleNodes:p.renderer.nodes.size};
   });
   result.status=result.errors.length?'failed':'pass';assert.equal(result.errors.length,0,JSON.stringify(result.errors));
  }finally{await api(sid,'stop').catch(()=>{});await context.close();}
 }
 report.status='pass';
}catch(e){report.status='failed';report.error=String(e.stack);console.error(e);process.exitCode=1;}
finally{await browser.close();fs.writeFileSync(path.join(outArg,'browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,cases:report.cases.map(c=>({budget:c.budget,status:c.status,gpu:c.probe?.gpuRenderer,frames:c.probe?.rafIntervalMs?.length}))}));}
