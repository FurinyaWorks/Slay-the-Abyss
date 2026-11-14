import test from 'node:test';
import {release660CiCurrent} from './helpers/release-660-ci-current.mjs';
import {extendRelease660HelperClosure} from './helpers/release-660-helper-closure.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {discoverJs} from '../scripts/ci-shards.mjs';
import {integratedCiProof as proof,integratedSource,integratedPriorInventory,assertIntegratedCurrent,renderIntegratedCiBinding,extendIntegratedHelperClosure} from './helpers/integrated-ci-source.mjs';
const raw=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n'),hash=s=>createHash('sha256').update(s).digest('hex');

test('integration validates complete raw sources and leaves every foreign byte and production owner visible',()=>{
 assertIntegratedCurrent();assert.deepEqual(discoverJs(),proof.inventory);assert.equal(new Set(proof.inventory).size,proof.inventory.length);
 for(const [path,row]of Object.entries(proof.files))for(const target of Object.keys(proof.sources)){
  const source=raw(path),production=path.startsWith('src/')||path==='config/architecture.json';
  const expected=production?source:row.views[target]?.source??source;
  assert.equal(integratedSource(path,source,target),expected);
  if(!production&&row.views[target]){
   const crlf=source.replaceAll('\n','\r\n');
   assert.equal(integratedSource(path,crlf,target),row.views[target].sha256===hash(source)?crlf:expected);
  }
  for(const input of [source+'\n',source.slice(1),source.slice(0,-1),null,{},17])assert.equal(integratedSource(path,input,target),input);
  for(const foreign of ['__proto__','constructor','foreign/'+path])assert.equal(integratedSource(foreign,source,target),source);
 }
 for(const path of ['.gitattributes','docs/legal/assets.json','tests/helpers/closeout-source-epoch.mjs','tests/helpers/run-hud-ci-source.mjs','tests/helpers/integrated-ci-source.mjs'])
  assert.throws(()=>assertIntegratedCurrent((p,e)=>readFileSync(p,e)+(p===path?'\n':'')),/fresh complete integration source/);
 assert.equal(raw('tests/helpers/integrated-ci-binding.mjs'),renderIntegratedCiBinding(hash(readFileSync('tests/helpers/integrated-ci-source.json.gz'))));
 assert.equal(hash(readFileSync('tests/helpers/menu-red-before-integration-production-source.json.gz')),'ee888fd1686beaeffc2e439164619ecedee9ac00d2ca00a2711bd74c63e28cae');
});

test('integration copy closure requires its complete exact predecessor and current dependency bytes',()=>{
 const predecessor=Object.fromEntries(Object.entries(proof.closure).filter(([,row])=>row.before!==null).map(([p,row])=>[p,row.before]));
 predecessor['tests/helpers/retained.mjs']='a'.repeat(64);
 const result=extendIntegratedHelperClosure(predecessor);assert.equal(result['tests/helpers/retained.mjs'],predecessor['tests/helpers/retained.mjs']);
 for(const [path,row]of Object.entries(proof.closure)){
  assert.equal(result[path],row.after);
  assert.equal(hash(path.endsWith('.gz')?readFileSync(path):raw(path)),extendRelease660HelperClosure(result)[path]);
  assert.throws(()=>extendIntegratedHelperClosure({...predecessor,[path]:'f'.repeat(64)}),/copy predecessor/);
 }
});

test('release660 complete CI inputs preserve old views and freshly reject changed siblings',()=>{
 const path='data/presentation/ui_theme.json',row=proof.files[path],source=raw(path),target=Object.keys(row.views).find(k=>row.views[k]);
 assert.equal(integratedSource(path,source,target),row.views[target].source);
 assert.equal(integratedSource(path,row.current.source,target),row.views[target].source);
 for(const bad of [source+'\n',source.slice(1),source.slice(0,-1)])assert.equal(integratedSource(path,bad,target),bad);
 const sibling='tests/helpers/closeout-source-epoch.mjs';
 for(const missing of [false,true])assert.throws(()=>integratedSource(path,source,target,{read:(p,...args)=>{
  if(p===sibling){if(missing)throw Error('missing sibling');return raw(p)+'\n';}return readFileSync(p,...args);
 }}),/fresh complete integration source|missing sibling/);
 assert.equal(integratedSource(path,source,target),row.views[target].source);
});

test('release660 inventory continuation freshly rejects sibling bytes and deletion after warming',()=>{
 let choice;
 for(const kind of ['js','lua'])for(const target of Object.keys(proof.sources)){
  const current=kind==='js'?proof.inventory:proof.luaInventory,prior=proof.inventories[target][kind];
  if(current.some(path=>!prior.includes(path)&&Object.hasOwn(release660CiCurrent.files,path)))choice={kind,target,current,prior};
 }
 assert(choice,'a continued source is present in an admitted historical inventory');
 const {kind,target,current,prior}=choice;
 assert.deepEqual(integratedPriorInventory(current,target,kind),prior);
 for(const sibling of ['tests/helpers/closeout-source-epoch.mjs','tests/helpers/release-660-source-epoch.json.gz']){
  for(const missing of [false,true])assert.throws(()=>integratedPriorInventory(current,target,kind,(p,...args)=>{
   if(p===sibling){if(missing)throw Error('missing inventory sibling');const v=readFileSync(p,...args);return typeof v==='string'?v+'\n':Buffer.concat([v,Buffer.from('bad')]);}
   return readFileSync(p,...args);
  }),/fresh|missing inventory sibling/);
  assert.deepEqual(integratedPriorInventory(current,target,kind),prior);
 }
 assert(Object.isFrozen(release660CiCurrent)&&Object.isFrozen(release660CiCurrent.files)&&Object.isFrozen(Object.values(release660CiCurrent.files)[0]));
 assert.throws(()=>{release660CiCurrent.files['data/presentation/ui_theme.json'].after='f'.repeat(64);},TypeError);
});
