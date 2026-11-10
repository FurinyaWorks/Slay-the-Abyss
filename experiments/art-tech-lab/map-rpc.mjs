import {bridge} from './rpc.mjs';
import fs from 'node:fs';
const folder=process.argv[2];
const b=bridge(),unpack=r=>r.structuredContent??JSON.parse(r.content.find(c=>c.type==='text').text);
try{
 await b.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'map',version:'1'}});
 const {handle}=unpack(await b.call('qxqy_project_open',{path:folder+'/map.save.json'}));
 const start=unpack(await b.call('qxqy_studio_play',{handle,action:'start'}));
 fs.writeFileSync(folder+'/simulator-start.json',JSON.stringify(start,null,2));
 if(start.mountError||start.logs?.some(l=>l.level==='lua-error'))throw Error('Simulator mount/runtime failed: '+JSON.stringify(start.logs));
 const shot=await b.call('qxqy_studio_play_screenshot',{handle});
 const pic=shot.content.find(c=>c.type==='image');if(!pic)throw Error('Simulator returned no screenshot');fs.writeFileSync(folder+'/simulator.png',Buffer.from(pic.data,'base64'));
 fs.writeFileSync(folder+'/simulator-shot.json',JSON.stringify(shot.content.filter(c=>c.type!=='image')));
 console.log(JSON.stringify(start));
 await b.call('qxqy_studio_play',{handle,action:'stop'});
}finally{b.close()}
