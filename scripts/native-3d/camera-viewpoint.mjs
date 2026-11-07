import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sha256} from '../evidence-files.mjs';

// Schema reference: luern0313/UGC-Gia-Gil-ProtoBuf@3203018 camera.proto
// CameraData.4 = ViewpointOffset { float x=1; float y=2; float z=3; }.
// Official 镜头设置 first-person sample independently contains field4.y=.3.
// Reuse MCP's wire writer: do NOT roundtrip the entire old community schema
// (its field19 type disagrees with the current official collision flag).
const toolRoot=process.env.MILIASTRA_MCP_ROOT||'D:/MiliastraTools/genshin-miliastra-mcp';
const wire=()=>import(pathToFileURL(join(toolRoot,'src/scene/wire.mjs')));
function record(root,api,name){
 const section=api.one(root,18);
 const cameras=api.fields(section).filter(f=>f.id===1&&f.wire===2).map(row=>({row,settings:api.one(row.data,2)}));
 const matches=cameras.filter(c=>name===undefined||api.one(c.settings,1).toString('utf8')===name);
 if(matches.length!==1)throw Error('Expected one explicitly selected camera template');
 return {...matches[0],section};
}
function inspect(settings,api){
 const rows=api.fields(settings),offsetRows=rows.filter(f=>f.id===4);
 if(offsetRows.length!==1||offsetRows[0].wire!==2)throw Error('Camera viewpoint envelope is missing or ambiguous');
 const vector=api.fields(offsetRows[0].data);
 const offset=[1,2,3].map(id=>{
  const hits=vector.filter(f=>f.id===id);
  if(hits.length>1||hits.some(f=>f.wire!==5))throw Error('Camera viewpoint component is ambiguous');
  return hits.length?hits[0].data.readFloatLE(0):0;
 });
 const scalar=id=>{const hits=rows.filter(f=>f.id===id);if(hits.length>1||hits.some(f=>f.wire!==0))throw Error('Ambiguous camera scalar');return Number(hits[0]?.value??0);};
 if(!offset.every(Number.isFinite))throw Error('Camera viewpoint is not finite');
 return {name:api.one(settings,1).toString('utf8'),offset,mode:scalar(12),followRotation:scalar(13)!==0};
}
export async function readCameraViewpoint(mapPath,name){
 const api=await wire(),{settings}=record(api.container(readFileSync(mapPath)),api,name);
 return inspect(settings,api);
}
export async function setCameraViewpoint({mapPath,outputPath,name,offset}={}){
 if(!mapPath||!outputPath||resolve(mapPath)===resolve(outputPath))throw Error('Camera viewpoint requires a distinct output copy');
 if(!Array.isArray(offset)||offset.length!==3||!offset.every(n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n))))throw Error('Camera viewpoint requires a finite vec3');
 if(existsSync(outputPath))throw Error('Refuse to overwrite existing camera copy');
 const api=await wire(),bytes=readFileSync(mapPath),root=api.container(bytes),selected=record(root,api,name);
 const before=inspect(selected.settings,api);
 if(before.mode!==2)throw Error('Viewpoint adapter requires an existing fixed character camera');
 const vector=Buffer.concat(offset.map((value,i)=>{const b=Buffer.alloc(4);b.writeFloatLE(value);return api.field(i+1,5,b);}));
 const settings=api.replace(api.replace(selected.settings,4,2,vector),13,0,0);
 const changed=api.replace(selected.row.data,2,2,settings);
 const section=Buffer.concat(api.fields(selected.section).map(row=>row.raw.equals(selected.row.raw)?api.field(1,2,changed):row.raw));
 const output=api.wrap(bytes,api.replace(root,18,2,section));
 mkdirSync(dirname(resolve(outputPath)),{recursive:true});writeFileSync(outputPath,output,{flag:'wx'});
 const after=await readCameraViewpoint(outputPath,name);
 if(after.followRotation||after.offset.some((n,i)=>n!==Math.fround(offset[i])))throw Error('Camera viewpoint readback differs');
 return {mapPath:resolve(outputPath),before,after,inputSha256:sha256(bytes),outputSha256:sha256(output),
  schemaSource:'https://github.com/luern0313/UGC-Gia-Gil-ProtoBuf/blob/3203018dd73a14a4e327483b92a4b09e4e583ca0/camera.proto',
  method:'field4_viewpoint_and_field13_followRotation_only',officialImport:'not_run',visualCalibration:'not_run'};
}
