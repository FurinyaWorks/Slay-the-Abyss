// Supplement the original receipt without changing it or rerunning tests.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,normalize} from 'node:path';
import {createHash} from 'node:crypto';
const dir='docs/evidence/m7-wheel-20261109/',receiptPath=dir+'source-final-receipt.json',logPath=dir+'source-final.log.gz';
const hash=x=>createHash('sha256').update(x).digest('hex'),read=p=>readFileSync(p,'utf8');
const receiptBytes=readFileSync(receiptPath),receipt=JSON.parse(receiptBytes),vm='tests/helpers/wheel-event-vm.mjs';
const mismatches=Object.entries(receipt.inputSha256After).flatMap(([path,atRun])=>{const current=hash(readFileSync(path));return current===atRun?[]:[{path,atRun,current}];});
assert.deepEqual(mismatches.map(x=>x.path),[vm]);
const modules=new Set(),data=new Set(),edges=[];
function visit(path){
 if(modules.has(path))return;modules.add(path);const source=read(path);
 // All relative static imports/re-exports in this inspected source closure use from literals.
 for(const match of source.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)){
  if(!match[1].startsWith('.'))continue;const target=normalize(dirname(path)+'/'+match[1]);edges.push({from:path,to:target});visit(target);
 }
 for(const match of source.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\)/g))data.add(normalize(dirname(path)+'/'+match[1]));
}
visit('tests/wheel-event-source-epoch.test.mjs');
const copyPath='tests/helpers/copy-integration-source-closure.mjs',copy=read(copyPath),manifestPath='tests/helpers/integration-source-closure.json';
const copied={...JSON.parse(read(manifestPath))};
for(const match of copy.matchAll(/"(tests\/(?:helpers|fixtures)\/[^"\n]+)": "([a-f0-9]{64})"/g))copied[match[1]]=match[2];
assert(!modules.has(vm));assert(!data.has(vm));assert(!Object.hasOwn(copied,vm));
const sourcePaths=Object.keys(receipt.inputSha256After).filter(p=>p==='config/architecture.json'||p.startsWith('src/lua/'));
const direct=['tests/fixtures/wheel-event-before.lua','tests/helpers/combined-epoch/pre-wheel-source-epoch.mjs'];
const relevant=[...new Set([...modules,...data,...Object.keys(copied),...sourcePaths,...direct])].sort();
const verified=Object.fromEntries(relevant.map(path=>{const current=hash(readFileSync(path));assert.equal(current,receipt.inputSha256After[path],path);if(Object.hasOwn(copied,path))assert.equal(current,copied[path],path+' copied hash');return [path,current];}));
const result={auditedAt:new Date().toISOString(),originalReceipt:receiptPath,originalReceiptSha256:hash(receiptBytes),originalLog:logPath,originalLogSha256:hash(readFileSync(logPath)),originalRun:{tests:receipt.tests,durationMs:receipt.durationMs,nodeReportedDurationMs:receipt.nodeReportedDurationMs,inputsUnchangedDuringRun:receipt.inputsUnchanged},capturedPathCount:Object.keys(receipt.inputSha256After).length,finalCapturedSetEqualsRun:false,laterMismatches:mismatches,staticModuleCount:modules.size,staticModules:[...modules].sort(),staticImportEdges:edges,literalURLData:[...data].sort(),copyManifestPaths:Object.keys(copied).sort(),verifiedRelevantPathCount:relevant.length,verifiedRelevantSha256:verified,dynamicReadReview:[
 'The test directly reads every non-null proof.current source (config/architecture.json and src/lua/*.lua), the fixed Wheel before fixture and the exact pre-wheel facade. Its live linked reader is invoked only with validated proof.owners paths.',
 'copyIntegrationSourceClosure reads only the fixed manifest and literal override paths enumerated here, verifies their hashes, and writes copies into the isolated temporary directory. Wheel VM is absent from this list.',
 'The generated child script imports only the copied combined-epoch/source-epoch.mjs and Node standard libraries. Its raw reader returns proof.current strings, not local VM files.',
 'The Act1 inverse import reads its fixed before Lua fixture at module load. The source test invokes only preAct1ChoiceSource on Wheel source; no behavior VM, Lua execution, mutant runner or comparable error helper is invoked.',
 'The receipt runner deliberately hashes all helper and fixture files before and after execution. Its broad capture includes Wheel VM even though the source test does not import, copy or execute it.'
 ],conclusion:'All inspected source-test import, fixed data, copy-manifest and production-reader inputs retain their recorded identities. Only an overcaptured behavior-VM helper changed later. The original run remains 5/5 and its wall measurement remains 23093 ms; this supplement is not a final-tree rerun or a full captured-set equality claim.'};
writeFileSync(dir+'source-final-scope-supplement.json',JSON.stringify(result,null,2)+'\n');console.log({captured:result.capturedPathCount,relevant:relevant.length,modules:modules.size,copied:Object.keys(copied).length,mismatches});
