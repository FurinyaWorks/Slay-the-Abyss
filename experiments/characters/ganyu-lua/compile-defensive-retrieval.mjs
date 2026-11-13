import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {toLua} from '../../../scripts/build-lua-data.mjs';
import {paidSchemaKeys as keys,paidInteger as integer} from './compile-paid.mjs';
const top=['id','name','candidate_name','role','rarity','target','base','upgrade','source_ref','review','exhaust','retain','production_enabled'];
function pair(a){
 if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==2)throw Error('two effects required');
 for(const k of Reflect.ownKeys(a)){const d=Object.getOwnPropertyDescriptor(a,k);if(!['0','1','length'].includes(k)||!('value'in d))throw Error('invalid effects properties');}
 if(!Object.hasOwn(a,'0')||!Object.hasOwn(a,'1'))throw Error('dense effects required');
}
export function compileDefensiveRetrieval(c){
 keys(c,top);if(!['ganyu-47','ganyu-68'].includes(c.id)||c.target!=='self'||c.production_enabled||c.review?.human_approved)throw Error('unsupported defensive retrieval');
 const exhaust=c.id==='ganyu-47';
 for(const f of ['exhaust','retain'])if(c[f]!==undefined&&typeof c[f]!=='boolean')throw Error('invalid lifecycle');
 if((c.exhaust===true)!==exhaust||(c.retain===true)===exhaust)throw Error('lifecycle mismatch');
 const variant=v=>{keys(v,['cost','effects']);integer(v.cost);pair(v.effects);const [b,r]=v.effects;keys(b,['op','amount']);if(b.op!=='block')throw Error('block first required');integer(b.amount);
 if(exhaust){keys(r,['op','effect_op']);if(r.op!=='seek_effect'||r.effect_op!=='block')throw Error('direct block selector required');}
 else{keys(r,['op','card_id','zone']);if(r.op!=='seek_card'||r.card_id!=='ganyu-03'||(r.zone??'draw')!=='draw')throw Error('arrow in draw required');}
 return {cost:v.cost,effects:[{op:'block',value:b.amount},{op:'ganyuRetrieve',zone:'draw',...(exhaust?{selector:'block'}:{})}]};};
 const base=variant(c.base),upgrade=variant(c.upgrade);
 const text=v=>`获得${v.effects[0].value}点格挡。将抽牌堆中第一张${exhaust?'直接获得格挡的牌':'ganyu-03'}移入手牌；保留升级状态。手牌已满或无匹配则不移动。${exhaust?'消耗。':'保留。'}`;
 return {id:'ganyu_lab_'+c.id.slice(-2),name:c.name,type:'skill',target:'SELF',rarity:c.rarity,...base,upgrade,text:text(base),upgradeText:text(upgrade),exhaust,selfRetain:!exhaust,experimental:true,ganyuCandidate:true,productionEnabled:false,reviewStatus:'HOLD'};
}
export function build(){const raw=readFileSync(new URL('./source-candidates.json',import.meta.url));const source=JSON.parse(raw);const out={cards:['ganyu-47','ganyu-68'].map(id=>compileDefensiveRetrieval(source.cards.find(c=>c.id===id))),sourceSHA256:createHash('sha256').update(raw).digest('hex'),hostAcceptance:'NOT_YET_VERIFIED',productionEnabled:false};writeFileSync(new URL('./defensive-retrieval-definitions.lua',import.meta.url),'-- Isolated compound candidates; not registered.\nreturn '+toLua(out)+'\n');return out;}
if(process.argv[1]?.endsWith('/compile-defensive-retrieval.mjs'))build();
