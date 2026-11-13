import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {toLua} from '../../../scripts/build-lua-data.mjs';
import {paidSchemaKeys as keys,paidEffectsArray as array,paidInteger as integer} from './compile-paid.mjs';
const specs={'ganyu-30':['charged_draw','chargedDraw',false],'ganyu-33':['storm_draw','stormDraw',true],'ganyu-43':['spend_one_draw','spendOneDraw',true]};
export function compileDraw(c){
 keys(c,['id','name','candidate_name','role','rarity','target','base','upgrade','source_ref','review','exhaust','retain','production_enabled']);
 const spec=Object.hasOwn(specs,c.id)&&specs[c.id];if(!spec||c.target!=='self'||c.production_enabled||c.review?.human_approved)throw Error('unsupported draw candidate');
 if(c.exhaust!==undefined&&typeof c.exhaust!=='boolean'||(c.exhaust===true)!==spec[2]||c.retain!==undefined&&c.retain!==false)throw Error('draw lifecycle mismatch');
 const variant=v=>{keys(v,['cost','effects']);integer(v.cost);array(v.effects);const e=v.effects[0];keys(e,['op','amount','bonus']);if(e.op!==spec[0])throw Error('draw source mismatch');integer(e.amount);integer(e.bonus);integer(e.amount+e.bonus);return {cost:v.cost,effects:[{op:'ganyuDraw',kind:spec[1],amount:e.amount,bonus:e.bonus}]};};
 const base=variant(c.base),upgrade=variant(c.upgrade);
 const text=v=>{const e=v.effects[0];const condition=spec[0]==='charged_draw'?'若蓄力为2，消耗全部蓄力':spec[0]==='spend_one_draw'?'若至少有1层蓄力，消耗1层':'若冰雨存在，不消耗冰雨或蓄力';return `抽${e.amount}张牌。${condition}，本次改为抽${e.amount+e.bonus}张牌。${spec[2]?'消耗。':''}`;};
 return {id:'ganyu_lab_'+c.id.slice(-2),name:c.name,type:'skill',target:'SELF',rarity:c.rarity,...base,upgrade,text:text(base),upgradeText:text(upgrade),exhaust:spec[2],experimental:true,ganyuCandidate:true,productionEnabled:false,reviewStatus:'HOLD'};
}
export function buildDraw(){const raw=readFileSync(new URL('./source-candidates.json',import.meta.url));const source=JSON.parse(raw);const out={cards:Object.keys(specs).map(id=>compileDraw(source.cards.find(c=>c.id===id))),sourceSHA256:createHash('sha256').update(raw).digest('hex'),hostAcceptance:'NOT_YET_VERIFIED',productionEnabled:false};writeFileSync(new URL('./draw-definitions.lua',import.meta.url),'-- Generated isolated resource draw candidates; not registered.\nreturn '+toLua(out)+'\n');return out;}
if(process.argv[1]?.endsWith('/compile-draw.mjs'))buildDraw();
