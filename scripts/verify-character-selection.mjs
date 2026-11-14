// Actual candidate Lua + installed Simulator. This is not a device/GPU benchmark.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const [saveFile,sdkFile,rendererFile,out]=process.argv.slice(2);
assert(saveFile&&sdkFile&&rendererFile&&out&&!fs.existsSync(out),'Use a fresh output directory');
fs.mkdirSync(out,{recursive:true});
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sdk=await import(pathToFileURL(path.resolve(sdkFile))),{Gr,vi,dn,wi,pa,Me,d,ya}=sdk;
const {vc}=await import(pathToFileURL(path.resolve(rendererFile)));
const canvas=createRequire(import.meta.url)(process.env.SELECTION_CANVAS_MODULE??'F:/New folder/.artifacts/art-lab-runtime/node_modules/@napi-rs/canvas');
const save=JSON.parse(fs.readFileSync(saveFile));
const report={scope:'Actual GIL readback in Simulator/Fengari; software renderer, not official client or GPU FPS',saveSha256:sha(saveFile),sdkSha256:sha(sdkFile),rendererSha256:sha(rendererFile),status:'running',inputs:[],steps:[],roundtrips:[]};
const enc=s=>new TextEncoder().encode(s),images=new Map(),imageMetadata=new Map();
const cache=process.env.SELECTION_IMAGE_CACHE??'F:/New folder/.artifacts/simulator-runtime/state/beyond-simulator/images';
const quantile=(a,q)=>[...a].sort((x,y)=>x-y)[Math.max(0,Math.ceil(a.length*q)-1)];
const stats=a=>({n:a.length,p50:quantile(a,.5),p95:quantile(a,.95),max:Math.max(...a)});
function luaValue(L,index){
 const t=d.lua_type(L,index);
 if(t===0)return null;if(t===1)return d.lua_toboolean(L,index);if(t===3)return d.lua_tonumber(L,index);
 if(t===4)return Buffer.from(d.lua_tolstring(L,index)).toString();if(t!==5)return '<type-'+t+'>';
 const result={},abs=d.lua_absindex(L,index);d.lua_pushnil(L);
 while(d.lua_next(L,abs)!==0){const key=luaValue(L,-2);result[key]=luaValue(L,-1);d.lua_pop(L,1);}return result;
}
let session;
try{
 const start=performance.now();
 session=Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});
 report.initializeMs=performance.now()-start;
 assert(session.runtime.logs.some(l=>l.text==='ABYSS_UI ready'),'Missing new ready');
 const mounted=session.runtime.mountedScripts.find(s=>/abyss_ui(?:\.lua)?$/.test(s.path)),L=mounted.env;
 function bind(fn,name,target){
  const top=d.lua_gettop(L);d.lua_getglobal(L,enc(fn));let found=false;
  for(let i=1;i<50;i++){const key=d.lua_getupvalue(L,-1,i);if(!key)break;if(Buffer.from(key).toString()===name){d.lua_setglobal(L,enc(target));found=true;break;}d.lua_pop(L,1);}d.lua_settop(L,top);assert(found,name+' observer unavailable');
 }
 bind('OnUpdate','view','__SELECTION_VIEW');bind('OnDestroy','portraits','__SELECTION_PORTRAITS');
 session.runtime.runChunk(L,`function __SELECTION_STATUS() local v=__SELECTION_VIEW;return {mode=v.mode,open=v.characterOpen,selected=v.characterSelection.info and v.characterSelection.info.id,portraits=__SELECTION_PORTRAITS:status()}end`,'SELECTION_OBSERVER');
 const state=()=>{const top=d.lua_gettop(L);d.lua_getglobal(L,enc('__SELECTION_STATUS'));assert.equal(d.lua_pcall(L,0,1,0),0);const value=luaValue(L,-1);d.lua_settop(L,top);return value;};
 const find=trail=>{let n=session.runtime.roots[0];for(const name of trail.split('/')){const found=n.children.filter(c=>c.name===name);assert.equal(found.length,1,trail);n=found[0];}return n;};
 const all=n=>[n,...(n.children??[]).flatMap(all)];
 const step=()=>{const t=performance.now();dn(session,1/60);report.steps.push(performance.now()-t);};
 const tap=trail=>{const node=find(trail);for(let n=node;n;n=n.parent)assert(n.active!==false&&n.visible!==false,'Hidden input '+trail);
  const boxes=wi(session),box=boxes.get(node.Id),matrix=pa(session,boxes).get(node.Id),point=Me(matrix,box.centerX,box.centerY),t=performance.now();
  vi(session,'move',point.x,point.y);const hit=vi(session,'down',point.x,point.y);step();vi(session,'up',point.x,point.y);step();
  assert.equal(hit?.Id,node.Id,'Actual hit mismatch '+trail);report.inputs.push({trail,wallMs:performance.now()-t});};
 async function render(name){
  const snapshot=ya(session,{view:true,paint:true,compact:true});
  for(const n of snapshot.paint??[]){
   if(n.kind!=='image'||n.imageId<=100006)continue;
   const key=`${n.imageSource??'StaticReference'}:${n.imageId}`;if(images.has(key))continue;
   let loaded=false;
   for(const dir of fs.readdirSync(path.join(cache,'sprite-v1'))){const file=path.join(cache,'sprite-v1',dir,n.imageId+'.png');if(!fs.existsSync(file))continue;
    images.set(key,await canvas.loadImage(file));const meta=path.join(cache,'border-v1',dir,n.imageId+'.json');if(fs.existsSync(meta))imageMetadata.set(key,JSON.parse(fs.readFileSync(meta)));loaded=true;break;}
   assert(loaded,'Missing actual atlas '+key);
  }
  const t=performance.now(),png=vc(snapshot.scene,snapshot.canvasWidth,snapshot.canvasHeight,{images,imageMetadata});
  fs.writeFileSync(path.join(out,name+'.png'),png.data);return {snapshot,renderMs:performance.now()-t};
 }
 const symbol=find('stage/characterPanel/v25Roster/selected/v25Constellation'),symbolIds=all(symbol).map(n=>n.Id);
 assert.equal(all(symbol).filter(n=>n.kind==='image').length,93);
 assert.equal(state().portraits.selection.owned,0,'Menu must not allocate hidden background');
 await render('menu');
 const openAt=performance.now();tap('stage/menuPanel/start/hit');let frames=0;
 for(;frames<2000&&state().portraits.selection.phase!=='ready';frames++)step();
 assert(frames<2000,JSON.stringify(state()));report.firstSelectionMs=performance.now()-openAt;report.prepareFrames=frames;
 report.firstState=state();
 const host=find('stage/characterPanel/lumineSelectionBackground'),facets=all(host).filter(n=>n.kind==='image');assert.equal(facets.length,1600);
 report.halfTriangles=facets.filter(n=>n.enableMask).length;
 for(const n of facets)if(n.enableMask){assert.equal(n.enableFill,true);assert.equal(n.fillType,'Horizontal');assert.equal(n.fillAmount,.5);}
 const first=await render('selection');report.softwarePngMs=first.renderMs;
 const painted=new Set(first.snapshot.paint.filter(n=>n.kind==='image').map(n=>n.id));
 assert(facets.every(n=>painted.has(n.Id)),'Background was not completely painted');
 assert(all(symbol).filter(n=>n.kind==='image').every(n=>painted.has(n.Id)),'Constellation was occluded/hidden');
 report.primitives={constellation:93,background:1600,backgroundOwned:state().portraits.selection.owned};
 report.visualStatus='UNVERIFIED: software renderer omits radial fill; official game screenshot required';
 const count=session.runtime.controlsById.size;report.residentControls=count;
 for(let i=0;i<20;i++){
  tap('stage/characterPanel/cancel/hit');assert(!state().open);const t=performance.now();
  tap('stage/menuPanel/start/hit');assert(state().open&&state().portraits.selection.phase==='ready');
  assert.equal(session.runtime.controlsById.size,count,'Roundtrip leaked controls');assert.deepEqual(all(symbol).map(n=>n.Id),symbolIds,'Constellation rebuilt');
  report.roundtrips.push({modelMs:performance.now()-t,controls:count});
 }
 session.runtime.runChunk(L,`local v=__SELECTION_VIEW;local ok,why=v:selectCharacter('hutao');assert(not ok and why=='competition_character_unavailable');assert(v.characterSelection.info.id=='ironclad');__SELECTION_PORTRAITS:sync('menu',true,false,'hutao');assert(not __SELECTION_VIEW.root:GetChild('characterPanel'):GetChild('lumineSelectionBackground').visible);__SELECTION_PORTRAITS:sync('menu',true,false,'ironclad');assert(__SELECTION_PORTRAITS:status().selection.phase=='ready')`,'SELECTION_ROLE_BOUNDARY');
 assert.equal(session.runtime.controlsById.size,count);
 tap('stage/characterPanel/details/deckOpen/hit');await render('starter-deck');
 report.faults=session.runtime.logs.filter(l=>l.level==='lua-error'||/ABYSS_UI failed|command_failed|prepare_failed/.test(l.text));assert.deepEqual(report.faults,[]);
 report.warmModelMs=stats(report.roundtrips.map(r=>r.modelMs));report.sdkStepMs=stats(report.steps);report.status='pass';
}catch(error){report.error=String(error.stack);report.status='failed';process.exitCode=1;console.error(error);}
finally{
 report.logs=session?.runtime.logs??[];
 if(session){for(const runtime of session.runtimes??[session.runtime])runtime.destroy();report.remainingControls=session.runtime.controlsById.size;if(report.remainingControls!==0){report.status='failed';process.exitCode=1;}}
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,firstSelectionMs:report.firstSelectionMs,warmModelMs:report.warmModelMs,primitives:report.primitives,remainingControls:report.remainingControls}));
}
