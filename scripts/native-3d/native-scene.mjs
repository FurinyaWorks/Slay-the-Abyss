import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareBattleCamera,enemyFeet} from './camera.mjs';
import {assertGraphBudget,assertCompiledBudget} from './graph-budget.mjs';

const toolRoot=process.env.MILIASTRA_MCP_ROOT||'D:/MiliastraTools/genshin-miliastra-mcp';
const load=name=>import(pathToFileURL(join(toolRoot,'src',name)));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Default character templates parked at y=2000 are not playable spawn points.
export const labAnchor=Object.freeze([0,0.4,0]);
export function validateLabAnchor(anchor){
  if(!Array.isArray(anchor)||anchor.length!==3||!anchor.every(Number.isFinite)
    ||Math.abs(anchor[0])>50||Math.abs(anchor[2])>50||Math.abs(anchor[1])>20)
    throw Error('Experimental arena anchor must stay near the playable origin; template parking coordinates are invalid');
}
export const nativeModels=Object.freeze([
  {model:1,name:'遗迹守卫',asset:30005001,idle:5001001,attack:5001002,attackSeconds:3.58,hit:5001011,hitSeconds:2.16},
  {model:2,name:'大型风史莱姆',asset:30005003,idle:5003001,attack:5003002,attackSeconds:2.28,hit:null},
  {model:3,name:'打手丘丘人',asset:30007001,idle:7001007,attack:7001012,attackSeconds:2.15,hit:null},
]);

