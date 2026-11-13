// Source-bound definitions for independently reviewed isolated conditional ABI only.
import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {toLua} from '../../../scripts/build-lua-data.mjs';
import {paidSchemaKeys as keys,paidEffectsArray as array,paidInteger as integer} from './compile-paid.mjs';
const specs={
 'ganyu-34':['charged_direct','chargedDirect','enemy','attack'],
 'ganyu-38':['charged_block','chargedBlock','self','skill'],
 'ganyu-40':['charged_aoe','chargedAoe','self','attack'],
 'ganyu-74':['spend_one_block','spendOneBlock','self','skill'],
};
export function compileConditionalLifecycle(c){
 keys(c,['id','name','candidate_name','role','rarity','target','base','upgrade','source_ref','review','exhaust','retain','production_enabled']);
 const spec=Object.hasOwn(specs,c.id)&&specs[c.id];if(!spec||c.target!==spec[2]||c.production_enabled||c.review?.human_approved)throw Error('unsupported conditional candidate');
 const exhaust=['ganyu-34','ganyu-38'].includes(c.id);for(const flag of ['exhaust','retain'])if(c[flag]!==undefined&&typeof c[flag]!=='boolean')throw Error('invalid lifecycle');if((c.exhaust===true)!==exhaust||(c.retain===true)===exhaust)throw Error('lifecycle mismatch');
 const variant=v=>{keys(v,['cost','effects']);integer(v.cost);array(v.effects);const e=v.effects[0];const field=spec[0]==='charged_direct'?'direct':'amount';keys(e,['op',field,'bonus']);
  if(e.op!==spec[0])throw Error('conditional source mismatch');integer(e[field]);integer(e.bonus);integer(e[field]+e.bonus);
  return {cost:v.cost,effects:[{op:'ganyuConditional',kind:spec[1],amount:e[field],bonus:e.bonus}]};};
 const base=variant(c.base),upgrade=variant(c.upgrade);
 const text=v=>{const e=v.effects[0];const action=spec[3]==='skill'?'获得格挡':'造成伤害';const target=spec[0]==='charged_aoe'?'（所有敌人）':'';
 const condition=spec[0].startsWith('spend_one')?'若至少有1层蓄力，消耗1层':spec[0]==='full_charge_damage'?'若蓄力为2，不消耗蓄力':spec[0]==='storm_block'?'若冰雨存在，不消耗冰雨或蓄力':'若蓄力为2，消耗全部蓄力';
 return `${action}${e.amount}点${target}。${condition}，本次改为${e.amount+e.bonus}点。${exhaust?'消耗。':'保留。'}`;};
 return {id:'ganyu_lab_'+c.id.slice(-2),name:c.name,type:spec[3],target:c.target==='enemy'?'ENEMY':'SELF',rarity:c.rarity,...base,upgrade,text:text(base),upgradeText:text(upgrade),exhaust,selfRetain:!exhaust,experimental:true,ganyuCandidate:true,productionEnabled:false,reviewStatus:'HOLD'};
}
export function buildConditionalLifecycle(){const raw=readFileSync(new URL('./source-candidates.json',import.meta.url));const source=JSON.parse(raw);const out={cards:Object.keys(specs).map(id=>compileConditionalLifecycle(source.cards.find(c=>c.id===id))),sourceSHA256:createHash('sha256').update(raw).digest('hex'),hostAcceptance:'NOT_YET_VERIFIED',productionEnabled:false};writeFileSync(new URL('./conditional-lifecycle-definitions.lua',import.meta.url),'-- Generated isolated conditional candidates; not registered.\nreturn '+toLua(out)+'\n');return out;}
if(process.argv[1]?.endsWith('/compile-conditional-lifecycle.mjs'))buildConditionalLifecycle();
