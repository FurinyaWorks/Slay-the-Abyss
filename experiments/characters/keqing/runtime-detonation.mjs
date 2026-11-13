import{cards}from'./mechanics.mjs';
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const n=x=>Number.isSafeInteger(x)&&x>=0&&x<=999;
export function detonationProbe(id,{definitions=cards}={}){
 if(!['KQ026','KQ028'].includes(id))throw Error('unsupported detonation id');const c=definitions[id],single=id==='KQ026';
 if(!exact(c,['rarity','channel','candidateName','role','type','cost','effects'])||c.type!=='attack'||c.cost!==(single?1:2)||!exact(c.effects,['base','upgraded']))throw Error('unsupported detonation card');
 const faces={};for(const key of ['base','upgraded']){
  const a=c.effects[key];if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==2||Reflect.ownKeys(a).length!==3||!Object.hasOwn(a,'0')||!Object.hasOwn(a,'1'))throw Error('unsupported detonation array');
  if(!exact(a[0],['op','damage','hits','target'])||a[0].op!=='damage'||!n(a[0].damage)||a[0].hits!==(single?1:2)||a[0].target!==(single?'one':'all')||!exact(a[1],single?['op','damage','target']:['op','damage'])||a[1].op!=='detonate'||!n(a[1].damage)||(single&&a[1].target!=='one'))throw Error('unsupported detonation effects');
  faces[key]={hit:a[0].damage,burst:a[1].damage};
 }
 return{id,name:'待命名·'+id,type:'attack',cost:c.cost,rarity:'special',color:'colorless',effects:[],upgrade:{effects:[]},keqingProbe:{status:'HOLD',releaseEligible:false},keqingDetonation:faces};
}