// The installed tool rejects creature asset -> prefab. Reuse the actual official
// complex-creature template envelope instead, then replace all behavior through
// the tool's public operations. This is an experimental structural adaptation:
// changing the model of the envelope still needs official import validation.
export async function seedCreaturePrefabs({mapPath,outputPath,models=nativeModels}) {
  const {container,fields,field,one,replace,wrap,varint}=await load('scene/wire.mjs');
  const {inspectPrefabs}=await load('scene/prefabs.mjs');
  const sourcePath=join(toolRoot,'knowledge/samples/gil/mh6riq9wvxqq_复杂造物.gil');
  const sourceBytes=readFileSync(sourcePath),sourceRoot=container(sourceBytes);
  const seed=fields(one(sourceRoot,4)).filter(f=>f.id===1&&f.wire===2)
    .find(f=>Number(one(f.data,2,0))===30007001)?.data;
  if(!seed||Number(one(seed,9,0))!==4)throw Error('Official complex-creature seed missing');
  const bytes=readFileSync(mapPath);let root=container(bytes);
  const kind=b=>Number(one(b,1,0));
  const old=inspectPrefabs(root),prefabs=[];
  if(old.some(p=>p.name.startsWith('LAB3D_')))throw Error('LAB3D already exists: use the clean input copy');
  let next=Math.max(0x40800000,...old.map(p=>Number(p.gameId)).filter(id=>id>=0x40800000&&id<=0x408fffff))+1;
  for(const model of models){
    while(root.includes(varint(next)))next++;
    if(next>0x408fffff)throw Error('No free creature prefab ID');
    const name=`LAB3D_${model.model}`,id=next++;
    const entry=Buffer.concat(fields(seed).flatMap(f=>{
      if(f.id===1)return [field(1,0,id)];
      if(f.id===2)return [field(2,0,model.asset)];
      if(f.id===6&&f.wire===2){
        const type=kind(f.data);
        if(type===1)return [field(6,2,Buffer.concat([field(1,0,1),field(11,2,field(1,2,Buffer.from(name)))]))];
        // Remove source decision, skill, patrol and logic references. Public
        // scene_set_creature_logic installs new decision/skills/logic below.
        if([80,81,82].includes(type))return [];
        if(type===65)return [field(6,2,Buffer.concat([field(1,0,65),field(70,2,field(1,2,Buffer.alloc(0)))]))];
      }
      if(f.id===7&&f.wire===2){
        const type=kind(f.data);
        if(type===1){const v=Buffer.alloc(4);v.writeFloatLE(model.scale??1);
          return [field(7,2,Buffer.concat([field(1,0,1),field(11,2,Buffer.concat([field(1,2,Buffer.alloc(0)),field(2,2,Buffer.alloc(0)),field(3,2,Buffer.concat([1,2,3].map(i=>field(i,5,v)))),field(501,0,4294967295)]))]))];}
        if(type===3)return [field(7,2,Buffer.concat([field(1,0,3),field(13,2,Buffer.alloc(0))]))];
      }
      // Source status-instance runtime record references an external sample
      // resource. It is deliberately omitted; own invincibility is added below.
      if(f.id===8&&f.wire===2&&kind(f.data)===42)return [];
      return [f.raw];
    }));
    root=replace(root,4,2,Buffer.concat([one(root,4),field(1,2,entry)]));
    const library=one(root,6),tabs=fields(library);
    const tab=tabs.find(t=>t.id===1&&t.wire===2&&kind(t.data)===18);
    const listed=field(5,2,Buffer.concat([field(1,0,2700),field(2,0,id)]));
    let changed;
    if(tab){
      const contents=fields(tab.data),existing=contents.find(t=>t.id===3&&t.wire===2);
      const tabBytes=existing?replace(tab.data,3,2,Buffer.concat([existing.data,listed])):Buffer.concat([tab.data,field(3,2,listed)]);
      changed=Buffer.concat(tabs.map(t=>t===tab?field(1,2,tabBytes):t.raw));
    }else{
      // Library-tab envelope copied from the actual official creature tab.
      const template=fields(one(sourceRoot,6)).find(t=>t.id===1&&t.wire===2&&kind(t.data)===18);
      if(!template)throw Error('Official creature library tab missing');
      const tabBytes=replace(template.data,3,2,listed);
      changed=Buffer.concat([library,field(1,2,tabBytes)]);
    }
    root=replace(root,6,2,changed);
    prefabs.push({...model,prefabId:id,prefabName:name});
  }
  const output=resolve(outputPath??join(dirname(mapPath),'lab3d-prefabs.gil'));
  if(output===resolve(mapPath))throw Error('Refuse to overwrite input save');
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,wrap(bytes,root),{flag:'wx'});
  const readback=inspectPrefabs(container(readFileSync(output)));
  for(const p of prefabs)if(!readback.some(r=>Number(r.gameId)===p.prefabId&&r.baseTemplateId===p.asset&&r.name===p.prefabName&&!r.duplicateIdentity))throw Error('Creature prefab readback failed');
  return {mapPath:output,prefabs,provenance:{sourcePath,sourceSha256:hash(sourceBytes),seedEntrySha256:hash(seed),method:'official_complex_template_model_adaptation',officialImport:'not_run',spawnability:'unverified'}};
}

const head="/// <reference types=\"genshin-ts\" />\nimport {g,defineSignal} from 'genshin-ts/runtime/core'\nimport {UIControlGroupStatus,CharacterSkillSlot,TopOfStackSkillDestructionType} from 'genshin-ts/definitions/enum'\n";
const clientHead=head+"import {TargetEntity} from 'genshin-ts/definitions/client_enums'\n";
const signals=`const COMMAND=defineSignal('LAB3D_COMMAND',[['command','str'],['model','int'],['actor','int'],['seq','int']] as const)\nconst ACK=defineSignal('client:LAB3D_ACK',[['player','entity'],['message','str'],['seq','int']] as const)\n`;
const positionSignal="const POSITION=defineSignal('client:LAB3D_POSITION',[['player','entity'],['actor','int'],['seq','int'],['x','float'],['y','float'],['z','float']] as const)\n";
const reportPosition=(target,actor,seq)=>`const actualPosition=f.split3dVector(f.getEntityLocationAndRotation(${target}).location);
for(const positionPlayer of f.getListOfPlayerEntitiesOnTheField())f.sendSignal(POSITION,positionPlayer,${actor},${seq},actualPosition.xComponent,actualPosition.yComponent,actualPosition.zComponent);`;
const ack=(message,seq)=>`for(const player of f.getListOfPlayerEntitiesOnTheField())f.sendSignal(ACK,player,${message},${seq});`;

