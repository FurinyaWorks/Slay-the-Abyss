import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {rewardQueryBoundaryProof as proof,preRewardQueryBoundarySource as project,rewardQueryBoundaryReader as reader} from './helpers/reward-query-boundary-source-inverse.mjs';
import {preM7FinalSource,m7FinalReader} from './helpers/m7-core-final-source-inverse.mjs';
import {preRelicQuerySource} from './helpers/relic-query-source-inverse.mjs';
import {copyCurrentSourceFixture} from './helpers/isolated-current-source.mjs';
import {preRewardQueryBoundarySource as frozenProject,rewardQueryBoundaryReader as frozenReader} from './helpers/epochs/reward/tests/helpers/reward-query-boundary-source-inverse.mjs';
import {sourceEpoch} from './helpers/combined-epoch/source-epoch.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const paths=Object.keys(proof.files),config='config/architecture.json';
// The four-source proof describes the original reward epoch; today's configuration has additional approved boundaries.
const current=Object.fromEntries(paths.map(p=>[p,sourceEpoch.proof.targets.reward.files[p].source]));
const historicalRead=p=>current[p];
const before=Object.fromEntries(paths.map(p=>[p,proof.files[p].beforeSource]));
const boundary={id:'reward-query-consumer-boundary',from:['abyss_relic_card_rewards','abyss_relic_choices','abyss_relic_pending'],forbiddenTargets:['abyss_relic_hooks'],reason:'Reward query consumers read the existing Queries and Family.common capability slots directly on every call. Their Run imports retain real initialized reward transactions and permanent inventory commands.'};

test('complete d8 Git sources permit only six capability reads, one boundary and only the stale deferred exception removal',()=>{
 assert.equal(proof.revision,'d8a57cae2a867200ca8e588abc0d368e6cdb3799');
 assert(Object.isFrozen(proof)&&Object.isFrozen(proof.files));
 const blobs=['57fadc81538e272f711a146a22a28da383ad4a9b','3bb46bafdb15fa7665ca4c14252dfe1bdcbc71f9','1d3272181c45f73f590c95284a7d03349d446b62','d572702dc8966a1770c1c6dab67ef947e563afb8'];
 for(const [i,path]of paths.entries()){
  const file=proof.files[path];assert(Object.isFrozen(file));
  assert.equal(hash(before[path]),file.beforeSha256);assert.equal(hash(current[path]),file.afterSha256);
  assert.equal(file.beforeSource.includes('\r'),false);
  assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(before[path])+'\0'+before[path]).digest('hex'),blobs[i]);
  assert.equal(file.beforeGitBlob,blobs[i]);
  if(path===config)continue;
  const owns="require('abyss_relic_hooks').owns",preview="require('abyss_relic_hooks').previewCardReward";
  assert.equal(before[path].split(owns).length,path.includes('pending')?3:2);
  assert.equal(before[path].split(preview).length,path.includes('pending')?1:2);
  assert.equal(current[path],before[path].replaceAll(owns,"require('abyss_relic_queries').hooks.owns").replaceAll(preview,"require('abyss_relic_family_combat').common.previewCardReward"));
 }
 const policy=JSON.parse(current[config]),prior=JSON.parse(before[config]);
 assert.deepEqual(policy.dependencyBoundaries.shift(),boundary);
 const stale={from:'abyss_relic_choices',to:'abyss_relic_hooks',reason:'Relic callbacks load the already initialized runtime only when an actual obtain, choice, damage or card action executes; no module initialization import.'};
 const index=prior.deferredImports.findIndex(row=>row.from===stale.from&&row.to===stale.to);
 assert(index>=0);assert.deepEqual(prior.deferredImports.splice(index,1),[stale]);assert.deepEqual(policy,prior);
 const line='    '+JSON.stringify(stale)+',\n';
 assert.equal(before[config].split(line).length,2);assert.equal(current[config].includes(line),false);
 const inserted='    {\n      "id": "reward-query-consumer-boundary",\n      "from": ["abyss_relic_card_rewards", "abyss_relic_choices", "abyss_relic_pending"],\n      "forbiddenTargets": ["abyss_relic_hooks"],\n      "reason": '+JSON.stringify(boundary.reason)+'\n    },\n';
 assert.equal(current[config],before[config].replace(line,'').replace('  "dependencyBoundaries": [\n','  "dependencyBoundaries": [\n'+inserted),'only the new boundary and exact stale exception removal may change configuration bytes');
 for(const name of boundary.from)assert(prior.deferredImports.some(e=>e.from===name&&e.to==='abyss_run'),'retain initialized Run transaction: '+name);
});

