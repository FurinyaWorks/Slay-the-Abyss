import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,readFileSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve,dirname,basename} from 'node:path';import {gzipSync,gunzipSync} from 'node:zlib';import {spawnSync} from 'node:child_process';
test('menu evidence gate rejects slow first frame despite successful rendering and low primitive count',()=>{
 const target=mkdtempSync(join(tmpdir(),'menu-scene-evidence-'));
 try{
  cpSync(resolve('docs/evidence/menu-native-2d-20261112'),target,{recursive:true});
  const file=join(target,'browser.json.gz'),browser=JSON.parse(gunzipSync(readFileSync(file)));
  // Explicit synthetic negative control: a captured frame is insufficient when late.
  browser.navigationToPositiveFrameMs=10000;browser.syntheticNegativeControl=true;
  writeFileSync(file,gzipSync(JSON.stringify(browser)));
  const run=spawnSync(process.execPath,['experiments/menu-ruins-review/verify.mjs',target],{encoding:'utf8',windowsHide:true});
  assert.notEqual(run.status,0);assert.match(run.stderr,/first running frame must stay below 3s/);
 }finally{
  assert.equal(dirname(resolve(target)),resolve(tmpdir()));assert(basename(target).startsWith('menu-scene-evidence-'));
  rmSync(target,{recursive:true,force:true});
 }
});
