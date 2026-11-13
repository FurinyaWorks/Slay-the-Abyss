// Current feedback collector; it never regenerates or rewrites a prior archive.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {discoverJs} from '../../scripts/ci-shards.mjs';
import {discoverSources} from '../../scripts/lua-quality-metrics.mjs';
import {feedbackBase,feedbackPriorCiSha,feedbackPriorClosureSha,feedbackProductionPaths,feedbackCiPaths,feedbackAddedTests,
 feedbackHelperPaths,feedbackClosurePaths,feedbackProductCiPaths,feedbackHash as hash,feedbackBinding as bind,renderFeedbackCiBinding} from './sts-feedback-source-runtime.mjs';
const norm=s=>s.replaceAll('\r\n','\n'),read=p=>readFileSync(p,'utf8'),json=p=>JSON.parse(read(p));
const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024});
function tree(revision,scope){
 assert.match(revision,/^[a-f0-9]{40}$/);
 return Object.fromEntries(git(['ls-tree','-r','--format=%(path)\t%(objectname)',revision,'--',...scope]).trim().split('\n').filter(Boolean).map(row=>row.split('\t')));
}
function gitFiles(revision,paths){
 if(!paths.length)return {};
 const bytes=execFileSync('git',['cat-file','--batch'],{input:paths.map(p=>revision+':'+p).join('\n')+'\n',maxBuffer:64*1024*1024});
 const result={};let at=0;
 for(const p of paths){
  const end=bytes.indexOf(10,at),header=bytes.subarray(at,end).toString(),match=/^([a-f0-9]{40}) blob (\d+)$/.exec(header);
  assert(match,'complete frozen Git input: '+p);const size=Number(match[2]);at=end+1;
  const source=bytes.subarray(at,at+size).toString('utf8');at+=size;assert.equal(bytes[at++],10);
  assert.equal(bind(source).gitBlob,match[1],'complete original Git bytes: '+p);result[p]=source;
 }
 assert.equal(at,bytes.length);return result;
}
function immutable(path,sha){const bytes=readFileSync(path);assert.equal(hash(bytes),sha,'immutable predecessor: '+path);return JSON.parse(gunzipSync(bytes));}
const priorProduction=()=>immutable('tests/helpers/sts-style-source-epoch.json.gz','cc47fd96c79d7a604d2c5c269b012354d887762aecbe2990ac89fbf2ac74c1a9');
const priorCi=()=>immutable('tests/helpers/sts-style-ci-source.json.gz',feedbackPriorCiSha);
const productionInventory=()=>['config/architecture.json',...Object.keys(discoverSources())].sort();
export function collectFeedbackProduction(sourceCommit){
 const frozen=priorProduction(),scope=['config/architecture.json','src/lua'];
 const beforeGit=tree(feedbackBase,scope),afterGit=tree(sourceCommit,scope),originalGit=tree(frozen.currentCommit,scope);
 assert.deepEqual(beforeGit,originalGit,'d359 retains the exact complete a730 production tree');
 const inventory=productionInventory();assert.deepEqual(inventory,Object.keys(beforeGit).sort(),'complete feedback inventory');
 assert.deepEqual(Object.keys(afterGit).sort(),inventory,'no feedback production inventory change');
 const changes=inventory.filter(p=>beforeGit[p]!==afterGit[p]);assert.deepEqual(changes,feedbackProductionPaths,'only the reviewed feedback Lua edits');
 const beforeSources=gitFiles(feedbackBase,feedbackProductionPaths),before={},current={},samples={};
 for(const p of inventory){const source=norm(read(p));samples[p]=source;
  assert.equal(bind(source).gitBlob,afterGit[p],'reviewed committed feedback source: '+p);
 }
 for(const p of feedbackProductionPaths){before[p]=bind(beforeSources[p]);current[p]=bind(samples[p]);}
 assert.deepEqual(productionInventory(),inventory,'inventory changed during feedback collection');
 for(const [p,s]of Object.entries(samples))assert.equal(norm(read(p)),s,'source changed during feedback collection: '+p);
 return {schemaVersion:1,normalization:'LF',baseCommit:feedbackBase,sourceCommit,inventory,before,current};
}
function validateFrozenCi(proof){
 const sources=gitFiles(feedbackBase,[...new Set([...Object.keys(proof.files),...Object.keys(proof.helperSources)])]);
 for(const [p,row]of Object.entries(proof.files))assert.equal(sources[p],row.after.source,'complete frozen d359 CI source: '+p);
 for(const [p,row]of Object.entries(proof.helperSources))assert.equal(sources[p],row.source,'complete frozen d359 helper: '+p);
 assert.equal(hash(readFileSync('tests/helpers/sts-style-prior-runtime.json.gz')),'10bf3b7d960e4c02ae2d64e26d8d5f16824439b9396949973f08ccec1c9d9330','immutable pre-style runtime');
 assert.equal(hash(readFileSync('tests/helpers/closeout-source-closure.json')),feedbackPriorClosureSha,'immutable original helper-copy closure');
}
export function collectFeedbackCi(sourceCommit){
 const prior=priorCi();validateFrozenCi(prior);
 const production=gzipSync(Buffer.from(JSON.stringify(collectFeedbackProduction(sourceCommit))),{level:9});
 assert.deepEqual(readFileSync('tests/helpers/sts-feedback-production.json.gz'),production,'CI must bind the exact current feedback production patch');
 const scope=['scripts','tests','data','config','tools','.github','package.json','package-lock.json','.gitattributes','docs/legal/assets.json'];
 const changed=[...new Set([
  ...git(['diff',feedbackBase,'--name-only','--',...scope]).trim().split('\n'),
  ...git(['ls-files','--others','--exclude-standard','--',...scope]).trim().split('\n'),
 ])].filter(Boolean)
  .filter(p=>!['tests/helpers/sts-feedback-production.json.gz','tests/helpers/sts-feedback-ci.json.gz','tests/helpers/sts-feedback-ci-binding.mjs'].includes(p));
 for(const p of changed)assert(feedbackCiPaths.includes(p),'unregistered feedback CI drift: '+p);
 const beforeTree=tree(feedbackBase,scope),beforeSources=gitFiles(feedbackBase,feedbackCiPaths.filter(p=>Object.hasOwn(beforeTree,p)));
 const files={};
 for(const p of feedbackCiPaths){const after=norm(read(p)),before=beforeSources[p]??null;
  assert.notEqual(after,before,'registered feedback execution input must change: '+p);
  files[p]={before:before===null?null:bind(before),after:bind(after)};
 }
 const productTree=tree(sourceCommit,scope);
 for(const p of feedbackProductCiPaths)assert.equal(files[p].after.gitBlob,productTree[p],'complete committed feedback product input: '+p);
 const inventory=discoverJs();assert.deepEqual(inventory,[...prior.afterInventory,...feedbackAddedTests].sort(),'complete actual feedback Full inventory');
 const original=json('tests/helpers/closeout-source-closure.json'),helperClosure={};
 for(const p of feedbackClosurePaths)helperClosure[p]={before:original[p]??null,after:hash(p.endsWith('.gz')?readFileSync(p):norm(read(p)))};
 const helperSources=Object.fromEntries(feedbackHelperPaths.map(p=>[p,files[p].after]));
 for(const [p,row]of Object.entries(files))assert.equal(norm(read(p)),row.after.source,'CI source changed during collection: '+p);
 return {schemaVersion:1,normalization:'LF',baseCommit:feedbackBase,sourceCommit,priorArchiveSha256:feedbackPriorCiSha,
  inventoryBefore:prior.afterInventory,inventoryAfter:inventory,addedTests:feedbackAddedTests,files,helperSources,helperClosure};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve('tests/helpers/generate-sts-feedback-source.mjs')){
 const [mode,sourceCommit]=process.argv.slice(2);assert(['--check','--write-production','--write-ci'].includes(mode));
 const names=mode==='--write-production'?['production']:mode==='--write-ci'?['ci']:['production','ci'];
 const reports={};
 for(const name of names){const data=name==='production'?collectFeedbackProduction(sourceCommit):collectFeedbackCi(sourceCommit);
  const bytes=gzipSync(Buffer.from(JSON.stringify(data)),{level:9}),file='tests/helpers/sts-feedback-'+name+'.json.gz';
  if(mode==='--check')assert.deepEqual(readFileSync(file),bytes,'stale feedback '+name);else writeFileSync(file,bytes);
  if(name==='ci'){
   const leaf='tests/helpers/sts-feedback-ci-binding.mjs',source=renderFeedbackCiBinding(hash(bytes));
   if(mode==='--check')assert.equal(norm(read(leaf)),source,'exact feedback CI trust-leaf policy');else writeFileSync(leaf,source);
  }
  reports[name]={sha256:hash(bytes),bytes:bytes.length};
 }
 console.log(JSON.stringify(reports,null,2));
}
