import {readFileSync,writeFileSync,copyFileSync,mkdirSync,constants} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {assertGraphBudget,assertCompiledBudget} from './graph-budget.mjs';

const head="import {g,defineSignal} from 'genshin-ts/runtime/core'\n";
const sample="const SAMPLE=defineSignal('LAB3D_CAMERA_SAMPLE',[['seq','int'],['point','int'],['x','float'],['y','float'],['z','float']] as const);\n";
const payload=[{name:'seq',type:'integer'},{name:'point',type:'integer'},...['x','y','z'].map(name=>({name,type:'float'}))];
export const cameraProjectionPoints=Object.freeze([[.5,.5,1],[.5,.5,2],[.6,.5,1],[.5,.6,1]].map(Object.freeze));
export function cameraProjectionSources({server,skill,skillId}){
 const client=head+sample+`g.characterSkill({id:${skill.graphId},name:${JSON.stringify(skill.name)},prefix:false}).on('start',(_evt,f)=>{
 const unit=f.getSelfEntity(),seq=f.getCustomVariable(unit,'LAB_camera_seq').asType('int');
 ${cameraProjectionPoints.map(([u,v,depth],i)=>`const screen${i}=f.viewportCoordinatesToScreenCoordinates(${u},${v});
 const world${i}=f.screenCoordinatesToWorldCoordinates(screen${i}.screenX,screen${i}.screenY,${depth});
 const xyz${i}=f.split3dVector(world${i});
 f.sendSignalToServerNodeGraph(SAMPLE,seq,${i}n,xyz${i}.xComponent,xyz${i}.yComponent,xyz${i}.zComponent);`).join('\n')}
 })`;
 const code=head+sample+"import {CharacterSkillSlot,TopOfStackSkillDestructionType} from 'genshin-ts/definitions/enum'\n"+
 "const REQUEST=defineSignal('LAB3D_CAMERA_REQUEST',[['seq','int']] as const);\n"+
 "const CAMERA=defineSignal('client:LAB3D_CAMERA',[['player','entity'],['seq','int'],['point','int'],['x','float'],['y','float'],['z','float']] as const);\n"+
 `g.server({id:${server.graphId},name:${JSON.stringify(server.name)}})
 .on('whenEntityIsCreated',(evt,f)=>{
 f.addCharacterSkill(evt.eventSourceEntity as any,${skillId},CharacterSkillSlot.Skill2Q,TopOfStackSkillDestructionType.Destroy);
 })
 .onSignal(REQUEST,(evt,f)=>{
 if(evt.params.seq<=0n)return;
 const players=f.getListOfPlayerEntitiesOnTheField();
 if(players.length!==1)return;
 for(const character of f.getAllCharacterEntitiesOfSpecifiedPlayer(players[0])){
  if(evt.params.seq>f.getCustomVariable(character,'LAB_camera_seq').asType('int')){
   f.setCustomVariable(character,'LAB_camera_seq',evt.params.seq,true);
   f.castSkillFromSpecifiedPanelSlot(character as any,CharacterSkillSlot.Skill2Q,false);
  }
 }
 })
 .onSignal(SAMPLE,(evt,f)=>{
 if(evt.params.point<0n||evt.params.point>3n)return;
 if(evt.params.seq!==f.getCustomVariable(f.getSelfEntity(),'LAB_camera_seq').asType('int'))return;
 const players=f.getListOfPlayerEntitiesOnTheField();
 if(players.length!==1)return;
 f.sendSignal(CAMERA,players[0],evt.params.seq,evt.params.point,evt.params.x,evt.params.y,evt.params.z);
 })`;
 return [{graphId:server.graphId,code},{graphId:skill.graphId,code:client}];
}

export async function prepareCameraProjection({call,mapPath}={}){
 if(typeof call!=='function'||!mapPath)throw Error('Camera projection requires call and a base GIL');
 const input=resolve(mapPath),original=readFileSync(input),workspace=join(dirname(input),`camera-projection-${randomUUID()}`);
 mkdirSync(workspace);let current=join(workspace,'base.gil');copyFileSync(input,current,constants.COPYFILE_EXCL);
 const hash=b=>createHash('sha256').update(b).digest('hex');
 const receipt={sourcePath:input,inputSha256:hash(original),liveWriteEnabled:false,calls:[],statuses:{compile:'not_run',officialImport:'not_run',playtest:'not_run'}};
 async function invoke(name,args={}){
  const result=await call(name,{...args,mapPath:current});
  writeFileSync(join(workspace,`${receipt.calls.length+1}-${name}.json`),JSON.stringify(result,null,2));
  if(result.error||result.isError)throw Error(`${name}: ${JSON.stringify(result)}`);
  if(result.mapPath){if(resolve(result.mapPath)===input)throw Error('Projection tool returned original input');current=result.mapPath;}
  receipt.calls.push({name,mapPath:current});return result;
 }
 try{
  for(const [name,parameters] of [['LAB3D_CAMERA_REQUEST',[{name:'seq',type:'integer'}]],['LAB3D_CAMERA_SAMPLE',payload],['LAB3D_CAMERA',payload]])await invoke('scene_add_signal',{name,parameters});
  const server=await invoke('scene_add_graph',{name:'LAB3D_camera_projection',kind:'server',attachToPrefab:'character'});
  const skill=await invoke('scene_add_graph',{name:'LAB3D_camera_projection_skill',kind:'characterSkill'});
  await invoke('scene_add_components',{prefab:'character',variables:[{name:'LAB_camera_seq',type:'integer',value:0}]});
  const configured=await invoke('scene_add_skill',{name:'ABYSS_camera_projection',type:'instant',graphId:skill.graphId});
  const sources=cameraProjectionSources({server,skill,skillId:configured.skillId});
  for(const s of sources)writeFileSync(join(workspace,`${s.graphId}.ts`),s.code);
  const compiled=await invoke('write_graphs',{graphs:sources});
  if(compiled.failed||compiled.errors?.length||compiled.written?.length!==sources.length)throw Error('Camera projection compilation incomplete');
  const compiledBudget=assertCompiledBudget(compiled.written);
  const inspected=await invoke('inspect_map'),graphBudget=assertGraphBudget(inspected.graphs);
  if(!sources.every(s=>inspected.graphs.some(g=>g.id===s.graphId&&g.nodeCount>0)))throw Error('Camera projection readback incomplete');
  if(!readFileSync(input).equals(original))throw Error('Camera projection source GIL changed');
  const final=join(workspace,'camera-projection.gil');copyFileSync(current,final,constants.COPYFILE_EXCL);
  Object.assign(receipt,{mapPath:final,outputSha256:hash(readFileSync(final)),graphs:{server,skill},sources,skillId:configured.skillId,compiledBudget,graphBudget});
  receipt.statuses.compile='passed';return receipt;
 }finally{writeFileSync(join(workspace,'camera-projection.json'),JSON.stringify(receipt,null,2));}
}
