import {bridge} from '../art-tech-lab/rpc.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const dir='experiments/card-art-lowcost/', b=bridge();
const unpack=r=>r.structuredContent??JSON.parse(r.content.find(c=>c.type==='text').text);
try {
 await b.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'card-art-research',version:'1'}});
 for(const {id} of JSON.parse(readFileSync(dir+'counts.json'))){
  const {handle}=unpack(await b.call('qxqy_project_open',{path:dir+id+'.save.json'}));
  const start=await b.call('qxqy_studio_play',{handle,action:'start'});
  const shot=await b.call('qxqy_studio_play_screenshot',{handle});
  const pic=shot.content.find(c=>c.type==='image');if(!pic)throw Error('No screenshot');
  writeFileSync(dir+id+'.host.png',Buffer.from(pic.data,'base64'));
  writeFileSync(dir+id+'.receipt.json',JSON.stringify({start,screenshot:shot.content.filter(c=>c.type!=='image'),officialVerified:false},null,2));
  await b.call('qxqy_studio_play',{handle,action:'stop'});
 }
} finally {b.close()}
