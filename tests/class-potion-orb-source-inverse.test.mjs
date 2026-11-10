import {preEmeraldCostSource} from './helpers/map-emerald-cost-source-inverse.mjs';
import {preEmeraldMapCiSource as originalPreEmeraldMapCiSource} from './helpers/map-emerald-ci-source-inverse.mjs';
import {originalPlanningSource} from './helpers/ci-complete-calibration-source-inverse.mjs';
import {preDefectIntegrationPlanningSource} from './helpers/defect-integration-planning-source-inverse.mjs';
import {preEnemyIntegrationPlanningSource} from './helpers/enemy-integration-planning-source-inverse.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {preClassPotionOrbSource as prior,classPotionOrbReader,classPotionOrbSourceProof as proof} from './helpers/class-potion-orb-source-inverse.mjs';
import {preM7FinalSource} from './helpers/m7-core-final-source-inverse.mjs';
import {standaloneArchitectureSource} from './helpers/class-potion-watcher-source-inverse.mjs';
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const before=JSON.parse(gunzipSync(readFileSync('tests/fixtures/class-potion-orb-before.json.gz')));
const owners=Object.keys(proof),live=Object.fromEntries(owners.map(p=>[p,read(p)]));
// Explicit historical standalone view; actual combined sources are verified separately.
live['config/architecture.json']=standaloneArchitectureSource.potion;
const otherBefore=JSON.parse(gunzipSync(readFileSync('tests/fixtures/watcher-actor-before.json.gz')));
const historicalRead=p=>Object.hasOwn(live,p)?live[p]:(otherBefore[p]??read(p));
const hash=s=>createHash('sha256').update(s).digest('hex');
test('all four complete potion owners restore independent frozen sources through the historical boundary',()=>{
 assert.deepEqual(owners,['src/lua/abyss_class_potions.lua','src/lua/abyss_card_actions.lua','src/lua/abyss_combat_effect_dispatch.lua','config/architecture.json']);
 for(const path of owners){
  assert.equal(hash(live[path]),proof[path].afterSha256);
  assert.equal(hash(before[path]),proof[path].beforeSha256);
  for(const source of [live[path],live[path].replaceAll('\n','\r\n')]){
   assert.equal(prior(path,source,{readSource:historicalRead}),before[path]);
   assert.equal(preM7FinalSource(path,source,{readSource:historicalRead}),before[path]);
  }
 }
});
test('each invocation freshly authenticates every linked owner, including reused wrapped readers',()=>{
 for(const wrap of [r=>r,classPotionOrbReader]){
  const calls=[];const reader=wrap(p=>{calls.push(p);return live[p];});
  for(const path of owners){
   calls.length=0;assert.equal(prior(path,live[path],{readSource:reader}),before[path]);assert.deepEqual(calls,owners);
   calls.length=0;assert.equal(prior(path,live[path],{readSource:reader}),before[path]);assert.deepEqual(calls,owners);
  }
 }
});
test('old, foreign, partial and drifted inputs cannot authorize linked reads',()=>{
 for(const path of owners)for(const source of [before[path],live[path]+'\n',live[path].slice(1),live[path]+live[path],null,{},false,10]){
  assert.equal(prior(path,source,{readSource(){assert.fail('foreign input must not read');}}),source);
 }
});
test('complete inputs reject missing, mixed, and drifted owners after prior successful projections',()=>{
 for(const path of owners)for(const owner of owners){
  const current={...live};const reader=classPotionOrbReader(p=>{if(!Object.hasOwn(current,p))throw Error('missing owner');return current[p];});
  assert.equal(prior(path,live[path],{readSource:reader}),before[path]);
  for(const value of [before[owner],live[owner]+'\n',live[owner].slice(1)]){
   current[owner]=value;
   assert.throws(()=>prior(path,live[path],{readSource:reader}),/potion linked owner identity/);
  }
  delete current[owner];assert.throws(()=>prior(path,live[path],{readSource:reader}),/potion linked owner missing/);
 }
});

test('the local planning floor changes only its declared entry and cannot authorize drift',async()=>{
 const {preClassPotionPlanningSource:project,classPotionPlanningKey:key,classPotionPlanningFloor:floor}=await import('./helpers/class-potion-planning-source-inverse.mjs');
 const path='scripts/ci-test-timings.json',source=preEnemyIntegrationPlanningSource(path,preDefectIntegrationPlanningSource(path,originalPlanningSource(path,preEmeraldMapCiSource(path,read(path)),'seven'))),previous=project(path,source);
 assert.notEqual(previous,source);
 const expected=JSON.parse(previous);assert.equal(expected.jsPlanning.localLowerBounds[key],undefined);
 assert.equal(floor.durationMs,180000);assert(floor.durationMs>=162004.675552);
 expected.jsPlanning.localLowerBounds[key]=floor;
 assert.deepEqual(expected,JSON.parse(source),'no other budget, observation or safety value changes');
 assert.equal(project(path,source.replaceAll('\n','\r\n')),previous);
 for(const changed of [source+'\n',source.slice(1),source.replace('"durationMs": 180000','"durationMs": 162004'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999')])assert.equal(project(path,changed),changed);
 assert.equal(project('foreign',source),source);
});

// Preserve the complete original Emerald/historical assertions behind one exact registration boundary.
function preEmeraldMapCiSource(path,source){return originalPreEmeraldMapCiSource(path,preEmeraldCostSource(path,source));}
