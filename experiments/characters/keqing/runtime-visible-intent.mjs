import{cards}from'./mechanics.mjs';
const exact=(o,ks)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));const n=v=>Number.isSafeInteger(v)&&v>=0&&v<=999;
export function visibleIntentProbe(id,{definitions=cards}={}){
 if(!['KQ041','KQ058'].includes(id))throw Error('unsupported intent id');const c=definitions[id];if(!exact(c,['rarity','channel','candidateName','role','type','cost','effects'])||c.type!=='attack'||c.cost!==1||!exact(c.effects,['base','upgraded']))throw Error('unsupported intent card');
 const p={};for(const key of ['base','upgraded']){const a=c.effects[key],op=id==='KQ041'?'attackingBlock':'idleExtra',field=id==='KQ041'?'amount':'damage';if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==2||Reflect.ownKeys(a).length!==3||!Object.hasOwn(a,'0')||!Object.hasOwn(a,'1')||!exact(a[0],['op','damage','hits','target'])||a[0].op!=='damage'||a[0].hits!==1||a[0].target!=='one'||!n(a[0].damage)||!exact(a[1],['op',field])||a[1].op!==op||!n(a[1][field]))throw Error('unsupported intent effect');p[key]={first:a[0].damage,conditional:a[1][field]};}
 return{id,name:'待命名·'+id,type:'attack',target:'ENEMY',cost:1,rarity:'special',color:'colorless',effects:[],upgrade:{effects:[]},keqingProbe:{status:'HOLD',releaseEligible:false},keqingVisibleIntent:p};
}
