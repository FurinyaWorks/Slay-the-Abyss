// Isolated headless visual evidence for the SAME fixture measured by the SDK.
// The private prefetch renderer must be identified explicitly; never reset a
// user's session. Screenshots remain subject to human visual acceptance.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const [fixturePath,sdkReportPath,output,sid,archiveName,base='http://127.0.0.1:55670',cdp='http://127.0.0.1:9224']=process.argv.slice(2);
// Optional bounded delta: "whole" or comma-separated actual slot numbers.
// Default retains the complete whole+ten-hover coverage.
const requestedSlots=process.env.ABYSS_COVERAGE_SLOTS;
const selectedSlots=requestedSlots===undefined?null:requestedSlots==='whole'?[]:requestedSlots.split(',').map(Number);
if(selectedSlots)assert(selectedSlots.every(n=>Number.isInteger(n)&&n>=1&&n<=10)&&new Set(selectedSlots).size===selectedSlots.length,'ABYSS_COVERAGE_SLOTS must be whole or unique slots 1..10');
if(!fixturePath||!sdkReportPath||!output||!sid||!archiveName||fs.existsSync(output))throw Error('Usage: node scripts/capture-battle-card-coverage.mjs <coverage.save.json> <sdk-report.json> <new-output-dir> <OWN-session-id> <server-workspace-archive-name> [baseURL] [headlessCDP]');
assert(sid.startsWith('card-coverage-'),'use a new dedicated card-coverage session');
assert.notEqual(new URL(base).port,'4178','never touch the user server');
assert.equal(new URL(cdp).port,'9224','this probe is restricted to the dedicated headless browser');
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=fs.readFileSync(fixturePath),sdk=JSON.parse(fs.readFileSync(sdkReportPath));
assert.equal(sdk.status,'passed');assert.equal(hash(bytes),sdk.saveSha256);
const receipt=JSON.parse(fs.readFileSync(fixturePath+'.receipt.json'));
assert.equal(receipt.kind,'offline-sdk-card-coverage-fixture');
assert.equal(receipt.fixtureModuleSha256,sdk.fixture.fixtureModuleSha256);
fs.mkdirSync(output,{recursive:false});
const report={kind:'headless-sdk-card-coverage-visual',status:'running',node:process.version,sid,base,cdp,
 saveSha256:hash(bytes),sdkReportSha256:hash(fs.readFileSync(sdkReportPath)),sourceCandidate:receipt.sourceCandidate,
 renderer:'private prefetch observer; differs from original official renderer',notOfficialEvidence:true,
 actualGilLuaExact:false,deviceVerified:false,visualAccepted:false,captures:[],errors:[]};
