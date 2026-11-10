import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {sourceEpoch as epoch,preColorlessDescriptionEpoch as prior} from './helpers/combined-epoch/source-epoch.mjs';
import {extendColorlessDescriptionEpoch} from './helpers/colorless-description-source-epoch.mjs';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
const file='src/lua/abyss_colorless_cards.lua',source=readFileSync(file,'utf8').replaceAll('\r\n','\n');
const hash=b=>createHash('sha256').update(b).digest('hex');
const raw=p=>epoch.proof.current[p]?.source??null;
test('Colorless public identity preserves all predecessor owners bindings and historical targets',()=>{
 assert.equal(hash(source),'f5b2d94fa5a8ddfe748f68782d9210b24d8552540ff296d7d03b27fafc005b00');
 assert.equal(epoch.proof.current[file].source,source);
 assert.deepEqual(epoch.proof.owners,prior.proof.owners);assert.equal(epoch.proof.owners.length,51);
 assert.equal(Object.keys(epoch.proof.current).length,339);assert.equal(Object.keys(epoch.proof.targets).length,22);
 for(const [target,value]of Object.entries(prior.proof.targets))assert.deepEqual(epoch.proof.targets[target],value);
 for(const [path,value]of Object.entries(prior.proof.current))if(path!==file)assert.deepEqual(epoch.proof.current[path],value);
 assert.equal(epoch.proof.colorlessDescription.collectedBaseCommit,'ab65ed3b5b4240eb653af4651a13c1b8c72b2e04');
 assert.equal(epoch.proof.colorlessDescription.candidateCommit,'3a09dfba19fca59c5bcd434a6ad09ed7d0330902');
});
test('Colorless all targets authenticate every live owner after warm calls in LF and CRLF',()=>{
 for(const target of Object.keys(epoch.proof.targets))for(const crlf of [false,true]){
  const input=crlf?source.replaceAll('\n','\r\n'):source;let changed=null;
  const reader=p=>p===changed?raw(p)+'\n':crlf?raw(p)?.replaceAll('\n','\r\n'):raw(p);
  assert.equal(epoch.preCombinedSource(file,input,{target,readSource:reader}),epoch.proof.targets[target].files[file].source);
  for(const owner of epoch.proof.owners){changed=owner;assert.throws(()=>epoch.preCombinedSource(file,input,{target,readSource:reader}),/linked owner identity/);changed=null;}
 }
});
test('Colorless foreign inputs do not read; target and raw-reader failures stay closed',()=>{
 for(const target of Object.keys(epoch.proof.targets)){
  for(const input of ['foreign',source+'\n',null,false,{},Buffer.from(source)])assert.equal(epoch.preCombinedSource(file,input,{target,readSource(){throw Error('foreign must not read');}}),input);
  assert.throws(()=>epoch.preCombinedSource(file,source,{target,readSource:()=>null}),/linked owner identity/);
  assert.throws(()=>epoch.preCombinedSource(file,source,{target,readSource:null}),/reader/);
 }
 assert.throws(()=>epoch.preCombinedSource(file,source,{target:'unknown',readSource:raw}),/unknown source target/);
 const projected=epoch.combinedReader(raw,'colorlessDescriptionPrior');assert.equal(epoch.combinedReader(projected,'colorlessDescriptionPrior'),projected);
 assert.equal(epoch.combinedReader(projected,'actor')(file),epoch.proof.targets.actor.files[file].source);
 assert.throws(()=>epoch.preCombinedSource(file,source,{target:'actor',readSource:p=>projected(p)}),/linked owner identity/);
});
test('Colorless predecessor authentication consumes one detached plain snapshot',()=>{
 const original=prior.proof;const forged=structuredClone(original);forged.owners=[];
 assert.throws(()=>extendColorlessDescriptionEpoch({...prior,proof:forged}),/authenticated predecessor/);
 let reads=0;Object.defineProperty(forged,'toJSON',{value:()=>{reads++;return original;}});
 const safe=extendColorlessDescriptionEpoch({...prior,proof:forged});assert.equal(reads,1);assert.deepEqual(safe.proof.owners,original.owners);
 const access=structuredClone(original);let calls=0;Object.defineProperty(access,'current',{enumerable:true,get(){calls++;return calls===1?original.current:{};}});
 assert.deepEqual(extendColorlessDescriptionEpoch({...prior,proof:access}).proof.targets.colorlessDescriptionPrior.files,original.current);assert.equal(calls,1);
});
test('registered public copier creates detached Colorless runtime without borrowing live imports',()=>{
 const dir=mkdtempSync(join(tmpdir(),'colorless-public-'));
 try{
  copyIntegrationSourceClosure(dir);
  for(const owner of epoch.proof.owners){const target=join(dir,owner);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,raw(owner));}
  writeFileSync(join(dir,'probe.mjs'),`import {registerHooks} from 'node:module';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {readFileSync} from 'node:fs';const prefix=pathToFileURL(process.cwd()+'/').href;registerHooks({resolve(s,c,n){const r=n(s,c);assert(r.url.startsWith('node:')||r.url.startsWith(prefix));return r;}});const {sourceEpoch:e}=await import('./tests/helpers/combined-epoch/source-epoch.mjs');const f=${JSON.stringify(file)},s=readFileSync(f,'utf8');for(const t of Object.keys(e.proof.targets))assert.equal(e.preCombinedSource(f,s,{target:t}),e.proof.targets[t].files[f].source);console.log('DETACHED_COLORLESS_PASS');`);
  const child=spawnSync(process.execPath,['probe.mjs'],{cwd:dir,encoding:'utf8',timeout:120000,env:{...process.env,NODE_PATH:'',NODE_OPTIONS:''}});assert.equal(child.status,0,child.stdout+child.stderr);assert.match(child.stdout,/DETACHED_COLORLESS_PASS/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
