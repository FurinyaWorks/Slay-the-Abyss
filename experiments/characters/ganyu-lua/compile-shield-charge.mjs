import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {toLua} from '../../../scripts/build-lua-data.mjs';
import {paidSchemaKeys as keys,paidInteger as integer} from './compile-paid.mjs';
const top=['id','name','candidate_name','role','rarity','target','base','upgrade','source_ref','review','exhaust','retain','production_enabled'];
function pair(a){if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==2)throw Error('two effects required');for(const k of Reflect.ownKeys(a)){const d=Object.getOwnPropertyDescriptor(a,k);if(!['0','1','length'].includes(k)||!('value'in d))throw Error('invalid pair properties');}if(!Object.hasOwn(a,'0')||!Object.hasOwn(a,'1'))throw Error('dense pair required');}
export function compileShieldCharge(c){
 keys(c,top);if(!['ganyu-09','ganyu-36','ganyu-56'].includes(c.id)||c.target!=='self'||c.production_enabled||c.review?.human_approved)throw Error('unsupported defensive storm');
 const exhaust=false;const retain=c.id==='ganyu-56';for(const f of ['exhaust','retain'])if(c[f]!==undefined&&typeof c[f]!=='boolean')throw Error('invalid lifecycle');if((c.exhaust===true)!==exhaust||(c.retain===true)!==retain)throw Error('lifecycle mismatch');
 const variant=v=>{keys(v,['cost','effects']);integer(v.cost);pair(v.effects);const[b,r]=v.effects;keys(b,['op','amount']);keys(r,['op','amount']);if(b.op!=='block'||r.op!=='charge')throw Error('ordered block then charge required');integer(b.amount);integer(r.amount);return{cost:v.cost,effects:[{op:'block',value:b.amount},{op:'ganyuCard',kind:'charge',amount:r.amount}]};};
 const base=variant(c.base),upgrade=variant(c.upgrade);const text=v=>`获得${v.effects[0].value}点格挡。随后获得${v.effects[1].amount}层蓄力（上限2）。${retain?'保留。':''}`;
 return{id:'ganyu_lab_'+c.id.slice(-2),name:c.name,type:'skill',target:'SELF',rarity:c.rarity,...base,upgrade,text:text(base),upgradeText:text(upgrade),exhaust,selfRetain:retain,experimental:true,ganyuCandidate:true,productionEnabled:false,reviewStatus:'HOLD'};
}
export function build(){const raw=readFileSync(new URL('./source-candidates.json',import.meta.url));const source=JSON.parse(raw);const out={cards:['ganyu-09','ganyu-36','ganyu-56'].map(id=>compileShieldCharge(source.cards.find(c=>c.id===id))),sourceSHA256:createHash('sha256').update(raw).digest('hex'),hostAcceptance:'NOT_YET_VERIFIED',productionEnabled:false};writeFileSync(new URL('./shield-charge-definitions.lua',import.meta.url),'-- Isolated shield/charge compound candidates; not registered.\nreturn '+toLua(out)+'\n');return out;}
if(process.argv[1]?.endsWith('/compile-shield-charge.mjs'))build();
