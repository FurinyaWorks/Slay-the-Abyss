// Isolated shot lifecycle variants, not admitted by the public03/06 host.
import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {toLua} from '../../../scripts/build-lua-data.mjs';
const top=['id','name','candidate_name','role','rarity','target','base','upgrade','source_ref','review','exhaust','retain','production_enabled'];
const ownData=(o,allowed)=>{for(const k of Reflect.ownKeys(o)){const d=Object.getOwnPropertyDescriptor(o,k);if(typeof k!=='string'||!allowed.includes(k)||!('value' in d))throw Error('unsupported paid schema');}};
const keys=(o,allowed)=>{if(!o||Array.isArray(o)||typeof o!=='object'||Object.getPrototypeOf(o)!==Object.prototype)throw Error('unsupported paid schema');ownData(o,allowed);};
const effectsArray=a=>{if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype)throw Error('single effect required');ownData(a,['0','length']);if(a.length!==1||!Object.hasOwn(a,'0'))throw Error('single effect required');};
const integer=n=>{if(!Number.isSafeInteger(n)||n<0||n>2147483647)throw Error('invalid paid integer');return n;};
export function compileShotLifecycle(c){
 keys(c,top);if(!['ganyu-27','ganyu-51'].includes(c.id))throw Error('unsupported paid candidate');
 if(c.production_enabled||c.review?.human_approved)throw Error('unapproved integration status');
 const exhaust=c.id==='ganyu-51';for(const flag of ['exhaust','retain'])if(c[flag]!==undefined&&typeof c[flag]!=='boolean')throw Error('invalid lifecycle');if((c.exhaust===true)!==exhaust||(c.retain===true)===exhaust)throw Error('lifecycle mismatch');
 const shot=true;if(c.target!==(shot?'enemy':'self'))throw Error('paid target mismatch');
 const variant=v=>{keys(v,['cost','effects']);integer(v.cost);effectsArray(v.effects);const e=v.effects[0];
  keys(e,shot?['op','direct','bloom']:['op','amount']);if(e.op!==(shot?'charged_shot':'charge'))throw Error('paid effect mismatch');
  return {cost:v.cost,effects:[shot?{op:'ganyuCard',kind:'chargedShot',direct:integer(e.direct),bloom:integer(e.bloom)}:{op:'ganyuCard',kind:'charge',amount:integer(e.amount)}]};};
 const base=variant(c.base),upgrade=variant(c.upgrade);
 const text=v=>shot?`造成${v.effects[0].direct}点伤害。若蓄力为2，消耗全部蓄力，随后对所有敌人造成${v.effects[0].bloom}点伤害。`:`获得${v.effects[0].amount}层蓄力（上限2）。`;
 return {id:'ganyu_lab_'+c.id.slice(-2),name:c.name,type:shot?'attack':'skill',target:shot?'ENEMY':'SELF',rarity:c.rarity,...base,upgrade,text:text(base)+(exhaust?'消耗。':'保留。'),upgradeText:text(upgrade)+(exhaust?'消耗。':'保留。'),exhaust,selfRetain:!exhaust,experimental:true,ganyuCandidate:true,productionEnabled:false,reviewStatus:'HOLD'};
}
export function buildShotLifecycle(){const raw=readFileSync(new URL('./source-candidates.json',import.meta.url));const source=JSON.parse(raw);const cards=['ganyu-27','ganyu-51'].map(id=>compileShotLifecycle(source.cards.find(c=>c.id===id)));const out={cards,sourceSHA256:createHash('sha256').update(raw).digest('hex'),hostAcceptance:'NOT_YET_VERIFIED',productionEnabled:false};writeFileSync(new URL('./shot-lifecycle-definitions.lua',import.meta.url),'-- Generated isolated shot lifecycle variants; not registered.\nreturn '+toLua(out)+'\n');return out;}
if(process.argv[1]?.endsWith('/compile-shot-lifecycle.mjs'))buildShotLifecycle();
