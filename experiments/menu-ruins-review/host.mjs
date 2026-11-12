import fs from 'node:fs';import {bridge} from '../art-tech-lab/rpc.mjs';
const [file,out]=process.argv.slice(2),b=bridge(),unpack=r=>r.structuredContent??JSON.parse(r.content.find(c=>c.type==='text').text);
fs.mkdirSync(out,{recursive:true});
try{
 await b.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'menu-ruins',version:'1'}});
 const opened=unpack(await b.call('qxqy_project_open',{path:file}));console.log('opened',opened);
 const handle=opened.handle,t=performance.now();const start=await b.call('qxqy_studio_play',{handle,action:'start'});
 fs.writeFileSync(out+'/start.json',JSON.stringify(start));console.log('started',performance.now()-t);
 const r=await b.call('qxqy_studio_play_screenshot',{handle});const pic=r.content.find(c=>c.type==='image');
 if(pic)fs.writeFileSync(out+'/menu.png',Buffer.from(pic.data,'base64'));
 fs.writeFileSync(out+'/screenshot.json',JSON.stringify(r.content.filter(c=>c.type!=='image')));console.log('screenshot',!!pic);
}finally{b.close()}
