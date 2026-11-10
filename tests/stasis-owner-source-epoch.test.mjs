import {sourceEpoch as liveWheelEpoch} from './helpers/combined-epoch/source-epoch.mjs';
const stasisLive=liveWheelEpoch.combinedReader(p=>readFileSync(p,'utf8'),'wheelPrior');
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sourceEpoch,preStasisEpoch} from './helpers/combined-epoch/pre-wheel-source-epoch.mjs';
import {stasisEpoch,extendStasisEpoch} from './helpers/stasis-source-epoch.mjs';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
import {stasisReplayBefore,priorStasisReplayPrelude} from './helpers/stasis-replay-before.mjs';
const proof=sourceEpoch.proof,prior=preStasisEpoch.proof,paths=stasisEpoch.proof.owners;
const raw=p=>proof.current[p]?.source??null;
test('Stasis outer epoch preserves all 339 predecessor bindings and complete current sources',()=>{
 assert.equal(stasisEpoch.proof.currentCommit,'4a51905537fa223e5df4e5ee475152c8a6629af5');
 assert.deepEqual(paths,['config/architecture.json','src/lua/abyss_actor.lua','src/lua/abyss_act2_powers.lua','src/lua/abyss_act2_stasis.lua']);
 assert.equal(Object.keys(proof.current).length,339);assert.equal(proof.owners.length,53);
 assert.deepEqual(proof.owners,[...prior.owners,'src/lua/abyss_act2_powers.lua','src/lua/abyss_act2_stasis.lua']);
 assert.deepEqual(proof.targets.stasisPrior.files,prior.current);
 for(const [key,value]of Object.entries(prior))if(!['current','owners','targets'].includes(key))assert.deepEqual(proof[key],value,key);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(proof.targets[name],target,name);
 for(const [path,binding]of Object.entries(prior.current))if(!paths.includes(path))assert.deepEqual(proof.current[path],binding,path);
 assert.deepEqual(['config/architecture.json',...readdirSync('src/lua').filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p)].sort(),Object.keys(proof.current).filter(p=>proof.current[p]!==null).sort());
 for(const [path,binding]of Object.entries(proof.current))if(binding)assert.equal(stasisLive(path).replaceAll('\r\n','\n'),binding.source,path);
 for(const path of paths){assert.deepEqual(stasisEpoch.proof.targets.prior.files[path],prior.current[path]);for(const field of Object.keys(prior.current[path])){const changed=structuredClone(prior);changed.current[path][field]='tampered';assert.throws(()=>extendStasisEpoch({...preStasisEpoch,proof:changed}),/authenticated predecessor/);}}
 assert(Object.isFrozen(proof.targets.stasisPrior.files));
});
test('four changed sources project every historical target with exact LF/CRLF and opaque-input rules',()=>{
 for(const path of paths)for(const [target,record]of Object.entries(proof.targets)){
  const expected=record.files[path]?.source??raw(path);
  for(const source of [raw(path),raw(path).replaceAll('\n','\r\n')])assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource:raw}),expected,path+':'+target);
  for(const source of [record.files[path]?.source,raw(path)+'--foreign',null,undefined,{},17]){let reads=0;assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource(){reads++;throw Error('unexpected');}}),source);assert.equal(reads,0);}
 }
 for(const target of ['unknown','',null,undefined,'__proto__'])assert.throws(()=>sourceEpoch.preCombinedSource(paths[0],'foreign',{target,readSource:null}),/unknown source target/);
});
test('53 fresh raw owners are required after warm authorization including layout and linked reader retargeting',()=>{
 const path=paths[0],source=JSON.stringify(JSON.parse(raw(path))),target='stasisPrior';
 for(const crlf of [false,true]){
  let corrupt=null,missing=null;const seen=[];
  const readSource=p=>{seen.push(p);if(p===missing)return null;const s=stasisLive(p).replaceAll('\r\n','\n');return p===corrupt?s+'\n':crlf?s.replaceAll('\n','\r\n'):s;};
  for(let i=0;i<2;i++){seen.length=0;assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource}),prior.current[path].source);assert.deepEqual(seen,proof.owners);}
  for(const owner of proof.owners){corrupt=owner;assert.throws(()=>sourceEpoch.preCombinedSource(path,source,{target,readSource}),/linked owner identity/,owner);corrupt=null;missing=owner;assert.throws(()=>sourceEpoch.preCombinedSource(paths[3],raw(paths[3]),{target,readSource}),/linked owner identity/,owner);missing=null;}
 }
 const reader=sourceEpoch.combinedReader(raw,target);assert.equal(reader(paths[1]),prior.current[paths[1]].source);assert.equal(sourceEpoch.combinedReader(reader,target),reader);
 assert.equal(sourceEpoch.combinedReader(reader,'actor')(paths[1]),proof.targets.actor.files[paths[1]].source);
 for(const readSource of [null,false,0,{},[]])assert.throws(()=>sourceEpoch.preCombinedSource(path,source,{target,readSource}),/reader/);
 assert.throws(()=>sourceEpoch.preCombinedSource(path,source,{target,readSource(){throw Error('missing');}}),/linked owner missing/);
 for(const input of [raw(path)+'--bad','\ufeff'+raw(path),raw(path).replace('"layers"','"layers":{},"layers"')]){let reads=0;assert.equal(sourceEpoch.preCombinedSource(path,input,{target,readSource(){reads++;}}),input);assert.equal(reads,0);}
});
test('isolated helper copy closes both epochs without Git or source tree access',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'stasis-epoch-'));
 try{copyIntegrationSourceClosure(directory);const module=await import(pathToFileURL(join(directory,'tests/helpers/combined-epoch/pre-wheel-source-epoch.mjs')).href);assert.deepEqual(module.sourceEpoch.proof,proof);assert.deepEqual(module.preStasisEpoch.proof,prior);assert.equal(module.sourceEpoch.preCombinedSource(paths[3],raw(paths[3]),{target:'stasisPrior',readSource:raw}),prior.current[paths[3]].source);assert.throws(()=>module.sourceEpoch.preCombinedSource(paths[3],raw(paths[3]),{target:'stasisPrior',readSource:p=>p===paths[2]?null:raw(p)}),/linked owner identity/);}finally{rmSync(directory,{recursive:true,force:true});}
});
test('historical three-argument Actor replay loads exact complete prior Powers and Stasis modules',()=>{
 for(const [name,file]of Object.entries(stasisReplayBefore.files)){assert.deepEqual(file.source,prior.current[file.path].source);assert.match(priorStasisReplayPrelude(),new RegExp(name));}
 assert.match(stasisReplayBefore.files.abyss_act2_stasis.source,/require\('abyss_combat'\)/);
});
