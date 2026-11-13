import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {toLua} from '../../../scripts/build-lua-data.mjs';
import {paidSchemaKeys as keys,paidInteger as integer} from './compile-paid.mjs';
const top=['id','name','candidate_name','role','rarity','target','base','upgrade','source_ref','review','exhaust','retain','production_enabled'];
function pair(a){if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==2)throw Error('two effects required');for(const k of Reflect.ownKeys(a)){const d=Object.getOwnPropertyDescriptor(a,k);if(!['0','1','length'].includes(k)||!('value'in d))throw Error('invalid pair properties');}if(!Object.hasOwn(a,'0')||!Object.hasOwn(a,'1'))throw Error('dense pair required');}
export function compileChargeDraw(c){
 keys(c,top);if(!['ganyu-20','ganyu-60'].includes(c.id)||c.target!=='self'||c.production_enabled||c.review?.human_approved)throw Error('unsupported defensive storm');
 const exhaust=c.id==='ganyu-60';for(const f of ['exhaust','retain'])if(c[f]!==undefined&&typeof c[f]!=='boolean')throw Error('invalid lifecycle');if((c.exhaust===true)!==exhaust||c.retain===true)throw Error('lifecycle mismatch');
 const variant=v=>{keys(v,['cost','effects']);integer(v.cost);pair(v.effects);const wanted=exhaust?['charge','draw']:['draw','charge'];const effects=v.effects.map((e,i)=>{keys(e,['op','amount']);if(e.op!==wanted[i])throw Error('ordered charge/draw required');integer(e.amount);return e.op==='charge'?{op:'ganyuCard',kind:'charge',amount:e.amount}:{op:'draw',value:e.amount};});return{cost:v.cost,effects};};
 const base=variant(c.base),upgrade=variant(c.upgrade);const text=v=>v.effects.map(e=>e.op==='draw'?`抽${e.value}张牌。`:`获得${e.amount}层蓄力（上限2）。`).join('随后')+(exhaust?'消耗。':'');
 return{id:'ganyu_lab_'+c.id.slice(-2),name:c.name,type:'skill',target:'SELF',rarity:c.rarity,...base,upgrade,text:text(base),upgradeText:text(upgrade),exhaust,experimental:true,ganyuCandidate:true,productionEnabled:false,reviewStatus:'HOLD'};
}
export function build(){const raw=readFileSync(new URL('./source-candidates.json',import.meta.url));const source=JSON.parse(raw);const out={cards:['ganyu-20','ganyu-60'].map(id=>compileChargeDraw(source.cards.find(c=>c.id===id))),sourceSHA256:createHash('sha256').update(raw).digest('hex'),hostAcceptance:'NOT_YET_VERIFIED',productionEnabled:false};writeFileSync(new URL('./charge-draw-definitions.lua',import.meta.url),'-- Isolated ordered draw/charge compound candidates; not registered.\nreturn '+toLua(out)+'\n');return out;}
if(process.argv[1]?.endsWith('/compile-charge-draw.mjs'))build();
