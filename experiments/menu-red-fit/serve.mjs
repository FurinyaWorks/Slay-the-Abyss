// Reuse the installed Simulator, including the previously verified typed snapshot extension.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const [webArg,sceneArg,outArg]=process.argv.slice(2),web=path.resolve(webArg),scene=path.resolve(sceneArg),out=path.resolve(outArg);
fs.mkdirSync(out,{recursive:true});const workspace=path.join(out,'workspace');fs.mkdirSync(workspace,{recursive:true});
// Keep the editor workspace empty: its project index otherwise repeatedly
// normalizes the full archive at boot. The original SDK reads the same archive
// below; all play/pointer/clock endpoints remain unchanged.
process.env.PRIVATE_SNAPSHOT_EXTENSION='1';
process.env.QXQY_PLAY_TIMEOUT_MS='30000';
const hash=b=>createHash('sha256').update(b).digest('hex');
const source=fs.readFileSync(path.join(web,'dist/public/play-renderer.js'),'utf8');
if(hash(source)!=='9e89976ce304a896d8c5e57ce40545f795b8668a4a5460c8459adceb9a52d15a')throw Error('Simulator renderer identity differs');
const renderer=source.replaceAll('this.app.render()','this.app.ticker.update(performance.now())').replaceAll('this.app?.render()','this.app?.ticker.update(performance.now())');
// A persistent existing SDK session avoids editor archive snapshots/worker transfer.
// Lua, controls, layout, clocks and pointer implementation are the installed Simulator.
const sdkPath=process.env.MENU_REVIEW_SDK;
const sdk=sdkPath?await import(pathToFileURL(path.resolve(sdkPath))):null,sessions=new Map(),sources=new Map();
const entryId=process.env.MENU_REVIEW_SESSION??'menu-play';
if(!/^[a-zA-Z0-9_-]{1,100}$/.test(entryId))throw Error('Invalid preview entry identity');
const archive=JSON.parse(fs.readFileSync(scene));
let parked=null,parkedMs=null;
function preloadMenu(){
 if(!sdk||parked)return;
 const started=performance.now();
 parked=sdk.Gr(archive.assets.server,{templatesProject:archive.assets.client,scripts:archive.assets.scripts,serverConfig:archive.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});
 parkedMs=performance.now()-started;
 if(!parked.runtime.logs.some(l=>l.text==='ABYSS_UI ready'))throw Error('Preloaded menu did not reach current-candidate ready');
 parked.__startMs=parkedMs;
}
const closeSession=id=>{for(const r of sessions.get(id)?.runtimes??[])r.destroy();sessions.delete(id)};
function openSession(id,a){
 if((a.playerCount??1)!==1||(a.viewPlayerIndex??1)!==1)throw Error('This menu review supports one player');
 closeSession(id);if(sessions.size>=4)throw Error('session limit');
 const save=sources.get(id)??archive,t=performance.now();let session;
 if(id===entryId&&parked&&(!a.canvasId||a.canvasId==='pc-16-9')&&(!a.language||a.language==='LanguageChs')){
  session=parked;parked=null;session.__attachedPreloaded=true;
 }else{
  session=sdk.Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:a.canvasId??'pc-16-9',language:a.language??'LanguageChs'});
  session.__startMs=performance.now()-t;
 }
 session.__needsFullScene=true;sessions.set(id,session);return session;
}
const send=(res,code,value)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value))};
async function direct(req,res){
 let text='';for await(const part of req){text+=part;if(text.length>65536)throw Error('request too large')}
 const body=JSON.parse(text),id=body.sessionId;if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('invalid session');
 if(req.url==='/editor/api/load-archive'){
  if(body.path!=='menu.save.json'&&body.path!=='baseline.save.json')throw Error('unknown archive');
  closeSession(id);sources.set(id,body.path==='menu.save.json'?archive:JSON.parse(fs.readFileSync(path.join(workspace,body.path))));send(res,200,{ok:true,value:{loaded:true}});return;
 }
 const a=body.args??{};let session=sessions.get(id);
 if(body.action==='stop'){closeSession(id);sources.delete(id);send(res,200,{ok:true,value:{running:false}});if(id===entryId)setTimeout(preloadMenu,200);return}
 if(body.action==='start'||body.action==='device'){
  session=openSession(id,a);
 }
 if(!session&&process.env.MENU_REVIEW_AUTO_ATTACH==='1'&&['get','step','pointer','key','pause','resume'].includes(body.action))session=openSession(id,a);
 if(!session)throw Error('session has not started');
 if(body.action==='step'&&!session.debugPaused)sdk.dn(session,Math.max(.001,Math.min(.25,a.dt??1/60)));
 else if(body.action==='pointer')sdk.vi(session,a.type,a.x,a.y,{deltaX:a.deltaX,deltaY:a.deltaY});
 else if(body.action==='key')session.runtime.injectKey(a.key);
 else if(body.action==='pause')session.debugPaused=true;
 else if(body.action==='resume')session.debugPaused=false;
 else if(body.action==='view'){if((a.playerIndex??a.viewPlayerIndex??1)!==1)throw Error('This menu review supports one player');}
 else if(!['get','start','device','step'].includes(body.action))throw Error('unsupported preview action '+body.action);
 const reset=session.__needsFullScene&&a.view===true;
 const snapshot=sdk.ya(session,{inspect:a.inspect===true,view:a.view===true,paint:a.paint===true,compact:a.compact===true,sceneRev:reset?0:a.sceneRev});
 if(reset){
  if(!snapshot.scene?.reset||!Array.isArray(snapshot.scene.nodes))throw Error('New application requires a complete renderer reset');
  session.__needsFullScene=false;
 }
 snapshot.clockMode='manual';snapshot.running=true;snapshot.previewSdkStartMs=session.__startMs;snapshot.previewAttachedPreloaded=session.__attachedPreloaded===true;
 send(res,200,{ok:true,value:snapshot});
}
const {createWebServer}=await import(pathToFileURL(path.join(web,'dist/server.js')));
const imageAssets=process.env.MENU_REVIEW_IMAGE_CACHE
 ?await (await import('./preview-image-catalog.mjs')).previewImages(process.env.MENU_REVIEW_IMAGE_CACHE,path.join(out,'image-compatibility.json')):undefined;
