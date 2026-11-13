// Human-operated adapter over the reviewed isolated acquisition lifecycle.
import {act,openReward,skipReward,claimReward,selectionToken,proceed} from './acquisition.mjs';
export const mildRoute=[ [{hp:35,block:0,intent:6}], [{hp:45,block:0,intent:7}], [{hp:30,block:0,intent:4},{hp:25,block:0,intent:3}], [{hp:60,block:8,intent:9}] ];
export function command(run,text){
 const words=text.trim().split(/\s+/);
 if(run.phase==='battle'){
  if(text.trim()==='e')return act(run,{type:'end'});
  if(!/^[1-9]\d*(?:\s+[1-9]\d*)?$/.test(text.trim()))throw new Error('请输入牌号及可选目标号，或 e');
  return act(run,{type:'play',index:Number(words[0])-1,target:words[1]?Number(words[1])-1:null});
 }
 if(run.phase==='reward'){
  if(text.trim()==='o')return openReward(run);
  if(text.trim()==='s')return skipReward(run,selectionToken(run));
  if(text.trim()==='p')return proceed(run);
  if(/^[1-3]$/.test(text.trim()))return claimReward(run,selectionToken(run),Number(text.trim())-1);
 }
 throw new Error('当前状态不接受此命令');
}
