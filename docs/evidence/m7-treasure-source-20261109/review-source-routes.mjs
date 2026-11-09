import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceEpoch as epoch,preTreasureSourceEpoch as prior}from '../../tests/helpers/combined-epoch/source-epoch.mjs';
const proof=epoch.proof,raw=p=>proof.current[p]?.source??null;let projected=0,unchanged=0,reads=0;
for(const [target,record]of Object.entries(proof.targets)){
 const reader=epoch.combinedReader(raw,target);
 for(const [path,binding]of Object.entries(proof.current)){
  if(!binding)continue;
  const old=record.files[path];const changes=old&&old.sha256!==binding.sha256;
  const expected=changes?old.source:binding.source;
  assert.equal(reader(path),expected,`${target} reader ${path}`);
  for(const crlf of [false,true]){
   const source=crlf?binding.source.replaceAll('\n','\r\n'):binding.source;let calls=[];
   const got=epoch.preCombinedSource(path,source,{target,readSource:p=>{calls.push(p);return crlf?raw(p)?.replaceAll('\n','\r\n')??null:raw(p);}});
   assert.equal(got,changes?old.source:source,`${target} ${path}`);
   if(changes){assert.deepEqual(calls,proof.owners);projected++;}else{assert.equal(calls.length,0);unchanged++;}reads+=calls.length;
   if(changes)for(const readSource of [null,false,{},0])assert.throws(()=>epoch.preCombinedSource(path,source,{target,readSource}),/reader/);
  }
  if(old){let count=0;assert.equal(epoch.preCombinedSource(path,old.source,{target,readSource(){count++;throw Error('original read');}}),old.source);assert.equal(count,0);}
 }
}
for(const [key,value]of Object.entries(prior.proof.targets))assert.deepEqual(proof.targets[key],value);
for(const [path,binding]of Object.entries(prior.proof.current))if(path!=='src/lua/abyss_treasure_source.lua')assert.deepEqual(proof.current[path],binding);
assert.equal(proof.owners.length,52);
const report={status:'PASS',targets:Object.keys(proof.targets).length,paths:Object.keys(proof.current).length,projectedChecks:projected,unchangedChecks:unchanged,rawOwnerReads:reads,sourceAdapterSha256:createHash('sha256').update(readFileSync('tests/helpers/treasure-source-source-epoch.mjs')).digest('hex')};
writeFileSync('.artifacts/treasure-source/review-source-routes.json',JSON.stringify(report,null,2)+'\n');console.log(report);
