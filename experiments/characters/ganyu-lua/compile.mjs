import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {toLua} from '../../../scripts/build-lua-data.mjs';
const types={'ganyu-01':'attack','ganyu-02':'skill','ganyu-22':'attack','ganyu-24':'skill','ganyu-04':'attack','ganyu-08':'skill','ganyu-21':'attack','ganyu-55':'skill'};
export function compileCard(card){
 const keys=['id','name','candidate_name','role','rarity','target','base','upgrade','source_ref','review','exhaust','retain','production_enabled'];
 if(!card||Object.keys(card).some(k=>!keys.includes(k)))throw Error('unsupported card field');
 if(!Object.hasOwn(types,card.id))throw Error('unsupported candidate: '+card.id);
 if(card.exhaust!==undefined&&typeof card.exhaust!=='boolean')throw Error('invalid exhaust');
 if(!['enemy','self'].includes(card.target))throw Error('unsupported target');
 if(card.retain||card.production_enabled||card.review?.human_approved)throw Error('not an isolated compatible candidate');
 const effects=v=>v.effects.map(e=>{if(!['damage','block','draw','aoe'].includes(e.op)||Object.keys(e).some(k=>!['op','amount'].includes(k))||!Number.isSafeInteger(e.amount)||e.amount<0||e.amount>2147483647)throw Error('unsupported effect');return {op:e.op==='aoe'?'damageAll':e.op,value:e.amount};});
 const variant=v=>{if(!v||Object.keys(v).some(k=>!['cost','effects'].includes(k)))throw Error('unsupported variant field');if(!Number.isSafeInteger(v.cost)||v.cost<0||v.cost>2147483647)throw Error('invalid cost');return {cost:v.cost,effects:effects(v)};};
 const text=v=>v.effects.map(e=>({damage:`造成${e.amount}点伤害。`,aoe:`对所有敌人造成${e.amount}点伤害。`,block:`获得${e.amount}点格挡。`,draw:`抽${e.amount}张牌。`}[e.op])).join('')+(card.exhaust?'消耗。':'');
 return {text:text(card.base),upgradeText:text(card.upgrade),id:'ganyu_lab_'+card.id.slice(-2),name:card.name,type:types[card.id],rarity:card.rarity,target:card.target==='enemy'?'ENEMY':card.base.effects.some(e=>e.op==='aoe')?'ALL_ENEMY':'SELF',...variant(card.base),upgrade:variant(card.upgrade),exhaust:card.exhaust===true,sourceCandidate:card.id,reviewStatus:'HOLD',productionEnabled:false};
}
export function build(){const raw=readFileSync(new URL('./source-candidates.json',import.meta.url));const source=JSON.parse(raw);const mapped=source.cards.filter(c=>Object.hasOwn(types,c.id)).map(compileCard);
 const result={sourceVersion:source.version,sourceSHA256:createHash('sha256').update(raw).digest('hex'),develop:'903bf2a31e91f10fb24763ab4cea23d586d0bb83',cards:mapped,unmapped:source.cards.filter(c=>!Object.hasOwn(types,c.id)).map(c=>c.id),productionEnabled:false};
 writeFileSync(new URL('./definitions.lua',import.meta.url),'-- Generated isolated definitions; no registration.\nreturn '+toLua(result)+'\n');return result;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify({mapped:build().cards.length}));
