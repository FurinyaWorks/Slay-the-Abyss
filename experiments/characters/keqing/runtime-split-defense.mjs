import{cards}from'./mechanics.mjs';
const exact=(o,k)=>o&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
export function splitDefenseProbe({definitions=cards}={}){
 const c=definitions.KQ039;if(!exact(c,['rarity','channel','candidateName','role','type','cost','effects'])||c.type!=='skill'||c.cost!==1||!exact(c.effects,['base','upgraded']))throw Error('unsupported split defense contract');
 const f={};for(const k of['base','upgraded']){const a=c.effects[k];if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==2||Reflect.ownKeys(a).length!==3||!Object.hasOwn(a,0)||!Object.hasOwn(a,1))throw Error('unsupported split defense list');f[k]=a.map((e,i)=>{if(!exact(e,['op','amount'])||e.op!==(i?'nextBlock':'block')||!Number.isSafeInteger(e.amount)||e.amount<0||e.amount>999)throw Error('unsupported split defense effect');return{op:e.op,value:e.amount};});}
 return{id:'KQ039',name:'待命名·KQ039',type:'skill',target:'SELF',cost:1,experimental:true,rarity:'special',color:'colorless',effects:f.base,upgrade:{effects:f.upgraded},keqingProbe:{status:'HOLD',releaseEligible:false,nativeMapping:'nextBlock'}};
}
