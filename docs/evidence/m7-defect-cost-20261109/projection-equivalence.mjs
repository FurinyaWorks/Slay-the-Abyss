import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
const root=process.cwd(),dir='docs/evidence/m7-defect-cost-20261109',hash=b=>createHash('sha256').update(b).digest('hex');
const calibration='tests/helpers/ci-complete-calibration-source-inverse.mjs',reward='tests/helpers/reward-query-planning-contract.mjs',shape='scripts/ci-quality-shape.mjs';
const base='fb04fd36ab4fbdba71c0da08bf71d2899143f69b';
const prior=p=>execFileSync('git',['show',`${base}:${p}`],{encoding:'utf8',maxBuffer:64*1024*1024});
const args=process.argv.slice(2);
assert.ok(args.length===0||args.length===2&&args[0]==='--output','Usage: node projection-equivalence.mjs [--output new-output.json.gz]');
const output=resolve(args[1]??`build/posix15-projection-replay-${Date.now()}.json.gz`);
assert.notEqual(output,fileURLToPath(import.meta.url),'never overwrite this script');
assert.ok(!existsSync(output),'output must be a new file; never overwrite evidence');
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean).map(p=>resolve(p));
assert.ok(!tracked.includes(output),'never overwrite a tracked file');
const originalReceiptPath=resolve(dir,'projection-equivalence-receipt.json.gz');
assert.notEqual(output,originalReceiptPath,'never overwrite the historical receipt');
const originalReceiptBytes=readFileSync(originalReceiptPath);
assert.equal(hash(originalReceiptBytes),'a423a9dfe824438a74a2f3aafab39e47035fffb3eaf129c8f9e2f43c94db7761','immutable first-run receipt');
const originalReceipt=JSON.parse(gunzipSync(originalReceiptBytes));

