import {preNativeMonsterArtSource} from './helpers/native-monster-art-source-inverse.mjs';
import test from 'node:test';
import {historicalTest} from './helpers/historical-baseline-inputs.mjs';
import assert from 'node:assert/strict';
import {preRelicRound3CompositionSource} from './helpers/relic-round3-composition.mjs';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync,symlinkSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {projectArtPerfSource,artPerfSourceComposition} from './helpers/art-perf-source-composition.mjs';
// Exact 98fef inputs retain the original catalog and retirement contracts.
import {round3CatalogProof as proof,preRound3CatalogSource as prior,prepareRound3CatalogModuleRetirement as retire} from './helpers/epochs/develop/tests/helpers/round3-catalog-source-inverse.mjs';
import {preRound3CatalogSource as currentProject,prepareRound3CatalogModuleRetirement as currentRetire} from './helpers/round3-catalog-source-inverse.mjs';
import {sourceEpoch} from './helpers/combined-epoch/source-epoch.mjs';
import {gameUiExtractionProof} from './helpers/epochs/develop/tests/helpers/game-ui-extraction-source-inverse.mjs';
import {coreLifecycleSourceProof} from './helpers/epochs/develop/tests/helpers/core-lifecycle-source-inverse.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const current=path=>preRelicRound3CompositionSource(path,preNativeMonsterArtSource(path,readFileSync(path,'utf8')),'round3').replaceAll('\r\n','\n');
const added='src/lua/abyss_combat_catalog.lua';
for(const path of ['config/architecture.json','src/lua/abyss_combat.lua']){
 historicalTest('exact catalog delta recovers complete rebased 1bfca626 identity: '+path,()=>{
  const source=current(path),binding=proof.files[path];
  assert.equal(hash(source),binding.afterSha256);
  const original=prior(path,source);
  assert.equal(hash(original),binding.beforeSha256);
  assert.equal(prior(path,original),original);
  assert.equal(prior(path,source.replaceAll('\n','\r\n')),original);
 });
 historicalTest('catalog inverse exposes partial, extra and duplicate drift: '+path,()=>{
  const source=current(path),binding=proof.files[path];
  const hunk=binding.hunks.find(h=>h.after.length),text=hunk.after.join('\n');
  for(const drift of [source+'\n-- extra\n',source.slice(1),source.replace(text,hunk.before.join('\n')),source.replace(text,text+'\n'+text)]){
   assert.notEqual(drift,source);assert.equal(prior(path,drift),drift);
  }
  assert.equal(prior('src/lua/unknown.lua',source),source);
  assert.equal(prior(path,null),null);
 });
 historicalTest('catalog inverse binds complete extracted responsibility: '+path,()=>{
  const source=current(path);
  for(const readSource of [()=>{throw new Error('missing');},()=>null,()=>current(added)+'\n-- drift\n',()=>current(added).replace('Colorless.withCards','Other.withCards')]){
   assert.throws(()=>prior(path,source,{readSource}),/catalog linked/);
  }
 });
}

historicalTest('rebased config retains the exact original 9293405d performance identity through the unchanged art proof',()=>{
 const path='config/architecture.json';
 assert.equal(hash(prior(path,current(path))),artPerfSourceComposition.files[path].currentSha256);
 assert.equal(hash(projectArtPerfSource(path,current(path),'perf')),
  '2a067420c4503b0efdf16ebe22eb7177a69759e4d41e50a15161422f6dcc41ed');
 assert.equal(hash(projectArtPerfSource(path,current(path),'art')),artPerfSourceComposition.files[path].targets.art.sha256);
});
historicalTest('only exact catalog module has no historical identity',()=>{
 const source=current(added);
 assert.equal(prior(added,source),null);
 assert.equal(prior(added,source+'\n'),source+'\n');
 assert.equal(prior('src/lua/renamed_catalog.lua',source),source);
});
historicalTest('retirement validates the exact copied module before deferred cleanup and refuses the live tree',()=>{
 assert.throws(()=>retire(process.cwd()),/separate historical destination/);
 const directory=mkdtempSync(join(tmpdir(),'abyss-catalog-inverse-'));
 try{
  mkdirSync(join(directory,'src/lua'),{recursive:true});
  const target=join(directory,added);writeFileSync(target,current(added)+'\n-- unknown\n');
  assert.throws(()=>retire(directory),/unreviewed catalog module destination/);
  assert.ok(existsSync(target),'rejected source stays intact');
  writeFileSync(target,current(added));const cleanup=retire(directory);
  assert.ok(existsSync(target),'validation itself never removes files');
  cleanup();assert.equal(existsSync(target),false);
  retire(directory)();assert.ok(existsSync(added),'live source remains intact');
 }finally{rmSync(directory,{recursive:true,force:true});}
});

