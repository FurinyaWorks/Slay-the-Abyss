import{cards}from'./mechanics.mjs';
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const n=x=>Number.isSafeInteger(x)&&x>=0&&x<=999;
export function aoeDefenseProbe(id,{definitions=cards}={}){
 if(id!=='KQ027')throw Error('unsupported aoe defense id');const c=definitions[id];
 if(!exact(c,['rarity','channel','candidateName','role','type','cost','effects'])||c.type!=='attack'||c.cost!==2||!exact(c.effects,['base','upgraded']))throw Error('unsupported aoe defense card');
 const faces={};for(const key of ['base','upgraded']){
  const a=c.effects[key];if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==2||Reflect.ownKeys(a).length!==3||!Object.hasOwn(a,'0')||!Object.hasOwn(a,'1'))throw Error('unsupported aoe defense array');
  if(!exact(a[0],['op','damage','hits','target'])||a[0].op!=='damage'||!n(a[0].damage)||a[0].hits!==1||a[0].target!=='all'||!exact(a[1],['op','resource','amount'])||a[1].op!=='resourceBlock'||a[1].resource!=='wedge'||!n(a[1].amount))throw Error('unsupported aoe defense effects');
  faces[key]={hit:a[0].damage,block:a[1].amount};
 }
 return{id,name:'待命名·'+id,type:'attack',cost:c.cost,rarity:'special',color:'colorless',effects:[],upgrade:{effects:[]},keqingProbe:{status:'HOLD',releaseEligible:false},keqingAoeDefense:faces};
}
