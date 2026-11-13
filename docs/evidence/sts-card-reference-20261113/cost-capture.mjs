import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {bridge} from '../../../experiments/art-tech-lab/rpc.mjs';
const prefix=process.argv[2]??'.artifacts/sts-card-reference/cost-v2';
const output=process.argv[3]??'docs/evidence/sts-card-reference-20261113/cost-v2.json';
const baselinePrefix=process.argv[4]??prefix,samples=Number(process.argv[5]??9);
assert(!fs.existsSync(output),'new output required');
const b=bridge(),unpack=r=>r.structuredContent??JSON.parse(r.content.find(c=>c.type==='text').text);
const report={scope:'actual SDK 0.5.2 software raster + PNG + RPC; static 150x210 cards, same canvas/background/positions; not GPU draw calls or device/gameplay performance',warmup:3,samples,runs:[]};
const median=a=>a.toSorted((x,y)=>x-y)[Math.floor(a.length/2)];
try{
 await b.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'sts-card-cost',version:'1'}});
 for(const count of [1,5,10])for(const version of count===5?['candidate','baseline']:['baseline','candidate']){
  const input=(version==='baseline'?baselinePrefix:prefix)+'-'+version+'-'+count,fixture=JSON.parse(fs.readFileSync(path.join(input,'receipt.json')));
  const run={version,count,fixture,openMs:null,startMs:null,screenshotMs:[],screenshotSha256:null};report.runs.push(run);
  let handle;
  try{
   let t=performance.now();const opened=unpack(await b.call('qxqy_project_open',{path:input+'/prototype.save.json'}));handle=opened.handle;run.openMs=performance.now()-t;
   t=performance.now();const started=unpack(await b.call('qxqy_studio_play',{handle,action:'start'}));run.startMs=performance.now()-t;
   assert(!started.mountError);assert(started.logs?.some(l=>l.text.includes('STS_ANGER_REFERENCE ready')),'current fixture ready log required');
   let pic;
   for(let i=0;i<report.warmup+report.samples;i++){
    t=performance.now();const shot=await b.call('qxqy_studio_play_screenshot',{handle});const elapsed=performance.now()-t;
    pic=shot.content.find(c=>c.type==='image');assert(pic);if(i>=report.warmup)run.screenshotMs.push(elapsed);
   }
   const bytes=Buffer.from(pic.data,'base64'),png=path.join(path.dirname(output),'cost-'+version+'-'+count+'.png');fs.writeFileSync(png,bytes);
   run.screenshot=png;run.screenshotSha256=createHash('sha256').update(bytes).digest('hex');run.medianScreenshotMs=median(run.screenshotMs);run.status='captured';
  }catch(error){run.status='failed';run.error=String(error.stack);throw error;}
  finally{if(handle)await b.call('qxqy_studio_play',{handle,action:'stop'});fs.writeFileSync(output,JSON.stringify(report,null,2));}
  console.log(JSON.stringify({version,count,visibleImages:fixture.costFixture.allCards.visibleImages,medianScreenshotMs:run.medianScreenshotMs}));
 }
}finally{b.close();fs.writeFileSync(output,JSON.stringify(report,null,2));}
