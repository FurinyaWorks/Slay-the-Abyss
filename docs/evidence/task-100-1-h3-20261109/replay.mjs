import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
// Opt-in actual SDK diagnostic. Private GIL, SDK projection and SDK exports are
// caller-supplied and are never copied into the repository evidence directory.
// Run from a repository checkout containing the frozen ae716926 commit:
// node replay.mjs <adapter-receipt.json> <candidate.gil> <actual-gil.save.json[.gz]> <sdk-export.mjs> <new-private-output-directory>
const args=process.argv.slice(2);
assert.equal(args.length,5,'receipt, GIL, SDK projection, SDK export and new output directory are required');
const [receiptPath,archivedGil,archivedSave,sdkPath,own]=args.map(value=>path.resolve(value));
const project=process.cwd();
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(fs.readFileSync(receiptPath));
assert.equal(sha(fs.readFileSync(archivedGil)),receipt.gilSha256);
const projectedBytes=archivedSave.endsWith('.gz')?gunzipSync(fs.readFileSync(archivedSave)):fs.readFileSync(archivedSave);
assert.equal(sha(projectedBytes),receipt.saveSha256);
const originalSave=JSON.parse(projectedBytes);
assert.equal(receipt.luaExact,true,'exact candidate Lua projection required before diagnostic instrumentation');
assert(!fs.existsSync(own),'use a new private output directory');
fs.mkdirSync(own,{recursive:true});
const exportFile=path.join(own,'sdk-observer.private.mjs');
fs.writeFileSync(exportFile,fs.readFileSync(sdkPath,'utf8')+'\nexport {Gr,dn,ya};\n');
const {Qi,Gr,dn,ya,d}=await import(pathToFileURL(exportFile));
const originalMount=Qi.prototype.mountScript;
Qi.prototype.mountScript=function(o){
 const controlId=Number(String(o.control?.authoringId??'').replace(/^n/,''));
 const script=path.basename(o.path,'.lua');
 const matches=receipt.mountedValues.filter(v=>v.controlId===controlId&&v.script===script);
 assert(matches.length<=1);
 return originalMount.call(this,{...o,params:matches[0]?.values??o.params??{}});
};
const bridgeScript=originalSave.assets.scripts.find(s=>path.basename(s.path)==='abyss_component_bridge.lua');
assert(bridgeScript);
const oldSource=execFileSync('git',['show','ae71692631e5a84c9716ea291dd1b32aa87281e0:src/lua/abyss_component_bridge.lua'],{cwd:project,encoding:'utf8'}).replaceAll('\r\n','\n');
const currentSource=bridgeScript.source.replaceAll('\r\n','\n');
const prelude=`
local H3={values={},frame=0}
_G.ABYSS_H3=H3
local function h3(bucket,key)
 local k=bucket..':'..tostring(key or 'all')
 H3.values[k]=(H3.values[k] or 0)+1
end
local function h3children(control)
 h3('nativeGetChildren','placementPath')
 return control:GetChildren()
end
local function h3child(control,name)
 h3('nativeGetChild',name)
 return control:GetChild(name)
end
local function h3semanticChildren(control)
 h3('nativeGetChildren','semantic')
 return control:GetChildren()
end
function H3.snapshot(phase)
 local rows={}
 for k,v in pairs(H3.values)do rows[#rows+1]=k..'='..v end
 table.sort(rows)
 print('H3_SNAPSHOT '..phase..' '..table.concat(rows,';'))
end
`;
function replaceOnce(source,needle,replacement){
 assert.equal(source.split(needle).length,2,'instrumentation identity '+needle.slice(0,60));
 return source.replace(needle,replacement);
}
function instrument(source,variant){
 let value=prelude+source;
 for(const [signature,body]of [
  ['local function read(owner,record,key)','h3("index",key)'],
  ['local function write(owner,record,key,value)','h3("newindex",key)'],
  ['local function getChild(owner,record,name)','h3("semanticGetChild",name)'],
  ['local function children(owner,record)','h3("semanticGetChildren","all")'],
  ['local function nativeAt(root,path)','h3("nativeAt",path)'],
  ['local function forward(owner,record,method,key,...)','h3("nativeForward",key)'],
 ])value=replaceOnce(value,signature,signature+'\n    '+body);
 value=replaceOnce(value,'current:GetChildren()','h3children(current)');
 value=replaceOnce(value,'record.native:GetChild(name)','h3child(record.native,name)');
 value=replaceOnce(value,'record.native:GetChildren()','h3semanticChildren(record.native)');
 if(variant==='old') {
  value=replaceOnce(value,'    return bridge','    bridge.step=function()end -- New Host compatibility only; old eager bridge has no pending jobs.\n    return bridge');
  value=replaceOnce(value,'if method then return method end','if method then h3("wrapperAllocated","operation:"..key);return method end');
  value=replaceOnce(value,"if type(value)=='function'then return function", "if type(value)=='function'then h3('wrapperAllocated','native:'..key);return function");
 } else {
  value=replaceOnce(value,'if record.methods[key]then return record.methods[key]end',
    variant==='current-cache-off'?'-- Controlled cache-off negative factor; no other behavior changed.':
    'if record.methods[key]then h3("wrapperCacheHit",key);return record.methods[key]end');
  value=replaceOnce(value,'if method then record.methods[key]=method;return method end',
    'if method then h3("wrapperAllocated","operation:"..key);record.methods[key]=method;return method end');
  value=replaceOnce(value,"if type(value)=='function'then", "if type(value)=='function'then h3('wrapperAllocated','native:'..key)");
  value=replaceOnce(value,'local imageMethod=function','h3("wrapperAllocated","image:"..key)\n        local imageMethod=function');
 }
 value=replaceOnce(value,'return M',`function M.h3Tick()
 H3.frame=H3.frame+1
 if H3.frame==30 then H3.snapshot('warm-start')end
 if H3.frame==150 then H3.snapshot('warm-end')end
end
return M`);
 return value;
}
const report={schemaVersion:1,createdAt:new Date().toISOString(),
 identity:{gilSha256:receipt.gilSha256,saveSha256:receipt.saveSha256,sdkExportSha256:sha(fs.readFileSync(sdkPath)),
  bridgeOldSha256:sha(oldSource),bridgeCurrentSha256:sha(currentSource),observerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url)))},
 method:'Actual eager GIL projection, same server tree/templates/parameters. Three separate SDK Gr instances. Diagnostic copies instrument bridge boundary counters and a shared 30+120 OnUpdate snapshot. Old eager bridge receives only a no-op step compatibility method for the current Host. Old bridge replacement is a multi-change characterization; current-cache-off vs current is the single-factor cache negative control.',
 limitations:['Instrumented copied-save sources are not byte-exact candidate Lua and are not official imports. Original GIL/projection hashes retained.','Counters measure bridge semantic/native forwarding only, not all SDK engine calls or device FPS.','No instrumented wall-time claim: observers perturb runtime and host process allocation.','Menu-only 120-update warm window does not establish battle/device behavior or all causes of historical 2.97x menu regression.'],runs:[]};
