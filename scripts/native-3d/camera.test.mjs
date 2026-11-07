import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {planningGroundY,battleCamera,cameraPosition,projectWorld,projectBody,enemyFeet,prepareBattleCamera,cameraStartupSource} from './camera.mjs';

test('declared 1.7m hero and five staggered enemies remain readable above hand and below header',()=>{
  const player=projectBody(battleCamera.playerFeet,{width:.8,height:1.7});
  assert.equal(battleCamera.groundHeightStatus,'unverified');assert.equal(battleCamera.playerFeet[1],planningGroundY);
  assert.ok(player.x<-200&&player.height>120,JSON.stringify(player));
  assert.ok(player.bottom>battleCamera.minActorY&&player.top<battleCamera.maxActorY,JSON.stringify(player));
  for(let slot=1;slot<=5;slot++){
    assert.equal(enemyFeet(slot)[1],planningGroundY);
    const body=projectBody(enemyFeet(slot),{width:1,height:1.7});
    assert.ok(body.height>120&&body.left>-100&&body.right<600,JSON.stringify(body));
    assert.ok(body.bottom>battleCamera.minActorY&&body.top<battleCamera.maxActorY,JSON.stringify(body));
    const tall=projectBody(enemyFeet(slot),{width:1.3,height:2.6});
    assert.ok(tall.top<battleCamera.maxActorY&&tall.right<600,JSON.stringify(tall));
  }
});
test('projector uses vertical FOV and yaw/pitch basis with centred Y-up UI coordinates',()=>{
  assert.deepEqual(projectWorld(battleCamera.focus),{x:0,y:0,depth:10});
  const position=cameraPosition();assert.ok(position[1]>3&&position[2]<-9);
  assert.ok(projectWorld([3,2,0]).y>0&&projectWorld([4,1.3,0]).x>0);
  assert.throws(()=>projectWorld(position),/behind/);
  assert.throws(()=>projectWorld([NaN,0,0]),/finite/);
  assert.throws(()=>projectBody([0,0,0],{width:0,height:2}),/dimensions/);
});
test('public follow/UI node snippet reuses hidden empty anchor and targets read-back control IDs',()=>{
  const code=cameraStartupSource({anchorPrefabId:123,cameraName:'battle"template',minimapIds:[77]});
  const anchors=[],hidden=[],follow=[];let created=0;
  const f={getEntitiesWithSpecifiedPrefabOnTheField:()=>anchors,
    getAllCharacterEntitiesOfSpecifiedPlayer:()=>[40],getEntityLocationAndRotation:()=>({location:[0,battleCamera.playerFeet[1],0]}),
    split3dVector:v=>({yComponent:v[1]}),create3dVector:(...values)=>values,
    createPrefab:(id,at)=>{assert.equal(id,123);assert.deepEqual(Array.from(at),Array.from(battleCamera.focus));created++;anchors.push(55);return 55;},
    setPlayerCameraToFollowEntity:(...args)=>follow.push(args),modifyUiControlStatusWithinTheInterfaceLayout:(...args)=>hidden.push(args)};
  for(let i=0;i<2;i++)vm.runInNewContext(code.replaceAll(' as bigint[]',''),{f,stage:10,player:20,UIControlGroupStatus:{Hidden:'hidden'}});
  assert.equal(created,1);assert.deepEqual(follow,[[20,55,'battle"template'],[20,55,'battle"template']]);
  assert.deepEqual(hidden,[[20,77n,'hidden'],[20,77n,'hidden']]);
  assert.throws(()=>cameraStartupSource({anchorPrefabId:1,cameraName:'x',minimapIds:[]}),/identities/);
});
function harness(options={}){
  let changed=false;const calls=[];
  const camera={cameraId:1,name:'camera',distance:18,fieldOfView:55};
  const call=async(name,args)=>{
    calls.push({name,args});
    if(name==='scene_list_cameras')return {cameras:[changed&&!options.badReadback?{...camera,distance:10,fieldOfView:42,fixedView:{yaw:0,pitch:12,ignoreCollision:true}}:camera]};
    if(name==='scene_set_camera'){changed=true;return {mapPath:'camera-copy.gil'};}
    if(name==='scene_list_interface')return {layouts:[{layoutId:9,controls:options.noMinimap?[]:[{id:71,name:'小地图',kind:'builtIn'}]}]};
    if(name==='scene_add_prefab')return {mapPath:'anchor-copy.gil',prefabId:99};
    if(name==='scene_add_components'){assert.equal(args.prefab,99);assert.equal(args.solid,false);return {mapPath:'anchor-nonsolid-copy.gil'};}
    if(name==='scene_list_prefabs')return {prefabs:[{prefabId:99,assetId:10005018}]};
    throw Error('unexpected '+name);
  };
  const verifyAnchor=async(path,id)=>{assert.equal(path,'anchor-nonsolid-copy.gil');assert.equal(id,99);return {solid:options.badCollision===true,componentKind:5,contentBytes:0};};
  return {calls,call,verifyAnchor};
}
test('preparation uses returned candidate copies and verifies public camera/anchor readbacks',async()=>{
  const h=harness(),result=await prepareBattleCamera({...h,mapPath:'input.gil'});
  assert.equal(result.mapPath,'anchor-nonsolid-copy.gil');assert.equal(result.anchorPrefabId,99);
  assert.equal(result.anchorCollision.solid,false);
  assert.equal(result.minimaps[0].id,71);assert.equal(result.evidence.officialImport,'not_run');
  assert.equal(h.calls.find(item=>item.name==='scene_add_prefab').args.mapPath,'camera-copy.gil');
  assert.equal(h.calls.find(item=>item.name==='scene_add_components').args.mapPath,'anchor-copy.gil');
  assert.equal(h.calls.at(-1).args.mapPath,'anchor-nonsolid-copy.gil');
  assert.match(result.startupSource,/71n,UIControlGroupStatus.Hidden/);
});
test('missing minimap and stale camera readback fail without declaring configuration success',async()=>{
  for(const [options,pattern]of [[{badReadback:true},/readback differs/],[{noMinimap:true},/minimap control/]]){
    const h=harness(options);await assert.rejects(prepareBattleCamera({...h,mapPath:'input.gil'}),pattern);
    assert.ok(!h.calls.some(item=>item.name==='scene_add_prefab'));
  }
});
test('rejected collision readback cannot return a configured battle camera',async()=>{
  const h=harness({badCollision:true});await assert.rejects(prepareBattleCamera({...h,mapPath:'input.gil'}),/collision readback/);
});
