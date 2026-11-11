// Local stage review, using the already installed, fingerprinted Simulator.
// The SDK and its GPL license stay in their existing installation; not bundled.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
import {patchRendererTicker,digest} from './renderer-ticker-patch.mjs';

const args=process.argv.slice(2),option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1]};
for(const name of ['--web-dir','--scenario-dir','--output','--candidate'])assert(option(name),name+' is required');
const web=path.resolve(option('--web-dir'));
const source=path.resolve(option('--scenario-dir'));
const output=path.resolve(option('--output'));
const port=Number(option('--port','0'));assert(Number.isInteger(port)&&port>=0&&port<65536);
fs.mkdirSync(output,{recursive:true});const workspace=path.join(output,'workspace');fs.mkdirSync(workspace,{recursive:true});
const hashes={
 'server.js':'e38f4c7bce2ca7eb36249e69f8c26a95c77e1d68b6c1d6944df63ea0d8dab9b9',
 'worker.js':'b6db2c1cc00bfa0309aa85d63011f2f664d53580ae4748383e50b40201d111c6',
 'snapshot-bridge.mjs':'8f3948cf4bff005a0e47f6ef965b001cdb4bb22af50172a2cc6cc74ee7e24274',
 'snapshot-hook.mjs':'ace28eca23f4a7221125625f383106c92a1b78489e8e958418dec8ce772318fc',
 'public/play.js':'c23e51046854a3518408de0a470eedb45a042274db90f1f71c78e9a9712dd557',
};
for(const [file,sha]of Object.entries(hashes))assert.equal(digest(fs.readFileSync(path.join(web,'dist',file))),sha,file);
const renderer=patchRendererTicker(fs.readFileSync(path.join(web,'dist/public/play-renderer.js'),'utf8'));
const adapter=JSON.parse(fs.readFileSync(path.join(source,'adapter-receipt.json')));
const actualBytes=fs.readFileSync(path.join(source,'pr588.actual.save.json'));
assert.equal(digest(actualBytes),adapter.saveSha256);
const actual=JSON.parse(actualBytes);
const candidateOption=option('--candidate');assert(candidateOption,'--candidate <candidate.json> is required');
const candidate=JSON.parse(fs.readFileSync(path.resolve(candidateOption)));
const gil=path.resolve(candidate.candidate.path);assert.equal(candidate.buildId,adapter.buildId);
assert.equal(digest(fs.readFileSync(gil)),adapter.candidateSha256);
const cases=[{name:'natural',file:'pr588.actual.save.json',title:'开始冒险',description:'主菜单 → 角色选择 → 开局祝福 → 地图 → 战斗。'}];
for(const c of cases){
 const bytes=fs.readFileSync(path.join(source,c.file)),save=JSON.parse(bytes);
 assert.equal(digest(bytes),adapter.saveSha256);
 assert.deepEqual(save,actual,'natural entry must use the exact actual readback, without startup fixtures');
 c.sha256=digest(bytes);c.archive='review-'+c.name+'.save.json';c.session='noncombat-'+c.name;
 const archived=path.join(workspace,c.archive);
 if(fs.existsSync(archived))assert.equal(digest(fs.readFileSync(archived)),c.sha256,'existing review archive differs; choose a fresh --output');
 else fs.writeFileSync(archived,bytes,{flag:'wx'});
}
process.env.PRIVATE_SNAPSHOT_EXTENSION='1';
process.env.PRIVATE_SNAPSHOT_TRACE=path.join(output,'snapshot-trace.jsonl');
process.env.QXQY_PLAY_TIMEOUT_MS??='30000';
const {createWebServer}=await import(pathToFileURL(path.join(web,'dist/server.js')));
const backend=await createWebServer({host:'127.0.0.1',port:0,workspace});
const base=new URL(backend.url);let reviewURL,ready=false,closing=false;
const manifest={stage:'阶段评审，未验收',buildId:adapter.buildId,gilSha256:adapter.candidateSha256,
 saveSha256:adapter.saveSha256,sourceCommit:adapter.sourceCommit,sourceDirty:adapter.sourceDirty,
 rendererSha256:digest(renderer),backendExtension:'private typed fullgraph snapshot; not official client',cases};
const json=(res,code,value)=>{res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(value))};
const index=()=>`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>非战斗页面评审</title><style>body{background:#141c23;color:#eee8dc;font:18px/1.7 system-ui;max-width:880px;margin:64px auto;padding:0 24px}a{color:#79ddd4}small{color:#b5bdc3}</style><h1>主菜单 · 选角 · 开局祝福</h1><p><a href="/editor/play#${cases[0].session}">开始冒险 →</a></p><p>实际候选自然入口。首次加载请等待画面完成；工具栏“重新开始”可恢复主菜单。</p><p>本机 Web Simulator，复用现有战斗页 SDK 与渲染器。截图和浏览器计时不代表官方客户端、手机实测或发布验收。</p><small>候选 ${adapter.buildId}。<a href="/review-manifest.json">身份收据</a> · <a href="/candidate.gil">离线 GIL</a>（未官方导入）</small></html>`;
const front=http.createServer((req,res)=>{
 if(req.headers.host!==new URL(reviewURL).host)return json(res,403,{error:'local host required'});
 const origin=req.headers.origin;if(origin&&origin!==reviewURL)return json(res,403,{error:'foreign origin'});
 if(!req.url?.startsWith('/')||req.url.startsWith('//'))return json(res,400,{error:'invalid path'});
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(ready?index():'准备阶段评审场景中，请稍后刷新。');}
 if(url.pathname==='/review-manifest.json')return json(res,200,{...manifest,ready,url:reviewURL});
 if(url.pathname==='/candidate.gil'){
  res.writeHead(200,{'content-type':'application/octet-stream','content-disposition':'attachment; filename="noncombat-review.gil"','content-length':fs.statSync(gil).size});
  const stream=fs.createReadStream(gil);stream.on('error',()=>res.destroy());return stream.pipe(res);
 }
 if(['/editor/play-renderer.js','/play-renderer.js'].includes(url.pathname)){
  res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'});return res.end(renderer);
 }
 const headers={...req.headers,host:base.host};delete headers.cookie;delete headers.authorization;if(origin)headers.origin=base.origin;
 const upstream=http.request({hostname:base.hostname,port:base.port,path:req.url,method:req.method,headers},answer=>{res.writeHead(answer.statusCode??502,answer.headers);answer.pipe(res)});
 upstream.on('error',e=>{if(!res.headersSent)json(res,502,{error:e.message});else res.end()});req.pipe(upstream);
});
await new Promise((resolve,reject)=>{front.once('error',reject);front.listen(port,'127.0.0.1',resolve)});
reviewURL='http://127.0.0.1:'+front.address().port;
try{
 for(const c of cases){const response=await fetch(backend.url+'/editor/api/load-archive',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:c.session,path:c.archive})});const result=await response.json();assert(response.ok&&result.ok,JSON.stringify(result));}
 ready=true;const receipt={...manifest,url:reviewURL,pid:process.pid,backendURL:backend.url,ready};
 fs.writeFileSync(path.join(output,'service.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}catch(e){console.error(e);await backend.close();front.close();process.exitCode=1;}
async function close(){if(closing)return;closing=true;await backend.close();await new Promise(resolve=>front.close(resolve));}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>close().finally(()=>process.exit(0)));

