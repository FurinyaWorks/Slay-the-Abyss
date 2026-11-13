// Candidate source order/rarity projection, not enabled game content.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {toLua} from '../../../scripts/build-lua-data.mjs';
const raw=readFileSync(new URL('./source-candidates.json',import.meta.url));
const source=JSON.parse(raw);const reward={common:[],uncommon:[],rare:[]};const seen=new Set();const basic=[];
for(const c of source.cards){
 if(!/^ganyu-\d\d$/.test(c.id)||seen.has(c.id))throw Error('duplicate/invalid candidate identity');seen.add(c.id);
 const id='ganyu_lab_'+c.id.slice(-2);
 if(c.rarity==='basic')basic.push(id);else {if(!reward[c.rarity])throw Error('unsupported rarity');reward[c.rarity].push(id);}
}
if(seen.size!==75||basic.length!==2)throw Error('unexpected candidate inventory');
const out={reward,basic,sourceSHA256:createHash('sha256').update(raw).digest('hex'),productionEnabled:false,approval:'HOLD'};
writeFileSync(new URL('./reward-pool.lua',import.meta.url),'-- Generated complete candidate pools, NOT registered. Never filter by implementation.\nreturn '+toLua(out)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(reward).map(([k,v])=>[k,v.length]))));
