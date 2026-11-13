import{cards}from'./mechanics.mjs';
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const n=v=>Number.isSafeInteger(v)&&v>=0&&v<=999;
export function firstCardProbe({definitions=cards}={}){
 const c=definitions.KQ047;if(!exact(c,['rarity','channel','candidateName','role','type','cost','effects'])||c.type!=='attack'||c.cost!==1||!exact(c.effects,['base','upgraded']))throw Error('unsupported first card card');
 const faces={};for(const key of ['base','upgraded']){const a=c.effects[key];if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==2||Reflect.ownKeys(a).length!==3||!Object.hasOwn(a,'0')||!Object.hasOwn(a,'1')||!exact(a[0],['op','damage','hits','target'])||a[0].op!=='damage'||a[0].hits!==1||a[0].target!=='one'||!n(a[0].damage)||!exact(a[1],['op','amount','firstOnly'])||a[1].op!=='draw'||a[1].firstOnly!==true||a[1].amount!==1)throw Error('unsupported first card effect');faces[key]={first:a[0].damage,draw:a[1].amount};}
 return{id:'KQ047',name:'待命名·KQ047',type:'attack',target:'ENEMY',cost:1,rarity:'special',color:'colorless',effects:[],upgrade:{effects:[]},keqingProbe:{status:'HOLD',releaseEligible:false},keqingFirstCard:faces};
}
