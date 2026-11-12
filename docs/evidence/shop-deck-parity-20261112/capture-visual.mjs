import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire}from'node:module';import {pathToFileURL}from'node:url';import {createHash}from'node:crypto';import {gzipSync}from'node:zlib';
import {patchRendererTicker}from'../../../experiments/noncombat-review/renderer-ticker-patch.mjs';
const input=path.resolve(process.argv[2]??'.artifacts/shop-deck-parity-20261112/current-final'),output=path.resolve(process.argv[3]??'docs/evidence/shop-deck-parity-20261112/visual-current');
assert(!fs.existsSync(output),'fresh screenshot directory required');fs.mkdirSync(output,{recursive:true});
const workspace=path.join(input,'workspace');fs.mkdirSync(workspace,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const source=read(path.join(input,'receipt.json')),saveBytes=fs.readFileSync(path.join(input,'current-shop.save.json'));assert.equal(hash(saveBytes),source.saveSha256);
fs.writeFileSync(path.join(workspace,'current-shop.save.json'),saveBytes);
process.env.PRIVATE_SNAPSHOT_EXTENSION='1';process.env.PRIVATE_SNAPSHOT_TRACE=path.join(input,'snapshot-trace.jsonl');process.env.QXQY_PLAY_TIMEOUT_MS='60000';
const web='F:/New folder/.artifacts/simulator-runtime/web',renderer=patchRendererTicker(fs.readFileSync(web+'/dist/public/play-renderer.js','utf8'));
assert.equal(hash(renderer),'5971287fabb54d2c061b76857bafffae6575b9e7612cb4bcc4ba95e88bb0aa20');
const {createWebServer}=await import(pathToFileURL(web+'/dist/server.js'));
const server=await createWebServer({host:'127.0.0.1',port:0,workspace}),base=server.url,sid='offline-shop-deck-'+Date.now();
const {composeRectMatrix,identityMatrix,applyMatrix}=await import(pathToFileURL('F:/New folder/.artifacts/art-lab-simulator/studio/ui/layout.js'));
const temp=path.join(input,'browser-temp');fs.mkdirSync(temp,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;
const {chromium}=createRequire('C:/Users/Administrator/AppData/Roaming/npm/node_modules/playwright/package.json')('playwright');
const executable=process.env.SHOP_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe';
const installedFallback='C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
const browserPath=fs.existsSync(executable)?executable:installedFallback;assert(fs.existsSync(browserPath));
const report={kind:'headless-actual-simulator-render-generated-current-official-profile',sourceClosureSha256:source.sourceClosureSha256,saveSha256:source.saveSha256,rendererSha256:hash(renderer),sdkSha256:hash(fs.readFileSync('F:/New folder/.artifacts/simulator-runtime/sdk/actual-session.mjs')),browserPath,rendering:'headless Chromium SwiftShader software WebGL; not official/GPU/device evidence',sid,shots:[],errors:[],resourceResponses:[],requests:[]};
async function api(route,body){const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)}),v=await response.json();assert(response.ok&&v.ok!==false,JSON.stringify(v));return v.value??v;}
function find(n,name){if(Array.isArray(n)){for(const c of n){const r=find(c,name);if(r)return r}return;}if(n.name===name)return n;return find(n.children??[],name);}
const child=(n,name)=>n?.children?.find(c=>c.name===name);
function geometry(s){const m=new Map();function visit(n,parent){const matrix=composeRectMatrix(parent,n.box,n);m.set(n.id,matrix);for(const c of n.children??[])visit(c,matrix);}for(const n of s.tree)visit(n,identityMatrix());return m;}
let browser,context,page;
try{
 await api('/editor/api/load-archive',{sessionId:sid,path:'current-shop.save.json'});
 browser=await chromium.launch({headless:true,executablePath:browserPath,env:{...process.env,TEMP:temp,TMP:temp},args:['--disable-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-extensions','--disable-features=MediaRouter']});
 context=await browser.newContext({viewport:{width:1400,height:1000}});await context.route('**/editor/play-renderer.js',r=>r.fulfill({contentType:'text/javascript',body:renderer}));
 page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400){const u=new URL(r.url());report.resourceResponses.push({status:r.status(),path:u.pathname,queryKeys:[...u.searchParams.keys()]});}});
 await page.goto(base+'/editor/play#'+sid);await page.addStyleTag({content:'#shell{width:1282px!important;height:722px!important;max-width:none!important;max-height:none!important;flex:none!important}'});
 await page.waitForFunction(()=>{const c=document.querySelector('canvas')?.getBoundingClientRect(),f=parseInt(document.querySelector('#frame')?.textContent?.replace(/[^0-9]/g,''));return document.body.innerText.includes('Playtest error')||f>0&&c?.width===1280&&c?.height===720;},{},{timeout:90000});
 const cv=page.locator('canvas').first(),rect=await cv.boundingBox(),state=()=>api('/editor/api/play',{sessionId:sid,action:'get',args:{inspect:true}});
 const point=(s,n)=>{assert(n,'control must exist');const b=n.box,q=applyMatrix(geometry(s).get(n.id),b.left+b.width/2,b.bottom+b.height/2);return{x:rect.x+q.x/s.canvasWidth*rect.width,y:rect.y+(1-q.y/s.canvasHeight)*rect.height};};
 const move=async(s,n)=>{const q=point(s,n);await page.mouse.move(q.x,q.y);return q;};
 const tap=async(s,n)=>{const q=await move(s,n);report.requests.push({kind:'headless-browser-pointer',control:n.name,id:n.id,point:q});await page.mouse.click(q.x,q.y,{delay:120});await page.waitForTimeout(700);};
 const waitState=async(predicate)=>{let value;const deadline=Date.now()+15000;do{await page.waitForTimeout(250);value=await state();if(predicate(value))return value;}while(Date.now()<deadline);return value;};
 const off=async()=>{await page.mouse.move(rect.x+650,rect.y+200);await page.waitForTimeout(200);};
 async function shot(name,checks={}){const s=await state();assert(JSON.stringify(s.logs).includes('ABYSS_UI ready'),'SDK readiness missing: '+JSON.stringify(s.logs));assert(JSON.stringify(s.logs).includes('OFFLINE_SHOP_FIXTURE'),'startup fixture missing');assert(!s.logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed/.test(l.text)),JSON.stringify(s.logs));fs.writeFileSync(path.join(output,name+'.state.json.gz'),gzipSync(JSON.stringify(s)));await cv.screenshot({path:path.join(output,name+'.png')});report.shots.push({name,checks,sha256:hash(fs.readFileSync(path.join(output,name+'.png'))),time:s.time,frame:s.frame});console.log(name);return s;}
 await page.waitForTimeout(350);let s=await state();fs.writeFileSync(path.join(input,'initial-state.json'),JSON.stringify(s));
 assert(find(s.tree,'nodePanel')?.visible,'shop not visible');
 const merchant=()=>find(s.tree,'merchant');
 await tap(s,find(child(merchant(),'talk'),'hit'));await off();s=await shot('01-shop-bubble',{expected:'merchant pale head bubble, shelf unobstructed, bottom black bar removed, pale leave text, top map'});
 const panel=find(s.tree,'nodePanel'),confirm=child(panel,'confirm');assert(confirm?.visible,'leave control missing');
 await move(s,confirm);await page.waitForTimeout(200);s=await shot('02-leave-hover');
 await page.mouse.down();await page.waitForTimeout(150);s=await shot('03-leave-pressed');await off();await page.mouse.up();await page.waitForTimeout(150);
 s=await state();const route=find(find(s.tree,'nodePanel'),'runRoute');assert(route?.visible,'top map missing');await tap(s,find(route,'hit'));s=await waitState(s=>find(s.tree,'mapPanel').visible);report.mapPreviewOpened=find(s.tree,'mapPanel').visible;
 s=await shot(report.mapPreviewOpened?'04-map-preview':'04-map-click-no-open');
 if(report.mapPreviewOpened){await tap(s,find(find(s.tree,'mapPanel'),'previewBack')?.children.find(n=>n.name==='hit'));await waitState(s=>!find(s.tree,'mapPanel').visible);await off();s=await shot('05-shop-map-return');assert(find(s.tree,'nodePanel').visible);}
 await tap(s,find(child(find(s.tree,'deckEntry'),'open'),'hit'));await waitState(s=>find(s.tree,'deckPanel').visible);await off();s=await shot('06-deck17-top',{expected:'permanent deck 17 cards; dark veil; five columns; red sort row'});
 const deck=find(s.tree,'deckPanel'),grid=child(deck,'pileGrid');assert(deck.visible&&grid.visible,'shared permanent grid missing');assert(child(child(deck,'pileChrome'),'heading').text.includes('17'),'17 card heading missing');
 const gridPoint=point(s,grid);await page.mouse.move(gridPoint.x,gridPoint.y);await page.mouse.wheel(0,1100);await page.waitForTimeout(500);await off();s=await shot('07-deck17-bottom',{expected:'lower rows, including cards16/17, rendered after actual grid scroll'});
 await page.mouse.move(gridPoint.x,gridPoint.y);await page.mouse.wheel(0,-1500);await page.waitForTimeout(400);await off();s=await state();
 const first=child(find(s.tree,'deckPanel'),'pileGrid').children.map(n=>({n,hit:find(n,'hit')})).filter(v=>v.hit).map(v=>({...v,q:point(s,v.hit)})).filter(v=>v.q.y>rect.y+160&&v.q.y<rect.y+600&&v.q.x>rect.x+180&&v.q.x<rect.x+1070).sort((a,b)=>a.q.y-b.q.y||a.q.x-b.q.x)[0];assert(first);await tap(s,first.hit);await waitState(s=>find(s.tree,'deckPanel').visible&&!child(find(s.tree,'deckPanel'),'pileGrid').visible);await off();s=await shot('08-deck-card-detail');assert(find(s.tree,'deckPanel').visible&&!child(find(s.tree,'deckPanel'),'pileGrid').visible,'card detail must actually open');
 await tap(s,find(child(find(s.tree,'deckPanel'),'pileReturn'),'hit'));await waitState(s=>child(find(s.tree,'deckPanel'),'pileGrid').visible);await off();s=await shot('09-deck-return-list');assert(child(find(s.tree,'deckPanel'),'pileGrid').visible);
 await tap(s,find(child(find(s.tree,'deckPanel'),'pileReturn'),'hit'));await waitState(s=>!find(s.tree,'deckPanel').visible);await off();s=await shot('10-shop-deck-return');assert(!find(s.tree,'deckPanel').visible&&find(s.tree,'nodePanel').visible);
 report.logs=s.logs;report.status='captured-awaiting-human-image-review';
}catch(error){report.status='failed';report.error=String(error.stack);console.error(report.error);process.exitCode=1;try{await page?.screenshot({path:path.join(output,'failure.png')});fs.writeFileSync(path.join(output,'failure-state.json.gz'),gzipSync(JSON.stringify(await api('/editor/api/play',{sessionId:sid,action:'get',args:{inspect:true}}))));}catch{}}
finally{fs.writeFileSync(path.join(output,'render-receipt.json'),JSON.stringify(report,null,2));try{report.stop=await api('/editor/api/play',{sessionId:sid,action:'stop',args:{}});}catch(e){report.stopError=String(e);}await context?.close();await browser?.close();await server.close();fs.writeFileSync(path.join(output,'render-receipt.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({output,status:report.status,shots:report.shots.length,error:report.error}));}
