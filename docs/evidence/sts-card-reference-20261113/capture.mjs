import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {bridge} from '../../../experiments/art-tech-lab/rpc.mjs';
const input=path.resolve(process.argv[2]??'.artifacts/sts-card-reference/prototype-1');
const output=path.resolve(process.argv[3]??'docs/evidence/sts-card-reference-20261113/prototype-1.png');
assert(!fs.existsSync(output),'new screenshot required');
const b=bridge(),unpack=r=>r.structuredContent??JSON.parse(r.content.find(c=>c.type==='text').text);
const receipt={input,output,rendering:'actual SDK software renderer, not official client/device',steps:[]};let handle;
try{
 await b.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'sts-card-reference',version:'1'}});
 const opened=unpack(await b.call('qxqy_project_open',{path:path.relative(process.cwd(),path.join(input,'prototype.save.json')).replaceAll('\\','/')}));handle=opened.handle;
 receipt.steps.push({open:opened});receipt.steps.push({start:unpack(await b.call('qxqy_studio_play',{handle,action:'start'}))});
 const screenshot=await b.call('qxqy_studio_play_screenshot',{handle});
 const pic=screenshot.content.find(c=>c.type==='image');assert(pic,'actual SDK PNG required');
 const bytes=Buffer.from(pic.data,'base64');fs.writeFileSync(output,bytes);
 receipt.sha256=createHash('sha256').update(bytes).digest('hex');receipt.screenshotMetadata=screenshot.content.filter(c=>c.type!=='image');
 receipt.status='captured-awaiting-review';
}catch(error){receipt.status='failed';receipt.error=String(error.stack);process.exitCode=1;}
finally{if(handle)try{receipt.steps.push({stop:unpack(await b.call('qxqy_studio_play',{handle,action:'stop'}))});}catch(error){receipt.stopError=String(error);}
 b.close();fs.writeFileSync(output+'.receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));}
