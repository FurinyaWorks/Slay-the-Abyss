// Reuse the installed Simulator, including the previously verified typed snapshot extension.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const [webArg,sceneArg,outArg]=process.argv.slice(2),web=path.resolve(webArg),scene=path.resolve(sceneArg),out=path.resolve(outArg);
fs.mkdirSync(out,{recursive:true});const workspace=path.join(out,'workspace');fs.mkdirSync(workspace,{recursive:true});
fs.copyFileSync(scene,workspace+'/menu.save.json');process.env.PRIVATE_SNAPSHOT_EXTENSION='1';
process.env.QXQY_PLAY_TIMEOUT_MS='30000';
const hash=b=>createHash('sha256').update(b).digest('hex');
const source=fs.readFileSync(path.join(web,'dist/public/play-renderer.js'),'utf8');
if(hash(source)!=='9e89976ce304a896d8c5e57ce40545f795b8668a4a5460c8459adceb9a52d15a')throw Error('Simulator renderer identity differs');
const renderer=source.replaceAll('this.app.render()','this.app.ticker.update(performance.now())').replaceAll('this.app?.render()','this.app?.ticker.update(performance.now())');
const {createWebServer}=await import(pathToFileURL(path.join(web,'dist/server.js')));
const backend=await createWebServer({host:'127.0.0.1',port:0,workspace}),base=new URL(backend.url);
const front=http.createServer((req,res)=>{
 if(['/editor/play-renderer.js','/play-renderer.js'].includes(req.url?.split('?')[0])){res.writeHead(200,{'content-type':'text/javascript'});res.end(renderer);return}
 const headers={...req.headers,host:base.host};if(headers.origin)headers.origin=base.origin;
 const upstream=http.request({hostname:base.hostname,port:base.port,path:req.url,method:req.method,headers},answer=>{res.writeHead(answer.statusCode,answer.headers);answer.pipe(res)});upstream.on('error',()=>{res.writeHead(502);res.end()});req.pipe(upstream);
});await new Promise(r=>front.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+front.address().port;
const receipt={url,pid:process.pid,saveSha256:hash(fs.readFileSync(scene)),rendererSha256:hash(renderer),scenePath:scene,web};
fs.writeFileSync(out+'/service.json',JSON.stringify(receipt,null,2));console.log(receipt);
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await backend.close();front.close();process.exit()});