historicalTest('retirement refuses content changed after preparation and preserves the file',()=>{
 const directory=mkdtempSync(join(tmpdir(),'abyss-catalog-drift-'));
 try{
  mkdirSync(join(directory,'src/lua'),{recursive:true});
  const target=join(directory,added);writeFileSync(target,current(added));
  const cleanup=retire(directory),changed=current(added)+'\n-- changed after preparation\n';
  writeFileSync(target,changed);
  assert.throws(cleanup,/unreviewed catalog module destination/);
  assert.equal(readFileSync(target,'utf8'),changed);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

function linkDirectory(t,target,path){
 try{symlinkSync(target,path,process.platform==='win32'?'junction':'dir');return true;}
 catch(error){
  if(!['EPERM','EACCES','ENOTSUP'].includes(error.code))throw error;
  t.skip('directory links unavailable: '+error.code);return false;
 }
}
historicalTest('retirement rejects a directory alias for the source module',t=>{
 const directory=mkdtempSync(join(tmpdir(),'abyss-catalog-alias-'));
 try{
  const sourceRoot=join(directory,'source'),alias=join(directory,'alias');
  mkdirSync(join(sourceRoot,'src/lua'),{recursive:true});
  writeFileSync(join(sourceRoot,added),current(added));
  if(!linkDirectory(t,sourceRoot,alias))return;
  assert.throws(()=>retire(alias,{sourceRoot}),/separate historical module/);
  assert.ok(existsSync(join(sourceRoot,added)));
 }finally{rmSync(directory,{recursive:true,force:true});}
});
historicalTest('retirement rejects a destination retargeted after preparation',t=>{
 const directory=mkdtempSync(join(tmpdir(),'abyss-catalog-retarget-'));
 try{
  const sourceRoot=join(directory,'source'),historical=join(directory,'historical');
  for(const root of [sourceRoot,historical]){
   mkdirSync(join(root,'src/lua'),{recursive:true});writeFileSync(join(root,added),current(added));
  }
  const cleanup=retire(historical,{sourceRoot});
  renameSync(join(historical,'src/lua'),join(historical,'src/saved-lua'));
  if(!linkDirectory(t,join(sourceRoot,'src/lua'),join(historical,'src/lua')))return;
  assert.throws(cleanup,/catalog module destination changed/);
  assert.ok(existsSync(join(sourceRoot,added)));
  assert.ok(existsSync(join(historical,'src/saved-lua/abyss_combat_catalog.lua')));
 }finally{rmSync(directory,{recursive:true,force:true});}
});


const readLive=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
function isolated(t){const root=mkdtempSync(join(tmpdir(),'current-catalog-contract-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;}
function write(root,path,source){const target=join(root,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,source);return target;}

test('current catalog hosts retain authenticated intermediate epochs and freshly validate every raw owner',()=>{
 // These are the frozen GameUI/lifecycle destinations actually admitted by develop's chain.
 // They are deliberately not claimed to be the much older round-three beforeSource tested above.
 const expected={
  'config/architecture.json':gameUiExtractionProof.files['config/architecture.json'],
  'src/lua/abyss_combat.lua':coreLifecycleSourceProof.files['src/lua/abyss_combat.lua'],
 };
 const current=Object.fromEntries(Object.keys(sourceEpoch.proof.current).map(p=>[p,readLive(p)]));
 for(const [path,binding]of Object.entries(expected)){
  assert.equal(hash(binding.beforeSource),binding.beforeSha256);
  if(binding.beforeGitBlob)assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.beforeSource)}\0`).update(binding.beforeSource).digest('hex'),binding.beforeGitBlob);
  assert.notEqual(binding.beforeSha256,proof.files[path].beforeSha256,'current intermediate epoch is not old round-three history');
  let bad=null,mode='good',seen=[];
  const raw=p=>{
   seen.push(p);
   if(p===bad){
    if(mode==='throw')throw Error('current catalog reader sentinel');
    if(mode==='missing')return undefined;if(mode==='null')return null;
    if(mode==='buffer')return Buffer.from(current[p]);if(mode==='changed')return current[p]+'\n';
   }
   return current[p];
  };
  const wrapped=sourceEpoch.combinedReader(sourceEpoch.combinedReader(raw,'develop'),'develop');
  assert.equal(sourceEpoch.combinedReader(wrapped,'develop'),wrapped);
  const check=()=>assert.equal(currentProject(path,current[path],{readSource:wrapped}),binding.beforeSource);
  check();const first=[...seen];for(const owner of sourceEpoch.proof.owners)assert(first.includes(owner),'fresh current catalog owner: '+owner);
  seen=[];check();assert.deepEqual(seen,first,'warm calls repeat the full raw-read sequence');
  for(bad of sourceEpoch.proof.owners){
   for(mode of ['changed','missing','null','buffer','throw']){
    seen=[];assert.throws(check,error=>{
     assert.match(error.message,/linked owner/);assert(error.message.includes(bad));
     if(mode==='throw')assert.match(error.message,/current catalog reader sentinel/);return true;
    });
    assert(seen.includes(bad));
    // Keep each fault-type recovery on the config owner and each owner's full recovery.
    if(bad==='config/architecture.json'){const previous=mode;mode='good';check();mode=previous;}
   }
   if(bad!=='config/architecture.json'){mode='good';check();}
  }
 }
 assert.equal(currentProject(added,current[added],{readSource:p=>current[p]}),null);
});

test('current catalog retirement checks complete bytes before preparation and cleanup without deleting rejected copies',t=>{
 assert.throws(()=>currentRetire(process.cwd()),/separate retirement destination/);
 const root=isolated(t),source=readLive(added),target=write(root,added,source+'\n-- unknown\n');
 assert.throws(()=>currentRetire(root),/complete retirement catalog identity/);
 assert.equal(readFileSync(target,'utf8'),source+'\n-- unknown\n');
 writeFileSync(target,source);const cleanup=currentRetire(root);assert(existsSync(target),'preparation does not delete');
 const changed=source+'\n-- changed after preparation\n';writeFileSync(target,changed);
 assert.throws(cleanup,/complete retirement catalog identity/);assert.equal(readFileSync(target,'utf8'),changed);
 writeFileSync(target,source);currentRetire(root)();assert(!existsSync(target));
 currentRetire(root)();assert.equal(readLive(added),source,'live catalog remains intact');
});

test('current catalog retirement rejects directory aliases before any deletion',t=>{
 const root=isolated(t),alias=join(root,'alias'),source=readLive(added);
 if(!linkDirectory(t,process.cwd(),alias))return;
 assert.throws(()=>currentRetire(alias),/separate retirement destination/);
 assert.equal(readLive(added),source);
 const destination=join(root,'historical');mkdirSync(join(destination,'src'),{recursive:true});
 if(!linkDirectory(t,join(process.cwd(),'src/lua'),join(destination,'src/lua')))return;
 assert.throws(()=>currentRetire(destination),/aliases live source/);
 assert.equal(readLive(added),source);
});

test('current catalog retirement rejects a directory retargeted after preparation',t=>{
 const root=isolated(t),source=readLive(added);write(root,added,source);
 const cleanup=currentRetire(root);renameSync(join(root,'src/lua'),join(root,'src/saved-lua'));
 if(!linkDirectory(t,join(process.cwd(),'src/lua'),join(root,'src/lua')))return;
 assert.throws(cleanup,/retirement target changed/);
 assert.equal(readLive(added),source);assert.equal(readFileSync(join(root,'src/saved-lua/abyss_combat_catalog.lua'),'utf8'),source);
});

test('current retirement preserves preparation versus cleanup ordering and deletes only authenticated copies',t=>{
 const leaf='src/lua/abyss_actor_presence.lua',source=readLive(added),leafSource=readLive(leaf);
 for(const present of [false,true])for(const catalogPresent of [false,true]){
  const root=isolated(t);if(present)write(root,leaf,leafSource);if(catalogPresent)write(root,added,source);
  const cleanup=currentRetire(root);assert.equal(existsSync(join(root,leaf)),present);assert.equal(existsSync(join(root,added)),catalogPresent);
  cleanup();assert(!existsSync(join(root,leaf)));assert(!existsSync(join(root,added)));
 }
 const root=isolated(t),target=write(root,added,source),leafTarget=write(root,leaf,leafSource),cleanup=currentRetire(root);
 writeFileSync(leafTarget,leafSource+'\n');
 assert.throws(cleanup,/unreviewed Actor presence module destination/);assert(existsSync(target)&&existsSync(leafTarget));
 writeFileSync(target,source+'\n');
 assert.throws(cleanup,/complete retirement catalog identity/);
 assert.throws(()=>currentRetire(root),/unreviewed Actor presence module destination/);
 assert(existsSync(target)&&existsSync(leafTarget));
 writeFileSync(leafTarget,leafSource);assert.throws(()=>currentRetire(root),/complete retirement catalog identity/);
 assert(existsSync(target)&&existsSync(leafTarget));
 assert.equal(readLive(added),source);assert.equal(readLive(leaf),leafSource);
});