const oldCalibration=prior(calibration),newCalibration=readFileSync(calibration,'utf8'),oldReward=prior(reward),newReward=readFileSync(reward,'utf8');
assert.equal(hash(oldCalibration),originalReceipt.helperSource[calibration].beforeSha256,'published remote base has the exact original calibration bytes');
assert.equal(hash(oldReward),originalReceipt.helperSource[reward].beforeSha256,'published remote base has the exact original reward helper bytes');
assert.equal(newCalibration,"import {prePosix15ShapeSource} from './posix15-shape-source-inverse.mjs';\n"+oldCalibration.replace('export function preCurrentCiPlacementSource(path,source){','export function preCurrentCiPlacementSource(path,source){\n source=prePosix15ShapeSource(path,source);'));
assert.equal(newReward,"import {prePosix15ShapeSource} from './posix15-shape-source-inverse.mjs';\n"+oldReward.replace("prePosix14ShapeSource('scripts/ci-quality-shape.mjs',liveContext.read('scripts/ci-quality-shape.mjs'))","prePosix14ShapeSource('scripts/ci-quality-shape.mjs',prePosix15ShapeSource('scripts/ci-quality-shape.mjs',liveContext.read('scripts/ci-quality-shape.mjs')))"));
// Keep the exact old implementation and dependency identities. Only module URL
// resolution changes so an immutable in-memory module reads its original fixtures.
const originalUrl=pathToFileURL(resolve(calibration)).href;
const loadedOld=oldCalibration.replace(/from (['"])(\.[^'"]+)\1/g,(_,q,p)=>`from ${q}${new URL(p,originalUrl).href}${q}`).replaceAll('import.meta.url',JSON.stringify(originalUrl));
assert.equal(hash(oldCalibration),hash(execFileSync('git',['show',`${base}:${calibration}`])));
const before=await import('data:text/javascript,'+encodeURIComponent(loadedOld));
const after=await import(originalUrl);
const {prePosix15ShapeSource,posix15ShapeProof}=await import(pathToFileURL(resolve('tests/helpers/posix15-shape-source-inverse.mjs')).href);
assert.equal(prior(shape),posix15ShapeProof.beforeSource);assert.equal(readFileSync(shape,'utf8'),posix15ShapeProof.afterSource);
const roots=['scripts','tests','config','src/lua','data','.github','package.json','package-lock.json'];
const isText=p=>/\.(?:mjs|lua|json|yml|yaml|txt|md)$/.test(p);
const inputPaths=execFileSync('git',['ls-tree','-r','--name-only',base,'--',...roots],{encoding:'utf8'}).trim().split('\n').filter(isText);
assert.deepEqual(inputPaths,originalReceipt.records.map(row=>row.path),'fixed published-base inventory reproduces the original3478-input domain');
const originalRecords=new Map(originalReceipt.records.map(row=>[row.path,row]));
const records=[],projectors=['preCurrentCiPlacementSource','preCiCompleteCalibrationSource'];
for(const path of inputPaths){
 const source=readFileSync(path,'utf8'),oldSource=path===shape?posix15ShapeProof.beforeSource:source;
 assert.equal(hash(source),originalRecords.get(path).afterInputSha256,'current input must retain its measured candidate bytes: '+path);
 const outputs={};
 for(const fn of projectors){const a=before[fn](path,oldSource),b=after[fn](path,source);assert.equal(b,a,`${fn}: ${path}`);outputs[fn]=hash(b);}
 if(path!==shape)assert.equal(prePosix15ShapeSource(path,source),source,'foreign-path identity: '+path);
 const row={path,beforeInputSha256:hash(oldSource),afterInputSha256:hash(source),outputSha256:outputs};
 assert.deepEqual(row,originalRecords.get(path),'reproduce both original output hashes: '+path);
 records.push(row);
}
const classify=(fn,path,input)=>{try{return {kind:'return',value:fn(path,input)};}catch(error){return {kind:'throw',name:error.name,message:error.message};}};
for(const input of [undefined,null,{},42,'','changed source',posix15ShapeProof.afterSource+'\n',posix15ShapeProof.afterSource.slice(1),posix15ShapeProof.afterSource.replace('length:15','length:16'),posix15ShapeProof.beforeSource])for(const path of [shape,'foreign','src/lua/abyss_combat.lua']){
 assert.equal(prePosix15ShapeSource(path,input),input);
 for(const fn of projectors)assert.deepEqual(classify(after[fn],path,input),classify(before[fn],path,input));
}
assert.equal(after.prePosix14ShapeSource(shape,prePosix15ShapeSource(shape,posix15ShapeProof.afterSource)),before.prePosix14ShapeSource(shape,posix15ShapeProof.beforeSource));
const guards=['scripts/ci-shards.mjs','scripts/test-lua.mjs','scripts/ci-test-timings.json','.github/workflows/quality.yml','scripts/verify-delivery.mjs','scripts/publish-full-quality.mjs','scripts/publish-merge-group.mjs'];
for(const p of guards)assert.equal(readFileSync(p,'utf8'),prior(p),'unchanged runtime '+p);
// New textual helpers are reported separately, independent of git staging or commit.
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
const currentText=roots.flatMap(p=>p.endsWith('.json')?[p]:walk(p)).filter(isText).sort();
const supplemental=[];
for(const path of currentText.filter(p=>!originalRecords.has(p))){
 const source=readFileSync(path,'utf8');assert.equal(prePosix15ShapeSource(path,source),source);
 for(const fn of projectors)assert.equal(after[fn](path,source),before[fn](path,source));
 supplemental.push({path,inputSha256:hash(source),nonShapeIdentity:true});
}
const receipt={scope:'Deterministic complete-source projection equivalence, not execution of the entire dependent test closure. Current exact shape15 is compared with its authenticated prior shape14. Every other listed complete textual input is identical on both sides. No heap, timing or gameplay change.',base,originalReceiptSha256:hash(originalReceiptBytes),publishedBaseInputInventory:true,supplementalTextInputs:supplemental,oldLoaderSourceSha256:hash(loadedOld),loaderTransform:'Exact git old helper source; relative import from URLs rebased to original helper directory; import.meta.url replaced with original absolute file URL. No executable projection logic changed.',functions:projectors,inputCount:records.length,nonShapeIdentityCount:records.length-1,helperSource:{[calibration]:{beforeSha256:hash(oldCalibration),afterSha256:hash(newCalibration)},[reward]:{beforeSha256:hash(oldReward),afterSha256:hash(newReward)}},shape:posix15ShapeProof,unchangedRuntimeSha256:Object.fromEntries(guards.map(p=>[p,hash(readFileSync(p))])),records};
const raw=JSON.stringify(receipt,null,2)+'\n';mkdirSync(dirname(output),{recursive:true});writeFileSync(output,gzipSync(raw,{mtime:0}),{flag:'wx'});
console.log(JSON.stringify({pass:true,functions:projectors,inputCount:records.length,nonShapeIdentityCount:records.length-1,supplementalTextInputCount:supplemental.length,output:relative(root,output),receiptSha256:hash(raw)},null,2));
