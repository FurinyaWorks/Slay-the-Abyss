// Read-only diagnostics for trusted, local candidate modules. No production approval.
import {readFileSync,readdirSync,realpathSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const loadedRoots = new Set();
const hash = s => createHash('sha256').update(s).digest('hex');
const git = (root,args) => execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
export function accessReport(ids,starter,reward) {
  if(!Array.isArray(ids)||!ids.length||ids.some(x=>typeof x!=='string'||!x)||new Set(ids).size!==ids.length)throw Error('invalid catalog IDs');
  if(!Array.isArray(starter)||!Array.isArray(reward))throw Error('invalid channel');
  const unknown=[...new Set([...starter,...reward].filter(id=>!ids.includes(id)))];
  return {defined:ids.length,starter:[...new Set(starter)],declaredReward:[...new Set(reward)],unknown,
    uncovered:ids.filter(id=>!starter.includes(id)&&!reward.includes(id)),
    scope:'Only the named local entry path; not global impossibility or natural acquisition probability.'};
}
export function textReport(ids,render) {
  return ids.map(id=>{
    const errors=[],texts={};
    for(const [name,flag] of [['base',false],['upgraded',true]]) {
      try {texts[name]=render(id,flag);if(typeof texts[name]!=='string'||!texts[name].trim())errors.push(name+': empty/non-string');}
      catch(e){errors.push(name+': '+e.message);}
    }
    const acceptedInvalidFlags=[];
    for(const flag of ['false',1,null]){try{render(id,flag);acceptedInvalidFlags.push(flag);}catch{}}
    return {id,texts,errors,acceptedInvalidFlags};
  });
}
// Narrow adapter contract: do not evaluate source code to extract a private pool.
// Any change away from a plain quoted-ID list fails closed and requires adapter review.
export function literalPool(source,name) {
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))throw Error('invalid pool name');
  const pattern='^\\s*(?:export\\s+)?const\\s+'+name+'\\s*=\\s*Object\\.freeze\\(\\[([^\\]]*)\\]\\)';
  const matches=[...source.matchAll(new RegExp(pattern,'gm'))];
  const stripped=source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
  const clean=[...stripped.matchAll(new RegExp(pattern,'gm'))];
  if(matches.length!==1||clean.length!==1||matches[0][1]!==clean[0][1])throw Error('unsupported or ambiguous pool declaration '+name);
  const body=matches[0][1].trim();
  if(!body)return [];
  const tokens=body.split(',').map(t=>t.trim());if(tokens.at(-1)==='')tokens.pop();
  return tokens.map(t=>{const m=t.match(/^(['"])([A-Za-z0-9_-]+)\1$/);if(!m)throw Error('unsupported pool literals');return m[2];});
}
export function snapshot(root,dir){
 const files=readdirSync(dir).filter(f=>f.endsWith('.mjs')||['cards.json','relic.json','sources.json'].includes(f)).sort();
 return {head:git(root,['rev-parse','HEAD']),dirty:git(root,['status','--porcelain','--untracked-files=all']),
   files:Object.fromEntries(files.map(f=>[f,hash(readFileSync(join(dir,f)))]))};
}
async function adapter(character,dir) {
 const mod=f=>import(pathToFileURL(join(dir,f)).href);
 const read=f=>readFileSync(join(dir,f),'utf8');
 if(character==='ganyu'){
  const m=await mod('engine.mjs'),v=await mod('validate.mjs');
  return {ids:m.catalogue.cards.map(c=>c.id),starter:m.catalogue.starting_deck,reward:[],
   channel:'play.mjs default starter-only terminal battle; custom-deck research harness excluded',
   text:m.cardText,relic:{id:m.starterRelic.id,text:m.relicText(),initiallyEquipped:m.initial().relics.includes(m.starterRelic.id),effectTriggered:'NOT_PROBED'},
   existingValidation:v.validateCandidate(m.catalogue,m.starterRelic,JSON.parse(read('sources.json')))};
 }
 if(character==='xiao'){
  const m=await mod('model.mjs'),b=await mod('battle.mjs');
  return {ids:m.catalog.cards.map(c=>c.id),starter:m.catalog.starter,reward:m.catalog.rewardCandidates,
   channel:'campaign.mjs declared rewardCandidates plus starter; no probability claim',
   text:(id,flag)=>m.cardText(m.catalog.cards.find(c=>c.id===id),flag),
   relic:{id:m.catalog.startingRelic.id,initiallyEquipped:b.newBattle().startingRelic,effectTriggered:'NOT_PROBED'},existingValidation:[]};
 }
 if(character==='zhongli'){
  const m=await mod('model.mjs'),b=await mod('battle.mjs');
  return {ids:m.cards.map(c=>c.id),starter:b.STARTER,reward:literalPool(read('journey.mjs'),'POOL'),
   channel:'journey.mjs three-room fixed POOL plus STARTER',
   text:m.textFor,relic:{id:b.RELIC.id,text:b.RELIC.description,initialJade:b.battleStart().jade,disabledInitialJade:b.battleStart({relic:false}).jade,declaredJade:b.RELIC.effect.jade,effectTriggered:'INITIALIZATION_ONLY'},existingValidation:[]};
 }
 if(character==='keqing'){
  const m=await mod('mechanics.mjs'),b=await mod('battle.mjs');
  return {ids:Object.keys(m.cards),starter:b.starterIds,reward:literalPool(read('rewards.mjs'),'rewardPool'),
   channel:'rewards.mjs declared two-offer pool plus starterIds',
   text:m.describe,relic:{id:b.starterRelic.id,text:b.describeRelic(),effectTriggered:'NOT_PROBED'},existingValidation:[]};
 }
 throw Error('unsupported character');
}
export async function audit(root,character){
 if(!['ganyu','xiao','zhongli','keqing'].includes(character))throw Error('unsupported character');
 root=realpathSync(resolve(root));const dir=join(root,'experiments','characters',character);
 const before=snapshot(root,dir);
 const base={schemaVersion:1,scope_complete:false,character,root,source:before,naming:'HOLD',balance:'HOLD',production:'HOLD',browser:'NOT_RUN',native:'NOT_RUN',
  limitations:['Imports reviewed local modules: trusted checkouts only; not an OS sandbox.','Access checks concern declared local channels, not win rate or earned rewards.','Text probe tests renderability and input types, not natural-language semantic equivalence.','Relic activation, duplicates, cancellation, upgrades acquisition and cross-battle reset need existing owner tests.']};
 if(before.dirty)return {...base,status:'DIRTY_SNAPSHOT',findings:[]};
 if(loadedRoots.has(dir))throw Error('Use a fresh process for each candidate snapshot (ESM cache).');
 loadedRoots.add(dir);
 const a=await adapter(character,dir);
 const access=accessReport(a.ids,a.starter,a.reward),text=textReport(a.ids,a.text),findings=[];
 if(access.unknown.length)findings.push({code:'UNKNOWN_CHANNEL_ID',ids:access.unknown});
 if(access.uncovered.length)findings.push({code:'ACQUISITION_UNCOVERED',ids:access.uncovered,channel:a.channel});
 for(const row of text){
  if(row.errors.length)findings.push({code:'TEXT_RENDER_ERROR',id:row.id,errors:row.errors});
  if(row.acceptedInvalidFlags.length)findings.push({code:'TEXT_ACCEPTS_INVALID_UPGRADE_TYPE',id:row.id,accepted:row.acceptedInvalidFlags});
 }
 if(a.relic.initiallyEquipped===false)findings.push({code:'RELIC_NOT_INITIALIZED',id:a.relic.id});
 if(a.relic.effectTriggered==='INITIALIZATION_ONLY'&&(a.relic.initialJade!==a.relic.declaredJade||a.relic.disabledInitialJade!==0))findings.push({code:'RELIC_INITIALIZATION_MISMATCH',detail:a.relic});
 if(a.existingValidation.length)findings.push({code:'OWNER_VALIDATOR_ERROR',errors:a.existingValidation});
 const after=snapshot(root,dir);
 if(JSON.stringify(before)!==JSON.stringify(after))return {...base,status:'SNAPSHOT_CHANGED',findings:[],after};
 return {...base,status:findings.length?'REVIEW_REQUIRED':'NO_FINDING_IN_BOUNDED_CHECK',channel:a.channel,access,text,relic:a.relic,findings};
}
export async function main(args){
 if(args.length!==2)throw Error('Usage: node audit.mjs <trusted-repo-root> <ganyu|xiao|zhongli|keqing>');
 const report=await audit(...args);console.log(JSON.stringify(report,null,2));
 return report.status==='NO_FINDING_IN_BOUNDED_CHECK'?0:report.status==='REVIEW_REQUIRED'?1:2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{process.exitCode=await main(process.argv.slice(2));}catch(e){console.error(JSON.stringify({status:'AUDIT_ERROR',error:e.message}));process.exitCode=2;}
}
