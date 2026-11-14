import test from 'node:test';
import {integratedRead} from './helpers/integrated-ci-source.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceEpoch,menuRedPriorEpoch} from './helpers/closeout-source-epoch.mjs';
import {extendMenuRedSourceEpoch,menuRedProductionPatch as patch} from './helpers/menu-red-source-epoch.mjs';
import {assertMenuRedCiCurrent,preMenuRedCiSource,menuRedCiProof,renderMenuRedCiBinding} from './helpers/menu-red-ci-source.mjs';
const raw=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n'),hash=s=>createHash('sha256').update(s).digest('hex');
test('red menu production preserves every prior owner and target and freshly rejects each changed owner drift',()=>{
 for(const path of patch.paths){
  assert.equal(raw(path),patch.current[path].source,path);
  assert.deepEqual(patch.before[path],menuRedPriorEpoch.proof.current[path]);
  assert.equal(sourceEpoch.preCombinedSource(path,raw(path),{target:'menuRedPrior',readSource:raw}),patch.before[path].source);
  for(const changed of [raw(path)+'\n',null])assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),
   {target:'menuRedPrior',readSource:p=>p===path?changed:raw(p)}),/linked owner identity/);
 }
 for(const [target,row]of Object.entries(menuRedPriorEpoch.proof.targets))assert.deepEqual(sourceEpoch.proof.targets[target],row);
 assert.deepEqual(Object.keys(sourceEpoch.proof.current).sort(),patch.inventory);
 const missing=structuredClone(patch);delete missing.current[patch.paths[0]];
 assert.throws(()=>extendMenuRedSourceEpoch(menuRedPriorEpoch,missing));
});
test('red menu CI requires complete exact source and retains unknown or drifted inputs',()=>{
 const raw=p=>integratedRead('menu')(p,'utf8').replaceAll('\r\n','\n');
 assertMenuRedCiCurrent();
 for(const [path,row]of Object.entries(menuRedCiProof.files)){
  const source=raw(path);
  for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(preMenuRedCiSource(path,input),row.before?.source??input);
  for(const input of [source+'\n',source.slice(1),source.slice(0,-1),null,{},17])assert.equal(preMenuRedCiSource(path,input),input);
  for(const unknown of ['__proto__','constructor','foreign/'+path])assert.equal(preMenuRedCiSource(unknown,source),source);
 }
 const sha=hash(readFileSync('tests/helpers/menu-red-ci-source.json.gz'));
 assert.equal(raw('tests/helpers/menu-red-ci-binding.mjs'),renderMenuRedCiBinding(sha));
});