const parseSnapshot=row=>Object.fromEntries(row.text.slice(row.text.indexOf(' ',12)+1).split(';').filter(Boolean).map(item=>{const p=item.lastIndexOf('=');return[item.slice(0,p),Number(item.slice(p+1))]}));
function visualTree(state){
 const rows=[];
 function walk(node,ancestors,visible){
  const shown=visible&&node.visible!==false&&node.active!==false;
  const p=[...ancestors,node.name];
  if(shown){const copy={...node,path:p.join('/')};for(const k of ['id','prefabId','authoringId','children'])delete copy[k];rows.push(copy);}
  for(const child of node.children??[])walk(child,p,shown);
 }
 for(const node of state.tree)walk(node,[],true);
 return rows;
}
try{
 for(const variant of ['old','current-cache-off','current']){
  const save=structuredClone(originalSave);
  const bridge=save.assets.scripts.find(s=>path.basename(s.path)==='abyss_component_bridge.lua');
  bridge.source=instrument(variant==='old'?oldSource:currentSource,variant);
  const ui=save.assets.scripts.find(s=>path.basename(s.path)==='abyss_ui.lua');
  ui.source=replaceOnce(ui.source,'        view:update(dt)',`        view:update(dt)
        require('abyss_component_bridge').h3Tick()`);
  fs.writeFileSync(path.join(own,variant+'.bridge-observed.lua'),bridge.source);
  let session;
  try{
   session=Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});
   for(let frame=0;frame<150;frame++)dn(session,1/60);
   const faults=session.runtime.logs.filter(row=>row.level==='lua-error'||/ABYSS_UI failed|prepare_failed|command_failed/.test(row.text));
   assert.equal(faults.length,0,JSON.stringify(faults));
   const snapshots=session.runtime.logs.filter(row=>row.text.startsWith('H3_SNAPSHOT'));
   assert.equal(snapshots.length,2);
   const start=parseSnapshot(snapshots[0]),end=parseSnapshot(snapshots[1]);
   const warm=Object.fromEntries(Object.entries(end).map(([key,n])=>[key,n-(start[key]??0)]));
   const observed=visualTree(ya(session,{inspect:true,view:true,paint:false}));
   fs.writeFileSync(path.join(own,variant+'.visual.json'),JSON.stringify(observed));
   report.runs.push({variant,observedSourceSha256:sha(bridge.source),controlCount:session.runtime.controlsById.size,
    warmFrames:120,snapshots,start,end,warm,visualSha256:sha(JSON.stringify(observed)),visibleNodes:observed.length,
    logs:session.runtime.logs,memory:process.memoryUsage()});
  }finally{if(session)for(const runtime of session.runtimes)for(const state of runtime.luaStates??[])try{d.lua_close(state)}catch{}}
 }
 const [old,off,current]=report.runs;
 assert.equal(off.visualSha256,current.visualSha256,'cache factor changed visible model');
 report.currentCacheVisualEqual=true;
 report.oldCurrentVisualEqual=old.visualSha256===current.visualSha256;
 for(const run of report.runs){
  run.warmTotals=Object.fromEntries(['index','newindex','semanticGetChild','semanticGetChildren','nativeGetChild','nativeGetChildren','nativeAt','nativeForward','wrapperAllocated','wrapperCacheHit'].map(bucket=>[bucket,Object.entries(run.warm).filter(([k])=>k.startsWith(bucket+':')).reduce((sum,[,v])=>sum+v,0)]));
 }
 report.status='H3_COUNTER_CHARACTERIZATION_PASS';
}catch(error){report.status='FAILED';report.error=String(error.stack??error);throw error;}
finally{Qi.prototype.mountScript=originalMount;fs.writeFileSync(path.join(own,'report.json'),JSON.stringify(report,null,2)+'\n');fs.unlinkSync(exportFile);}
console.log(JSON.stringify({status:report.status,oldCurrentVisualEqual:report.oldCurrentVisualEqual,currentCacheVisualEqual:report.currentCacheVisualEqual,runs:report.runs.map(({variant,warmTotals,controlCount,visualSha256})=>({variant,warmTotals,controlCount,visualSha256}))},null,2));
