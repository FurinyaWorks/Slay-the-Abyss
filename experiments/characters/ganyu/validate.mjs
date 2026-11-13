// Mechanical candidate sanity only. It never grants naming, balance or release approval.
import { readFileSync } from 'node:fs';import { pathToFileURL } from 'node:url';
const nat=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
export function validateCandidate(data,relic,sources) {
 const errors=[];const ids=new Set();const sourceIds=new Set(sources.records.map(s=>s.card_id));
 if(data.production_enabled!==false || data.status!=='CANDIDATE')errors.push('candidate cannot claim production');
 if(data.version!==relic.version)errors.push('relic version mismatch');
 if(data.version!==sources.version)errors.push('source version mismatch');
 for(const key of ['maxCharge','energyPerTurn','initialHp','drawPerTurn','handLimit'])if(!nat(data.environment[key],1))errors.push(`invalid environment ${key}`);
 if(!Array.isArray(data.cards)||!data.cards.length||data.cards.length>75)errors.push('invalid sample size');
 for(const c of data.cards) {
  if(typeof c.id!=='string'||!c.id||ids.has(c.id))errors.push('invalid or duplicate id');ids.add(c.id);
  if(c.name!==`待命名·${c.id}` || c.review?.human_approved!==false || c.review?.status!=='HOLD')errors.push(`unreviewed display ${c.id}`);
  if(c.retain!==undefined && typeof c.retain!=='boolean')errors.push(`invalid retain ${c.id}`);
  if(c.exhaust!==undefined && typeof c.exhaust!=='boolean')errors.push(`invalid exhaust ${c.id}`);
  if(c.source_ref!==c.id || !sourceIds.has(c.id))errors.push(`missing source record ${c.id}`);
  if(!['self','enemy'].includes(c.target))errors.push(`invalid target ${c.id}`);
  for(const level of ['base','upgrade']) {
   const v=c[level];if(!v || !nat(v.cost)||!Array.isArray(v.effects)||!v.effects.length){errors.push(`invalid variant ${c.id}`);continue;}
   for(const e of v.effects) {
    const fields={damage:['amount'],aoe:['amount'],block:['amount'],charge:['amount'],draw:['amount'],seek_card:[],storm:['amount','turns'],charged_block:['amount','bonus'],charged_direct:['direct','bonus'],charged_shot:['direct','bloom']}[e.op];
    if(e.op==='seek_card' && e.zone!==undefined && !['draw','discard'].includes(e.zone))errors.push(`invalid seek zone ${c.id}`);
    if(e.op==='seek_card' && !data.cards.some(c=>c.id===e.card_id))errors.push(`unknown seek target ${c.id}`);
    if(!fields){errors.push(`unknown effect ${c.id}`);continue;}
    for(const k of fields)if(!nat(e[k],k==='turns'?1:0))errors.push(`invalid ${e.op}.${k} ${c.id}`);
    if(['damage','charged_direct','charged_shot'].includes(e.op)&&c.target!=='enemy')errors.push(`target mismatch ${c.id}`);
   }
  }
 }
 for(const id of data.starting_deck)if(!ids.has(id))errors.push(`unknown starter ${id}`);
 if(sourceIds.size!==sources.records.length || sourceIds.size!==ids.size)errors.push('source inventory mismatch');
 if(relic.human_approved!==false||relic.status!=='CANDIDATE'||relic.name!==`待命名·${relic.id}`)errors.push('relic must remain candidate');
 if(relic.effect.op!=='bank_unused_energy'||relic.effect.requires_equipped!==true||!nat(relic.effect.energy_per_charge,1))errors.push('invalid relic hook');
 return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url)));
 const errors=validateCandidate(read('cards.json'),read('relic.json'),read('sources.json'));
 console.log(JSON.stringify({mechanicalValid:!errors.length,naming:'HOLD',balance:'HOLD',release:'HOLD',errors},null,2));process.exitCode=errors.length?1:0;
}
