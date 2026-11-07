// Camera setup uses public scene tools and official follow-entity/UI nodes only.
// No unmeasured GIL camera fields are written here.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
// Explicit provisional feet plane; arena pivot/collision top is not yet measured.
// Do not derive an exact support height from the catalogue's full bounding-box height.
export const planningGroundY=.4;
export const battleCamera=Object.freeze({focus:Object.freeze([3,1.3,0]),distance:10,fieldOfView:42,yaw:0,pitch:12,
  canvas:Object.freeze([1280,720]),playerFeet:Object.freeze([0,planningGroundY,0]),minActorY:-125,maxActorY:220,
  groundHeightStatus:'unverified'});
const radians=n=>n*Math.PI/180;
export function cameraPosition(camera=battleCamera){
  const yaw=radians(camera.yaw),pitch=radians(camera.pitch);
  return camera.focus.map((v,i)=>v-camera.distance*[Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)][i]);
}
export function projectWorld(point,camera=battleCamera){
  if(!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite))throw Error('World point must be a finite vec3');
  const yaw=radians(camera.yaw),pitch=radians(camera.pitch),d=point.map((v,i)=>v-camera.focus[i]);
  const forward=[Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
  const right=[Math.cos(yaw),0,-Math.sin(yaw)],up=[Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),Math.cos(yaw)*Math.sin(pitch)];
  const dot=v=>v.reduce((sum,n,i)=>sum+n*d[i],0),depth=camera.distance+dot(forward);
  if(depth<=0)throw Error('World point is behind camera');
  const focal=camera.canvas[1]/2/Math.tan(radians(camera.fieldOfView)/2);
  return {x:dot(right)*focal/depth,y:dot(up)*focal/depth,depth};
}
export function enemyFeet(slot,groundY=planningGroundY){
  if(!Number.isInteger(slot)||slot<1||slot>5)throw Error('Enemy camera slot must be 1..5');
  if(!Number.isFinite(groundY))throw Error('Finite explicit ground planning height required');
  return [3.2+(slot-1)*1.15,groundY,((slot-1)%2)*.45];
}
// Dimensions are explicit planning inputs, never invented official model bounds.
export function projectBody(feet,{width,height},camera=battleCamera){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Positive measured or declared body dimensions required');
  const corners=[-width/2,width/2].flatMap(x=>[0,height].map(y=>projectWorld([feet[0]+x,feet[1]+y,feet[2]],camera)));
  const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),bottom=Math.min(...ys),top=Math.max(...ys);
  return {x:(left+right)/2,y:(bottom+top)/2,width:right-left,height:top-bottom,left,right,bottom,top};
}
const identifier=value=>{if(!/^[A-Za-z_$][\w$]*$/.test(value))throw Error('Invalid graph variable identifier');return value;};
export function cameraStartupSource({anchorPrefabId,cameraName,minimapIds,stage='stage',player='player'}={}){
  if(!Number.isSafeInteger(anchorPrefabId)||anchorPrefabId<=0||typeof cameraName!=='string'||!cameraName)throw Error('Camera prefab identity and template name required');
  if(!Array.isArray(minimapIds)||!minimapIds.length||minimapIds.some(id=>!Number.isSafeInteger(id)||id<=0))throw Error('Actual minimap control identities required');
  identifier(stage);identifier(player);
  return `const battleCameraAnchors=f.getEntitiesWithSpecifiedPrefabOnTheField(${anchorPrefabId});
let cameraFocusY=${battleCamera.focus[1]};
const cameraCharacters=f.getAllCharacterEntitiesOfSpecifiedPlayer(${player});
if(cameraCharacters.length>0){const cameraFeet=f.split3dVector(f.getEntityLocationAndRotation(cameraCharacters[0]).location);cameraFocusY=cameraFeet.yComponent+${battleCamera.focus[1]-battleCamera.playerFeet[1]};}
const battleCameraAnchor=battleCameraAnchors.length>0?battleCameraAnchors[0]:f.createPrefab(${anchorPrefabId},f.create3dVector(${battleCamera.focus[0]},cameraFocusY,${battleCamera.focus[2]}),[0,0,0],${stage},false,1,[] as bigint[]);
f.setPlayerCameraToFollowEntity(${player},battleCameraAnchor,${JSON.stringify(cameraName)});
${minimapIds.map(id=>`f.modifyUiControlStatusWithinTheInterfaceLayout(${player},${id}n,UIControlGroupStatus.Hidden);`).join('\n')}`;
}
// Read only the native-collision block already documented/written by MCP scene-save.mjs.
// TEMPLATE components=7, kind=5, body=15; solid:false is an explicitly empty body.
export async function readAnchorCollision(mapPath,prefabId){
  const toolRoot=process.env.MILIASTRA_MCP_ROOT||'D:/MiliastraTools/genshin-miliastra-mcp';
  const {container,fields,one}=await import(pathToFileURL(join(toolRoot,'src/scene/wire.mjs')));
  const root=container(readFileSync(mapPath));
  const entries=fields(one(root,4)).filter(f=>f.id===1&&f.wire===2&&Number(one(f.data,1,0))===prefabId);
  if(entries.length!==1)throw Error('Expected exactly one camera anchor prefab');
  const collision=fields(entries[0].data).filter(f=>f.id===7&&f.wire===2&&Number(one(f.data,1,0))===5);
  if(collision.length!==1||one(collision[0].data,15).length!==0)throw Error('Camera anchor native collision is not explicitly disabled');
  return {solid:false,componentKind:5,contentBytes:0};
}
export async function prepareBattleCamera({call,mapPath,verifyAnchor=readAnchorCollision}={}){
  if(typeof call!=='function'||!mapPath)throw Error('Camera preparation requires call and mapPath');
  async function invoke(name,args={}){
    const result=await call(name,{...args,mapPath});
    if(result.error||result.isError)throw Error(`${name}: camera setup rejected`);
    if(result.mapPath)mapPath=result.mapPath;
    return result;
  }
  const before=await invoke('scene_list_cameras');
  if(before.cameras?.length!==1)throw Error('One explicit battle camera template required');
  const camera=before.cameras[0];
  await invoke('scene_set_camera',{name:camera.name,distance:battleCamera.distance,fieldOfView:battleCamera.fieldOfView,
    fixedView:{yaw:battleCamera.yaw,pitch:battleCamera.pitch,ignoreCollision:true}});
  const readback=await invoke('scene_list_cameras');
  const actual=readback.cameras?.find(item=>item.cameraId===camera.cameraId);
  if(actual?.distance!==battleCamera.distance||actual?.fieldOfView!==battleCamera.fieldOfView
    ||actual?.fixedView?.yaw!==battleCamera.yaw||actual?.fixedView?.pitch!==battleCamera.pitch||actual?.fixedView?.ignoreCollision!==true)
    throw Error('Battle camera readback differs');
  const ui=await invoke('scene_list_interface');
  const minimaps=ui.layouts?.flatMap(layout=>(layout.controls??[]).filter(control=>control.name==='小地图'&&control.kind==='builtIn').map(control=>({...control,layoutId:layout.layoutId})))??[];
  if(!minimaps.length)throw Error('Actual native minimap control not found');
  const anchor=await invoke('scene_add_prefab',{asset:10005018,name:'ABYSS_battle_camera_anchor'});
  await invoke('scene_add_components',{prefab:anchor.prefabId,solid:false});
  const anchorCollision=await verifyAnchor(mapPath,anchor.prefabId);
  if(anchorCollision?.solid!==false)throw Error('Camera anchor collision readback differs');
  const prefabs=await invoke('scene_list_prefabs');
  if(!prefabs.prefabs?.some(item=>item.prefabId===anchor.prefabId&&item.assetId===10005018))throw Error('Empty-model camera anchor readback failed');
  return {mapPath,camera:actual,anchorPrefabId:anchor.prefabId,anchorCollision,minimaps,
    startupSource:cameraStartupSource({anchorPrefabId:anchor.prefabId,cameraName:actual.name,minimapIds:minimaps.map(item=>item.id)}),
    requiredEnumImport:'UIControlGroupStatus',projection:{...battleCamera,position:cameraPosition()},
    evidence:{method:'official_set_player_camera_to_follow_entity',cameraGuide:'mhfua005zpeg',nodeGuide:'mhw66orrrfkm',
      emptyModelSource:'installed asset-catalog:10005018 空模型',minimapSource:'actual scene_list_interface',
      avatarAppearance:'current native player avatar; no unverified Traveler ID override',officialImport:'not_run',projectionCalibration:'not_run'}};
}
