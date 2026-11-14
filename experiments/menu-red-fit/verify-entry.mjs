import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createRequire}from'node:module';
const [serviceFile,out]=process.argv.slice(2),service=JSON.parse(fs.readFileSync(serviceFile));
assert(out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const sid='menu-entry-check-'+Date.now(),base=service.url,report={buildId:service.buildId,saveSha256:service.saveSha256,url:base,scope:'Single-player local Simulator preview; not official/cold-load acceptance'};
async function api(action,args={}){const r=await fetch(base+'/editor/api/play',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:sid,action,args}),signal:AbortSignal.timeout(60000)});return{status:r.status,...await r.json()};}
const {chromium}=createRequire('C:/Users/Administrator/AppData/Roaming/npm/node_modules/playwright/package.json')('playwright');
let browser;
try{
 const first=await api('get',{view:true,sceneRev:2147483647});assert(first.ok);assert(first.value.scene.reset);assert(first.value.scene.nodes.length>1500);report.reconnectReset=true;
 const rejected=await api('start',{playerCount:2});assert.equal(rejected.status,400);assert.equal(rejected.ok,false);assert((await api('view',{playerIndex:1})).ok);report.singlePlayerGuard=true;
 const temp=path.resolve(out,'tmp');fs.mkdirSync(temp);browser=await chromium.launch({headless:true,executablePath:'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',env:{...process.env,TEMP:temp,TMP:temp}});
 const page=await browser.newPage({viewport:{width:1400,height:1000}});report.errors=[];page.on('pageerror',e=>report.errors.push(String(e)));
 await page.goto(base+'/editor/play#'+sid);await page.addStyleTag({content:'#shell{width:1282px!important;height:722px!important;max-width:none!important;max-height:none!important;flex:none!important}'});
 await page.waitForFunction(()=>parseInt(document.querySelector('#frame')?.textContent.replace(/[^0-9]/g,''))>3,{},{timeout:60000});
 assert(await page.locator('#playerCountSel').isHidden());assert(await page.locator('#playerViewSel').isHidden());report.unsupportedControlsHidden=true;
 const state=await api('get',{inspect:true});assert(state.ok);assert(state.value.logs.some(l=>l.text==='ABYSS_BUILD '+service.buildId));assert(state.value.logs.some(l=>l.text==='ABYSS_UI ready'));
 await page.locator('canvas').first().screenshot({path:out+'/menu.png'});assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.error=String(e.stack);process.exitCode=1;}
finally{await browser?.close();await api('stop').catch(()=>{});fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
