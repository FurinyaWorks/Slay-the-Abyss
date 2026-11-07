// Camera setup uses public scene tools and official follow-entity/UI nodes only.
// No unmeasured GIL camera fields are written here.
import {dirname,join} from 'node:path';
import {setCameraViewpoint} from './camera-viewpoint.mjs';
// Explicit provisional feet plane; arena pivot/collision top is not yet measured.
// Do not derive an exact support height from the catalogue's full bounding-box height.
export const planningGroundY=.4;
export const battleCamera=Object.freeze({focus:Object.freeze([3,1.3,0]),distance:10,fieldOfView:42,yaw:0,pitch:12,
  canvas:Object.freeze([1280,720]),playerFeet:Object.freeze([0,planningGroundY,0]),minActorY:-125,maxActorY:220,
  groundHeightStatus:'unverified'});
// Native inverse-projection runs: template 0 -> world yaw90; -90 -> world180.
// Offsets stay in character (spawn yaw90) space, independently of camera yaw.
export const battleTemplateYaw=90;
export const battleViewpoint=Object.freeze([0,-.45,3]);
export const battleWorldFocusOffset=Object.freeze(battleCamera.focus.map((value,i)=>value-battleCamera.playerFeet[i]));
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
export function cameraStartupSource({cameraName,minimapIds,player='player'}={}){
  if(typeof cameraName!=='string'||!cameraName)throw Error('Camera template name required');
  if(!Array.isArray(minimapIds)||!minimapIds.length||minimapIds.some(id=>!Number.isSafeInteger(id)||id<=0))throw Error('Actual minimap control identities required');
  identifier(player);
  return `f.resetPlayerCameraToFollowEntity(${player});
f.switchMainCameraTemplate([${player}],${JSON.stringify(cameraName)});
${minimapIds.map(id=>`f.modifyUiControlStatusWithinTheInterfaceLayout(${player},${id}n,UIControlGroupStatus.Hidden);`).join('\n')}`;
}
export async function prepareBattleCamera({call,mapPath,writeViewpoint=setCameraViewpoint}={}){
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
    fixedView:{yaw:battleTemplateYaw,pitch:battleCamera.pitch,ignoreCollision:true}});
  const readback=await invoke('scene_list_cameras');
  const actual=readback.cameras?.find(item=>item.cameraId===camera.cameraId);
  if(actual?.distance!==battleCamera.distance||actual?.fieldOfView!==battleCamera.fieldOfView
    ||actual?.fixedView?.yaw!==battleTemplateYaw||actual?.fixedView?.pitch!==battleCamera.pitch||actual?.fixedView?.ignoreCollision!==true)
    throw Error('Battle camera readback differs');
  const ui=await invoke('scene_list_interface');
  const minimaps=ui.layouts?.flatMap(layout=>(layout.controls??[]).filter(control=>control.name==='小地图'&&control.kind==='builtIn').map(control=>({...control,layoutId:layout.layoutId})))??[];
  if(!minimaps.length)throw Error('Actual native minimap control not found');
  const hiddenNames=['小地图','造物生命值条','角色生命值条'];
  const hiddenGroups=ui.layouts.flatMap(layout=>(layout.controls??[]).filter(control=>hiddenNames.includes(control.name)&&control.kind==='builtIn'));
  for(const name of hiddenNames)if(!hiddenGroups.some(control=>control.name===name))throw Error('Actual native HUD group missing: '+name);
  const viewpoint=await writeViewpoint({mapPath,outputPath:join(dirname(mapPath),'battle-character-camera.gil'),name:actual.name,offset:battleViewpoint});
  if(viewpoint.after?.mode!==2||viewpoint.after?.followRotation!==false
    ||viewpoint.after?.offset?.length!==3||viewpoint.after.offset.some((n,i)=>n!==Math.fround(battleViewpoint[i])))throw Error('Character camera viewpoint readback differs');
  mapPath=viewpoint.mapPath;
  return {mapPath,camera:actual,viewpoint,followTarget:'player',minimaps,hiddenGroups,
    startupSource:cameraStartupSource({cameraName:actual.name,minimapIds:hiddenGroups.map(item=>item.id)}),
    requiredEnumImport:'UIControlGroupStatus',projection:{...battleCamera,position:cameraPosition()},
    evidence:{method:'fixed_character_camera_with_character_space_offset_and_native_projection',cameraGuide:'mhfua005zpeg',nodeGuide:'mhw66orrrfkm',
      minimapSource:'actual scene_list_interface',
      avatarAppearance:'current native player avatar; no unverified Traveler ID override',officialImport:'not_run',projectionCalibration:'not_run'}};
}
