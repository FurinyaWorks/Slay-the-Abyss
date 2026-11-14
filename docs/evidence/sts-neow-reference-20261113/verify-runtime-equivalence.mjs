// CI/storage-only edits may change the broad source receipt. Reuse a capture
// only if the generated application and the actual SDK input remain identical.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [beforePath,afterPath,outputPath,mode='neow']=process.argv.slice(2);
assert(beforePath&&afterPath&&outputPath,'before, after and output paths are required');
assert(['neow','character'].includes(mode),'mode must be neow or character');
const [beforeDir,afterDir,output]=[beforePath,afterPath,outputPath].map(p=>path.resolve(p));
const load=dir=>JSON.parse(fs.readFileSync(path.join(dir,'receipt.json')));
const before=load(beforeDir),after=load(afterDir);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const receipt of [before,after])assert.equal(digest(Buffer.from(JSON.stringify(receipt.inputs))),receipt.sourceClosureSha256);
// Exact input inventory used by shop-deck-parity-20261112/prepare-visual.mjs,
// which the Neow preparer reuses. A receipt cannot hide stale inputs by omission.
const currentInputs={};
function collect(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,entry.name);
 if(entry.isDirectory())collect(file);
 else if(/\.(lua|mjs|js|json|py)$/.test(file))currentInputs[file.replaceAll('\\','/')]=digest(fs.readFileSync(file));
}}
for(const dir of ['src/lua','scripts','data','config','tools'])collect(dir);
for(const receipt of [before,after])assert.deepEqual(Object.keys(receipt.inputs).sort(),Object.keys(currentInputs).sort(),'complete current preparation input inventory');
const allowed=new Set(['scripts/test-affected.mjs','scripts/ci-media-lfs.mjs','scripts/check-license.mjs','config/ci-media-lfs.json']);
const changed=Array.from(new Set([...Object.keys(before.inputs),...Object.keys(after.inputs)]))
 .filter(p=>before.inputs[p]!==after.inputs[p]);
assert(changed.every(p=>allowed.has(p)),'An application input changed outside the reviewed CI-only paths: '+changed.join(', '));
for(const [file,hash]of Object.entries(after.inputs)){
 assert(!path.isAbsolute(file)&&!file.split(/[\\/]/).includes('..'),'input path must remain repository-relative');
 assert.equal(currentInputs[file],hash,'After receipt is stale for current input: '+file);
}
assert.equal(Object.keys(before.generated).length,25);assert.equal(Object.keys(after.generated).length,25);
for(const [dir,receipt]of [[beforeDir,before],[afterDir,after]]){
 const actual=fs.readdirSync(path.join(dir,'generated'),{withFileTypes:true}).map(entry=>{
  assert(entry.isFile(),'generated inventory must contain regular files only');return entry.name;
 }).sort();
 assert.deepEqual(actual,Object.keys(receipt.generated).sort(),'generated receipt omits or invents disk outputs');
}
assert.deepEqual(Object.keys(before.generated).sort(),Object.keys(after.generated).sort());
const generated=[];
for(const file of Object.keys(before.generated)){
 const a=fs.readFileSync(path.join(beforeDir,'generated',file)),b=fs.readFileSync(path.join(afterDir,'generated',file));
 assert(a.equals(b),'Generated application bytes changed: '+file);
 assert.equal(digest(a),before.generated[file]);assert.equal(digest(b),after.generated[file]);
 generated.push({file,sha256:digest(a),bytes:a.length});
}
const expectedScenarios=mode==='neow'?['four','two']:['character'];
assert.deepEqual(Object.keys(before.scenarios).sort(),expectedScenarios);
assert.deepEqual(Object.keys(after.scenarios).sort(),expectedScenarios);
const scenarios=[];
for(const key of Object.keys(before.scenarios)){
 const a=fs.readFileSync(path.join(beforeDir,before.scenarios[key].file));
 const b=fs.readFileSync(path.join(afterDir,after.scenarios[key].file));
 assert(a.equals(b),'Actual SDK archive bytes changed: '+key);
 assert.equal(digest(a),before.scenarios[key].sha256);assert.equal(digest(b),after.scenarios[key].sha256);
 scenarios.push({scenario:key,sha256:digest(a),bytes:a.length});
}
const result={status:'BYTE_IDENTICAL_APPLICATION',mode,beforeSourceClosure:before.sourceClosureSha256,
 afterSourceClosure:after.sourceClosureSha256,changedInputs:changed,generated,scenarios,
 meaning:'Existing SDK captures use exactly the same application bytes; broad source changes are limited to reviewed CI/storage scripts.',
 officialImport:false,officialReady:false,deviceEvidence:false};
assert(!fs.existsSync(output),'Do not overwrite an equivalence record');
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
