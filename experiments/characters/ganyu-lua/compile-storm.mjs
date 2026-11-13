// Separate preparation output. No shared host is claimed to accept this definition yet.
import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {toLua} from '../../../scripts/build-lua-data.mjs';
import {paidSchemaKeys as keys,paidEffectsArray as array,paidInteger as integer} from './compile-paid.mjs';
export function compileStorm(c){
 keys(c,['id','name','candidate_name','role','rarity','target','base','upgrade','source_ref','review','exhaust','retain','production_enabled']);
 if(c.id!=='ganyu-05'||c.target!=='self'||c.production_enabled||c.review?.human_approved)throw Error('unsupported storm candidate');
 for(const flag of ['exhaust','retain'])if(c[flag]!==undefined&&c[flag]!==false)throw Error('unmapped storm flag');
 const variant=v=>{keys(v,['cost','effects']);integer(v.cost);array(v.effects);const e=v.effects[0];keys(e,['op','amount','turns']);
  if(e.op!=='storm')throw Error('unsupported storm effect');integer(e.amount);integer(e.turns);if(e.turns===0)throw Error('invalid storm duration');
  return {cost:v.cost,effects:[{op:'ganyuStorm',amount:e.amount,turns:e.turns}]};};
 const base=variant(c.base),upgrade=variant(c.upgrade);
 const text=v=>`建立冰雨：接下来${v.effects[0].turns}次你的回合结束时，对所有敌人造成${v.effects[0].amount}点伤害。已有冰雨分别保留较高伤害和较长持续时间。`;
 return {id:'ganyu_lab_05',name:c.name,type:'skill',target:'SELF',rarity:c.rarity,...base,upgrade,text:text(base),upgradeText:text(upgrade),experimental:true,ganyuCandidate:true,productionEnabled:false,reviewStatus:'HOLD'};
}
export function buildStorm(){const raw=readFileSync(new URL('./source-candidates.json',import.meta.url));const source=JSON.parse(raw);const out={cards:[compileStorm(source.cards.find(c=>c.id==='ganyu-05'))],sourceSHA256:createHash('sha256').update(raw).digest('hex'),hostAcceptance:'NOT_YET_VERIFIED',productionEnabled:false};writeFileSync(new URL('./storm-definitions.lua',import.meta.url),'-- Generated storm05 preparation only; not registered.\nreturn '+toLua(out)+'\n');return out;}
if(process.argv[1]?.endsWith('/compile-storm.mjs'))buildStorm();
