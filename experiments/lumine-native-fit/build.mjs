// Extends an actual current-source GIL using the existing native encoder. Never live-writes.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';import {createHash,randomUUID} from 'node:crypto';
import {nativeShape} from '../../scripts/v25-battle-scene.mjs';
import {loadNativeUiEncoder} from '../../scripts/native-ui-encoder.mjs';
import {writeScriptBatch} from '../../scripts/native-script-batch.mjs';
import {embeddedScripts} from '../../scripts/native-script-inventory.mjs';
import {runNativeClientCheck} from '../../scripts/native-client-check.mjs';
import {nativeUiVariables} from '../../scripts/native-candidate-scripts.mjs';
import {toLua} from '../../scripts/build-lua-data.mjs';
const [baseReceipt,fitDir,outArg]=process.argv.slice(2);
const storage=process.argv[5]??'prefab';assert(['prefab','batch'].includes(storage),'Unknown storage mode');
const sourceImage=process.argv[6]??'experiments/lumine-native-fit/input/source.png';
const defaultBudget=Number(process.argv[7]??0);assert([0,400,800,1600,3200].includes(defaultBudget));
assert(baseReceipt&&fitDir&&outArg,'build.mjs <current baseline candidate.json> <fit folder> <new output>');
const out=path.resolve(outArg);assert(!fs.existsSync(out),'Use new output directory');fs.mkdirSync(out,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex'),sha=p=>hash(fs.readFileSync(p));
const base=read(baseReceipt);assert.equal(sha(base.candidate.path),base.candidate.sha256);
const tool=process.env.MILIASTRA_MCP_ROOT??'D:/MiliastraTools/genshin-miliastra-mcp';
const {native}=await loadNativeUiEncoder(tool),wire=await import(pathToFileURL(tool+'/src/scene/wire.mjs'));
const {luaSyntaxError}=await import(pathToFileURL(tool+'/src/client-check.mjs'));
let mapPath=path.join(out,'base.gil');fs.copyFileSync(base.candidate.path,mapPath);
const bindings={},costs=[],inputs=[],rotationModules=new Map();const buildId=randomUUID();
const batchTemplates={};
if(storage==='batch'){
 for(const size of [60,10,1]){
  // Native fill is enabled in the prefab. SetFillHorizontal alone does not
  // enable the Simulator's separate serialized fill flag.
  const template={name:'LumineFitBatch'+size,kind:'container',size:[1280,720],children:Array.from({length:size},(_,i)=>({name:'image'+i,kind:'image',size:[1,1],image:100003,colour:'#FFFFFF',fill:{shape:'horizontal',from:'right',amount:.5}}))};
  const r=native.addClientTemplate({mapPath,...template,outputName:'batch-'+size},out);mapPath=r.mapPath;batchTemplates[size]=r.templateIndex;
 }
}
const sharedTemplateBytes=fs.statSync(mapPath).size-base.candidate.bytes;
const sourceSha256=sha(sourceImage),featuresSourceSha256=sha('experiments/lumine-native-fit/input/source.png');
const packs=new Map([400,800,1600,3200].map(budget=>{
 const pack=read(path.join(fitDir,`budget-${budget}.json`));
 assert.equal(pack.sourceSha256,sourceSha256,'Fit belongs to another source');assert.equal(pack.budget,budget,'Wrong fit budget');
 if(sourceSha256!==featuresSourceSha256)assert.equal(pack.featuresSourceSha256,featuresSourceSha256,'Hybrid must preserve the approved facial source in every budget');
 else if(pack.featuresSourceSha256)assert.equal(pack.featuresSourceSha256,featuresSourceSha256,'Facial reference belongs to another source');
 assert.equal(pack.sourceSize[0],1672);assert.equal(pack.sourceSize[1],941);
 assert(Number.isFinite(pack.width)&&pack.width>0&&Number.isFinite(pack.height)&&pack.height>0);
 assert(pack.shapes.length>0&&pack.shapes.length<=budget);
 for(const s of pack.shapes){assert(['rect','polygon','nativeTriangle'].includes(s.type));assert(/^#[0-9a-f]{6}$/i.test(s.colour));
  const values=s.box??s.points?.flat();assert(values&&values.every(Number.isFinite));
  if(s.type==='rect')assert(s.box.length===4&&s.box[2]>0&&s.box[3]>0);else assert(s.points.length===3&&s.points.every(p=>p.length===2));
  if(s.type==='nativeTriangle'){assert(Object.values(s.placement).every(Number.isFinite));assert(s.placement.w>0&&s.placement.h>0);assert(s.placement.rx===0||s.placement.ry===0,'Only single-axis squash is allowed');}}
 return [budget,pack];
}));
for(const budget of [400,800,1600,3200]){
 const file=path.join(fitDir,`budget-${budget}.json`),pack=packs.get(budget);inputs.push({path:path.resolve(file),sha256:sha(file)});
 const k=1280/pack.width,ky=720/pack.height;
 const images=pack.shapes.flatMap((shape,index)=>{
  if(shape.type==='nativeTriangle'){
   const p=shape.placement;
   return [{name:'facet'+index,kind:'image',image:100003,colour:shape.colour,opacity:1,
    position:[p.cx*k-640,p.cy*ky-360],size:[p.w*k,p.h*k],rotation:p.rz,_fitRotation:[p.rx,p.ry,p.rz]}];
  }
  const scaled={...shape,name:'facet'+index,opacity:1,
   ...(shape.box?{box:shape.box.map((v,i)=>v*(i%2?ky:k))}:{points:shape.points.map(([x,y])=>[x*k,y*ky])})};
  return nativeShape(scaled,{image:{rect:100001}}).map(image=>({...image,colour:shape.colour,position:[image.position[0],image.position[1]+22]}));
 });
 const rotations=[];for(const [index,image]of images.entries()){
  image.name='image'+index;
  if(image._fitRotation){rotations.push([Math.floor(index/60),index,...image._fitRotation]);delete image._fitRotation;}
 }
 assert(images.length<=budget,'Actual image budget exceeded');
 assert(images.every(n=>[100001,100003].includes(n.image)),'Only legal native primitives');
 const batches=Array.from({length:Math.ceil(images.length/60)},(_,i)=>({name:'batch'+i,kind:'container',size:[1280,720],children:images.slice(i*60,(i+1)*60)}));
 const template={name:'LumineFit'+budget,kind:'container',size:[1280,720],children:batches};
 const start=performance.now(),before=fs.statSync(mapPath).size;
 let result;
 if(storage==='batch'){
  const group=native.getClientUi({mapPath,template:'AbyssReadyCardGroup'});
  const byIndex=new Map(rotations.map(r=>[r[1],r.slice(2)]));
  const rows=images.map((image,i)=>{
   const rgb=[1,3,5].map(index=>parseInt(image.colour.slice(index,index+2),16)),rotation=byIndex.get(i)??[0,0,image.rotation??0];
   return [image.image,...image.position,...image.size,...(image.pivot??[.5,.5]),...(image.scale??[1,1]),...rotation,...rgb,image.fill?1:0].map(v=>Number.isInteger(v)?v:Math.round(v*1000)/1000);
  });
  const name='abyss_lumine_fit_rows'+budget;rotationModules.set(name,'return '+toLua(rows)+'\n');
  bindings[budget]={templateIndex:group.templateIndex,images:images.length,dataModule:name,batchTemplates};result={templateIndex:group.templateIndex};
  fs.writeFileSync(path.join(out,'rows-'+budget+'.json'),JSON.stringify(rows));
 }else{
  result=native.addClientTemplate({mapPath,...template,outputName:'fit-'+budget},out);mapPath=result.mapPath;
  bindings[budget]={templateIndex:result.templateIndex,images:images.length};
  if(rotations.length){const name='abyss_lumine_fit_rot'+budget;bindings[budget].rotationModule=name;rotationModules.set(name,'return '+toLua(rotations)+'\n');}
 }
 costs.push({budget,images:images.length,triangles:images.filter(n=>n.image===100003).length,rectangles:images.filter(n=>n.image===100001).length,
  fillMasks:images.filter(n=>n.fill).length,singleAxisTriangles:rotations.length,containers:storage==='batch'?(()=>{const n=images.length,g=Math.floor(n/60)+Math.floor(n%60/10)+n%10;return 1+g+Math.ceil(g/60)})():1+batches.length,templateIndex:result.templateIndex,
  cumulativeGilBytes:fs.statSync(mapPath).size,templateByteIncrement:fs.statSync(mapPath).size-before,encodeMs:performance.now()-start});
 if(storage==='batch')costs.at(-1).runtimeDataBytes=Buffer.byteLength(rotationModules.get('abyss_lumine_fit_rows'+budget));
 fs.writeFileSync(path.join(out,'template-'+budget+'.json'),JSON.stringify(template));
}
const ui=native.getClientUi({mapPath,ui:'SlayTheAbyss'}),layout=ui.interface;
const stage=layout.controls.find(c=>c.name==='stage'),panel=stage.children.find(c=>c.name==='characterPanel');
assert(panel&&!panel.children.some(c=>c.name==='lumineFitHost'));
panel.children.unshift({name:'lumineFitHost',kind:'container',size:[1280,720],active:false,visible:false,children:[]});
const scripts=embeddedScripts({mapPath,includeSource:true},wire).scripts,updates=[];
const sources=new Map(scripts.map(s=>[s.name,s.source]));
const runtime=fs.readFileSync(new URL('./runtime.lua',import.meta.url),'utf8');
sources.set('abyss_lumine_fit',runtime);sources.set('abyss_lumine_fit_binding','return '+toLua(bindings)+'\n');
for(const [name,source]of rotationModules)sources.set(name,source);
// Preserve all production modules byte-for-byte except these two explicit adapters.
const originalView=sources.get('abyss_game_ui_view');assert(originalView.endsWith('return M\n')||originalView.trimEnd().endsWith('return M'));
sources.set('abyss_game_ui_view',originalView.replace(/return M\s*$/,`
local fit=require('abyss_lumine_fit')
local originalSyncPortraits=M.syncPortraits
function M.syncPortraits(platform,self)
 local normal=originalSyncPortraits(platform,self)
 return function()
  local experiment=fit.enabled()
  local choosing=self.characterOpen and self.characterSelection.info and self.characterSelection.info.id=='ironclad'
  if experiment and self.mode=='menu' and (not self.characterOpen or choosing) then
   if platform.portraits then platform.portraits:sync(self.mode,self.characterOpen,self.disabled,nil,false)end
  else normal()end
  fit.sync(self.root,choosing and not self.disabled)
  if experiment and choosing and fit.status().phase=='failed' then normal()end
 end
end
return M\n`));
sources.set('abyss_ui',sources.get('abyss_ui').replace(/^print\("ABYSS_BUILD [^"]+"\)\n/,`print("ABYSS_BUILD ${buildId}")\n`)+`
-- TASK-94 experiment adapter; normal Start/Update and battle remain owned by the game.
local fit=require('abyss_lumine_fit')
local normalStart,normalDestroy=OnStart,OnDestroy
function OnStart() fit.configure(script:GetParam('lumineFitBudget') or 0);normalStart()end
function LumineFitPortraitStatus() return portraits and portraits:status() or {}end
function OnDestroy()
 local ok,why=pcall(fit.release)
 normalDestroy()
 if not ok then print('LUMINE_FIT cleanup_failed '..tostring(why))end
end
`);
const variables=[...nativeUiVariables(),{name:'lumineFitBudget',type:'integer',value:defaultBudget,public:true}];
for(const name of ['abyss_game_ui_view','abyss_ui','abyss_lumine_fit','abyss_lumine_fit_binding',...rotationModules.keys()])updates.push({name,source:sources.get(name),...(name==='abyss_ui'?{variables}:{})});
mapPath=writeScriptBatch(mapPath,updates,out,{...wire,clientScriptRecord:native.clientScriptRecord,luaSyntaxError});
const added=native.addClientUi({...layout,mapPath,replace:true,outputName:'lumine-fit-experiment'},out);mapPath=added.mapPath;
const check=runNativeClientCheck({mapPath},tool);fs.writeFileSync(path.join(out,'native-check.json'),JSON.stringify(check,null,2));assert(check.ok,'Native static check failed');
const actual=embeddedScripts({mapPath,includeSource:true},wire).scripts;
assert.equal(actual.length,sources.size);for(const s of actual)assert.equal(s.source,sources.get(s.name),s.name+' readback');
const candidatePath=path.join(out,'lumine-fit.gil');fs.copyFileSync(mapPath,candidatePath);
const receipt={...base,buildId,sourceDirty:true,candidate:{path:candidatePath,sha256:sha(candidatePath),bytes:fs.statSync(candidatePath).size},
 moduleDigests:Object.fromEntries(actual.map(s=>[s.name,hash(s.source)])),
 experiment:{kind:'lumine-native-fit',release:false,baseReceipt:path.resolve(baseReceipt),baseReceiptSha256:sha(baseReceipt),baseGil:base.candidate,
  sourceSha256,sourceImage:path.resolve(sourceImage),featuresSourceSha256:packs.get(400).featuresSourceSha256??null,inputs,costs,
  nativeTemplateNames:storage==='batch'?[60,10,1].map(n=>'LumineFitBatch'+n):[400,800,1600,3200].map(b=>'LumineFit'+b),storage,sharedTemplateBytes,rowDecimalPlaces:storage==='batch'?3:null,defaultBudget,
  nativeCheck:check.ok,unchangedModules:scripts.length-2,modifiedModules:['abyss_ui','abyss_game_ui_view'],addedModules:['abyss_lumine_fit','abyss_lumine_fit_binding',...rotationModules.keys()],
  switch:'public integer lumineFitBudget: 0 original / 400 / 800 / 1600 / 3200',officialImport:'not_run',devicePerformance:'UNVERIFIED'},
 receiptPath:path.join(out,'candidate.json')};
receipt.upstreamProductionManifest=receipt.productionManifest;delete receipt.productionManifest;
receipt.experimentManifest={modules:actual.map(s=>({name:s.name,sha256:hash(s.source)})),
    builderSha256:sha(new URL('./build.mjs',import.meta.url)),runtimeSha256:hash(runtime)};
fs.writeFileSync(receipt.receiptPath,JSON.stringify(receipt,null,2));
fs.writeFileSync(path.join(out,'costs.json'),JSON.stringify(costs,null,2));console.log(receipt.receiptPath);
