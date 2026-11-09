// Supplement the original receipt without changing it or rerunning tests.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {dirname,normalize} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const dir='docs/evidence/m7-wheel-20261109/';
const results=[];
for(const name of ['source-final','stasis-historical','integration-source']){
const receiptPath=dir+name+'-receipt.json',logPath=dir+name+'.log.gz';
const hash=x=>createHash('sha256').update(x).digest('hex'),read=p=>readFileSync(p,'utf8');
const receiptBytes=readFileSync(receiptPath),receipt=JSON.parse(receiptBytes),vm='tests/helpers/wheel-event-vm.mjs';
const mismatches=Object.entries(receipt.inputSha256After).flatMap(([path,atRun])=>{const current=hash(readFileSync(path));return current===atRun?[]:[{path,atRun,current}];});
const planning='tests/helpers/reward-query-planning-contract.mjs';
assert.deepEqual(mismatches.map(x=>x.path).sort(),(name==='source-final'?[vm,planning]:[planning]).sort());
const modules=new Set(),data=new Set(),edges=[];
function visit(path){
 if(modules.has(path))return;modules.add(path);const source=read(path);
 // All relative static imports/re-exports in this inspected source closure use from literals.
 for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\(\s*)['"]([^'"]+)['"]/g)){
  if(!match[1].startsWith('.'))continue;const target=normalize(dirname(path)+'/'+match[1]);edges.push({from:path,to:target});visit(target);
 }
 for(const match of source.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\)/g))data.add(normalize(dirname(path)+'/'+match[1]));
}
visit(receipt.testFile);
// Resolve the integration test's finite template import from its literal case list.
if(name==='integration-source'){
 const source=read(receipt.testFile),block=source.slice(source.indexOf('const cases=['),source.indexOf('];',source.indexOf('const cases=[')));
 for(const match of block.matchAll(/\['([^']+)'/g))visit('tests/helpers/'+match[1]+'-source-inverse.mjs');
}
// The Stasis dynamic isolated import resolves to this already copied module.
if(name==='stasis-historical')visit('tests/helpers/combined-epoch/pre-wheel-source-epoch.mjs');
const copyPath='tests/helpers/copy-integration-source-closure.mjs',copy=read(copyPath),manifestPath='tests/helpers/integration-source-closure.json';
const copied={...JSON.parse(read(manifestPath))};
for(const match of copy.matchAll(/"(tests\/(?:helpers|fixtures)\/[^"\n]+)": "([a-f0-9]{64})"/g))copied[match[1]]=match[2];
for(const changed of mismatches){assert(!modules.has(changed.path));assert(!data.has(changed.path));assert(!Object.hasOwn(copied,changed.path));}
const sourcePaths=Object.keys(receipt.inputSha256After).filter(p=>p==='config/architecture.json'||p.startsWith('src/lua/'));
const direct=['tests/fixtures/wheel-event-before.lua','tests/helpers/combined-epoch/pre-wheel-source-epoch.mjs'];
const directoryURLs=[...data].filter(p=>statSync(p).isDirectory());
for(const p of directoryURLs)data.delete(p);
const relevant=[...new Set([...modules,...data,...Object.keys(copied),...sourcePaths,...direct])].sort();
const uncaptured=[];
const verified=Object.fromEntries(relevant.map(path=>{const current=hash(readFileSync(path));if(Object.hasOwn(receipt.inputSha256After,path))assert.equal(current,receipt.inputSha256After[path],path);else{
 const original=spawnSync('git',['show','ef6b62a23aa85b41e32fb6e5c4e95b697b41d66c:'+path],{maxBuffer:32*1024*1024});assert.equal(original.status,0);assert.equal(current,hash(original.stdout));uncaptured.push({path,currentSha256:current,baselineMatches:true,limitation:'Not captured at original run time; current fixed-base comparison is supplementary, not retrospective execution-time identity.'});
 }if(Object.hasOwn(copied,path))assert.equal(current,copied[path],path+' copied hash');return [path,current];}));
const result={name,directoryURLs,uncapturedTransitiveDependencies:uncaptured,auditedAt:new Date().toISOString(),originalReceipt:receiptPath,originalReceiptSha256:hash(receiptBytes),originalLog:logPath,originalLogSha256:hash(readFileSync(logPath)),originalRun:{tests:receipt.tests,durationMs:receipt.durationMs,nodeReportedDurationMs:receipt.nodeReportedDurationMs,inputsUnchangedDuringRun:receipt.inputsUnchanged},capturedPathCount:Object.keys(receipt.inputSha256After).length,finalCapturedSetEqualsRun:false,laterMismatches:mismatches,staticModuleCount:modules.size,staticModules:[...modules].sort(),staticImportEdges:edges,literalURLData:[...data].sort(),copyManifestPaths:Object.keys(copied).sort(),verifiedRelevantPathCount:relevant.length,verifiedRelevantSha256:verified,dynamicReadReview:[
 'All production reader paths are bounded to config/architecture.json and src/lua/*.lua through validated epoch proofs; the captured sources are included in this audit.',
 'The exact copy manifest and overrides are enumerated and hash-verified. They are executed by source-final and stasis-historical; for integration-source they are a conservative extra checked superset, not an assertion that copying occurred.',
 'The receipt runner hashes all helpers and fixtures before and after execution, whether or not the test reads them. Later mismatches are checked against actual imports, fixed-data reads and the copied path set.',
 ...(name==='source-final' ? [
 'The test reads the fixed Wheel before fixture and pre-wheel facade. Its isolated child imports only the copied combined epoch and uses proof strings as its raw reader.',
 'Its Act1 inverse invocation projects Wheel source; no Wheel behavior VM, Lua execution or error-normalization helper is invoked.'
 ] : name==='stasis-historical' ? [
 'The test dynamically imports copied pre-wheel-source-epoch.mjs from its isolated directory; the graph and entire copy manifest are checked.',
 'stasis-replay-before.mjs reads its fixed archived Lua texts and calls luaString to construct preload text. This imports build-lua-data.mjs, build-original-v4.mjs and validate-data.mjs; these three script hashes were not captured in the original run. They currently match fixed ef6b baseline bytes; this is not retroactive run-time capture. Data-build entry points are guarded and not invoked by the test.'
 ] : [
 'The integration test dynamically imports combined-epoch/source-epoch.mjs plus 16 literal case-list inverse modules. The audit resolves every case-list template import, as well as literal dynamic imports.',
 'Retirement checks read only bounded production Lua sources and temporary fixture copies derived from proof strings, and perform filesystem identity checks. No planning contract or Wheel VM is imported or executed.'
 ])
 ],conclusion:'No later mismatched captured helper is imported, copied or executed by this test. All captured relevant inputs retain their recorded identities. Any uncaptured transitive dependencies are listed separately with current fixed-base identity only. Original run results and measurements are unchanged; this is not a final-tree rerun or full captured-set equality claim.'};
results.push(result);console.log({name,captured:result.capturedPathCount,relevant:relevant.length,modules:modules.size,copied:Object.keys(copied).length,uncaptured:uncaptured.length,mismatches});
}
writeFileSync(dir+'source-successful-scope-supplement.json',JSON.stringify({supersedes:'source-final-scope-supplement.json (retained unchanged as earlier inspection)',results},null,2)+'\n');
