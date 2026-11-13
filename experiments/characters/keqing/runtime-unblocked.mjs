import{cards}from'./mechanics.mjs';
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const n=v=>Number.isSafeInteger(v)&&v>=0&&v<=999;
export function unblockedProbe({definitions=cards}={}){
 const c=definitions.KQ056;if(!exact(c,['rarity','channel','candidateName','role','type','cost','effects'])||c.type!=='attack'||c.cost!==2||!exact(c.effects,['base','upgraded']))throw Error('unsupported unblocked card');
 const faces={};for(const key of ['base','upgraded']){const a=c.effects[key];if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==2||Reflect.ownKeys(a).length!==3||!Object.hasOwn(a,'0')||!Object.hasOwn(a,'1')||!exact(a[0],['op','damage','hits','target'])||a[0].op!=='damage'||a[0].hits!==1||a[0].target!=='one'||!n(a[0].damage)||!exact(a[1],['op','damage'])||a[1].op!=='unblockedExtra'||!n(a[1].damage))throw Error('unsupported unblocked effect');faces[key]={first:a[0].damage,extra:a[1].damage};}
 return{id:'KQ056',name:'待命名·KQ056',type:'attack',target:'ENEMY',cost:2,rarity:'special',color:'colorless',effects:[],upgrade:{effects:[]},keqingProbe:{status:'HOLD',releaseEligible:false},keqingUnblocked:faces};
}
