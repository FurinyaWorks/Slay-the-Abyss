import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,readFileSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve,dirname,basename} from 'node:path';import {gzipSync,gunzipSync} from 'node:zlib';import {spawnSync} from 'node:child_process';
function rejected(fileName,mutate,message){
 const target=mkdtempSync(join(tmpdir(),'menu-scene-evidence-'));
 try{
  cpSync(resolve('docs/evidence/menu-native-2d-20261112'),target,{recursive:true});
  const file=join(target,fileName),compressed=fileName.endsWith('.gz'),value=JSON.parse(compressed?gunzipSync(readFileSync(file)):readFileSync(file));
  mutate(value);value.syntheticNegativeControl=true;
  writeFileSync(file,compressed?gzipSync(JSON.stringify(value)):JSON.stringify(value));
  const run=spawnSync(process.execPath,['experiments/menu-ruins-review/verify.mjs',target],{encoding:'utf8',windowsHide:true});
  assert.notEqual(run.status,0);assert.match(run.stderr,message);
 }finally{
  assert.equal(dirname(resolve(target)),resolve(tmpdir()));assert(basename(target).startsWith('menu-scene-evidence-'));
  rmSync(target,{recursive:true,force:true});
 }
}
test('menu evidence gate rejects slow first frame despite successful rendering and low primitive count',()=>{
 rejected('browser.json.gz',r=>{r.navigationToPositiveFrameMs=10000},/first running frame must stay below 3s/);
});
test('menu evidence gate rejects substituted dirty candidate and renderer identities',()=>{
 rejected('candidate.json.gz',r=>{r.sourceDirty=true},/same candidate sourceDirty/);
 rejected('browser.json.gz',r=>{r.rendererSha256='0'.repeat(64)},/same renderer signature/);
 rejected('paired-sdk.json',r=>{r.sdkSha256='0'.repeat(64)},/same SDK signature/);
});
