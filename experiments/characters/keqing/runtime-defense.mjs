import {cards} from './mechanics.mjs';
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const amount=n=>Number.isSafeInteger(n)&&n>=0&&n<=999;
export function resourceDefenseProbe(id,{definitions=cards}={}){
 if(!['KQ006','KQ007'].includes(id))throw Error('unsupported defense id');
 const c=definitions[id];
 if(!exact(c,['rarity','channel','candidateName','role','type','cost','effects'])||c.type!=='skill'||c.cost!==1||!exact(c.effects,['base','upgraded']))throw Error('unsupported defense card');
 const resource=id==='KQ006'?'wedge':'infusion',faces={};
 for(const key of ['base','upgraded']){
  const a=c.effects[key];if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==2||Reflect.ownKeys(a).length!==3||!Object.hasOwn(a,'0')||!Object.hasOwn(a,'1'))throw Error('unsupported defense array');
  if(!exact(a[0],['op','amount'])||a[0].op!=='block'||!exact(a[1],['op','resource','amount'])||a[1].op!=='resourceBlock'||a[1].resource!==resource||!amount(a[0].amount)||!amount(a[1].amount))throw Error('unsupported defense effect');
  faces[key]={block:a[0].amount,extra:a[1].amount};
 }
 return{id,name:'待命名·'+id,type:'skill',cost:1,rarity:'special',color:'colorless',effects:[{op:'block',value:faces.base.block}],upgrade:{effects:[{op:'block',value:faces.upgraded.block}]},keqingProbe:{status:'HOLD',releaseEligible:false},keqingDefense:{resource,...faces}};
}
