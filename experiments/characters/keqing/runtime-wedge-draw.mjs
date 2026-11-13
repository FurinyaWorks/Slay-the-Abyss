import{cards}from'./mechanics.mjs';
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
export function wedgeDrawProbe({definitions=cards}={}){
 const c=definitions.KQ031;if(!exact(c,['rarity','channel','candidateName','role','type','cost','effects','exhaust'])||c.type!=='skill'||c.cost!==1||c.exhaust!==true||!exact(c.effects,['base','upgraded']))throw Error('unsupported wedge draw card');
 const faces={};for(const key of ['base','upgraded']){
  const a=c.effects[key];if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==1||Reflect.ownKeys(a).length!==2||!Object.hasOwn(a,'0')||!exact(a[0],['op','amount','wedgeAmount'])||a[0].op!=='draw'||![a[0].amount,a[0].wedgeAmount].every(n=>Number.isSafeInteger(n)&&n>=1&&n<=3))throw Error('unsupported wedge draw effect');
  faces[key]={amount:a[0].amount,wedgeAmount:a[0].wedgeAmount};
 }
 return{id:'KQ031',name:'待命名·KQ031',type:'skill',cost:1,exhaust:true,rarity:'special',color:'colorless',effects:[],upgrade:{effects:[]},keqingProbe:{status:'HOLD',releaseEligible:false},keqingWedgeDraw:faces};
}