const backend=await createWebServer({host:'127.0.0.1',port:0,workspace,imageAssets}),base=new URL(process.env.MENU_REVIEW_ASSET_BASE??backend.url);
let url,receipt;
const front=http.createServer((req,res)=>{
 if(req.headers.host!==new URL(url).host){res.writeHead(403);res.end('local host required');return}
 if(req.headers.origin&&req.headers.origin!==url){res.writeHead(403);res.end('foreign origin');return}
 if(!req.url?.startsWith('/')||req.url.startsWith('//')){res.writeHead(400);res.end();return}
 if(req.method==='GET'&&new URL(req.url,url).pathname==='/'){res.writeHead(302,{location:'/editor/play#'+entryId,'cache-control':'no-store'});res.end();return}
 if(req.method==='GET'&&req.url==='/menu-health'){send(res,receipt?200:503,{app:'menu-native-2d-review',ready:!!receipt,buildId:receipt?.buildId,saveSha256:receipt?.saveSha256});return}
 if(req.method==='GET'&&new URL(req.url,url).pathname==='/editor/play'){
  const html=fs.readFileSync(path.join(web,'dist/public/play.html'),'utf8').replace('</head>','<style>#playerCountSel,#playerViewSel{display:none!important}</style></head>');
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html);return;
 }
 if(sdk&&req.method==='POST'&&['/editor/api/play','/editor/api/load-archive'].includes(req.url)){direct(req,res).catch(e=>{console.error(e);if(!res.headersSent)send(res,400,{ok:false,error:e.message});else res.destroy()});return}
 if(['/editor/play-renderer.js','/play-renderer.js'].includes(req.url?.split('?')[0])){res.writeHead(200,{'content-type':'text/javascript'});res.end(renderer);return}
 const headers={...req.headers,host:base.host};delete headers.cookie;delete headers.authorization;if(headers.origin)headers.origin=base.origin;
 const upstream=http.request({hostname:base.hostname,port:base.port,path:req.url,method:req.method,headers},answer=>{res.writeHead(answer.statusCode,answer.headers);answer.pipe(res)});upstream.on('error',()=>{res.writeHead(502);res.end()});req.pipe(upstream);
});
const port=Number(process.env.MENU_REVIEW_PORT??0);
if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid MENU_REVIEW_PORT');
preloadMenu();
await new Promise((resolve,reject)=>{front.once('error',reject);front.listen(port,'127.0.0.1',resolve)});
url='http://127.0.0.1:'+front.address().port;
const save=JSON.parse(fs.readFileSync(scene)),buildId=/ABYSS_BUILD ([0-9a-f-]+)/.exec(save.assets.scripts.find(s=>s.path.endsWith('abyss_ui.lua')).source)?.[1];
receipt={url,pid:process.pid,saveSha256:hash(fs.readFileSync(scene)),rendererSha256:hash(renderer),scenePath:scene,web,buildId,preloadedEntry:entryId,preloadMs:parkedMs,coldLoadAccepted:false,assetBaseUrl:base.origin,autoAttach:process.env.MENU_REVIEW_AUTO_ATTACH==='1',cases:[{archive:'menu.save.json',sha256:hash(fs.readFileSync(scene))}],...(sdk?{sdkPath,sdkSha256:hash(fs.readFileSync(sdkPath)),runtimeMode:'persistent installed Simulator SDK; no editor transactions'}:{runtimeMode:'editor worker'})};
fs.writeFileSync(out+'/service.json',JSON.stringify(receipt,null,2));console.log(receipt);
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{for(const id of sessions.keys())closeSession(id);for(const r of parked?.runtimes??[])r.destroy();await backend.close();front.close();process.exit()});
