import {sourceEpoch} from './helpers/combined-epoch/source-epoch.mjs';
import {sevenRefactorEpoch} from './helpers/seven-refactor-source-epoch.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {preClassPotionWatcherSource as prior,classPotionWatcherReader,preIntegratedCapabilitySource, classPotionWatcherSourceProof as proof,standaloneArchitectureSource} from './helpers/class-potion-watcher-source-inverse.mjs';
import {preM7FinalSource,m7FinalReader} from './helpers/m7-core-final-source-inverse.mjs';
// Authenticate the full current owner closure before entering the frozen seven-refactor epoch.
const raw=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const read=sevenRefactorEpoch.combinedReader(sourceEpoch.combinedReader(raw,'watcherFlowPrior'),'localSeven');
const {before}=JSON.parse(gunzipSync(readFileSync('tests/fixtures/class-potion-watcher-before.json.gz')));
const owners=Object.keys(proof),live=Object.fromEntries(owners.map(p=>[p,read(p)]));
const hash=s=>createHash('sha256').update(s).digest('hex');
test('all six combined owners bind actual complete sources and preserve independent frozen identities',()=>{
 assert.deepEqual(owners,['src/lua/abyss_class_potions.lua','src/lua/abyss_card_actions.lua','src/lua/abyss_combat_effect_dispatch.lua','src/lua/abyss_watcher_attack_cards.lua','src/lua/abyss_combat_queued_play.lua','config/architecture.json']);
 for(const path of owners){
  assert.equal(hash(live[path]),proof[path].afterSha256);
  assert.equal(hash(before[path]),proof[path].beforeSha256);
  for(const project of [prior,preIntegratedCapabilitySource,preM7FinalSource])for(const source of [live[path],live[path].replaceAll('\n','\r\n')])assert.equal(project(path,source,{readSource:read}),before[path]);
 }
});
test('combined reads freshly authenticate all six owners on every call and reused wrapper',()=>{
 for(const wrap of [r=>r,classPotionWatcherReader]){
  const calls=[],reader=wrap(p=>{calls.push(p);return live[p];});
  for(const path of owners)for(let repeat=0;repeat<2;repeat++){
   calls.length=0;assert.equal(prior(path,live[path],{readSource:reader}),before[path]);assert.deepEqual(calls,owners);
  }
 }
});
test('combined old, foreign, partial, duplicated and drifted inputs never authorize reads',()=>{
 for(const path of [...owners,'foreign'])for(const source of [before[path],live[path]+'\n',live[path]?.slice(1),live[path]+live[path],null,{},false,10]){
  assert.equal(prior(path,source,{readSource(){assert.fail('foreign input must not read');}}),source);
 }
});
test('every combined linked owner rejects drift, mixed epochs and missing sources after warmed projections',()=>{
 for(const project of [prior,preIntegratedCapabilitySource,preM7FinalSource])for(const path of owners)for(const owner of owners){
  const current={...live};const raw=p=>{if(!Object.hasOwn(current,p))throw Error('missing owner');return current[p];};
  const reader=project===preM7FinalSource?m7FinalReader(raw):classPotionWatcherReader(raw);
  assert.equal(project(path,live[path],{readSource:reader}),before[path]);
  for(const value of [before[owner],live[owner]+'\n',live[owner].slice(1),...(owner==='config/architecture.json'?Object.values(standaloneArchitectureSource):[])]){
   current[owner]=value;
   assert.throws(()=>project(path,live[path],{readSource:reader}),/combined linked owner identity/);
  }
  delete current[owner];assert.throws(()=>project(path,live[path],{readSource:reader}),/combined linked owner missing/);
 }
});

