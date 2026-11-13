// Separate preparation output. No shared host is claimed to accept this definition yet.
import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {toLua} from '../../../scripts/build-lua-data.mjs';
import {paidSchemaKeys as keys,paidEffectsArray as array,paidInteger as integer} from './compile-paid.mjs';
function compileStormShape(c,id,exhaust,retain){
 keys(c,['id','name','candidate_name','role','rarity','target','base','upgrade','source_ref','review','exhaust','retain','production_enabled']);
 if(c.id!==id||c.target!=='self'||c.production_enabled||c.review?.human_approved)throw Error('unsupported storm candidate');
 for(const [flag,expected]of [['exhaust',exhaust],['retain',retain]])if(c[flag]!==undefined&&typeof c[flag]!=='boolean'||(c[flag]===true)!==expected)throw Error('storm lifecycle mismatch');
 const variant=v=>{keys(v,['cost','effects']);integer(v.cost);array(v.effects);const e=v.effects[0];keys(e,['op','amount','turns']);
  if(e.op!=='storm')throw Error('unsupported storm effect');integer(e.amount);integer(e.turns);if(e.turns===0)throw Error('invalid storm duration');
  return {cost:v.cost,effects:[{op:'ganyuStorm',amount:e.amount,turns:e.turns}]};};
 const base=variant(c.base),upgrade=variant(c.upgrade);
 const text=v=>`建立冰雨：接下来${v.effects[0].turns}次你的回合结束时，对所有敌人造成${v.effects[0].amount}点伤害。已有冰雨分别保留较高伤害和较长持续时间。`;
 return {id:'ganyu_lab_'+c.id.slice(-2),name:c.name,type:'skill',target:'SELF',rarity:c.rarity,...base,upgrade,text:text(base)+(exhaust?'消耗。':'')+(retain?'保留。':''),upgradeText:text(upgrade)+(exhaust?'消耗。':'')+(retain?'保留。':''),...(exhaust?{exhaust:true}:{}),...(retain?{selfRetain:true}:{}),experimental:true,ganyuCandidate:true,productionEnabled:false,reviewStatus:'HOLD'};
}
export function compileStorm(c){return compileStormShape(c,'ganyu-05',false,false);}
export function compileStormFamily(c){const specs={'ganyu-18':[false,false],'ganyu-31':[true,false],'ganyu-59':[false,true]};if(!Object.hasOwn(specs,c?.id))throw Error('unsupported storm family');return compileStormShape(c,c.id,...specs[c.id]);}
export function buildStorm(){const raw=readFileSync(new URL('./source-candidates.json',import.meta.url));const source=JSON.parse(raw);const out={cards:[compileStorm(source.cards.find(c=>c.id==='ganyu-05'))],sourceSHA256:createHash('sha256').update(raw).digest('hex'),hostAcceptance:'NOT_YET_VERIFIED',productionEnabled:false};writeFileSync(new URL('./storm-definitions.lua',import.meta.url),'-- Generated storm05 preparation only; not registered.\nreturn '+toLua(out)+'\n');return out;}
if(process.argv[1]?.endsWith('/compile-storm.mjs'))buildStorm();
