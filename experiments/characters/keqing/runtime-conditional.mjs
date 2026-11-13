import{cards}from'./mechanics.mjs';
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const n=x=>Number.isSafeInteger(x)&&x>=0&&x<=999;
function check(e){
 if(exact(e,['op','amount'])&&['block','lastInfusionBlock'].includes(e.op)&&n(e.amount))return;
 if(exact(e,['op','amount','cap'])&&e.op==='blockPerEnemy'&&n(e.amount)&&Number.isSafeInteger(e.cap)&&e.cap>=1&&e.cap<=3)return;
 if(exact(e,['op','absent','present'])&&e.op==='wedgeDamage'&&n(e.absent)&&n(e.present))return;
 if(exact(e,['op','damage','hits','target'])&&e.op==='damage'&&n(e.damage)&&Number.isSafeInteger(e.hits)&&e.hits>0&&e.hits<=4&&e.target==='one')return;
 if(exact(e,['op','when','amount'])&&e.op==='conditionalBlock'&&['noInfusion','noResources','oneEnemy'].includes(e.when)&&n(e.amount))return;
 if(exact(e,['op','damage'])&&e.op==='infusedDamage'&&n(e.damage))return;
 throw Error('unsupported conditional effect');
}
export function conditionalAttackProbe(id,{definitions=cards}={}){
 if(!['KQ008','KQ018','KQ025','KQ020','KQ035','KQ036','KQ067'].includes(id))throw Error('unsupported conditional id');
 const c=definitions[id],type=['KQ035','KQ036','KQ067'].includes(id)?'skill':'attack';if(!exact(c,['rarity','channel','candidateName','role','type','cost','effects'])||c.type!==type||c.cost!==(id==='KQ025'?2:1)||!exact(c.effects,['base','upgraded']))throw Error('unsupported conditional card');
 for(const a of Object.values(c.effects)){
  if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length<1||a.length>2||Reflect.ownKeys(a).length!==a.length+1||Object.keys(a).some((k,i)=>k!==String(i))||Object.keys(a).length!==a.length)throw Error('unsupported conditional array');
  a.forEach(check);
 }
 return{id,name:'待命名·'+id,type,cost:c.cost,rarity:'special',color:'colorless',effects:[],upgrade:{effects:[]},keqingProbe:{status:'HOLD',releaseEligible:false},keqingConditional:structuredClone(c.effects)};
}

export const conditionalCardProbe=conditionalAttackProbe;
