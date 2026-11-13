import {cards,textFor} from '../model.mjs';
import {validateCard} from './export.mjs';
import {toLua} from '../../../../scripts/build-lua-data.mjs';
import {writeFileSync} from 'node:fs';
const allowed=new Set(['pillar','repair','block','damage','weak']);
const plans=cards.filter(c=>c.power).map(c=>{
 validateCard(c);
 function effects(list){return list.map(([op,value])=>{
  if(!allowed.has(op))throw Error('unsupported Power plan');
  if(op==='pillar'||op==='repair')return {op:'zlInstall',power:op,value};
  if(op==='weak')return {op:'applyStatus',status:'weak',value};
  return {op,value};
 });}
 return {id:c.id,type:'power',cost:c.cost,target:c.target,approval:'HOLD',base:effects(c.base),upgraded:effects(c.upgraded),text:textFor(c.id),upgradeText:textFor(c.id,true)};
});
writeFileSync(new URL('./power_plans.lua',import.meta.url),'-- Generated intents only: not registered/playable card definitions.\nreturn '+toLua(plans)+'\n');

const candidates=plans.map(p=>({id:p.id,name:cards.find(c=>c.id===p.id).name,color:'zhongli_candidate',type:'power',rarity:cards.find(c=>c.id===p.id).rarity,cost:p.cost,target:p.target==='enemy'?'ENEMY':'SELF',experimental:true,
 effects:p.base.map(e=>e.op==='zlInstall'?{op:'zhongliCard',kind:e.power==='pillar'?'installPillar':'installRepair',value:e.value}:e),
 upgrade:{effects:p.upgraded.map(e=>e.op==='zlInstall'?{op:'zhongliCard',kind:e.power==='pillar'?'installPillar':'installRepair',value:e.value}:e)},text:p.text,upgradeText:p.upgradeText,approval:'HOLD'}));
writeFileSync(new URL('./power_candidates.lua',import.meta.url),'-- Integration proposals only; absent from the native-ready catalog. Requires shared dispatcher admission.\nreturn '+toLua(candidates)+'\n');