test('LF CRLF and exact configuration token layouts restore complete frozen reward sources',()=>{
 for(const path of paths)for(const input of [current[path],current[path].replaceAll('\n','\r\n')]){
  assert.equal(frozenProject(path,input,{readSource:historicalRead}),before[path]);
  assert.equal(frozenProject(path,input,{readSource:p=>current[p].replaceAll('\n','\r\n')}),before[path]);
 }
 for(const input of [JSON.stringify(JSON.parse(current[config])),JSON.stringify(JSON.parse(current[config]),null,'\t'),current[config]+'\n\t ']){
  assert.equal(frozenProject(config,input,{readSource:historicalRead}),before[config]);
 }
});

test('the current reward and final M7 entries retain LF CRLF layout and the older relic epoch',()=>{
 for(const path of paths)for(const input of [read(path),read(path).replaceAll('\n','\r\n')])for(const consume of [project,preM7FinalSource]){
  assert.equal(consume(path,input),before[path]);
  assert.equal(consume(path,input,{readSource:p=>read(p).replaceAll('\n','\r\n')}),before[path]);
 }
 for(const input of [JSON.stringify(JSON.parse(read(config))),JSON.stringify(JSON.parse(read(config)),null,'\t'),read(config)+'\n\t '])for(const consume of [project,preM7FinalSource])assert.equal(consume(config,input),before[config]);
 assert.equal(hash(preRelicQuerySource(config,read(config))),'68d46e73d734f9684326b24ba040706d768349ce9a552daf52006bb900bfaabf','the original 391 epoch remains reachable');
});

test('unknown original partial raw and duplicate escaped reordered inputs preserve identity with zero linked IO',()=>{
 let reads=0;const options={readSource(){reads++;throw Error('must not read');}};
 for(const path of paths)for(const source of [current[path],read(path)]){
  const variants=[before[path],source.slice(1),source+source,source+'\n-- foreign\n',undefined,null,false,17,{},Buffer.from(source),''];
  if(path===config){
   variants.push(source.replace('"reward-query-consumer-boundary"','"reward-query-consumer-boun\\u0064ary"'));
   variants.push(source.replace('"dependencyBoundaries":','"dependencyBoundaries": [], "dependencyBoundaries":'));
   const changed=JSON.parse(source);changed.dependencyBoundaries.reverse();variants.push(JSON.stringify(changed));
   const removed=JSON.parse(source);removed.dependencyBoundaries.shift();removed.unreviewed=true;variants.push(JSON.stringify(removed));
  }
  for(const value of variants)for(const consume of [project,preM7FinalSource])assert.equal(consume(path,value,options),value);
  assert.equal(project('foreign/'+path,source,options),source);
 }
 assert.equal(reads,0);
});

test('each warm projection freshly authenticates all three owners and configuration after drift missing and recovery',()=>{
 const project=frozenProject,reader=frozenReader;
 for(const consume of [project])for(const host of paths)for(const linked of paths){
  let mode='good',reads=[];
  const readSource=p=>{reads.push(p);if(p===linked){
   if(mode==='throw')throw Error('reader sentinel');
   if(mode==='missing')return undefined;
   if(mode==='null')return null;
   if(mode==='raw')return Buffer.from(current[p]);
   if(mode==='drift')return current[p]+'\n';
   if(mode==='before')return before[p];
  }return current[p];};
  for(const success of [0,1]){
   reads=[];assert.equal(consume(host,current[host],{readSource}),before[host]);assert.deepEqual(reads,paths);
  }
  for(mode of ['throw','missing','null','raw','drift','before']){
   reads=[];assert.throws(()=>consume(host,current[host],{readSource}),/reward query boundary linked owner/);assert(reads.includes(linked));
  }
  mode='good';reads=[];assert.equal(consume(host,current[host],{readSource}),before[host]);assert.deepEqual(reads,paths);
  const nested=reader(reader(readSource));assert.equal(reader(nested),nested);
  assert.equal(project(host,current[host],{readSource:nested}),before[host]);
  mode='drift';assert.throws(()=>project(host,current[host],{readSource:nested}),/linked owner/);
 }
 for(const readSource of [null,{},'invalid'])assert.throws(()=>project(paths[0],current[paths[0]],{readSource}),/linked reader/);
 const formatted=JSON.stringify(JSON.parse(current[config]));
 assert.throws(()=>project(paths[0],current[paths[0]],{readSource:p=>p===config?formatted:current[p]}),/linked owner/,'a formatted input cannot excuse reformatting the linked raw configuration');
});

