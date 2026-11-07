import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {planningGroundY,battleCamera,battleViewpoint,cameraPosition,projectWorld,projectBody,enemyFeet,prepareBattleCamera,cameraStartupSource} from './camera.mjs';

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
test('fixed character camera resets unsupported object follow before explicit activation',()=>{
  const code=cameraStartupSource({cameraName:'battle"template',minimapIds:[77]});
  const hidden=[],calls=[];
  const f={resetPlayerCameraToFollowEntity:player=>calls.push(['reset',player]),
    switchMainCameraTemplate:(players,name)=>calls.push(['select',Array.from(players),name]),
    modifyUiControlStatusWithinTheInterfaceLayout:(...args)=>hidden.push(args)};
  for(let i=0;i<2;i++)vm.runInNewContext(code,{f,player:20,UIControlGroupStatus:{Hidden:'hidden'}});
  assert.deepEqual(calls,[['reset',20],['select',[20],'battle"template'],['reset',20],['select',[20],'battle"template']]);
  assert.doesNotMatch(code,/\.createPrefab|\.setPlayerCameraToFollowEntity/);
  assert.deepEqual(hidden,[[20,77n,'hidden'],[20,77n,'hidden']]);
  assert.throws(()=>cameraStartupSource({cameraName:'x',minimapIds:[]}),/identities/);
});
function harness(options={}){
  let changed=false;const calls=[];
  const camera={cameraId:1,name:'camera',distance:18,fieldOfView:55};
  const call=async(name,args)=>{
    calls.push({name,args});
    if(name==='scene_list_cameras')return {cameras:[changed&&!options.badReadback?{...camera,distance:10,fieldOfView:42,fixedView:{yaw:0,pitch:12,ignoreCollision:true}}:camera]};
    if(name==='scene_set_camera'){changed=true;return {mapPath:'camera-copy.gil'};}
    if(name==='scene_list_interface')return {layouts:[{layoutId:9,controls:options.noMinimap?[]:[{id:71,name:'小地图',kind:'builtIn'},{id:72,name:'造物生命值条',kind:'builtIn'},{id:73,name:'角色生命值条',kind:'builtIn'}]}]};
    throw Error('unexpected '+name);
  };
  const writeViewpoint=async args=>{assert.equal(args.mapPath,'camera-copy.gil');assert.deepEqual(args.offset,battleViewpoint);return {mapPath:'viewpoint-copy.gil',after:{mode:2,followRotation:options.badViewpoint===true,offset:battleViewpoint.map(Math.fround)}};};
  return {calls,call,writeViewpoint};
}
test('preparation verifies offset readback without creating an unsupported object anchor',async()=>{
  const h=harness(),result=await prepareBattleCamera({...h,mapPath:'input.gil'});
  assert.equal(result.mapPath,'viewpoint-copy.gil');assert.equal(result.followTarget,'player');
  assert.equal(result.minimaps[0].id,71);assert.equal(result.evidence.officialImport,'not_run');
  assert.ok(!h.calls.some(item=>item.name==='scene_add_prefab'));
  assert.match(result.startupSource,/71n,UIControlGroupStatus.Hidden/);
  assert.match(result.startupSource,/72n,UIControlGroupStatus.Hidden/);
  assert.match(result.startupSource,/73n,UIControlGroupStatus.Hidden/);
});
test('missing minimap and stale camera readback fail without declaring configuration success',async()=>{
  for(const [options,pattern]of [[{badReadback:true},/readback differs/],[{noMinimap:true},/minimap control/]]){
    const h=harness(options);await assert.rejects(prepareBattleCamera({...h,mapPath:'input.gil'}),pattern);
    assert.ok(!h.calls.some(item=>item.name==='scene_add_prefab'));
  }
});
test('rejected offset readback cannot return a configured battle camera',async()=>{
  const h=harness({badViewpoint:true});await assert.rejects(prepareBattleCamera({...h,mapPath:'input.gil'}),/viewpoint readback/);
});
