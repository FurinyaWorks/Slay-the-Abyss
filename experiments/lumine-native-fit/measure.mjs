// Real installed Simulator Lua, native control model and software renderer.
// Fresh VM cold samples are not OS-disk cold launches, GPU frames or devices.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const [saveArg,sdkArg,rendererArg,outArg,cyclesArg='5',modeArg='all']=process.argv.slice(2);
assert(saveArg&&sdkArg&&rendererArg&&outArg,'measure.mjs <save> <sdk> <renderer> <new output> [cold=5] [all|budget]');
const out=path.resolve(outArg);assert(!fs.existsSync(out),'Use a new output');fs.mkdirSync(out,{recursive:true});
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sdk=await import(pathToFileURL(path.resolve(sdkArg))),{Gr,vi,dn,wi,pa,Me,d,ya,Qi}=sdk;
const {vc}=await import(pathToFileURL(path.resolve(rendererArg)));
const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);
const canvas=require(process.env.LUMINE_CANVAS_MODULE??'F:/New folder/.artifacts/art-lab-runtime/node_modules/@napi-rs/canvas');
const modes=modeArg==='all'?[0,400,800,1600,3200]:[Number(modeArg)],coldCycles=Number(cyclesArg);
assert(Number.isInteger(coldCycles)&&coldCycles>=1);let mode=0;
const mount=Qi.prototype.mountScript;
const addRoot=Qi.prototype.addRoot,observedMaps=new WeakSet();let allocations={created:0,destroyed:0,peak:0};
Qi.prototype.addRoot=function(options){
 const map=this.controlsById;
 if(!observedMaps.has(map)){
  observedMaps.add(map);const set=map.set,remove=map.delete;
  map.set=function(key,value){if(!this.has(key)||this.get(key)!==value)allocations.created++;const result=set.call(this,key,value);allocations.peak=Math.max(allocations.peak,this.size);return result;};
  map.delete=function(key){const result=remove.call(this,key);if(result)allocations.destroyed++;return result;};
 }
 return addRoot.call(this,options);
};
Qi.prototype.mountScript=function(options){return mount.call(this,{...options,params:{...options.params,...(/abyss_ui\.lua$/.test(options.path)?{lumineFitBudget:mode}:{})}})};
const report={kind:'lumine-fit-simulator-performance',scope:'Fresh Simulator/Fengari sessions, Node CPU/heap/RSS and real software PNG; no official client, GPU frame time, mobile or official capacity.',
 node:process.version,probeSha256:sha(new URL(import.meta.url)),save:path.resolve(saveArg),saveSha256:sha(saveArg),sdkSha256:sha(sdkArg),rendererSha256:sha(rendererArg),
 modes,coldCycles,samples:[],gpuFrameTime:'UNVERIFIED',officialCapacity:'UNVERIFIED',status:'running'};