test('reader wrappers never retain successful permissions and later same-call configuration drift is rejected',()=>{
 let reads=0,corrupt=false;
 const raw=p=>{reads++;return current[p]+(corrupt&&p===config?'\n':'');};
 const wrapped=frozenReader(frozenReader(raw));assert.equal(frozenReader(wrapped),wrapped);
 for(const path of paths){assert.equal(wrapped(path),before[path]);corrupt=true;assert.throws(()=>wrapped(path),/linked owner/);corrupt=false;}
 assert(reads>0);
 let configReads=0;
 assert.throws(()=>preRelicQuerySource(config,read(config),{readSource:p=>{
  const value=read(p);return p===config&&++configReads>1?value+'\n':value;
 }}),/linked owner/,'the old inner proof must reread the new outer closure instead of reusing the initial permission');
 assert(configReads>1);
});

test('an isolated copied helper has a complete closure and cannot borrow live owners after warm edits or deletion',()=>{
 const root=mkdtempSync(join(tmpdir(),'reward-query-source-'));
 try{
  copyCurrentSourceFixture(root);
  const script=`
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,rmSync} from 'node:fs';
import {rewardQueryBoundaryProof as proof,preRewardQueryBoundarySource as project} from './tests/helpers/reward-query-boundary-source-inverse.mjs';
const paths=Object.keys(proof.files),sources=Object.fromEntries(paths.map(p=>[p,readFileSync(p,'utf8')]));
for(const host of paths)for(const linked of paths){
 assert.equal(project(host,sources[host]),proof.files[host].beforeSource);
 writeFileSync(linked,sources[linked]+'\\n');assert.throws(()=>project(host,sources[host]),/linked owner/);
 writeFileSync(linked,sources[linked]);assert.equal(project(host,sources[host]),proof.files[host].beforeSource);
 rmSync(linked);assert.throws(()=>project(host,sources[host]),/linked owner/);
 writeFileSync(linked,sources[linked]);assert.equal(project(host,sources[host]),proof.files[host].beforeSource);
}
console.log('ISOLATED_REWARD_QUERY_SOURCE_PASS');`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  assert.ifError(result.error);assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/ISOLATED_REWARD_QUERY_SOURCE_PASS/);
  const proofPath=join(root,'tests/helpers/epochs/reward/tests/helpers/reward-query-boundary-before.json');
  writeFileSync(proofPath,readFileSync(proofPath,'utf8').replace('d8a57cae','e8a57cae'));
  const negative=spawnSync(process.execPath,['--input-type=module','-e',"import './tests/helpers/reward-query-boundary-source-inverse.mjs'"],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  assert.ifError(negative.error);assert.notEqual(negative.status,0);assert.match(negative.stderr,/complete reward query boundary source proof/);
 }finally{rmSync(root,{recursive:true,force:true});}
});


test('current reward and M7 wrappers freshly reject every expanded owner and recover after each fault',()=>{
 const sources=Object.fromEntries(sourceEpoch.proof.owners.map(p=>[p,read(p)]));
 for(const [consume,wrap]of [[project,reader],[preM7FinalSource,m7FinalReader]])for(const host of paths){
  let bad=null,mode='good',seen=[];
  const raw=p=>{seen.push(p);if(p===bad){
   if(mode==='throw')throw Error('expanded reader sentinel');
   if(mode==='missing')return undefined;if(mode==='null')return null;
   if(mode==='before')return before[p];
   if(mode==='buffer')return Buffer.from(sources[p]);if(mode==='changed')return sources[p]+'\n';
  }return sources[p]??read(p);};
  const wrapped=wrap(wrap(raw));assert.equal(wrap(wrapped),wrapped);
  assert.equal(wrapped(host),before[host]);seen=[];
  const check=()=>assert.equal(consume(host,read(host),{readSource:wrapped}),before[host]);
  check();const first=[...seen];for(const owner of sourceEpoch.proof.owners)assert(first.includes(owner),'fresh current owner: '+owner);
  seen=[];check();assert.deepEqual(seen,first,'warm calls repeat the complete raw-read sequence');
  for(bad of sourceEpoch.proof.owners)for(mode of ['changed','missing','null','buffer','throw',...(paths.includes(bad)?['before']:[])]){
   seen=[];assert.throws(check,error=>{assert.match(error.message,/linked owner/);assert(error.message.includes(bad));if(mode==='throw')assert.match(error.message,/expanded reader sentinel/);return true;});
   assert(seen.includes(bad));
   // When the host itself is changed, a reader must preserve unknown input bytes.
   if(bad!==host)assert.throws(()=>wrapped(host),/linked owner/);
   const previous=mode;mode='good';check();assert.equal(wrapped(host),before[host]);mode=previous;
  }
  for(const readSource of [null,{},'invalid'])assert.throws(()=>consume(host,read(host),{readSource}),/linked (?:owner )?reader/);
  const formatted=JSON.stringify(JSON.parse(read(config)));
  assert.throws(()=>consume(host,read(host),{readSource:p=>p===config?formatted:read(p)}),/linked owner/,'current linked raw configuration must retain exact bytes');
 }
});
