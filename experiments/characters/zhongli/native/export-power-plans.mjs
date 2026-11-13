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
