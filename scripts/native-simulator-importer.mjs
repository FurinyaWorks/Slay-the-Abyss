import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';import{registerHooks}from'node:module';import{createHash,randomUUID}from'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function preserveSimulatorRotations(source){
 const anchor='if(turn)out.rotation=turn;';
 if(source.split(anchor).length-1!==1)throw Error('Simulator native rectangle reader schema changed');
 return source.replace(anchor,`const nativeX=Number(t.rotation?.x??0),nativeY=Number(t.rotation?.y??0);
  if(![nativeX,nativeY,turn].every(Number.isFinite))throw Error('Invalid simulator native rotation');
  if(nativeX||nativeY)out.rotation=[nativeX,nativeY,turn];else if(turn)out.rotation=turn;`);
}
export async function loadNativeSimulatorImporter(toolRoot){
 const file=path.join(toolRoot,'src/simulator-import.mjs'),bytes=fs.readFileSync(file),sourceSha256=hash(bytes),transformed=preserveSimulatorRotations(bytes.toString('utf8'));
 const url=pathToFileURL(file);url.searchParams.set('abyss-native-xyz-reader',randomUUID());let intercepted=false;
 const hook=registerHooks({load(actual,context,next){const loaded=next(actual,context);if(actual!==url.href)return loaded;if(hash(Buffer.from(loaded.source))!==sourceSha256)throw Error('Simulator importer changed while loading');intercepted=true;return{...loaded,source:transformed}}});
 try{const importer=await import(url.href);if(!intercepted||typeof importer.readSimulatorSave!=='function')throw Error('Native simulator importer adaptation was not loaded');return{...importer,identity:{adapter:'simulator-native-xyz-v1',file,sourceSha256,transformedSha256:hash(transformed)}}}finally{hook.deregister()}
}