const enc=s=>new TextEncoder().encode(s);
const images=new Map(),imageMetadata=new Map(),missingAssets=new Set();
const imageRoot=process.env.LUMINE_IMAGE_CACHE??'F:/New folder/.artifacts/simulator-runtime/state/beyond-simulator/images';
async function assets(snapshot){
 for(const n of snapshot.paint??[]){
  if(n.kind!=='image'||n.imageId<=100006)continue;
  const key=`${n.imageSource??'StaticReference'}:${n.imageId}`;if(images.has(key)||missingAssets.has(key))continue;
  let loaded=false;
  for(const dir of fs.readdirSync(imageRoot+'/sprite-v1')){
   const f=path.join(imageRoot,'sprite-v1',dir,n.imageId+'.png');if(!fs.existsSync(f))continue;
   images.set(key,await canvas.loadImage(f));
   const meta=path.join(imageRoot,'border-v1',dir,n.imageId+'.json');if(fs.existsSync(meta))imageMetadata.set(key,JSON.parse(fs.readFileSync(meta)));
   loaded=true;break;
  }
  if(!loaded)missingAssets.add(key);
 }
}
function luaValue(L,index,depth=0){
 assert(depth<8);const t=d.lua_type(L,index);
 if(t===0)return null;if(t===1)return d.lua_toboolean(L,index);if(t===3)return d.lua_tonumber(L,index);
 if(t===4)return Buffer.from(d.lua_tolstring(L,index)).toString();if(t!==5)return '<type-'+t+'>';
 const result={},abs=d.lua_absindex(L,index);d.lua_pushnil(L);
 while(d.lua_next(L,abs)!==0){const key=luaValue(L,-2,depth+1);result[key]=luaValue(L,-1,depth+1);d.lua_pop(L,1)}return result;
}
function observer(session){
 const mounted=session.runtime.mountedScripts.find(s=>/abyss_ui(?:\.lua)?$/.test(s.path));assert(mounted?.alive,'UI script not alive');const L=mounted.env;
 const top=d.lua_gettop(L);d.lua_getglobal(L,enc('OnUpdate'));let found=false;
 for(let i=1;i<50;i++){const key=d.lua_getupvalue(L,-1,i);if(!key)break;if(Buffer.from(key).toString()==='view'){d.lua_setglobal(L,enc('__FIT_VIEW'));found=true;break}d.lua_pop(L,1)}d.lua_settop(L,top);assert(found,'View observer missing');
 session.runtime.runChunk(L,`function __FIT_STATUS()
 local v=__FIT_VIEW
 return {mode=v.mode,open=v.characterOpen,selected=v.characterSelection.info and v.characterSelection.info.id,
  deckOpen=v.characterSelection.deckOpen,fit=require('abyss_lumine_fit').status(),portraits=LumineFitPortraitStatus()}
 end`,'READ_ONLY_FIT_OBSERVER');
 return ()=>{const t=d.lua_gettop(L);d.lua_getglobal(L,enc('__FIT_STATUS'));assert.equal(d.lua_pcall(L,0,1,0),0);const s=luaValue(L,-1);d.lua_settop(L,t);return s;};
}
function find(session,trail){let n=session.runtime.roots[0];for(const name of trail.split('/')){const list=n.children.filter(c=>c.name===name);assert.equal(list.length,1,'native '+trail);n=list[0]}return n;}
function visible(n){for(let p=n;p;p=p.parent)if(p.active===false||p.visible===false)return false;return true;}
const quantile=(a,q)=>{const s=[...a].sort((a,b)=>a-b);return s[Math.max(0,Math.ceil(s.length*q)-1)]};
const stats=a=>({n:a.length,p50:quantile(a,.5),p95:quantile(a,.95),p99:quantile(a,.99),max:Math.max(...a)});
try{
 for(let cycle=1;cycle<=coldCycles;cycle++)for(const budget of modes){
  mode=budget;allocations={created:0,destroyed:0,peak:0};let session;const sample={budget,cycle,steps:[],inputs:[],warm:[],memoryBefore:process.memoryUsage()};report.samples.push(sample);
  const start=performance.now();let t=start;
  const bytes=fs.readFileSync(saveArg),save=JSON.parse(bytes);sample.readParseMs=performance.now()-t;
  try{
   t=performance.now();session=Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});sample.initializeMs=performance.now()-t;
   assert(session.runtime.logs.some(l=>l.text==='ABYSS_UI ready'),'no actual ready log: '+JSON.stringify(session.runtime.logs));
   const state=observer(session);
   const step=()=>{const at=performance.now();dn(session,1/60);sample.steps.push(performance.now()-at);};
   const tap=trail=>{const geometryAt=performance.now(),node=find(session,trail);assert(visible(node),'Input hidden '+trail);const boxes=wi(session),box=boxes.get(node.Id),matrix=pa(session,boxes).get(node.Id);assert(box&&matrix);const point=Me(matrix,box.centerX,box.centerY),at=performance.now(),geometryMs=at-geometryAt;vi(session,'move',point.x,point.y);const hit=vi(session,'down',point.x,point.y);step();vi(session,'up',point.x,point.y);step();const input={trail,expected:node.Id,hit:hit?.Id,passed:hit?.Id===node.Id,wallMs:performance.now()-at,driverGeometryMs:geometryMs};sample.inputs.push(input);assert.equal(hit?.Id,node.Id,'actual hit mismatch '+trail);return input;};
   sample.menuCount=session.runtime.controlsById.size;sample.noExperimentPreload=state().fit.created===0;assert(sample.noExperimentPreload);
   const ready=()=>{
    let count=0;
    for(;count<1500;count++){
     const s=state();assert(s.open,'Selection did not open');
     const avatar=s.portraits.avatar?.phase,selection=s.portraits.selection?.phase;
     const settled=phase=>phase===undefined||phase==='disabled'||phase==='idle'||phase==='ready'||phase==='released';
     if(budget&&s.fit.phase==='ready'&&settled(avatar)&&settled(selection))break;
     if(!budget&&selection==='ready'&&settled(avatar))break;
     assert(s.fit.phase!=='failed',s.fit.error);step();
    }
    assert(count<1500,'background not ready');return count;
   };
   const render=async filename=>{
    const begin=performance.now(),snapshot=ya(session,{view:true,paint:true,compact:true}),snapshotMs=performance.now()-begin;
    const assetAt=performance.now();await assets(snapshot);const assetLoadMs=performance.now()-assetAt;
    assert(snapshot.scene?.nodes?.length>0&&snapshot.paint.length>0,'Actual scene contains no paint');
    const at=performance.now(),png=vc(snapshot.scene,snapshot.canvasWidth,snapshot.canvasHeight,{images,imageMetadata});
    const renderMs=performance.now()-at;if(filename)fs.writeFileSync(path.join(out,filename),png.data);
    return {renderMs,snapshotMs,assetLoadMs,paintNodes:snapshot.paint.length,pngBytes:png.data.length,snapshot};
   };
   t=performance.now();tap('stage/menuPanel/start/hit');sample.prepareFrames=ready();sample.openToModelReadyMs=performance.now()-t;
   const first=await render(cycle===1?'budget-'+budget+'-selection.png':null);sample.firstPngMs=first.renderMs;
   sample.firstDisplayFromStartMs=performance.now()-start;
   tap('stage/characterPanel/cancel/hit');assert(!state().open,'real cancel did not leave selection');
   sample.coldOperableMs=performance.now()-start;
   sample.snapshotMs=first.snapshotMs;sample.assetLoadMs=first.assetLoadMs;
   sample.visibleImages=first.snapshot.paint.filter(n=>n.kind==='image').length;
   sample.visiblePrimitives=first.snapshot.paint.filter(n=>n.kind==='image'&&n.imageId>=100001&&n.imageId<=100006).length;
   if(budget){const ids=new Set();function collect(n){ids.add(n.Id);for(const child of n.children??[])collect(child);}collect(find(session,'stage/characterPanel/lumineFitHost'));
    sample.fitActuallyPaintedImages=first.snapshot.paint.filter(n=>n.kind==='image'&&ids.has(n.id)).length;assert.equal(sample.fitActuallyPaintedImages,state().fit.images,'Fit was ready but the complete native image tree was not painted');
    const facets=[...session.runtime.controlsById.values()].filter(n=>ids.has(n.Id)&&n.kind==='image');
    sample.fitMaskState={half:0,whole:0};
    for(const n of facets){if(n.enableMask){assert.equal(n.enableFill,true,'Runtime half triangle has no serialized fill flag');assert.equal(n.fillType,'Horizontal');assert.equal(n.fillHorizontalType?.Name??n.fillHorizontalType,'Right');assert.equal(n.fillAmount,.5);sample.fitMaskState.half++;}else{assert.equal(n.fillType,'Unused');sample.fitMaskState.whole++;}}
   }
   if(cycle===1&&budget){
    const scene=first.snapshot.scene,ids=new Set([String(find(session,'stage/characterPanel/lumineFitHost').Id)]);
    let changed=true;while(changed){changed=false;for(const n of scene.nodes)if(ids.has(String(n.parent))&&!ids.has(String(n.id))){ids.add(String(n.id));changed=true;}}
    const parent=new Map(scene.nodes.map(n=>[String(n.id),n.parent]));for(const id of [...ids]){let p=parent.get(id);while(p!=null&&!ids.has(String(p))){ids.add(String(p));p=parent.get(String(p));}}
    const isolated={...scene,nodes:scene.nodes.filter(n=>ids.has(String(n.id)))};
    const png=vc(isolated,first.snapshot.canvasWidth,first.snapshot.canvasHeight,{images,imageMetadata});fs.writeFileSync(path.join(out,'budget-'+budget+'-art-only.png'),png.data);
   }
   tap('stage/menuPanel/start/hit');ready(); // separate visible-idle experiment after the timed cold endpoint
   const visibleBefore={count:session.runtime.controlsById.size,created:allocations.created,fitCreated:state().fit.created};const visibleStepStart=sample.steps.length;
   for(let i=0;i<120;i++)step();
   sample.visibleStatic={before:visibleBefore,after:{count:session.runtime.controlsById.size,created:allocations.created,fitCreated:state().fit.created},sdkStepMs:stats(sample.steps.slice(visibleStepStart))};
   sample.visibleStaticNoRebuild=allocations.created===visibleBefore.created&&session.runtime.controlsById.size===visibleBefore.count;assert(sample.visibleStaticNoRebuild);
   // End-to-end includes startup, source parse, actual selection click, full software display,
   // then the existing cancel button, whose real page transition proves input is usable.
   tap('stage/characterPanel/cancel/hit');assert(!state().open,'real cancel did not leave selection');
   sample.fit=state().fit;sample.residentControls=session.runtime.controlsById.size;sample.visiblePaintNodes=first.paintNodes;
   if(cycle===1)fs.writeFileSync(path.join(out,'budget-'+budget+'-logs.json'),JSON.stringify(session.runtime.logs,null,2));
   const count=session.runtime.controlsById.size;
   for(let i=0;i<(cycle===1?10:0);i++){
    const at=performance.now(),input=tap('stage/menuPanel/start/hit'),prepareAt=performance.now();ready();const triggerToModelMs=input.wallMs+performance.now()-prepareAt;
    const shot=await render();sample.warm.push({cycle:i+1,fullDisplayMs:performance.now()-at,triggerToModelMs,driverGeometryMs:input.driverGeometryMs,renderMs:shot.renderMs,snapshotMs:shot.snapshotMs,controls:session.runtime.controlsById.size});
    tap('stage/characterPanel/cancel/hit');assert(!state().open);
   }
   const beforeIdle=session.runtime.controlsById.size,created=state().fit.created;
   for(let i=0;i<120;i++)step();
   sample.staticNoRebuild=state().fit.created===created&&session.runtime.controlsById.size===beforeIdle;assert(sample.staticNoRebuild);
   sample.boundedCache=sample.warm.every(w=>w.controls===count);assert(sample.boundedCache,'roundtrip growth');
   sample.sdkStepMs=stats(sample.steps);sample.longSdkSteps100ms=sample.steps.filter(n=>n>100).length;
   sample.memoryAfter=process.memoryUsage();sample.finalState=state();
   sample.allocations={...allocations};
   sample.faults=session.runtime.logs.filter(l=>l.level==='lua-error'||/ABYSS_UI failed|command_failed|prepare_failed|LUMINE_FIT failed/.test(l.text));assert.equal(sample.faults.length,0,JSON.stringify(sample.faults));
   sample.status='pass';console.log(JSON.stringify({budget,cycle,cold:sample.coldOperableMs,warm:stats(sample.warm.map(w=>w.fullDisplayMs)),fit:sample.fit,controls:sample.residentControls}));
  }catch(error){sample.status='failed';sample.error=String(error.stack);sample.logs=session?.runtime.logs;throw error;}
  finally{
   if(session){const n=session.runtime.controlsById.size;for(const runtime of session.runtimes??[session.runtime])runtime.destroy();sample.teardown={before:n,after:session.runtime.controlsById.size};}
   fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify(report,null,2));
  }
 }
 report.status='pass';
 report.summary=modes.map(budget=>{const samples=report.samples.filter(s=>s.budget===budget);return {budget,coldOperableMs:stats(samples.map(s=>s.coldOperableMs)),coldModelMs:stats(samples.map(s=>s.openToModelReadyMs)),warmFullDisplayMs:stats(samples.flatMap(s=>s.warm.map(w=>w.fullDisplayMs))),softwarePngMs:stats(samples.map(s=>s.firstPngMs)),residentControls:samples.map(s=>s.residentControls),allTeardownZero:samples.every(s=>s.teardown.after===0)};});
}catch(error){report.status='failed';report.error=String(error.stack);process.exitCode=1;console.error(error);}
finally{Qi.prototype.mountScript=mount;Qi.prototype.addRoot=addRoot;report.missingAssets=[...missingAssets];report.sourceStable=sha(saveArg)===report.saveSha256;fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify(report,null,2));}
