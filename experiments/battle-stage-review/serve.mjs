// Local stage review, using the already installed, fingerprinted Simulator.
// The SDK and its GPL license stay in their existing installation; not bundled.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
import {patchRendererTicker,digest} from './renderer-ticker-patch.mjs';

const args=process.argv.slice(2),option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1]};
const web=path.resolve(option('--web-dir','.artifacts/battle-repair-20261111/snapshot-private-web-v2'));
const source=path.resolve(option('--scenario-dir','.artifacts/battle-repair-20261111/source-aim-candidate'));
const output=path.resolve(option('--output','.artifacts/battle-stage-review-20261111'));
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
const cases=[{name:'ten',file:'hud.save.json',title:'十牌、双敌、三药水',description:'主要评审场景，包含遗物和消耗牌。'},
 {name:'five',file:'five.save.json',title:'标准五牌开局',description:'无额外测试药水；用于查看较宽松手牌布局。'}];
for(const c of cases){
 const bytes=fs.readFileSync(path.join(source,c.file)),receipt=JSON.parse(fs.readFileSync(path.join(source,c.file+'.receipt.json'))),save=JSON.parse(bytes);
 assert.equal(receipt.inputSha256,adapter.saveSha256);
 assert.equal(receipt.modifiedModule,'abyss_game_ui.lua');
 const original=actual.assets.scripts.find(s=>s.path===receipt.modifiedModule);
 const modified=save.assets.scripts.find(s=>s.path===receipt.modifiedModule);
 assert(original&&modified);
 assert.equal(digest(original.source),receipt.originalModuleSha256);
 assert.equal(digest(modified.source),receipt.fixtureModuleSha256);
 const fixtureSource=modified.source,fixtureName=save.meta.name;
 assert.equal(typeof fixtureName,'string');
 modified.source=original.source;save.meta.name=actual.meta.name;
 assert.deepEqual(save,actual,'fixture may only change its display name and the specified startup module source');
 modified.source=fixtureSource;save.meta.name=fixtureName;
 c.sha256=digest(bytes);c.archive='review-'+c.name+'.save.json';c.session='battle-stage-'+c.name;
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
const index=()=>`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>战斗页面 · 阶段评审</title><style>body{background:#141c23;color:#eee8dc;font:18px/1.7 system-ui;max-width:880px;margin:64px auto;padding:0 24px}h1{font-size:32px}a{color:#79ddd4}.status{color:#ffd580}section{padding:18px 0;border-top:1px solid #46545d}small{color:#b5bdc3}code{font-size:14px}</style><h1>战斗页面 · 阶段评审</h1><p class="status">本轮牌堆与遗物详情候选；可实际游玩。</p><p>本机 Web Simulator。首次启动仍可能等待约十几秒；加载中请等待出现完整战斗画面。请重点评审拖牌、红色瞄准线、连续出牌、药水和三个牌堆。</p>${cases.map(c=>`<section><a href="/editor/play#${c.session}">${c.title} →</a><p>${c.description}</p></section>`).join('')}<section><p>保留现有战斗路线，补齐三个牌堆浏览与战斗遗物详情。官方客户端与手机仍未实测；浏览器计时及视觉边界以本轮报告为准。</p><p>拖牌到敌人松手出牌；结束回合后可以继续。要恢复初始场景，请使用 Simulator 工具栏的重新开始。</p></section><small>候选 <code>${adapter.buildId}</code>。使用私有 Simulator 执行加速实验，保留完整事务回滚；不代表官方客户端或手机性能。30秒仅为诊断超时，不是加载合格标准。<br><a href="/review-manifest.json">候选与工具身份</a> · <a href="/candidate.gil">离线 GIL</a>（未官方导入）</small></html>`;
const front=http.createServer((req,res)=>{
 if(req.headers.host!==new URL(reviewURL).host)return json(res,403,{error:'local host required'});
 const origin=req.headers.origin;if(origin&&origin!==reviewURL)return json(res,403,{error:'foreign origin'});
 if(!req.url?.startsWith('/')||req.url.startsWith('//'))return json(res,400,{error:'invalid path'});
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(ready?index():'准备阶段评审场景中，请稍后刷新。');}
 if(url.pathname==='/review-manifest.json')return json(res,200,{...manifest,ready,url:reviewURL});
 if(url.pathname==='/candidate.gil'){
  res.writeHead(200,{'content-type':'application/octet-stream','content-disposition':'attachment; filename="battle-stage-review.gil"','content-length':fs.statSync(gil).size});
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
