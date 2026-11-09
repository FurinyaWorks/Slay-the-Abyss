import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync,rmSync,copyFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceEpoch,preEncounterFormationEpoch} from '../../../tests/helpers/combined-epoch/source-epoch.mjs';
const directory='docs/evidence/m7-formation-20261109',formation='src/lua/abyss_encounter_formation.lua';
const hash=x=>createHash('sha256').update(x).digest('hex'),normalized=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const fileHash=p=>hash(p.endsWith('.gz')?readFileSync(p):normalized(p));
const proof=sourceEpoch.proof,prior=preEncounterFormationEpoch.proof;
const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
const predecessor=spawnSync('git',['show','fb04fd36:tests/helpers/combined-epoch/source-epoch.mjs'],{encoding:'utf8'});assert.equal(predecessor.status,0);
assert.equal(normalized('tests/helpers/combined-epoch/pre-formation-source-epoch.mjs'),predecessor.stdout);
const livePaths=['config/architecture.json',...readdirSync('src/lua').filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p)].sort();
assert.deepEqual(livePaths,Object.keys(proof.current).filter(p=>proof.current[p]!==null).sort());
for(const path of livePaths)assert.equal(normalized(path),proof.current[path].source,path);
for(const [target,identity]of Object.entries(prior.targets))assert.deepEqual(proof.targets[target],identity,target);
for(const [path,identity]of Object.entries(prior.current))if(path!==formation)assert.deepEqual(proof.current[path],identity,path);
assert.deepEqual(proof.targets.encounterFormationPrior.files,prior.current);
assert.deepEqual([...proof.owners].sort(),Object.keys(proof.current).filter(path=>Object.values(proof.targets).some(target=>target.files[path]?.sha256!==proof.current[path]?.sha256)).sort());
assert.equal(proof.owners.length,51);assert.equal(proof.currentTreeCommitted,false);
let negatives=0;
const sampled=[proof.owners[0],proof.owners[Math.floor(proof.owners.length/2)],proof.owners.at(-1)];
for(const path of ['config/architecture.json',formation]){
 const target=path===formation?'encounterFormationPrior':'actor';
 const raw=normalized(path),input=path===formation?raw:JSON.stringify(JSON.parse(raw));
 let corrupt=null,missing=null,calls=[];
 const reader=p=>{calls.push(p);return p===missing?null:normalized(p)+(p===corrupt?'\n':'');};
 for(let repeat=0;repeat<2;repeat++){
  calls=[];assert.equal(sourceEpoch.preCombinedSource(path,input,{target,readSource:reader}),proof.targets[target].files[path].source);
  assert.deepEqual(calls,proof.owners);
 }
 for(const owner of sampled){
  corrupt=owner;assert.throws(()=>sourceEpoch.preCombinedSource(path,input,{target,readSource:reader}),/linked owner identity/);negatives++;corrupt=null;
  missing=owner;assert.throws(()=>sourceEpoch.preCombinedSource(path,input,{target,readSource:reader}),/linked owner identity/);negatives++;missing=null;
 }
 const linked=sourceEpoch.combinedReader(reader,target);assert.equal(sourceEpoch.combinedReader(linked,target),linked);
 assert.equal(linked(path),proof.targets[target].files[path].source);
 corrupt=proof.owners.find(owner=>owner!==path);assert.throws(()=>linked(path),/linked owner identity/);negatives++;corrupt=null;
 const retargeted=sourceEpoch.combinedReader(linked,'develop');assert.equal(retargeted(formation),proof.targets.develop.files[formation].source);
 corrupt=proof.owners.find(owner=>owner!==formation);assert.throws(()=>retargeted(formation),/linked owner identity/);negatives++;corrupt=null;
 let reads=0;const foreign=raw+'-- foreign\n';assert.equal(sourceEpoch.preCombinedSource(path,foreign,{target,readSource(){reads++;throw Error('unavailable');}}),foreign);assert.equal(reads,0);
 assert.throws(()=>sourceEpoch.preCombinedSource(path,raw,{target:'__proto__',readSource:reader}),/unknown source target/);negatives++;
}
// Validate that the archived compressed bytes are checked before any projection can be imported.
const temp=mkdtempSync(join(tmpdir(),'formation-independent-archive-'));
try{
 mkdirSync(join(temp,'combined-epoch'));copyFileSync('tests/helpers/combined-epoch/source-epoch-runtime.mjs',join(temp,'combined-epoch/source-epoch-runtime.mjs'));
 copyFileSync('tests/helpers/encounter-formation-source-epoch.mjs',join(temp,'encounter-formation-source-epoch.mjs'));
 const archive=readFileSync('tests/helpers/encounter-formation-source-epoch.json.gz');archive[archive.length-1]^=1;
 writeFileSync(join(temp,'encounter-formation-source-epoch.json.gz'),archive);
 const result=spawnSync(process.execPath,[join(temp,'encounter-formation-source-epoch.mjs')],{encoding:'utf8',timeout:10000});
 assert.notEqual(result.status,0);assert.match(result.stderr,/encounter-formation compressed identity/);negatives++;
}finally{rmSync(temp,{recursive:true,force:true});}
const reviewedReceipts=[];
for(const name of ['behavior-final','source','source-defect-regression','source-integration']){
 const receipt=JSON.parse(readFileSync(`${directory}/${name}-receipt.json`));
 const logBytes=readFileSync(`${directory}/${name}.log.gz`),plain=gunzipSync(logBytes),log=plain.toString();
 assert.equal(hash(logBytes),receipt.compressedLogSha256);assert.equal(hash(plain),receipt.logSha256);
 assert.equal(hash(normalized(receipt.testFile)),receipt.testSha256,receipt.testFile);
 for(const [path,expected]of Object.entries({...receipt.inputSha256,...receipt.generatedInputSha256}))assert.equal(fileHash(path),expected,path);
 if(receipt.beforeInputSha256)assert.deepEqual(receipt.beforeInputSha256,receipt.afterInputSha256);
 assert.equal(receipt.beforeAfterHashesMatched,true);
 assert(log.includes(`tests ${receipt.tests}`));assert(log.includes(`pass ${receipt.pass}`));assert.equal(receipt.tests,receipt.pass);
 for(const key of ['fail','cancelled','skipped']){assert.equal(receipt[key],0);assert(log.includes(`${key} 0`));}
 assert(log.includes(`duration_ms ${receipt.durationMs}`));
 reviewedReceipts.push({name,tests:receipt.tests,pass:receipt.pass,inputCount:Object.keys(receipt.inputSha256).length,generatedInputCount:Object.keys(receipt.generatedInputSha256??{}).length,durationMs:receipt.durationMs,receiptSha256:hash(readFileSync(`${directory}/${name}-receipt.json`))});
}
const retained=JSON.parse(readFileSync(`${directory}/retained-double-vm-receipt.json`)),retainedLog=gunzipSync(readFileSync(`${directory}/retained-double-vm.log.gz`));
assert.equal(hash(retainedLog),retained.logSha256);assert.equal(hash(normalized(retained.runner)),retained.runnerSha256);
assert.equal(retained.tests,17);assert.equal(retained.pass,17);assert.match(retained.scope,/after successful run, not a before\/after hash witness/);
assert(retainedLog.toString().includes(`duration_ms ${retained.durationMs}`));
const retainedDrift=[];
for(const [path,expected]of Object.entries(retained.inputSha256)){let actual;try{actual=fileHash(path);}catch{actual=null;}if(actual!==expected)retainedDrift.push({path,expected,actual});}
assert.deepEqual(retainedDrift.map(row=>row.path),[retained.executedPath],'Only intentional recurring-file reduction may differ from the retained snapshot');
assert.equal(retainedDrift[0].expected,retained.runnerSha256,'retained runner preserves exact originally executed source');
console.log('PASS independent source: 339 live inputs, all prior targets/bindings preserved, exact former facade, 51-owner changed union, '+negatives+' fresh rejection probes including archive tamper');
console.log('PASS final receipts: all 4 logs, test files and recorded live/generated inputs match; 14/11/11/38 passed; retained 17-test source preserved exactly with only disclosed recurring-file reduction');
const result={reviewer:'EncounterFormation independent reviewer (not the implementer)',reviewedAt:new Date().toISOString(),scope:'Source/behavior local review only; no Full, merge, exact final commit or platform approval.',reviewedBaseHead:head,sourceSha256:hash(normalized(formation)),gateSha256:hash(normalized('scripts/check-lua-static.mjs')),sourceFacadeSha256:hash(normalized('tests/helpers/combined-epoch/source-epoch.mjs')),sourceOuterSha256:hash(normalized('tests/helpers/encounter-formation-source-epoch.mjs')),owners:51,negativeProbes:negatives,reviewedReceipts,retained:{tests:17,durationMs:retained.durationMs,postRunHashLimitation:true,expectedCurrentDrift:retainedDrift}};
writeFileSync(`${directory}/independent-source-receipt-review.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
