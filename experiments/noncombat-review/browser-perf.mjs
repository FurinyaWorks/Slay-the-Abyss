import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire}from'node:module';import {pathToFileURL}from'node:url';import {createHash}from'node:crypto';
const service=JSON.parse(fs.readFileSync(process.argv[2]));
const base=service.url,out=process.argv[3],sid='qa-stage-visual-'+Date.now();fs.mkdirSync(out);
const {composeRectMatrix,identityMatrix,applyMatrix}=await import(pathToFileURL('F:/New folder/.artifacts/art-lab-simulator/studio/ui/layout.js'));
const {chromium}=createRequire('C:/Users/Administrator/AppData/Roaming/npm/node_modules/playwright/package.json')('playwright');
const report={kind:'actual-stage-visual-not-performance',buildId:service.buildId,fixtureSha256:service.cases[0].sha256,rendererSha256:service.rendererSha256,sid,shots:[],errors:[]};
const hash=b=>createHash('sha256').update(b).digest('hex');
async function api(route,body){const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)}),v=await r.json();assert(r.ok&&v.ok!==false,JSON.stringify(v));return v.value??v;}
const archiveStart=performance.now(); await api('/editor/api/load-archive',{sessionId:sid,path:service.cases[0].archive});
report.archiveLoadMs=performance.now()-archiveStart; function find(n,name){if(Array.isArray(n)){for(const c of n){const r=find(c,name);if(r)return r}return}if(n.name===name)return n;return find(n.children??[],name)}
const plain=s=>String(s??'').replace(/<[^>]+>/g,''),child=(n,name)=>n.children.find(c=>c.name===name);
function geometry(s){const m=new Map();function visit(n,p){const t=composeRectMatrix(p,n.box,n);m.set(n.id,t);for(const c of n.children??[])visit(c,t)}for(const n of s.tree)visit(n,identityMatrix());return m;}
const temp=path.resolve(out+'/tmp');fs.mkdirSync(temp);const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',env:{...process.env,TEMP:temp,TMP:temp},args:['--enable-gpu','--disable-extensions','--disable-features=MediaRouter']});let context,page;
try{
 context=await browser.newContext({viewport:{width:1400,height:1000}});page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));const navStart=performance.now();await page.goto(base+'/editor/play#'+sid);await page.addStyleTag({content:'#shell{width:1282px!important;height:722px!important;max-width:none!important;max-height:none!important;flex:none!important}'});await page.waitForFunction(()=>{const c=document.querySelector('canvas')?.getBoundingClientRect(),f=parseInt(document.querySelector('#frame')?.textContent.replace(/[^0-9]/g,''));return f>0&&c?.width===1280&&c?.height===720},{},{timeout:60000});report.navigationToPositiveFrameMs=performance.now()-navStart;
 const cv=page.locator('canvas').first(),rect=await cv.boundingBox(),state=()=>api('/editor/api/play',{sessionId:sid,action:'get',args:{inspect:true}});
 const point=(s,n)=>{assert(n,'control must exist');const b=n.box,q=applyMatrix(geometry(s).get(n.id),b.left+b.width/2,b.bottom+b.height/2);return{x:rect.x+q.x/s.canvasWidth*rect.width,y:rect.y+(1-q.y/s.canvasHeight)*rect.height}};
 const move=async(s,n)=>{const q=point(s,n);await page.mouse.move(q.x,q.y);return q},tap=async(s,n)=>{const q=await move(s,n),phase='tap-'+n.name+'-'+(report.transitions??=[]).length;const before=await page.evaluate(phase=>{const p=__PAGE_PROBE__;p.phase=phase;return{start:performance.now(),signature:p.paints.at(-1)?.signature}},phase);await page.mouse.click(q.x,q.y);try{await page.waitForFunction(before=>__PAGE_PROBE__.paints.some(p=>p.phase===__PAGE_PROBE__.phase&&p.signature!==before.signature),before,{timeout:10000})}catch{}const observed=await page.evaluate(before=>__PAGE_PROBE__.paints.find(p=>p.phase===__PAGE_PROBE__.phase&&p.signature!==before.signature),before);report.transitions.push({phase,before,observed,clickToFirstChangedDrawMs:observed?observed.end-before.start:null});await page.waitForTimeout(250)},off=async()=>{await page.mouse.move(rect.x+600,rect.y+230);await page.waitForTimeout(350)};
 await page.evaluate(async()=>{const{PixiPlayRenderer}=await import('/editor/play-renderer.js');const p=window.__PAGE_PROBE__={phase:'init',paints:[],ids:[]};p.visible=n=>{for(let c=n;c;c=c.parent)if(c.visible===false||c.alpha===0)return false;return !!n};const original=PixiPlayRenderer.prototype.applyScene;PixiPlayRenderer.prototype.applyScene=async function(...args){p.renderer=this;if(!this.app.renderer.__pageWrapped){const renderer=this.app.renderer,old=renderer.render;renderer.render=function(...a){const start=performance.now(),result=old.apply(this,a);const signature=JSON.stringify(p.ids.map(id=>{const n=p.renderer.nodes.get(id);return{id,visible:p.visible(n),text:n?.__visual?.__text?.text}}));p.paints.push({phase:p.phase,start,end:performance.now(),signature});return result};renderer.__pageWrapped=true}return original.apply(this,args)}});
 async function shot(name,checks={}){const s=await state();if(name==='01-menu'){function all(nodes){return nodes.flatMap(n=>[n,...all(n.children??[])])}const ids=all(s.tree).filter(n=>['menuPanel','characterPanel','eventView','mapPanel','battlePanel'].includes(n.name)).map(n=>n.id);const body=find(find(s.tree,'eventView'),'body');if(body)ids.push(body.id);await page.evaluate(ids=>__PAGE_PROBE__.ids=ids,ids);await page.waitForTimeout(250)}report.shots.push({name,frame:s.frame,checks});return s;}
 let s=await shot('01-menu');
 await tap(s,find(find(s.tree,'menuPanel'),'start').children.find(n=>n.name==='hit'));s=await state(); for(let wait=0;wait<80&&find(find(s.tree,'characterPanel'),'hint')?.text?.includes('正在载入');wait++){await page.waitForTimeout(500);s=await state()} await shot('02-character');
 const character=find(s.tree,'characterPanel');assert(character.visible);
 await tap(s,find(find(character,'confirm'),'hit'));s=await shot('03-neow');
 await tap(s,find(find(find(s.tree,'eventView'),'option1'),'hit'));s=await shot('04-neow-offers');
 await tap(s,find(find(find(s.tree,'eventView'),'option2'),'hit'));s=await shot('05-neow-result'); await tap(s,find(find(find(s.tree,'eventView'),'option1'),'hit'));s=await shot('06-map');
 function all(nodes){return nodes.flatMap(n=>[n,...all(n.children??[])])}; await page.waitForTimeout(500);s=await state();const next=all(s.tree).find(n=>/^node\d+$/.test(n.name)&&n.visible&&n.children.some(c=>c.name==='hit'&&c.visible));assert(next,'reachable map node');await tap(s,find(next,'hit'));await page.waitForTimeout(1500);s=await shot('07-first-battle');assert(find(s.tree,'battlePanel').visible);
 report.probe=await page.evaluate(()=>({paints:__PAGE_PROBE__.paints}));
 report.status='captured';
}catch(error){report.status='failed';report.error=String(error.stack);console.log(report.error);process.exitCode=1}
finally{await context?.close();await browser.close();try{await api('/editor/api/play',{sessionId:sid,action:'stop',args:{}})}catch(error){report.stopError=String(error)}fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(out)}





