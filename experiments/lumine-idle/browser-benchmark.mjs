// Parameterize the already reviewed #621 browser input/render probe.
import fs from 'node:fs';import path from 'node:path';import {gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';
const [scenario,serviceFile,output,...options]=process.argv.slice(2);assert(scenario&&serviceFile&&output);
const out=path.resolve(output);fs.mkdirSync(out,{recursive:true});
const read=p=>gunzipSync(fs.readFileSync('docs/evidence/battle-piles-final-20261111/'+p+'.mjs.gz')).toString();
const geometry=path.join(out,'geometry.json');
let source=read('geometry-runner').replace("const dir='.artifacts/battle-piles-final-20261111/candidate-r12';",'const dir='+JSON.stringify(path.resolve(scenario))+';')
 .replace("'.artifacts/battle-repair-20261111/input-cadence/geometry-pile-final.json'",JSON.stringify(geometry));
const geometryRunner=path.join(out,'geometry.mjs');fs.writeFileSync(geometryRunner,source);
function run(file){const r=spawnSync(process.execPath,[file],{stdio:'inherit',windowsHide:true,timeout:180000});if(r.error)throw r.error;assert.equal(r.status,0,file)}
run(geometryRunner);
source=read('browser-qa');
const start=source.indexOf('const launchAt='),end=source.indexOf('const leading=');assert(start>0&&end>start);
source=source.slice(0,start)+`const launchAt=performance.now(),variant='current-lumine-candidate';
const out=${JSON.stringify(out+path.sep)};const g=JSON.parse(fs.readFileSync(${JSON.stringify(geometry)}));
assert.equal(Object.keys(g.potions).length,3);assert.equal(g.cards.length,10);assert.equal(g.actors.length,2);
const service=JSON.parse(fs.readFileSync(${JSON.stringify(path.resolve(serviceFile))}));assert.equal(g.buildId,service.buildId);
const base=service.url,sid='lumine-browser-qa-'+Date.now(),hash=s=>createHash('sha256').update(s).digest('hex');let server;
`+source.slice(end);
source=source.replace('Actual 52aee HUD','Current GIL-derived HUD');
const anchor=' await page.evaluate(async ids=>';assert.equal(source.split(anchor).length,2);
source=source.replace(anchor,` const findFigure=n=>{if(Array.isArray(n)){for(const x of n){const r=findFigure(x);if(r)return r}return}if(n.name==='officialFigure')return n;return findFigure(n.children??[])};
 const figureAt=performance.now();let visible=false;
 for(let i=0;i<120;i++){const r=await(await fetch(base+'/editor/api/play',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:sid,action:'get',args:{inspect:true}})})).json();if(findFigure(r.value?.tree??[])?.visible){visible=true;break}await page.waitForTimeout(250)}
 assert(visible,'native figure must be fully visible before response sampling');report.figureReadyAfterObservedPageMs=performance.now()-figureAt;
`+anchor);
const steady=" await phase('tooltip-defend');";assert.equal(source.split(steady).length,2);
source=source.replace(steady," await phase('steady-idle');await page.waitForTimeout(3000);\n"+steady);
if(options.includes('--fixed-drag')){
 const cancel="await phase('defend-cancel');";assert.equal(source.split(cancel).length,2);
 source=source.replace(cancel,`await phase('fixed-stream');
 const inputChannel=await page.context().newCDPSession(page),scheduleAt=performance.now();
 report.fixedDispatch=[];
 await Promise.all(Array.from({length:48},(_,i)=>new Promise((resolve,reject)=>setTimeout(()=>{
  const p=xy({x:720+i*3,y:500}),sent=performance.now()-scheduleAt;
  inputChannel.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x,y:p.y,button:'left',buttons:1})
   .then(()=>{report.fixedDispatch.push({index:i,targetMs:i*1000/60,sentMs:sent,doneMs:performance.now()-scheduleAt});resolve()}).catch(reject);
 },i*1000/60))));
 await page.waitForTimeout(400);await inputChannel.detach();
 `+cancel);
 const measured=" console.log(JSON.stringify({status:report.status";assert.equal(source.split(measured).length,2);
 source=source.replace(measured,` const fixedEvents=data.events.filter(x=>x.phase==='fixed-stream'&&x.type==='pointermove');
 const fixedFrames=data.frames.filter(x=>x.phase==='fixed-stream');
 const lastEvent=fixedEvents.at(-1),lastX=fixedFrames.at(-1)?.cards[0]?.x;
 const finalDraw=fixedFrames.find(x=>x.at>=lastEvent?.at&&Math.abs(x.cards[0]?.x-lastX)<1);
 report.fixedStream={targetEvents:48,completedDispatches:report.fixedDispatch.length,targetHz:60,receivedEvents:fixedEvents.length,
  receivedSpanMs:lastEvent?.at-fixedEvents[0]?.at,
  pointerRequests:data.requests.filter(x=>x.phase==='fixed-stream'&&x.action==='pointer').length,
  changedFrames:fixedFrames.filter((x,i)=>i&&Math.abs(x.cards[0].x-fixedFrames[i-1].cards[0].x)>1).length,
  lastInputToLastObservedPositionDrawMs:finalDraw?finalDraw.at-lastEvent.at:null,
  endpointVerified:false};
 assert.equal(report.fixedDispatch.length,48,'all fixed-rate trusted dispatches must complete');
 assert(fixedEvents.length>0&&fixedEvents.length<=48,'record actual browser pointer coalescing');
 assert(report.fixedStream.changedFrames>0&&Number.isFinite(report.fixedStream.lastInputToLastObservedPositionDrawMs),'fixed drag must actually move the card');
 `+measured);
}
const runner=path.join(out,'browser.mjs');fs.writeFileSync(runner,source);run(runner);