test('standalone config entry rejects every opposite-owner mixed epoch, drift and deletion after warmup',()=>{
 const config='config/architecture.json';
 for(const [epoch,opposite]of [['potion',owners.slice(3,5)],['watcher',owners.slice(0,3)]]){
  const historical={...live,[config]:standaloneArchitectureSource[epoch]};
  for(const owner of opposite)historical[owner]=before[owner];
  const entries=[
   raw=>source=>preIntegratedCapabilitySource(config,source,{readSource:raw}),
   raw=>{const reader=classPotionWatcherReader(raw);return source=>preIntegratedCapabilitySource(config,source,{readSource:reader});},
   raw=>source=>preM7FinalSource(config,source,{readSource:raw}),
   raw=>{const reader=m7FinalReader(raw);return source=>preM7FinalSource(config,source,{readSource:reader});},
   raw=>{const reader=classPotionWatcherReader(raw);return ()=>reader(config);},
   raw=>{const reader=m7FinalReader(raw);return ()=>reader(config);},
  ];
  for(const entry of entries)for(const owner of opposite)for(const mutation of ['after','drift','missing'])for(const crlf of [false,true]){
   const current={...historical};
   const raw=p=>{if(!Object.hasOwn(current,p))throw Error('missing owner');return current[p];};
   const project=entry(raw),source=crlf?historical[config].replaceAll('\n','\r\n'):historical[config];
   assert.equal(project(source),before[config]);
   assert.equal(project(source),before[config]);
   if(mutation==='missing')delete current[owner];
   else current[owner]=mutation==='after'?live[owner]:before[owner]+'\n';
   assert.throws(()=>project(source),mutation==='missing'?/combined linked owner missing/:/combined linked owner identity/,epoch+': '+owner+': '+mutation);
  }
  // Exact reported reproduction: both refactors' Lua owners with standalone config.
  for(const entry of entries){
   const current={...live,[config]:historical[config]};
   assert.throws(()=>entry(p=>current[p])(historical[config]),/combined linked owner identity/);
  }
 }
});

test('current-to-seven bridge authenticates the complete predecessor and every fresh raw owner',()=>{
 const target=sourceEpoch.proof.targets.watcherFlowPrior;
 assert.equal(target.commit,'7821a7f44b518c09f6b565860e04e4823bc95153');
 for(const [path,binding]of Object.entries(sevenRefactorEpoch.proof.current))
  assert.deepEqual(target.files[path],binding,'independent seven-refactor predecessor: '+path);
 const config='config/architecture.json',seen=[];let bad=null,mode=null;
 const readRaw=path=>{
  seen.push(path);
  if(path===bad){
   if(mode==='missing')return undefined;
   if(mode==='throw')throw Error('bridge raw reader sentinel');
   return raw(path)+'\n';
  }
  return raw(path);
 };
 const predecessor=sourceEpoch.combinedReader(readRaw,'watcherFlowPrior');
 const reader=sevenRefactorEpoch.combinedReader(predecessor,'localSeven');
 const currentSource=raw(config);
 assert.equal(hash(reader(config)),proof[config].afterSha256);seen.length=0;
 // Keep the entry token stable while faulting its linked config read as well.
 const check=()=>{
  const source=sourceEpoch.preCombinedSource(config,currentSource,{target:'watcherFlowPrior',readSource:readRaw});
  assert.equal(hash(sevenRefactorEpoch.preCombinedSource(config,source,{target:'localSeven',readSource:predecessor})),proof[config].afterSha256);
 };
 check();const first=[...seen];seen.length=0;check();assert.deepEqual(seen,first);
 for(const owner of sourceEpoch.proof.owners){
  assert(first.includes(owner),'fresh current owner: '+owner);
  for(mode of ['drift','missing','throw']){
   bad=owner;
   for(let repeat=0;repeat<2;repeat++)assert.throws(check,error=>{
    assert.match(error.message,/linked owner/);assert(error.message.includes(owner));
    if(mode==='throw')assert.match(error.message,/bridge raw reader sentinel/);return true;
   });
  }
  bad=null;check();
 }
});

test('current-to-seven reader preserves unknown entry values without linked-owner reads',()=>{
 const config='config/architecture.json';
 for(const input of [undefined,null,{},raw(config)+'\n-- unknown']){
  const seen=[],readRaw=path=>{seen.push(path);assert.equal(path,config);return input;};
  const reader=sevenRefactorEpoch.combinedReader(sourceEpoch.combinedReader(readRaw,'watcherFlowPrior'),'localSeven');
  assert.equal(reader(config),input);assert.deepEqual(seen,[config]);
 }
});
