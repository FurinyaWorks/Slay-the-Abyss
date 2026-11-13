import{cards}from'./mechanics.mjs';
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const n=x=>Number.isSafeInteger(x)&&x>=0&&x<=999;
export function infusionExchangeProbe(id,{definitions=cards}={}){
 if(!['KQ021','KQ022'].includes(id))throw Error('unsupported infusion id');const c=definitions[id];
 if(!exact(c,['rarity','channel','candidateName','role','type','cost','effects','exhaust'])||c.type!=='skill'||c.cost!==(id==='KQ021'?0:2)||c.exhaust!==true||!exact(c.effects,['base','upgraded']))throw Error('unsupported infusion card');
 const faces={};for(const key of ['base','upgraded']){
  const a=c.effects[key],length=id==='KQ021'?1:2;
  if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==length||Reflect.ownKeys(a).length!==length+1||Object.keys(a).length!==length||Object.keys(a).some((k,i)=>k!==String(i)))throw Error('unsupported infusion array');
  if(id==='KQ021'){
   if(!exact(a[0],['op','amount'])||a[0].op!=='cashInfusion'||!n(a[0].amount))throw Error('unsupported cash infusion');faces[key]={amount:a[0].amount};
  }else{
   if(!exact(a[0],['op','attacks'])||a[0].op!=='grantInfusion'||a[0].attacks!==1||!exact(a[1],['op','amount'])||a[1].op!=='block'||!n(a[1].amount))throw Error('unsupported infusion grant');faces[key]={amount:a[1].amount};
  }
 }
 return{id,name:'待命名·'+id,type:'skill',cost:c.cost,exhaust:true,rarity:'special',color:'colorless',effects:[],upgrade:{effects:[]},keqingProbe:{status:'HOLD',releaseEligible:false},keqingInfusion:faces};
}
