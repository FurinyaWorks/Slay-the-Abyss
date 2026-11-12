// No process or preparation starts before the original deadline is armed.
import assert from 'node:assert/strict';
import {fork,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {rmSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {tmpdir} from 'node:os';
let child,active,ownedRoot,closed=false,sequence=0,lastStatus={prepared:false,executions:0};
function cleanup(){
 if(!ownedRoot)return;
 const root=resolve(ownedRoot),within=relative(resolve(tmpdir()),root);
 assert(within&&!isAbsolute(within)&&!within.startsWith('..')&&within.startsWith('abyss-historical-runtime-')&&!within.includes(sep),'owned historical drag temporary root');
 rmSync(root,{recursive:true,force:true});ownedRoot=undefined;
}
function diagnostic(message){return `${message}\n--- Lua stdout ---\n${active?.stdout??''}\n--- Lua stderr ---\n${active?.stderr??''}\nHistorical last phase: ${active?.phase??'waiting-for-entry'} (${Date.now()-(active?.started??Date.now())} ms since this call started)`;}
function stop(){
 closed=true;if(!child)return;
 if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
 else try{process.kill(-child.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}
 cleanup();
}
function fail(error){if(active){clearTimeout(active.timer);const reject=active.reject;active=undefined;reject(error);}}
function start(){
 child=fork(fileURLToPath(new URL('./historical-drag-worker.mjs',import.meta.url)),[],{stdio:['ignore','pipe','pipe','ipc'],windowsHide:true,detached:process.platform!=='win32'});
 for(const [stream,key]of [[child.stdout,'stdout'],[child.stderr,'stderr']])stream.on('data',bytes=>{
  if(!active)return;active[key]+=bytes.toString();
  if(Buffer.byteLength(active[key])>1024*1024){const error=new Error(diagnostic('Historical drag exceeds original 1MiB output limit'));stop();fail(error);}
 });
 child.on('error',error=>{const failure=new Error(diagnostic(error.message),{cause:error});stop();fail(failure);});
 child.on('exit',(code,signal)=>{
  closed=true;let error=active?new Error(diagnostic(`Historical drag worker exited ${code??signal}`)):undefined;
  try{cleanup();}catch(failure){if(error)error.message+='\nHistorical cleanup failed: '+failure.message;else error=failure;}
  if(error&&active)fail(error);
 });
 child.on('message',message=>{
  if(message.type==='owned-root'){assert(!ownedRoot,'one owned historical drag root');ownedRoot=message.directory;return;}
  if(message.type==='ready'){if(active)child.send({type:'run',id:active.id,script:active.script});return;}
  if(!active||message.id!==active.id)return;
  if(message.type==='phase'){active.phase=message.phase;return;}
  if(message.type!=='result')return;
  if(Date.now()-active.started>30000){const error=new Error(diagnostic('Historical drag result arrived after original 30000ms deadline'));stop();fail(error);return;}
  lastStatus=message.status;clearTimeout(active.timer);
  const {resolve,reject}=active;
  if(message.error){const error=new Error(diagnostic(message.error.message));error.cause=message.error;active=undefined;reject(error);}
  else{const result=message.result;active=undefined;resolve(result);}
 });
}
export const dragReplay={
 run(script,{timeout=30000}={}){
  assert.equal(timeout,30000,'unchanged original drag total deadline');assert(!active&&!closed,'one live scoped drag request');
  return new Promise((resolve,reject)=>{
   active={id:++sequence,script,resolve,reject,stdout:'',stderr:'',phase:'waiting-for-entry',started:Date.now()};
   active.timer=setTimeout(()=>{const error=new Error(diagnostic(`Historical drag exceeded original ${timeout}ms total deadline`));stop();fail(error);},timeout);
   if(!child)start();else child.send({type:'run',id:active.id,script});
  });
 },
 status(){return Object.freeze({...lastStatus,closed});},
 close(){
  if(!child||closed)return Promise.resolve();
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{stop();reject(new Error('Historical drag scope cleanup failed'));},5000);
   child.once('exit',code=>{clearTimeout(timer);try{cleanup();code===0?resolve():reject(new Error('Historical drag cleanup exited '+code));}catch(error){reject(error);}});child.send({type:'close'});
  });
 }
};
