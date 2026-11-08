import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preSessionRewardSource as originalSession,sessionRewardReader,sessionRewardProof} from './helpers/epochs/sessionReward/tests/helpers/session-reward-source-inverse.mjs';
import {preM7FinalSource as originalM7} from './helpers/epochs/develop/tests/helpers/m7-core-final-source-inverse.mjs';
import {preSessionRewardSource as combinedSession} from './helpers/session-reward-source-inverse.mjs';
import {preM7FinalSource as combinedM7} from './helpers/m7-core-final-source-inverse.mjs';
import {sourceEpoch} from './helpers/combined-epoch/source-epoch.mjs';
const files=sessionRewardProof.files;
const paths=[...Object.keys(files),...Object.keys(sessionRewardProof.linked)];
// Preserve the original slice's exact read-count and byte contracts in its
// immutable source epoch. The actual combined tree is independently checked below.
const historicalRead=path=>sourceEpoch.proof.targets.sessionReward.files[path]?.source;
const preSessionRewardSource=(path,source,options={})=>originalSession(path,source,{readSource:historicalRead,...options});
const current=Object.fromEntries(paths.map(path=>[path,historicalRead(path)]));
const preM7FinalSource=(path,source)=>originalM7(path,preSessionRewardSource(path,source,{readSource:historicalRead}),{readSource:historicalRead});

test('current combined Session and M7 projections preserve the original complete before sources',()=>{
 for(const [path,file]of Object.entries(files)){
  const actual=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  assert.equal(combinedSession(path,actual),file.beforeSource,path);
  assert.equal(combinedM7(path,actual),file.beforeSource,path);
 }
});
test('exact Session reward sources return the complete prior Git identities',()=>{
 for(const [path,file]of Object.entries(files)){
  const read=[];const reader=p=>(read.push(p),current[p]);
  assert.equal(preSessionRewardSource(path,current[path],{readSource:reader}),file.beforeSource);
  assert.deepEqual(read,paths,'each full owner and capability is freshly checked');
  assert.equal(preSessionRewardSource(path,current[path].replaceAll('\n','\r\n'),{readSource:reader}),file.beforeSource);
  assert.equal(preM7FinalSource(path,current[path]),file.beforeSource,'outer projection reaches existing chain');
 }
});
test('Session reward old, partial and foreign sources receive no permission or linked reads',()=>{
 for(const [path,file]of Object.entries(files))for(const input of [file.beforeSource,current[path]+'-- drift',null]){
  assert.equal(preSessionRewardSource(path,input,{readSource:()=>assert.fail('must not read')}),input);
 }
 const path='config/architecture.json',duplicate=current[path].replace('"id": "session-reward-capabilities"','"id": "foreign", "id": "session-reward-capabilities"');
 assert.equal(preSessionRewardSource(path,duplicate,{readSource:()=>assert.fail('must not read')}),duplicate);
 const formatted=JSON.stringify(JSON.parse(current[path]));
 assert.equal(preSessionRewardSource(path,formatted),files[path].beforeSource,'only existing whitespace permission');
});
test('every warm linked owner, including shared capability slots, rejects mutation and missing readers',()=>{
 const path='src/lua/abyss_event_combat.lua';
 for(const linked of paths){
  let drift=false;const read=p=>p===linked&&drift?current[p]+'-- drift':current[p];
  const reader=sessionRewardReader(read);assert.equal(reader(path),files[path].beforeSource);drift=true;
  if(linked===path)assert.equal(reader(path),current[path]+'-- drift','foreign current input must not acquire prior identity');
  else assert.throws(()=>reader(path),/Session reward linked owner identity/,'warm authorization cannot be cached');
  assert.throws(()=>preSessionRewardSource(path,current[path],{readSource:p=>{if(p===linked)throw Error('missing');return current[p];}}),/Session reward linked owner missing/);
 }
});
