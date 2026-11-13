import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {toLua} from '../../../scripts/build-lua-data.mjs';
import {paidSchemaKeys as keys,paidEffectsArray as array,paidInteger as integer} from './compile-paid.mjs';
const specs={'ganyu-10':['draw',null,false],'ganyu-25':['discard',null,true],'ganyu-39':['draw','storm',true],'ganyu-48':['draw','charge',true]};
export function compileRetrieval(c){
 keys(c,['id','name','candidate_name','role','rarity','target','base','upgrade','source_ref','review','exhaust','retain','production_enabled']);
 const spec=Object.hasOwn(specs,c.id)&&specs[c.id];if(!spec||c.target!=='self'||c.production_enabled||c.review?.human_approved)throw Error('unsupported retrieval candidate');
 if(c.exhaust!==undefined&&typeof c.exhaust!=='boolean'||(c.exhaust===true)!==spec[2]||c.retain!==undefined&&c.retain!==false)throw Error('retrieval lifecycle mismatch');
 const variant=v=>{keys(v,['cost','effects']);integer(v.cost);array(v.effects);const e=v.effects[0];
  if(spec[1]){keys(e,['op','effect_op']);if(e.op!=='seek_effect'||e.effect_op!==spec[1])throw Error('retrieval selector mismatch');}
  else{keys(e,['op','card_id','zone']);if(e.op!=='seek_card'||e.card_id!=='ganyu-03'||(e.zone??'draw')!==spec[0])throw Error('retrieval source mismatch');}
  return {cost:v.cost,effects:[{op:'ganyuRetrieve',zone:spec[0],...(spec[1]?{selector:spec[1]}:{})}]};};
 const base=variant(c.base),upgrade=variant(c.upgrade);const target=spec[1]==='storm'?'直接建立冰雨的牌':spec[1]==='charge'?'直接获得蓄力的牌':'ganyu-03';
 const text=`将${spec[0]==='draw'?'抽牌堆':'弃牌堆'}中第一张${target}移入手牌。保留升级状态；手牌已满则不移动。${spec[2]?'消耗。':''}`;
 return {id:'ganyu_lab_'+c.id.slice(-2),name:c.name,type:'skill',target:'SELF',rarity:c.rarity,...base,upgrade,text,upgradeText:text,exhaust:spec[2],experimental:true,ganyuCandidate:true,productionEnabled:false,reviewStatus:'HOLD'};
}
export function buildRetrieval(){const raw=readFileSync(new URL('./source-candidates.json',import.meta.url));const source=JSON.parse(raw);const out={cards:Object.keys(specs).map(id=>compileRetrieval(source.cards.find(c=>c.id===id))),sourceSHA256:createHash('sha256').update(raw).digest('hex'),hostAcceptance:'NOT_YET_VERIFIED',productionEnabled:false};writeFileSync(new URL('./retrieval-definitions.lua',import.meta.url),'-- Generated isolated retrieval candidates; not registered.\nreturn '+toLua(out)+'\n');return out;}
if(process.argv[1]?.endsWith('/compile-retrieval.mjs'))buildRetrieval();
