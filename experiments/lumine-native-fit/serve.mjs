// Local review adapter: reuses the installed Simulator server, SDK and renderer.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
import {patchRendererTicker} from '../noncombat-review/renderer-ticker-patch.mjs';
const [candidateArg,previewArg,sdkArg,webArg,outArg]=process.argv.slice(2);assert(candidateArg&&previewArg&&sdkArg&&webArg&&outArg);
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const candidate=read(candidateArg),adapter=read(previewArg),save=read(adapter.save);
const acceptanceFile=new URL('./owner-acceptance.json',import.meta.url),acceptance=fs.existsSync(acceptanceFile)?read(acceptanceFile):null;
const visualAccepted=acceptance?.acceptedBudget===1600&&acceptance.candidateSha256===candidate.candidate.sha256&&acceptance.saveSha256===adapter.saveSha256;
assert.equal(sha(candidate.candidate.path),candidate.candidate.sha256);assert.equal(sha(adapter.save),adapter.saveSha256);
assert.equal(adapter.candidateSha256,candidate.candidate.sha256);assert.equal(adapter.inverseReadback.faults.length,0);
const out=path.resolve(outArg),web=path.resolve(webArg);assert(!fs.existsSync(out),'New service directory required');fs.mkdirSync(out,{recursive:true});
const workspace=path.join(out,'workspace');fs.mkdirSync(workspace);fs.copyFileSync(adapter.save,workspace+'/menu.save.json');
const sdk=await import(pathToFileURL(path.resolve(sdkArg))),renderer=patchRendererTicker(fs.readFileSync(web+'/dist/public/play-renderer.js','utf8'));
const {createWebServer}=await import(pathToFileURL(web+'/dist/server.js'));
const backend=await createWebServer({host:'127.0.0.1',port:0,workspace}),base=new URL(backend.url),sessions=new Map();
let mountingBudget=0,url;const original=sdk.Qi.prototype.mountScript;
sdk.Qi.prototype.mountScript=function(options){return original.call(this,{...options,params:{...options.params,...(/abyss_ui\.lua$/.test(options.path)?{lumineFitBudget:mountingBudget}:{})}})};
const json=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(value));};
const stop=id=>{for(const runtime of sessions.get(id)?.runtimes??[])runtime.destroy();sessions.delete(id);};
async function play(req,res){
 let text='';for await(const p of req){text+=p;if(text.length>65536)throw Error('request too large');}
 const body=JSON.parse(text),id=body.sessionId,match=/^lumine-(0|400|800|1600|3200)$/.exec(id??'');assert(match,'Select a review link from the landing page');
 if(req.url==='/editor/api/load-archive'){json(res,200,{ok:true,value:{loaded:true}});return;}
 if(body.action==='stop'){stop(id);json(res,200,{ok:true,value:{running:false}});return;}
 const a=body.args??{};let session=sessions.get(id);
 if(body.action==='start'||body.action==='device'){
  stop(id);assert(sessions.size<3,'Close an existing preview first');mountingBudget=Number(match[1]);
  try{session=sdk.Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:a.canvasId??'pc-16-9',language:'LanguageChs'});sessions.set(id,session);}finally{mountingBudget=0;}
 }
 assert(session,'Session has not started');
 if(body.action==='step'&&!session.debugPaused)sdk.dn(session,Math.max(.001,Math.min(.25,a.dt??1/60)));
 else if(body.action==='pointer')sdk.vi(session,a.type,a.x,a.y,{deltaX:a.deltaX,deltaY:a.deltaY});
 else if(body.action==='key')session.runtime.injectKey(a.key);
 else if(body.action==='pause')session.debugPaused=true;
 else if(body.action==='resume')session.debugPaused=false;
 else assert(['get','start','device','step'].includes(body.action),'Unsupported action');
 const snapshot=sdk.ya(session,{inspect:a.inspect===true,view:a.view===true,paint:a.paint===true,compact:a.compact===true,sceneRev:a.sceneRev});
 json(res,200,{ok:true,value:{...snapshot,clockMode:'manual',running:true}});
}
const front=http.createServer((req,res)=>{
 if(req.headers.host!==new URL(url).host||req.headers.origin&&req.headers.origin!==url){res.writeHead(403);res.end();return;}
 const route=new URL(req.url,url).pathname;
 if(route==='/'){
  res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(`<!doctype html><html lang="zh"><meta charset="utf-8"><title>岩荧原生背景实验</title><style>body{background:#172534;color:#f5ead7;max-width:850px;margin:60px auto;font:18px/1.8 system-ui;padding:24px}a{color:#f7cc7b}li{margin:12px 0}</style><h1>岩荧 · 原生背景首版</h1><p>同一GIL和Lua，只切换实验参数。点击“开始冒险”进入选角；返回可验证缓存复用。</p><ul>${[0,400,800,1600,3200].map(n=>`<li><a href="/editor/play#lumine-${n}">${n===0?'原背景基线':n+'图元预算'}</a></li>`).join('')}</ul><p>${visualAccepted?'当前1600画质已获Owner认可。':'当前画质未验收。'}Simulator与官方GPU/设备性能分别记录；本页不代表发布许可。</p><a href="/candidate.gil">下载实验GIL（实验默认${candidate.experiment.defaultBudget??0}，参数0为原背景）</a> · <a href="/identity">构建身份</a></html>`);return;
 }
 if(route==='/identity'){json(res,200,{buildId:candidate.buildId,gil:candidate.candidate,saveSha256:adapter.saveSha256,parameter:'lumineFitBudget',officialImport:'not_run'});return;}
 if(route==='/candidate.gil'){res.writeHead(200,{'content-type':'application/octet-stream','content-disposition':'attachment; filename="lumine-fit-experiment.gil"'});fs.createReadStream(candidate.candidate.path).pipe(res);return;}
 if(req.method==='POST'&&['/editor/api/play','/editor/api/load-archive'].includes(route)){play(req,res).catch(e=>json(res,400,{ok:false,error:String(e.message)}));return;}
 if(['/editor/play-renderer.js','/play-renderer.js'].includes(route)){res.writeHead(200,{'content-type':'text/javascript'});res.end(renderer);return;}
 const headers={...req.headers,host:base.host};delete headers.authorization;delete headers.cookie;if(headers.origin)headers.origin=base.origin;
 const upstream=http.request({hostname:base.hostname,port:base.port,path:req.url,method:req.method,headers},answer=>{res.writeHead(answer.statusCode,answer.headers);answer.pipe(res)});upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
});
await new Promise((resolve,reject)=>{front.once('error',reject);front.listen(0,'127.0.0.1',resolve);});url='http://127.0.0.1:'+front.address().port;
const receipt={url,pid:process.pid,buildId:candidate.buildId,candidateSha256:candidate.candidate.sha256,saveSha256:adapter.saveSha256,sdkSha256:sha(sdkArg),renderer:'existing ticker patch',rendererSha256:sha(web+'/dist/public/play-renderer.js'),tickerPatchSha256:sha(new URL('../noncombat-review/renderer-ticker-patch.mjs',import.meta.url)),serveSha256:sha(new URL(import.meta.url)),mode:'same GIL, per-session public experiment parameter'};
fs.writeFileSync(out+'/service.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
for(const sig of ['SIGINT','SIGTERM'])process.once(sig,async()=>{for(const id of sessions.keys())stop(id);sdk.Qi.prototype.mountScript=original;await backend.close();front.close();process.exit();});
