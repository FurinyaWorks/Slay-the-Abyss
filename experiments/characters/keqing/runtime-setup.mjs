import{cards}from'./mechanics.mjs';
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const n=x=>Number.isSafeInteger(x)&&x>=0&&x<=999;
export function setupProbe(id,{definitions=cards}={}){
 if(!['KQ010','KQ011','KQ013'].includes(id))throw Error('unsupported setup id');const c=definitions[id],skill=id==='KQ010';
 if(!exact(c,['rarity','channel','candidateName','role','type','cost','effects'])||c.type!==(skill?'skill':'attack')||c.cost!==(id==='KQ011'?2:1)||!exact(c.effects,['base','upgraded']))throw Error('unsupported setup card');
 const faces={};for(const key of ['base','upgraded']){
  const a=c.effects[key];if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==2||Reflect.ownKeys(a).length!==3||!Object.hasOwn(a,'0')||!Object.hasOwn(a,'1')||!exact(a[1],['op'])||a[1].op!=='setWedgeIfAbsent')throw Error('unsupported setup array');
  if(skill){if(!exact(a[0],['op','amount'])||a[0].op!=='block'||!n(a[0].amount))throw Error('unsupported setup block');faces[key]=a[0].amount;}
  else{if(!exact(a[0],['op','damage','hits','target'])||a[0].op!=='damage'||a[0].hits!==1||a[0].target!==(id==='KQ013'?'all':'one')||!n(a[0].damage))throw Error('unsupported setup attack');faces[key]=a[0].damage;}
 }
 return{id,name:'待命名·'+id,type:c.type,cost:c.cost,rarity:'special',color:'colorless',effects:[],upgrade:{effects:[]},keqingProbe:{status:'HOLD',releaseEligible:false},keqingSetup:faces};
}
