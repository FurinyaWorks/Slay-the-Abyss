import{cards}from'./mechanics.mjs';
const exact=(o,k)=>o&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
export function skillDrawProbe({definitions=cards}={}){
 const c=definitions.KQ049;if(!exact(c,['rarity','channel','candidateName','role','type','cost','effects'])||c.type!=='skill'||c.cost!==1||!exact(c.effects,['base','upgraded']))throw Error('unsupported skill draw contract');
 const f={};for(const k of['base','upgraded']){const a=c.effects[k];if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==1||Reflect.ownKeys(a).length!==2||!Object.hasOwn(a,0)||!exact(a[0],['op','amount','skillBlock'])||a[0].op!=='draw'||a[0].amount!==1||!Number.isSafeInteger(a[0].skillBlock)||a[0].skillBlock<0||a[0].skillBlock>999)throw Error('unsupported skill draw effects');f[k]=[{op:'escapePlan',value:a[0].skillBlock}];}
 return{id:'KQ049',name:'待命名·KQ049',type:'skill',target:'SELF',cost:1,experimental:true,rarity:'special',color:'colorless',effects:f.base,upgrade:{effects:f.upgraded},keqingProbe:{status:'HOLD',releaseEligible:false,nativeMapping:'escapePlan'}};
}
