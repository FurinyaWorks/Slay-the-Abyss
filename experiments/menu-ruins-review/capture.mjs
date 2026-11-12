import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const [serviceArg,out]=process.argv.slice(2),service=JSON.parse(fs.readFileSync(serviceArg)),base=service.url,sid='menu-review-'+Date.now();fs.mkdirSync(out,{recursive:true});
const {chromium}=createRequire('C:/Users/Administrator/AppData/Roaming/npm/node_modules/playwright/package.json')('playwright');
const {composeRectMatrix,identityMatrix,applyMatrix}=await import(pathToFileURL('F:/New folder/.artifacts/art-lab-simulator/studio/ui/layout.js'));
const report={saveSha256:service.saveSha256,rendererSha256:service.rendererSha256,errors:[],timings:[],shots:[],scope:'Web Simulator actual renderer; not official client or GPU FPS'};
const api=async(route,body)=>{const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)}),v=await r.json();assert(r.ok&&v.ok!==false,JSON.stringify(v));return v.value??v};
const find=(nodes,name)=>{for(const n of Array.isArray(nodes)?nodes:[nodes]){if(n.name===name)return n;const v=find(n.children??[],name);if(v)return v}};
const t0=performance.now();await api('/editor/api/load-archive',{sessionId:sid,path:'menu.save.json'});report.archiveLoadMs=performance.now()-t0;
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',args:['--enable-gpu','--disable-extensions']});
try{
 const context=await browser.newContext({viewport:{width:1400,height:1000}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
 const nav=performance.now();await page.goto(base+'/editor/play#'+sid);await page.addStyleTag({content:'#shell{width:1282px!important;height:722px!important;max-width:none!important;max-height:none!important;flex:none!important}'});
 await page.waitForFunction(()=>parseInt(document.querySelector('#frame')?.textContent.replace(/[^0-9]/g,''))>0,{},{timeout:60000});report.navigationToFrameMs=performance.now()-nav;await page.waitForTimeout(500);
 const cv=page.locator('canvas').first(),rect=await cv.boundingBox(),state=()=>api('/editor/api/play',{sessionId:sid,action:'get',args:{inspect:true}});
 async function shot(name){const s=await state();await cv.screenshot({path:out+'/'+name+'.png'});report.shots.push(name);fs.writeFileSync(out+'/'+name+'.state.json',JSON.stringify({tree:s.tree,logs:s.logs,frame:s.frame}));return s}
 function point(s,n){assert(n,'target exists');let matrix;function visit(a,p){const m=composeRectMatrix(p,a.box,a);if(a.id===n.id)matrix=m;for(const c of a.children??[])visit(c,m)}for(const root of s.tree)visit(root,identityMatrix());const b=n.box,q=applyMatrix(matrix,b.left+b.width/2,b.bottom+b.height/2);return{x:rect.x+q.x/s.canvasWidth*rect.width,y:rect.y+(1-q.y/s.canvasHeight)*rect.height}}
 async function tap(s,n,expect){const q=point(s,n),t=performance.now();await page.mouse.click(q.x,q.y);for(let i=0;i<100;i++){const a=await state();if(find(a.tree,expect)?.visible){report.timings.push({to:expect,clickToObservedMs:performance.now()-t});return a}await page.waitForTimeout(50)}throw Error('did not reach '+expect)}
 let s=await shot('01-menu');assert(find(s.tree,'menuRuinsScene')?.visible);assert(s.logs.every(l=>l.level!=='error'));
 if(process.env.MENU_REVIEW_FULL==='1'){
  s=await tap(s,find(find(s.tree,'start'),'hit'),'characterPanel');await page.waitForTimeout(800);await shot('02-character');
  const count=nodes=>nodes.reduce((v,n)=>v+1+count(n.children??[]),0);report.roundtripCounts=[];
  for(let i=0;i<5;i++){
   const panel=find(s.tree,'characterPanel'),back=find(panel,'back');assert(back,'character back');s=await tap(s,find(back,'hit'),'menuPanel');
   report.roundtripCounts.push(count(s.tree));s=await tap(s,find(find(s.tree,'start'),'hit'),'characterPanel');
  }
  s=await tap(s,find(find(find(s.tree,'characterPanel'),'back'),'hit'),'menuPanel');await page.mouse.move(rect.x+600,rect.y+200);await page.waitForTimeout(500);await shot('03-return-menu');
  assert(new Set(report.roundtripCounts).size===1,'no accumulating controls');
 }
 report.status='captured';await context.close();
}catch(error){report.status='failed';report.error=String(error.stack);process.exitCode=1;console.log(report.error)}
finally{await browser.close();await api('/editor/api/play',{sessionId:sid,action:'stop',args:{}});fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(report)}
