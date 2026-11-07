import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const toolRoot=process.env.MILIASTRA_MCP_ROOT||'D:/MiliastraTools/genshin-miliastra-mcp';
const load=name=>import(pathToFileURL(join(toolRoot,'src',name)));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const officialArena=JSON.parse(readFileSync(new URL('./arena-scene.json',import.meta.url),'utf8'));

// Copy the complete authored static composition, never the tutorial gameplay.
// A whole-scene transform preserves relative placement, scale and silhouette.
// Optional cutaway removes only the near facade for the fixed combat camera.
export async function installOfficialArena({mapPath,outputPath,sourcePath=join(toolRoot,officialArena.source),offset=officialArena.profiles.combatCamera.offset,yaw=180,cutaway=true}={}){
  if(!mapPath||!outputPath||resolve(mapPath)===resolve(outputPath)||resolve(sourcePath)===resolve(outputPath))throw Error('Arena requires a distinct output copy');
  if(![0,180].includes(yaw)||!Array.isArray(offset)||offset.length!==3||!offset.every(Number.isFinite))throw Error('Arena transform requires yaw 0/180 and a finite offset');
  if(existsSync(outputPath))throw Error('Refuse to overwrite an existing arena candidate');
  const {container,fields,field,one,replace,wrap,varint}=await load('scene/wire.mjs');
  const {listSceneEntities}=await load('scene-save.mjs');
  const sourceBytes=readFileSync(sourcePath),sourceRoot=container(sourceBytes),baseBytes=readFileSync(mapPath);
  if(digest(sourceBytes)!==officialArena.sourceSha256)throw Error('Official arena source hash differs from the reviewed tutorial');
  if(listSceneEntities({mapPath,namePrefix:'ABYSS_ARENA_',limit:1}).total)throw Error('Arena is already installed; use the clean input copy');
  let root=container(baseBytes);
  const original=listSceneEntities({mapPath:sourcePath,limit:1000}).entities.filter(e=>e.kind==='static');
  if(original.length!==93)throw Error('Official signal terrain identity changed: expected 93 static entities');
  const byId=new Map(original.map(e=>[e.guid,e]));
  const kind=b=>Number(fields(b).find(f=>f.id===1&&f.wire===0)?.value??0);
  const f32=n=>{const b=Buffer.alloc(4);b.writeFloatLE(n);return b;};
  const vector=v=>Buffer.concat(v.map((n,i)=>field(i+1,5,f32(n))));
  const readVector=b=>[1,2,3].map(id=>fields(b).find(f=>f.id===id&&f.wire===5)?.data.readFloatLE(0)??0);
  const sign=yaw===180?-1:1,entities=[],excluded=[];let next=1079000000;
  for(const record of fields(one(sourceRoot,5))){
    if(record.id!==1||record.wire!==2)continue;
    const oldId=Number(one(record.data,1,0)),meta=byId.get(oldId);if(!meta)continue;
    const world=meta.position.map((n,i)=>(i===1?n:sign*n)+offset[i]);
    if(cutaway&&world[2]<officialArena.profiles.combatCamera.nearFacadeZ&&world[1]>-1.5){excluded.push({sourceGuid:oldId,name:meta.name,reason:'camera-facing facade cutaway'});continue;}
    // No imported server graphs, custom variables, UI or gameplay configurations.
    const graph=fields(record.data).find(f=>f.id===6&&kind(f.data)===3);
    if(graph&&one(graph.data,13).length)throw Error('Static scenery unexpectedly contains a graph binding');
    while(root.includes(varint(next))||entities.some(e=>e.guid===next))next++;
    if(next>=1082130432)throw Error('No free static entity IDs');
    const guid=next++,name=`ABYSS_ARENA_${guid}_${meta.name}`;
    let data=replace(record.data,1,0,guid);
    data=Buffer.concat(fields(data).map(f=>{
      if(f.id===5&&kind(f.data)===1){const p=one(f.data,11);return field(5,2,replace(f.data,11,2,replace(p,1,2,Buffer.from(name))));}
      if(f.id===6&&kind(f.data)===1){let t=one(f.data,11);t=replace(t,1,2,vector(world));
        const rotation=readVector(one(t,2));rotation[1]+=yaw;t=replace(t,2,2,vector(rotation));
        return field(6,2,replace(f.data,11,2,t));}
      return f.raw;
    }));
    entities.push({guid,sourceGuid:oldId,name,assetId:meta.assetId,position:world,data});
  }
  root=replace(root,5,2,Buffer.concat([one(root,5),...entities.map(e=>field(1,2,e.data))]));
  const library=one(root,6);let found=false;
  const listing=entities.map(e=>field(5,2,Buffer.concat([field(1,0,200),field(2,0,e.guid)])));
  const tabs=fields(library).map(tab=>{
    if(tab.id!==1||tab.wire!==2||kind(tab.data)!==3)return tab.raw;
    found=true;const body=one(tab.data,3);return field(1,2,replace(tab.data,3,2,Buffer.concat([body,...listing])));
  });
  if(!found)throw Error('Target save has no placed-entity library tab');
  root=replace(root,6,2,Buffer.concat(tabs));
  const output=wrap(baseBytes,root);mkdirSync(dirname(resolve(outputPath)),{recursive:true});writeFileSync(outputPath,output,{flag:'wx'});
  const readback=listSceneEntities({mapPath:outputPath,namePrefix:'ABYSS_ARENA_',limit:1000}).entities;
  if(readback.length!==entities.length||!entities.every(e=>readback.some(r=>r.guid===e.guid&&r.assetId===e.assetId)))throw Error('Arena entity readback mismatch');
  return {mapPath:resolve(outputPath),source:{...officialArena,path:resolve(sourcePath),sha256:digest(sourceBytes)},
    inputSha256:digest(baseBytes),outputSha256:digest(output),sourceStaticCount:original.length,
    entities:entities.map(({data,...e})=>e),excluded,transform:{offset,yaw,cutaway},
    evidence:{staticReadback:'passed',officialImport:'not_run',cameraComposition:'requires_current_client_capture',phone:'not_run'},
    cameraRecommendation:{distance:18,fieldOfView:55,fixedView:{yaw:0,pitch:22}},
    contactPlatform:officialArena.contactPlatform,
    note:'Official authored ruin composition; native scene builder must set addFloor:false. Combat placement uses the original flat arrival platform; contactPlatform records its model/scale/collision evidence. Actual standing height and camera visibility require client verification.'};
}
