import {mkdirSync,readFileSync,writeFileSync,copyFileSync,constants} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {connect,data} from './rpc.mjs';

const signal="const VIEW=defineSignal('ABYSS_VIEW_POINT',[['seq','int'],['point','int'],['u','float'],['v','float'],['x','float'],['y','float'],['z','float']] as const);\n";
const head="import {g,defineSignal} from 'genshin-ts/runtime/core'\n";
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function viewportProbeSources({server,skill,skillId}){
 const emit=(point,world,uv)=>`const xyz${point}=f.split3dVector(${world});f.sendSignalToServerNodeGraph(VIEW,seq,${point}n,${uv}.viewportX,${uv}.viewportY,xyz${point}.xComponent,xyz${point}.yComponent,xyz${point}.zComponent);`;
 const points=['feet',"f._3dVectorAddition(feet,[3.2,0,0])","f._3dVectorAddition(feet,[0,0,3.2])","f._3dVectorAddition(feet,[0,1.7,0])"];
 const client=head+signal+`g.characterSkill({id:${skill.graphId},name:${JSON.stringify(skill.name)},prefix:false}).on('start',(_evt,f)=>{
 const unit=f.getSelfEntity(),seq=f.getCustomVariable(unit,'ABYSS_VIEW_SEQ').asType('int');
 const feet=f.getEntityLocation(unit);
 ${points.map((p,i)=>`const world${i}=${p};const screen${i}=f.worldCoordinatesToScreenCoordinates(world${i});const uv${i}=f.screenCoordinatesToViewportCoordinates(screen${i}.screenX,screen${i}.screenY);${emit(i,`world${i}`,`uv${i}`)}`).join('\n')}
 const centre=f.viewportCoordinatesToScreenCoordinates(.5,.5);
 const centreUV=f.screenCoordinatesToViewportCoordinates(centre.screenX,centre.screenY);
 const near=f.screenCoordinatesToWorldCoordinates(centre.screenX,centre.screenY,1);
 const far=f.screenCoordinatesToWorldCoordinates(centre.screenX,centre.screenY,2);
 ${emit(4,'near','centreUV')}${emit(5,'far','centreUV')}
})`;
 const code=head+signal+"import {CharacterSkillSlot,TopOfStackSkillDestructionType} from 'genshin-ts/definitions/enum'\n"+
 `g.server({id:${server.graphId},name:${JSON.stringify(server.name)}})
 .on('whenEntityIsCreated',(evt,f)=>{
 const unit=evt.eventSourceEntity;
 f.addCharacterSkill(unit as any,${skillId},CharacterSkillSlot.Skill2Q,TopOfStackSkillDestructionType.Destroy);
 f.startTimer(unit,'ABYSS_VIEW_SAMPLE',false,[5]);
 f.printString('ABYSS_VIEW_PROBE scheduled 5s; points 0=feet 1=worldX 2=worldZ 3=head-envelope 4=inverseDepth1 5=inverseDepth2');
 })
 .on('whenTimerIsTriggered',(evt,f)=>{
 if(evt.timerName!=='ABYSS_VIEW_SAMPLE')return;
 const unit=evt.eventSourceEntity;
 f.setCustomVariable(unit,'ABYSS_VIEW_SEQ',1n,true);
 f.castSkillFromSpecifiedPanelSlot(unit as any,CharacterSkillSlot.Skill2Q,false);
 f.printString('ABYSS_VIEW_PROBE requested sample 1');
 })
 .onSignal(VIEW,(evt,f)=>{
 f.printString('ABYSS_VIEW_PROBE seq point u v worldX worldY worldZ');
 ${['seq','point','u','v','x','y','z'].map(p=>`f.printString(f.dataTypeConversion(evt.params.${p},'str'));`).join('\n')}
 })`;
 return [{graphId:server.graphId,code},{graphId:skill.graphId,code:client}];
}

export async function prepareViewportProbe({call,mapPath,output=resolve('.artifacts/native-viewport-probe')}={}){
 if(typeof call!=='function'||!mapPath)throw Error('Viewport probe requires call and a base GIL');
 const input=resolve(mapPath),bytes=readFileSync(input),workspace=join(resolve(output),randomUUID());mkdirSync(workspace,{recursive:true});
 let current=join(workspace,'base.gil');copyFileSync(input,current,constants.COPYFILE_EXCL);
 const receipt={buildId:workspace.split(/[\\/]/).at(-1),baseMap:input,inputSha256:hash(bytes),liveWriteEnabled:false,calls:[],statuses:{compile:'not_run',officialImport:'not_run',playtest:'not_run'}};
 async function invoke(name,args={}){
  const result=await call(name,{...args,mapPath:current});
  writeFileSync(join(workspace,`${receipt.calls.length+1}-${name}.json`),JSON.stringify(result,null,2));
  if(result.error||result.isError)throw Error(`${name}: ${JSON.stringify(result)}`);
  if(result.mapPath){if(resolve(result.mapPath)===input)throw Error('MCP returned the original input path');current=result.mapPath;}
  receipt.calls.push({name,mapPath:current});return result;
 }
 try{
  await invoke('scene_add_signal',{name:'ABYSS_VIEW_POINT',parameters:[{name:'seq',type:'integer'},{name:'point',type:'integer'},...['u','v','x','y','z'].map(name=>({name,type:'float'}))]});
  const server=await invoke('scene_add_graph',{name:'ABYSS_VIEW_PROBE',kind:'server',attachToPrefab:'character'});
  const skill=await invoke('scene_add_graph',{name:'ABYSS_VIEW_PROBE_SKILL',kind:'characterSkill'});
  await invoke('scene_add_components',{prefab:'character',variables:[{name:'ABYSS_VIEW_SEQ',type:'integer',value:0}]});
  const configured=await invoke('scene_add_skill',{name:'ABYSS_viewport_probe',type:'instant',graphId:skill.graphId});
  const graphs=viewportProbeSources({server,skill,skillId:configured.skillId});
  for(const graph of graphs)writeFileSync(join(workspace,`${graph.graphId}.ts`),graph.code);
  const compiled=await invoke('write_graphs',{graphs});
  if(compiled.failed||compiled.errors?.length||compiled.written?.length!==2)throw Error('Viewport probe compilation incomplete');
  const inspected=await invoke('inspect_map');
  if(!graphs.every(g=>inspected.graphs.some(r=>r.id===g.graphId&&r.nodeCount>0)))throw Error('Viewport probe graph readback mismatch');
  const final=join(workspace,'viewport-probe.gil');copyFileSync(current,final,constants.COPYFILE_EXCL);
  if(!readFileSync(input).equals(bytes))throw Error('Input GIL changed during probe preparation');
  Object.assign(receipt,{mapPath:final,outputSha256:hash(readFileSync(final)),graphName:server.name,graphs,skillId:configured.skillId});
  receipt.statuses.compile='passed';return receipt;
 }finally{writeFileSync(join(workspace,'viewport-probe.json'),JSON.stringify(receipt,null,2));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const client=await connect(resolve('.artifacts/native-viewport-probe-tool'));
 try{const receipt=await prepareViewportProbe({call:async(name,args)=>data(await client.callTool({name,arguments:args},undefined,{timeout:120000})),mapPath:process.argv[2],output:process.argv[3]});console.log(JSON.stringify({mapPath:receipt.mapPath,graphName:receipt.graphName,outputSha256:receipt.outputSha256,statuses:receipt.statuses}));}
 finally{await client.close();}
}
