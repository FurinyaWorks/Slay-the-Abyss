import {productionModels,enemyModels} from './models.mjs';
import {battleCamera,projectBody,enemyFeet} from './camera.mjs';

export function nativeBattleConfig(buildId,native){
 if(productionModels.some((model,index)=>model.model!==index+1))throw Error('Native model IDs must match one-based Lua array indices');
 // Arrays retain numeric Lua indices; object keys become strings in toLua.
 const perModel=productionModels.map(m=>Array.from({length:5},(_,i)=>projectBody(enemyFeet(i+1),m.body)));
 return {buildId,maxActors:5,defaultModel:1,models:native.capabilities.models,enemyModels,
  bodies:productionModels.map(m=>m.body),heroBody:{width:.8,height:1.7},heroFeet:battleCamera.playerFeet,
  worldFeet:Array.from({length:5},(_,i)=>enemyFeet(i+1)),
  projections:{hero:projectBody(battleCamera.playerFeet,{width:.8,height:1.7}),slots:perModel[0],models:perModel},
  camera:native.camera.projection,presentationStatus:'native-targets-and-official-arena-awaiting-client-calibration'};
}