function validateActorCount(maxActors){
  if(!Number.isInteger(maxActors)||maxActors<1||maxActors>5)throw Error('Native actor count must be between 1 and 5');
}

export function nativeSkillRequests(model,graphs){
  return ['attack',...(model.hit?['hit']:[])].map(action=>{
    const seconds=model[`${action}Seconds`];
    if(!Number.isFinite(seconds)||seconds<=0)throw Error(`Known ${action} duration required for ${model.name}`);
    return {action,cooldownSeconds:seconds,args:{name:`LAB3D_${model.model}_${action}`,creature:model.asset,animation:model[action],
      graphId:graphs[`skill_${action}`].graphId,graphAtMs:Math.floor(seconds*1000)-1,faceTarget:false,interrupts:false}};
  });
}

export function nativeGraphSources({graphs,prefabs,statusId,playerStatusId=statusId,floorId,anchor,maxActors=3,cameraSource='',positions,playerSkillId,cameraAnchorPrefabId}){
  validateActorCount(maxActors);
  const spacing=maxActors>1?6/(maxActors-1):0;
  const slotPositions=Array.from({length:maxActors-1},(_,i)=>`if(slot===${i+2}n)slotX=${anchor[0]+3.5+(i+1)*spacing};`).join('else ');
  const placed=positions?`let slotZ=${positions[0][2]};${positions.map((v,i)=>`if(slot===${i+1}n){slotX=${v[0]};slotZ=${v[2]};}`).join('')}`:'';
  const createUnit=p=>`if(evt.params.model===${p.model}n){
  let slotX=${anchor[0]+3.5};${slotPositions}
  ${placed}
  const unit=f.createPrefab(${p.prefabId},f.create3dVector(slotX,${anchor[1]},${positions?'slotZ':anchor[2]+3}),[0,-90,0],stage,false,1,[] as bigint[]);
  const players=f.getListOfPlayerEntitiesOnTheField();
  if(players.length>0){const characters=f.getAllCharacterEntitiesOfSpecifiedPlayer(players[0]);if(characters.length>0){const character=characters[0];f.modifyEntityFaction(unit,f.queryEntityFaction(character));
   f.addUnitStatus(character,unit,${statusId},1n,f.createDictionary([] as string[],[] as number[]));
   f.addUnitStatus(character,character,${playerStatusId},1n,f.createDictionary([] as string[],[] as number[]));}}
  f.setCustomVariable(unit,'LAB_actor',slot,true);f.setCustomVariable(unit,'LAB_seq',sequence,true);
  f.setCustomVariable(unit,'LAB_command',0n,true);f.setCustomVariable(unit,'LAB_busy',1n,true);
  f.setCustomVariable(unit,'LAB_hasHit',${Boolean(p.hit)},true);
  f.startTimer(unit,'LAB_READY',false,[4.5]);
  ${ack("'created:initializing_4.5s'","sequence")}return;
  }`;
  const prefabList=`f.assemblyList([${prefabs.map(p=>p.prefabId+'n').join(',')}],'config_id')`;
  const server=head+signals+`g.server({id:${graphs.server.graphId},name:'${graphs.server.name}'})
.on('whenEntityIsCreated',(evt,f)=>{
 ${floorId?`f.createPrefab(${floorId},[${anchor[0]+4},${anchor[1]-0.35},${anchor[2]+2}],[0,0,0],evt.eventSourceEntity,false,1,[] as bigint[]);`:''}
 f.startTimer(evt.eventSourceEntity,'LAB_BOOT',true,[1]);
})
.on('whenTimerIsTriggered',(evt,f)=>{
 if(evt.timerName!=='LAB_BOOT')return;
 for(const player of f.getListOfPlayerEntitiesOnTheField()){
 const stage=f.getSelfEntity();
 const characters=f.getAllCharacterEntitiesOfSpecifiedPlayer(player);
  for(const character of characters){${cameraSource}
   f.addUnitStatus(character,character,${playerStatusId},1n,f.createDictionary([] as string[],[] as number[]));${playerSkillId?`f.addCharacterSkill(character as any,${playerSkillId},CharacterSkillSlot.Skill1E,TopOfStackSkillDestructionType.Destroy);`:''}f.stopTimer(evt.eventSourceEntity,'LAB_BOOT');}
 }
})
.onSignal(COMMAND,(evt,f)=>{
 const stage=f.getSelfEntity(),sequence=evt.params.seq,command=evt.params.command,slot=evt.params.actor;
 if(sequence<=f.getCustomVariable(stage,'LAB_lastseq').asType('int')){${ack("'duplicate_or_stale'","sequence")}return;}
 f.setCustomVariable(stage,'LAB_lastseq',sequence,true);
 if(command!=='show'&&command!=='reset'&&command!=='hide'&&command!=='idle'&&command!=='attack'&&command!=='hit'&&command!=='death'){${ack("'unsupported:command'","sequence")}return;}
 if(slot<0n||slot>${maxActors}n){${ack("'unsupported:actor'","sequence")}return;}
 ${playerSkillId?`if(slot===0n&&command==='attack'){
 for(const player of f.getListOfPlayerEntitiesOnTheField())for(const character of f.getAllCharacterEntitiesOfSpecifiedPlayer(player)){
 f.setCustomVariable(character,'LAB_player_seq',sequence,true);f.castSkillFromSpecifiedPanelSlot(character as any,CharacterSkillSlot.Skill1E,false);
 ${ack("'requested:player_skill'","sequence")}}
 return;}`:''}
 ${playerSkillId?`if(slot===0n&&command==='hit'){
 for(const player of f.getListOfPlayerEntitiesOnTheField())for(const character of f.getAllCharacterEntitiesOfSpecifiedPlayer(player))f.playTimedEffects(7,character,'GI_RootNode',false,false,[0,1,0],[0,0,0],1,false);
 ${ack("'completed:hit'","sequence")}return;}`:''}
 if(slot===0n&&command!=='hide'){${ack("'unsupported:player_animation'","sequence")}return;}
 if(command==='show'||command==='reset'||command==='hide'){
  for(const prefab of ${prefabList})for(const unit of f.getEntitiesWithSpecifiedPrefabOnTheField(prefab)){if(slot===0n||f.getCustomVariable(unit,'LAB_actor').asType('int')===slot)f.removeEntity(unit);}
  if(command==='hide'){${ack("'hidden'","sequence")}return;}
  ${prefabs.map(createUnit).join('\n')}
  ${ack("'unsupported:model'","sequence")}return;
 }
 let found=false;
 for(const prefab of ${prefabList})for(const unit of f.getEntitiesWithSpecifiedPrefabOnTheField(prefab)){
 if(f.getCustomVariable(unit,'LAB_actor').asType('int')===slot){
  found=true;
  if(command==='death'){f.destroyEntity(unit);${ack("'completed:death'","sequence")}}
  else if(command==='idle'){f.setCustomVariable(unit,'LAB_command',0n,true);f.setCustomVariable(unit,'LAB_busy',0n,true);${ack("'completed:idle'","sequence")}}
  else if(f.getCustomVariable(unit,'LAB_busy').asType('int')!==0n){${ack("'busy:wait_ready_or_animation'","sequence")}}
  else if(command==='hit'&&!f.getCustomVariable(unit,'LAB_hasHit').asType('bool')){f.playTimedEffects(7,unit,'GI_RootNode',false,false,[0,1,0],[0,0,0],1,false);${ack("'completed:hit'","sequence")}}
  else{f.setCustomVariable(unit,'LAB_seq',sequence,true);f.setCustomVariable(unit,'LAB_busy',1n,true);f.setCustomVariable(unit,'LAB_command',command==='attack'?1n:2n,true);f.startTimer(unit,'LAB_TIMEOUT',false,[8]);${ack("'requested:await_skill_event'","sequence")}}
 }
 }
 if(!found){${ack("'missing_actor:show_first'","sequence")}}
})`;
  const unit=head+signals+positionSignal+`g.server({id:${graphs.unit.graphId},name:'${graphs.unit.name}'})
.on('whenTimerIsTriggered',(evt,f)=>{
 const unit=evt.eventSourceEntity,seq=f.getCustomVariable(unit,'LAB_seq').asType('int');
 if(evt.timerName==='LAB_READY'){f.setCustomVariable(unit,'LAB_busy',0n,true);
 ${cameraAnchorPrefabId?`for(const cameraEntity of f.getEntitiesWithSpecifiedPrefabOnTheField(${cameraAnchorPrefabId})){${reportPosition('cameraEntity','-1n','seq')}}`:''}
 ${positions?reportPosition('unit',"f.getCustomVariable(unit,'LAB_actor').asType('int')",'seq'):''}
 ${positions?`if(f.getCustomVariable(unit,'LAB_actor').asType('int')===1n){for(const player of f.getListOfPlayerEntitiesOnTheField())for(const hero of f.getAllCharacterEntitiesOfSpecifiedPlayer(player)){${reportPosition('hero','0n','seq')}}}`:''}
 ${ack("'ready'","seq")}}
 if(evt.timerName==='LAB_TIMEOUT'&&f.getCustomVariable(unit,'LAB_busy').asType('int')===1n){f.setCustomVariable(unit,'LAB_command',0n,true);f.setCustomVariable(unit,'LAB_busy',0n,true);${ack("'error:animation_timeout'","seq")}}
})
.on('whenSkillNodeIsCalled',(evt,f)=>{
 const unit=evt.callerEntity,seq=f.getCustomVariable(unit,'LAB_seq').asType('int');
 f.stopTimer(unit,'LAB_TIMEOUT');f.setCustomVariable(unit,'LAB_command',0n,true);f.setCustomVariable(unit,'LAB_busy',0n,true);
 ${positions?reportPosition('unit',"f.getCustomVariable(unit,'LAB_actor').asType('int')",'seq'):''}
 if(evt.parameter1==='LAB_attack'){${ack("'completed:attack'","seq")}}
 if(evt.parameter1==='LAB_hit'){${ack("'completed:hit'","seq")}}
})`;
  // Reuse the upstream fitting example's fixed decision status. Conditions are
  // read in the status graph where tactics/skills are evaluated by the engine.
  // This removes dynamic status switching as a failure point; real animation
  // entry and endpoint receipts still require official-client validation.
  const decision=clientHead+`g.creationStatusDecision({id:${graphs.decision.graphId},name:'${graphs.decision.name}',prefix:false}).on('start1',(_evt,f)=>{
 f.switchToSelfExecutionStatus(true,${graphs.idle.graphId},1n);
})`;
  const records=[{...graphs.server,code:server},{...graphs.unit,code:unit},{...graphs.decision,code:decision}];
  for(const [key,number] of [['attack',1],['hit',2],['idle',0]])records.push({...graphs[key],code:clientHead+`g.creationStatus({id:${graphs[key].graphId},name:'${graphs[key].name}',prefix:false}).on('start1',(_evt,f)=>{${number?`f.executeSkill(true,${number}n);`:`f.executeSkill(f.getCustomVariable(TargetEntity.Self,'LAB_command').asType('int')===1n,1n);f.executeSkill(f.getCustomVariable(TargetEntity.Self,'LAB_command').asType('int')===2n,2n);`}f.tacticStandStill(true,'stand',false);})`});
  for(const action of ['attack','hit'])records.push({...graphs[`skill_${action}`],code:clientHead+`g.creationSkill({id:${graphs[`skill_${action}`].graphId},name:'${graphs[`skill_${action}`].name}',prefix:false}).on('start',(_evt,f)=>{f.notifyServerNodeGraph('LAB_${action}','','');})`});
  if(playerSkillId){
   records.push({...graphs.player,code:head+signals+positionSignal+`g.server({id:${graphs.player.graphId},name:'${graphs.player.name}'})
.on('whenSkillNodeIsCalled',(evt,f)=>{if(evt.parameter1!=='LAB_player_attack')return;
 const unit=evt.callerEntity,seq=f.getCustomVariable(unit,'LAB_player_seq').asType('int');
 const player=f.getPlayerEntityToWhichTheCharacterBelongs(unit as any);
 const grounded=f.split3dVector(f.getEntityLocationAndRotation(unit).location);
 f.teleportPlayer(player,f.create3dVector(${anchor[0]},grounded.yComponent,${anchor[2]}),[0,90,0]);
 f.startTimer(unit,'LAB_PLAYER_POSITION',false,[0.08]);
 ${ack("'completed:attack'","seq")}})
.on('whenTimerIsTriggered',(evt,f)=>{if(evt.timerName!=='LAB_PLAYER_POSITION')return;
 const unit=evt.eventSourceEntity,seq=f.getCustomVariable(unit,'LAB_player_seq').asType('int');
 ${reportPosition('unit','0n','seq')}
})`});
   records.push({...graphs.skill_player,code:clientHead+`g.characterSkill({id:${graphs.skill_player.graphId},name:'${graphs.skill_player.name}',prefix:false}).on('start',(_evt,f)=>{f.notifyServerNodeGraph('LAB_player_attack','','');})`});
  }
  return records.map(({graphId,code})=>({graphId,code}));
}

