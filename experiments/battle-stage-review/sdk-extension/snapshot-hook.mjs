// Private opt-in backend extension. No HTTP/game/platform API is added.
import fs from'node:fs';import{createHash}from'node:crypto';import{installFullSnapshotBridge}from'./snapshot-bridge.mjs';
const live=new WeakMap();let active=0;
const sha=s=>createHash('sha256').update(s).digest('hex');
function emit(row){const text=JSON.stringify({kind:'private-snapshot-backend-extension',active,...row});console.log(text);if(process.env.PRIVATE_SNAPSHOT_TRACE)fs.appendFileSync(process.env.PRIVATE_SNAPSHOT_TRACE,text+'\n');}
export function installSession(d,session,scripts){
 if(process.env.PRIVATE_SNAPSHOT_EXTENSION!=='1'){emit({event:'disabled',extension:false});return;}
 if(live.has(session))throw Error('duplicate private snapshot install');
 const handles=[];
 try{
  const files=scripts.filter(s=>/(?:^|\/)abyss_snapshot\.lua$/.test(s.path));
  if(files.length!==1||sha(files[0].source.replaceAll('\r\n','\n'))!=='8952ff07bea54c924d9a04200acce11be26cbb4bc66096de72a1b6a39e079b63')throw Error('private snapshot source fingerprint mismatch');
  for(const runtime of session.runtimes){
   const ui=runtime.mountedScripts.filter(s=>/(?:^|\/)abyss_ui(?:\.lua)?$/.test(s.path));
   if(ui.length!==1||!ui[0].env)throw Error('private snapshot UI environment missing or ambiguous');
   const bridge=installFullSnapshotBridge(d,ui[0].env);handles.push(bridge);
   if(!bridge.originalOwnerFunctionsIntact())throw Error('original owner functions changed');
  }
  if(!handles.length)throw Error('private snapshot runtime missing');
  live.set(session,handles);active+=handles.length;
  emit({event:'installed',extension:true,runtimes:handles.length,workerSha256:sha(fs.readFileSync(new URL('worker.js',import.meta.url)))});
 }catch(error){
  if(live.has(session)){live.delete(session);active-=handles.length;}
  for(const handle of handles.reverse())handle.uninstall();
  emit({event:'install-failed',extension:false,error:String(error.message||error)});throw error;
 }
}
export function disposeSession(session){
 const handles=live.get(session);if(!handles)return;
 live.delete(session);active-=handles.length;const metrics=[];let intact=true;
 for(const handle of handles){intact=handle.originalOwnerFunctionsIntact()&&intact;handle.uninstall();metrics.push(handle.metrics);}
 emit({event:'uninstalled',extension:false,runtimes:handles.length,metrics});
 if(!intact)throw Error('private snapshot original owner functions changed');
}
