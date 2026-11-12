// Narrow cold entry: the parent arms its hard deadline before this fork.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {loadHistoricalBaselineInputs} from './historical-baseline-inputs.mjs';
import {createHistoricalRuntimeRoots,applyHistoricalRuntimeTarget} from './historical-runtime-root.mjs';
import {exactHistoricalDragTarget} from './historical-drag-target.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
let runtime,manifest,luaString,toLua,battleLayout,executions=0,child;
const preparation={},started=Date.now();
function phase(id,name){process.send({type:'phase',id,phase:name});}
function collect(root,path,output){for(const name of readdirSync(join(root,path))){const file=join(path,name),stat=lstatSync(join(root,file));assert(!stat.isSymbolicLink(),'generated fixture has no aliases');if(stat.isDirectory())collect(root,file,output);else output[file.replaceAll('\\','/')]=hash(readFileSync(join(root,file)));}}
function fresh(){
 // Each request rereads the original archive, fixed target and oracle records.
 exactHistoricalDragTarget(loadHistoricalBaselineInputs());
 for(const [path,sha]of Object.entries(manifest)){
  const file=join(runtime.directory,path);
  for(let parent=dirname(file);parent!==runtime.directory;parent=dirname(parent))assert(!lstatSync(parent).isSymbolicLink(),'fresh complete historical fixture parent alias: '+path);
  if(sha===null){assert.throws(()=>lstatSync(file),{code:'ENOENT'},'fresh complete historical fixture absence: '+path);continue;}
  assert(!lstatSync(file).isSymbolicLink(),'fresh complete historical fixture alias: '+path);assert.equal(hash(readFileSync(file)),sha,'fresh complete historical fixture: '+path);
 }
 for(const directory of ['src','scripts','data','build']){
  const actual={};collect(runtime.directory,directory,actual);
  const expected=Object.keys(manifest).filter(p=>p.startsWith(directory+'/')&&manifest[p]!==null).sort();
  assert.deepEqual(Object.keys(actual).sort(),expected,'fresh complete historical fixture inventory: '+directory);
 }
}
async function execute(args,cwd,{lua=false}={}){
 return await new Promise((resolve,reject)=>{
  const proc=child=spawn(process.execPath,args,{cwd,windowsHide:true,env:{...process.env,LUA_PATH:'./build/lua/?.lua;./src/lua/?.lua;;',LUA_PATH_5_3:'./build/lua/?.lua;./src/lua/?.lua;;',LUA_INIT:'',LUA_INIT_5_3:''},stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  proc.stdout.on('data',b=>{stdout+=b;(lua?process.stdout:process.stderr).write(b);if(Buffer.byteLength(stdout)>1024*1024){proc.kill();reject(Error('original 1MiB stdout limit'));}});
  proc.stderr.on('data',b=>{stderr+=b;process.stderr.write(b);if(Buffer.byteLength(stderr)>1024*1024){proc.kill();reject(Error('original 1MiB stderr limit'));}});
  proc.on('error',reject);proc.on('close',(status,signal)=>{child=undefined;signal?reject(Error('Historical child terminated by '+signal)):resolve({status,stdout,stderr});});
 });
}
async function prepare(id){
 if(runtime)return;
 phase(id,'staging');runtime=createHistoricalRuntimeRoots({source:false});preparation.stagedMs=Date.now()-started;
 process.send({type:'owned-root',directory:runtime.directory});
 console.log('Historical pre-multi monster UI replay (03266f66) only: unchanged frozen cases/scenes; not current source-port acceptance.');
 const target=exactHistoricalDragTarget(runtime.inputs);applyHistoricalRuntimeTarget(runtime.directory,target);preparation.projectedMs=Date.now()-started;
 for(const builder of ['build-lua-data.mjs','build-ui.mjs']){phase(id,builder);const result=await execute(['scripts/'+builder],runtime.directory);assert.equal(result.status,0,'original historical builder');}
 preparation.builtMs=Date.now()-started;
 ({luaString,toLua}=await import(pathToFileURL(join(runtime.directory,'scripts/build-lua-data.mjs'))));
 ({battleLayout}=await import(pathToFileURL(join(runtime.directory,'scripts/ui-layout.mjs'))));
 manifest=Object.fromEntries(Object.entries({...runtime.inputs,...target}).map(([p,b])=>[p,b===null?null:hash(b)]));collect(runtime.directory,'build',manifest);preparation.preparedMs=Date.now()-started;
}
async function run(message){
 const{id,script}=message;
 try{
  assert(['tests/lua/battle_ui_drag_click_compatibility.lua','tests/lua/battle_ui_drag_click_compatibility_slice_2.lua'].includes(script),'only two complete original drag slices');
  await prepare(id);phase(id,'fresh-complete-inputs');fresh();
  const entry=join(runtime.directory,'build/historical-ui-case.lua');
  assert(!existsSync(entry)||!lstatSync(entry).isSymbolicLink(),'historical Lua entry is not an alias');
  const source=`ABYSS_TEST_LAYOUT=${toLua(battleLayout())}\ndofile(${luaString(script)})`;writeFileSync(entry,source);manifest['build/historical-ui-case.lua']=hash(source);
  phase(id,'lua');executions++;
  const cli=createRequire(import.meta.url).resolve('fengari-node-cli/src/lua-cli.js');
  const result=await execute(['--max-old-space-size=1024',cli,'-e',`dofile(${luaString(entry)})`],runtime.directory,{lua:true});phase(id,'lua-finished');
  process.send({type:'result',id,result:{...result,verificationRoot:runtime.directory,preparation},status:{prepared:true,executions}});
 }catch(error){process.send({type:'result',id,error:{message:error.message,stack:error.stack},status:{prepared:!!manifest,executions}});}
}
process.on('message',message=>{if(message.type==='run')void run(message);else if(message.type==='close'){runtime?.close();runtime=undefined;process.disconnect();}});
process.on('disconnect',()=>{child?.kill();runtime?.close();});process.send({type:'ready'});