report.captureMode=selectedSlots===null?'whole-and-all-ten-slots':{whole:true,slots:selectedSlots};
const {chromium}=createRequire(process.env.ABYSS_PLAYWRIGHT_PACKAGE??'C:/Users/Administrator/AppData/Roaming/npm/node_modules/playwright/package.json')('playwright');
let browser,context,page;
async function api(route,body){const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});const data=await r.json();assert(r.ok&&data.ok!==false,JSON.stringify(data));return data.value??data;}
try{
 const prefetchReceiptPath=process.env.ABYSS_PREFETCH_RECEIPT??path.resolve('.artifacts/performance-blocker/prefetch-web-receipt.json');
 const prefetchBytes=fs.readFileSync(prefetchReceiptPath),prefetch=JSON.parse(prefetchBytes);
 report.rendererIdentity={receiptSha256:hash(prefetchBytes),http:[]};
 for(const [route,expected]of [['/editor/play-renderer.js',prefetch.patchedRendererSha256],['/editor/play.js',prefetch.playJsSha256]]){
  const response=await fetch(base+route,{cache:'no-store',signal:AbortSignal.timeout(10000)});assert(response.ok,route);
  const sha256=hash(Buffer.from(await response.arrayBuffer()));assert.equal(sha256,expected,'actual renderer HTTP identity '+route);
  report.rendererIdentity.http.push({route,sha256});
 }
 // The web JSON body limit is 1 MiB, so use the existing file import path.
 // Authenticate the actual server workspace over HTTP, then the exact local
 // file bytes before and after loading; a stale same-build archive is rejected.
 const previewResponse=await fetch(base+'/api/preview',{signal:AbortSignal.timeout(10000)});
 assert(previewResponse.ok);const previewPayload=await previewResponse.json();const preview=previewPayload.value??previewPayload;
 const workspace=fs.realpathSync(process.env.ABYSS_COVERAGE_WORKSPACE??path.resolve('.artifacts/performance-blocker/prefetch-web/workspace'));
 assert.equal(fs.realpathSync(preview.workspace).toLowerCase(),workspace.toLowerCase(),'actual HTTP server workspace differs');
 const archivePath=path.resolve(workspace,archiveName);
 assert.equal(path.dirname(archivePath),workspace,'coverage archive must be a direct workspace file');
 if(!fs.existsSync(archivePath))fs.writeFileSync(archivePath,bytes,{flag:'wx'});
 assert.equal(hash(fs.readFileSync(archivePath)),report.saveSha256,'workspace archive bytes differ from measured fixture');
 const loaded=await api('/editor/api/load-archive',{sessionId:sid,path:archiveName});
 assert.equal(loaded.snapshot.storage.path,archiveName,'server loaded a different archive');
 assert.equal(hash(fs.readFileSync(archivePath)),report.saveSha256,'archive changed while importing');
 report.importedSaveSha256=hash(bytes);
 report.importFilename=archiveName;
 report.importMethod='HTTP-workspace-authenticated exact file import';report.serverWorkspace=workspace;
 // The existing Studio file import decodes JSON and exports save/base64.
 // Read back every Lua module after import, rather than trusting only READY.
 const exported=await api('/editor/api/export',{sessionId:sid,format:'save',assetType:''});
 assert.equal(exported.encoding,'base64');
 const roundTrip=JSON.parse(Buffer.from(exported.data,'base64'));
 const originalScripts=JSON.parse(bytes).assets.scripts;
 const scriptHashes=scripts=>scripts.map(s=>[s.path,hash(s.source)]).sort((a,b)=>a[0].localeCompare(b[0]));
 assert.deepEqual(scriptHashes(roundTrip.assets.scripts),scriptHashes(originalScripts),'imported Lua source differs from authenticated fixture');
 report.readBackScriptHashes=scriptHashes(roundTrip.assets.scripts);
 browser=await chromium.connectOverCDP(cdp);report.browserVersion=browser.version();context=await browser.newContext({viewport:{width:1400,height:1000}});page=await context.newPage();
 page.on('pageerror',error=>report.errors.push(String(error)));
 await page.goto(base+'/editor/play#'+sid);
 await page.addStyleTag({content:'#shell{width:1282px!important;height:722px!important;max-width:none!important;max-height:none!important;flex:none!important}'});
 await page.waitForFunction(()=>document.querySelector('#loading')?.classList.contains('hidden'),{},{timeout:60000});
 const canvas=page.locator('canvas').first();await page.waitForTimeout(2000);const rect=await canvas.boundingBox();assert(rect);
 report.canvas=rect;
 const point=p=>({x:rect.x+p.x/sdk.canvas.width*rect.width,y:rect.y+(1-p.y/sdk.canvas.height)*rect.height});
 const whole=sdk.captures.find(c=>c.name==='whole-'+receipt.group);assert(whole);
 async function shot(name,expected){
  await page.waitForTimeout(350);
  const state=await api('/editor/api/play',{sessionId:sid,action:'get',args:{inspect:true}});
  const logs=JSON.stringify(state.logs??state);
  assert(logs.includes('CARD_COVERAGE_READY group='+receipt.group),'current fixture ready log missing');
  if(receipt.sourceCandidate?.buildId)assert(logs.includes('ABYSS_BUILD '+receipt.sourceCandidate.buildId),'current candidate identity missing');
  const readySlots=[...logs.matchAll(/CARD_COVERAGE_SLOT (\d+) uid=(\d+(?:\.0+)?) id=(\w+) upgraded=(true|false) rarity=(\w+) type=(\w+) cost=(-?\d+(?:\.0+)?)/g)]
    .map(m=>({slot:Number(m[1]),uid:Number(m[2]),id:m[3],upgraded:m[4]==='true',rarity:m[5],type:m[6],cost:Number(m[7])})).sort((a,b)=>a.slot-b.slot);
  assert.deepEqual(readySlots,whole.cards.map(({slot,uid,id,upgraded,rarity,type,cost})=>({slot,uid,id,upgraded,rarity,type,cost})),'browser READY slots differ from measured real SDK hand');
  const filename=name+'.png';await canvas.screenshot({path:path.join(output,filename)});
  const surfaces=[];
  function battle(nodes){for(const node of nodes??[]){if(node.name==='battlePanel')return node;const found=battle(node.children);if(found)return found;}}
  for(const node of battle(state.tree)?.children??[])if(/^card\d+$/.test(node.name)||['statusInfo','notice','endTurn'].includes(node.name))surfaces.push(node);
  let observedTooltipTitle=null;
  if(expected.slot){
   const info=surfaces.find(node=>node.name==='statusInfo');assert(info?.visible,'actual hover reader not visible');
   observedTooltipTitle=info.children.find(node=>node.name==='title')?.text;
   const card=whole.cards.find(card=>card.slot===expected.slot);
   const plain=card.title.replace(/<[^>]+>/g,'').replace(/[+＋]\d*$/,'');
   assert.equal(observedTooltipTitle,plain,'browser hover resolved a different actual card');
  }
  const stateFile=name+'.state.json';fs.writeFileSync(path.join(output,stateFile),JSON.stringify({canvasWidth:state.canvasWidth,canvasHeight:state.canvasHeight,logs:state.logs,surfaces}));
  report.captures.push({name,file:filename,sha256:hash(fs.readFileSync(path.join(output,filename))),stateFile,expected,observedTooltipTitle,
    hoverUidVerifiedBy:'same-fixture SDK pointer UID plus browser actual tooltip title; visual appearance requires human review'});
 }
 await shot('whole-'+receipt.group,{cards:whole.cards.map(({slot,id,uid,rarity,type,upgraded})=>({slot,id,uid,rarity,type,upgraded}))});
 const priority=receipt.group==='status'?[5,6,10,7,9]:receipt.group==='mechanics'?[4,5,10,3,7]:[];
 const ordered=whole.cards.filter(card=>selectedSlots===null||selectedSlots.includes(card.slot)).sort((a,b)=>(priority.indexOf(a.slot)<0?100+a.slot:priority.indexOf(a.slot))-(priority.indexOf(b.slot)<0?100+b.slot:priority.indexOf(b.slot)));
 for(const card of ordered){
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height*.4);await page.waitForTimeout(450);
  const p=point(card.point);await page.mouse.move(p.x,p.y);await page.waitForTimeout(600);
  await shot('hover-'+receipt.group+'-'+card.slot,{slot:card.slot,id:card.id,uid:card.uid});
 }
 report.status='captured-pending-human-review';
}catch(error){report.status='failed';report.error=String(error.stack);process.exitCode=1;}
finally{
 if(report.errors.length){report.status='failed';process.exitCode=1;}
 report.sourceStable=hash(fs.readFileSync(fixturePath))===report.saveSha256&&hash(fs.readFileSync(sdkReportPath))===report.sdkReportSha256;
 if(!report.sourceStable){report.status='failed';process.exitCode=1;}
 await context?.close();await browser?.close();
 fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:report.status,captures:report.captures.length,error:report.error}));
}
