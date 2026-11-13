import {cards} from './mechanics.mjs';
// Probe-only definition conversion. Not imported by any production loader.
const plain=obj=>obj!==null&&typeof obj==='object'&&Object.getPrototypeOf(obj)===Object.prototype;
const exact=(obj,keys)=>plain(obj)&&Reflect.ownKeys(obj).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(obj,k));
const natural=n=>Number.isSafeInteger(n)&&n>=0;
function effect(e){
 if(!plain(e))throw Error('unsupported effect shape');
 if(e.op==='damage' && exact(e,['op','damage','hits','target']) && natural(e.damage)&&Number.isSafeInteger(e.hits)&&e.hits>0&&['one','all'].includes(e.target))
  return Array.from({length:e.hits},()=>({op:e.target==='all'?'damageAll':'damage',value:e.damage}));
 if(e.op==='block'&&exact(e,['op','amount'])&&natural(e.amount))return [{op:'block',value:e.amount}];
 if(e.op==='draw'&&exact(e,['op','amount'])&&natural(e.amount))return [{op:'draw',value:e.amount}];
 throw Error('unsupported runtime contract: '+e.op);
}
export function compileRuntimeProbe(id,{definitions=cards}={}){
 const c=definitions[id];
 if(!plain(c)||!['attack','skill'].includes(c.type)||!natural(c.cost)||c.cost>3)throw Error('unsupported card');
 // Reject unknown semantics rather than dropping candidate fields.
 const allowed=['rarity','channel','candidateName','role','type','cost','effects','exhaust'];
 if(Reflect.ownKeys(c).some(k=>!allowed.includes(k))||(c.exhaust!==undefined&&typeof c.exhaust!=='boolean'))throw Error('unsupported card fields');
 if(!exact(c.effects,['base','upgraded'])||[c.effects.base,c.effects.upgraded].some(a=>!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||Reflect.ownKeys(a).length!==a.length+1||Object.keys(a).length!==a.length||Object.keys(a).some((key,i)=>key!==String(i))))throw Error('unsupported effects container');
 const base=c.effects.base.flatMap(effect),up=c.effects.upgraded.flatMap(effect);
 return {id,name:'待命名·'+id,type:c.type,cost:c.cost,rarity:'special',color:'colorless',
  effects:base,upgrade:{effects:up},...(c.exhaust?{exhaust:true}:{}),
  keqingProbe:{source:id,status:'HOLD',releaseEligible:false,resourceScope:'no wedge or infusion',note:'No production acquisition or character registration'}};
}
export function runtimeSupport(){
 return Object.keys(cards).map(id=>{try{compileRuntimeProbe(id);return {id,supported:true};}catch(e){return {id,supported:false,reason:e.message};}});
}