export async function prepareNativeScene({call,mapPath,anchor=labAnchor,outputPath,addFloor=true,maxActors=5,models=nativeModels,productionCamera=false}={}){
  if(typeof call!=='function'||!mapPath)throw Error('prepareNativeScene needs call and mapPath');
  validateLabAnchor(anchor);
  validateActorCount(maxActors);
  const seeded=await seedCreaturePrefabs({mapPath,outputPath,models});mapPath=seeded.mapPath;
  async function invoke(name,args={}){const result=await call(name,{...args,mapPath});if(result.error||result.isError)throw Error(`${name}: ${JSON.stringify(result)}`);if(result.mapPath)mapPath=result.mapPath;return result;}
  const listed=await invoke('scene_list_prefabs');
  for(const p of seeded.prefabs)if(!listed.prefabs.some(r=>r.prefabId===p.prefabId&&r.assetId===p.asset))throw Error('Tool prefab readback failed');
  await invoke('scene_set_faction_hostility',{hostilePairs:[]});
  await invoke('scene_set_level_settings',{aggroMode:'custom'});
  await invoke('scene_set_player_count',{min:1,max:1});
  await invoke('scene_set_spawn',{position:anchor,rotation:[0,productionCamera?90:0,0]});
  const points=await invoke('scene_list_preset_points');
  const spawn=points.points.filter(p=>p.spawn);
  if(spawn.length!==1||spawn[0].position.some((v,i)=>Math.abs(v-anchor[i])>0.001))throw Error('Playable spawn readback differs from arena anchor');
  let floor;
  if(addFloor){
    floor=await invoke('scene_add_prefab',{asset:20002055,name:'LAB3D_floor',scale:[5,1,5]});
    await invoke('scene_add_components',{prefab:floor.prefabId,extraCollision:{areas:[{size:[5,0.5,5]}]}});
  }
  const cameras=await invoke('scene_list_cameras');
  if(cameras.cameras?.length)await invoke('scene_set_camera',{distance:18,fieldOfView:55,fixedView:{yaw:0,pitch:22}});
  let camera;
  if(productionCamera){camera=await prepareBattleCamera({call:invoke,mapPath});mapPath=camera.mapPath;}
  for(const [name,parameters] of [['LAB3D_COMMAND',[{name:'command',type:'string'},{name:'model',type:'integer'},{name:'actor',type:'integer'},{name:'seq',type:'integer'}]],['LAB3D_ACK',[{name:'message',type:'string'},{name:'seq',type:'integer'}]]])await invoke('scene_add_signal',{name,parameters});
  if(productionCamera)await invoke('scene_add_signal',{name:'LAB3D_POSITION',parameters:[{name:'actor',type:'integer'},{name:'seq',type:'integer'},...['x','y','z'].map(name=>({name,type:'float'}))]});
  const safe=await invoke('scene_add_unit_status',{name:'LAB3D_invincible',invincible:true});
  const playerSafe=await invoke('scene_add_unit_status',{name:'LAB3D_player_rooted',invincible:true,rooted:true});
  await invoke('scene_add_components',{entity:'关卡实体',variables:[{name:'LAB_lastseq',type:'integer',value:0}]});
  const graphs={};
  for(const [key,kind] of [['server','server'],['unit','server'],['decision','creatureDecision'],['idle','creatureStatus'],['attack','creatureStatus'],['hit','creatureStatus'],['skill_attack','creatureSkill'],['skill_hit','creatureSkill']]){
    graphs[key]=await invoke('scene_add_graph',{name:`LAB3D_${key}`,kind,...(key==='unit'?{attachToPrefab:seeded.prefabs.map(p=>p.prefabId)}:{})});
  }
  let playerSkill;
  if(productionCamera){
   graphs.player=await invoke('scene_add_graph',{name:'LAB3D_player',kind:'server',attachToPrefab:'character'});
   graphs.skill_player=await invoke('scene_add_graph',{name:'LAB3D_player_attack',kind:'characterSkill'});
   await invoke('scene_add_components',{prefab:'character',variables:[{name:'LAB_player_seq',type:'integer',value:0}]});
   playerSkill=await invoke('scene_add_skill',{name:'ABYSS_native_card_attack',graphId:graphs.skill_player.graphId,type:'normal',animation:1001,graphAtMs:1832,
    effect:{asset:10002152,attachPoint:'GI_WeaponR',ms:1833.333}});
  }
  for(const p of seeded.prefabs){
    await invoke('scene_add_components',{prefab:p.prefabId,variables:[{name:'LAB_actor',type:'integer',value:0},{name:'LAB_seq',type:'integer',value:0},{name:'LAB_command',type:'integer',value:0},{name:'LAB_busy',type:'integer',value:0},{name:'LAB_hasHit',type:'boolean',value:false}]});
    const skills=[];
    for(const request of nativeSkillRequests(p,graphs)){
      const skill=await invoke('scene_add_creature_skill',request.args);
      skills.push({skill:skill.skillId,firstCooldownSeconds:0,cooldownSeconds:request.cooldownSeconds});
    }
    await invoke('scene_set_creature_logic',{prefab:p.prefabId,decisionGraphId:graphs.decision.graphId,skills,sharedCooldownSeconds:0,logic:{sightDistance:0.01,chainRadius:0.01,territoryRadius:20}});
  }
  const sources=nativeGraphSources({graphs,prefabs:seeded.prefabs,statusId:safe.statusId,playerStatusId:playerSafe.statusId,floorId:floor?.prefabId,anchor,maxActors,
   cameraSource:camera?.startupSource,cameraAnchorPrefabId:camera?.anchorPrefabId,positions:productionCamera?Array.from({length:maxActors},(_,i)=>enemyFeet(i+1)):undefined,playerSkillId:playerSkill?.skillId});
  const compiled=await invoke('write_graphs',{graphs:sources});
  if(compiled.failed||compiled.errors?.length||compiled.written?.length!==sources.length)throw Error(`Native graph compilation incomplete: ${JSON.stringify(compiled)}`);
  assertCompiledBudget(compiled.written);
  const inspected=await invoke('inspect_map');
  const graphBudget=assertGraphBudget(inspected.graphs);
  for(const graph of Object.values(graphs))if(!inspected.graphs.some(r=>r.id===graph.graphId&&r.nodeCount>0))throw Error('Native graph readback incomplete');
  return {mapPath,anchor,prefabs:seeded.prefabs,graphs,sources,graphBudget,statusId:safe.statusId,playerStatusId:playerSafe.statusId,floor,camera,playerSkill,provenance:seeded.provenance,
    capabilities:{models:seeded.prefabs.map(p=>({model:p.model,name:p.name,idle:'native_standing',attack:true,hit:Boolean(p.hit),death:'destroyEntity_effect_not_clip'})),playerAnimation:false,actors:maxActors,initializationSeconds:4.5,commands:['show','hide','reset','idle','attack','hit','death'],damageAuthority:'existing_lua_only',animationReceipt:'skill_endpoint_not_visual_confirmation',officialImport:'not_run',phone:'not_run'}};
}
