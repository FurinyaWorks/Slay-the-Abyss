import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync,existsSync,linkSync,unlinkSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
const sandbox=process.cwd();
const {sourceEpoch}=await import('./helpers/combined-epoch/source-epoch.mjs');
const proof=sourceEpoch.proof,raw=p=>proof.current[p]?.source??null;
const shopDeckPaths=['src/lua/abyss_deck_ui.lua','src/lua/abyss_merchant.lua','src/lua/abyss_game_ui_input.lua','src/lua/abyss_node_ui_feedback.lua','src/lua/abyss_potion_discard_ui.lua'];
test('shop/deck continuation retains the complete closeout predecessor and every original target',async()=>{
 const {closeoutPriorEpoch}=await import('./helpers/closeout-source-epoch.mjs');
 assert.ok(proof.targets.shopDeckPrior,'explicit complete predecessor view');
 assert.equal(proof.targets.shopDeckPrior.commit,'903bf2a31e91f10fb24763ab4cea23d586d0bb83');
 assert.deepEqual(proof.targets.shopDeckPrior.files,closeoutPriorEpoch.proof.current);
 const {shopDeckFourSourcePrior}=await import('./helpers/closeout-source-epoch.mjs');
 assert.deepEqual(Object.keys(shopDeckFourSourcePrior.current),shopDeckPaths.slice(0,4),'PR639 four-source predecessor remains independently intact');
 for(const [path,binding]of Object.entries(shopDeckFourSourcePrior.current))assert.deepEqual(proof.targets.shopDeckFourPrior.files[path],binding);
 const {shopDeckBeforeCiRepairPrior}=await import('./helpers/closeout-source-epoch.mjs');
 assert.deepEqual(Object.keys(shopDeckBeforeCiRepairPrior.current),shopDeckPaths,'complete five-source predecessor remains independently intact');
 for(const [path,binding]of Object.entries(shopDeckBeforeCiRepairPrior.current))assert.deepEqual(proof.targets.shopDeckBeforeCiRepairPrior.files[path],binding);
 for(const [name,target]of Object.entries(closeoutPriorEpoch.proof.targets))assert.deepEqual(proof.targets[name],target,name);
 assert.deepEqual(Object.keys(proof.current),Object.keys(closeoutPriorEpoch.proof.current));
 assert.equal(proof.currentTreeCommitted,false,'working source hashes do not invent a committed corpus');
 for(const path of Object.keys(proof.current))if(!shopDeckPaths.includes(path))assert.deepEqual(proof.current[path],closeoutPriorEpoch.proof.current[path],path);
 for(const path of shopDeckPaths){
  assert.equal(readFileSync(path,'utf8').replaceAll('\r\n','\n'),raw(path),path);
  for(const input of [raw(path),raw(path).replaceAll('\n','\r\n')])for(const target of Object.keys(proof.targets)){
   const before=proof.targets[target].files[path];
   const expected=before&&before.sha256!==proof.current[path].sha256?before.source:input;
   assert.equal(sourceEpoch.preCombinedSource(path,input,{target,readSource:raw}),expected,path+':'+target);
  }
 }
});
test('shop/deck source slices reject unknown drift without I/O and freshly reject every missing or changed owner',async()=>{
 const {sourceSlice}=await import('./helpers/closeout-source-epoch.mjs');
 const path=shopDeckPaths[0],source=raw(path),target='shopDeckPrior';
 assert.ok(proof.targets[target],'explicit continuation target');
 const before=proof.targets[target].files[path].source;
 assert.notEqual(source,before,'the regression uses the new complete deck source');
 for(const input of [source+'\n',source.slice(1),'\ufeff'+source,null,undefined,{},17]){
  let reads=0;assert.equal(sourceSlice(path,input,target,()=>{reads++;throw Error('unexpected');}),input);assert.equal(reads,0);
 }
 for(const other of ['foreign','__proto__','constructor',...shopDeckPaths.slice(1)]){
  let reads=0;assert.equal(sourceSlice(other,source,target,()=>{reads++;throw Error('unexpected');}),source);assert.equal(reads,0);
 }
 for(const owner of proof.owners){
  let bad=false,reads=0;
  const reader=p=>{reads++;return bad&&p===owner?raw(p)+'\n':raw(p);};
  assert.equal(sourceSlice(path,source,target,reader),before);assert.equal(reads,proof.owners.length);bad=true;
  assert.throws(()=>sourceSlice(path,source,target,reader),/linked owner identity/,owner);
  for(const missing of [null,undefined,17])assert.throws(()=>sourceSlice(path,source,target,p=>p===owner?missing:raw(p)),/linked owner identity/,owner);
  assert.throws(()=>sourceSlice(path,source,target,p=>{if(p===owner)throw Error('removed');return raw(p);}),/linked owner missing/,owner);
 }
 assert(proof.owners.includes(shopDeckPaths[1]),'new merchant owner participates in the inherited fresh closure');
 const inherited='config/architecture.json';
 assert.notEqual(raw(inherited),proof.targets.develop.files[inherited].source);
 assert.throws(()=>sourceEpoch.preCombinedSource(inherited,raw(inherited),{target:'develop',readSource:p=>p===shopDeckPaths[1]?null:raw(p)}),/linked owner identity/);
});
test('shop/deck archive collection rejects unlisted drift, missing sources and changes during collection',async()=>{
 const {collectShopDeckSourceEpoch}=await import('./helpers/generate-shop-deck-source-epoch.mjs');
 const {gunzipSync}=await import('node:zlib');
 const collected=collectShopDeckSourceEpoch({readSource:raw});
 assert.deepEqual(Object.keys(collected.current),shopDeckPaths);
 for(const path of shopDeckPaths)assert.deepEqual(collected.current[path],proof.current[path]);
 assert.deepEqual(gunzipSync(readFileSync('tests/helpers/shop-deck-source-epoch.json.gz')),Buffer.from(JSON.stringify(collected)),'registered complete source content is reproducible without Git or source edits');
 const unlisted='src/lua/abyss_actor.lua';
 assert.throws(()=>collectShopDeckSourceEpoch({readSource:p=>p===unlisted?raw(p)+'\n':raw(p)}),/unlisted current source drift/);
 for(const path of shopDeckPaths){
  for(const missing of [null,undefined,17])assert.throws(()=>collectShopDeckSourceEpoch({readSource:p=>p===path?missing:raw(p)}),/current source required/);
  assert.throws(()=>collectShopDeckSourceEpoch({readSource:p=>{if(p===path)throw Error('source removed');return raw(p);}}),/source removed/);
 }
 let reads=0;
 assert.throws(()=>collectShopDeckSourceEpoch({readSource:p=>p===shopDeckPaths[0]&&++reads>1?raw(p)+'\n':raw(p)}),/source changed during collection/);
});
test('detached shop/deck source slices use fresh local owners and cannot replace missing sources with archived text',async t=>{
 const {copyCurrentSourceFixture}=await import('./helpers/isolated-current-source.mjs');
 for(const crlf of [false,true]){
  const directory=mkdtempSync(join(tmpdir(),'shop-deck-epoch-'));
  t.after(()=>rmSync(directory,{recursive:true,force:true}));copyCurrentSourceFixture(directory,{crlf});
  const script=`import assert from 'node:assert/strict';
   import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
   import {sourceSlice,sourceEpoch} from './tests/helpers/closeout-source-epoch.mjs';
   const path='src/lua/abyss_deck_ui.lua',owner='src/lua/abyss_merchant.lua';
   const input=readFileSync(path,'utf8'),expected=sourceEpoch.proof.targets.shopDeckPrior.files[path].source;
   const project=()=>sourceSlice(path,input,'shopDeckPrior');
   assert.equal(project(),expected);
   const source=readFileSync(owner,'utf8');writeFileSync(owner,source+'\\n');
   assert.throws(project,/linked owner identity/);
   writeFileSync(owner,source);assert.equal(project(),expected);
   unlinkSync(owner);assert.throws(project,/linked owner missing/);`;
  execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:directory,encoding:'utf8',timeout:30000,windowsHide:true});
 }
});
test('fresh authorization covers the complete changed-owner union without caching',()=>{
 const required=Object.keys(proof.current).filter(path=>Object.values(proof.targets).some(target=>target.files[path]?.sha256!==proof.current[path]?.sha256));
 assert.deepEqual([...proof.owners].sort(),required.sort());
});
test('combined epoch authenticates the complete current production tree',()=>{
 const files=['config/architecture.json',...readdirSync('src/lua').filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p)].sort();
 assert.deepEqual(files,Object.keys(proof.current).filter(p=>proof.current[p]!==null).sort());
 for(const path of files)assert.equal(readFileSync(path,'utf8').replaceAll('\r\n','\n'),raw(path),path);
});
const cases=[
 ['m7-core-final','preM7FinalSource','develop','abyss_original_v4'],
 ['relic-query','preRelicQuerySource','develop','abyss_inventory'],
 ['core-lifecycle','preCoreLifecycleSource','develop','abyss_actor'],
 ['game-ui-extraction','preGameUiExtractionSource','develop','abyss_game_ui'],
 ['round3-catalog','preRound3CatalogSource','develop','abyss_combat_catalog'],
 ['power-shop','prePowerShopSource','powerShop','abyss_shop'],
 ['session-reward','preSessionRewardSource','sessionReward','abyss_potion_rewards'],
 ['watcher-final-execution','preWatcherExecutionSource','watcher','abyss_watcher_final_cards'],
 ['inventory-responsibilities','preInventoryResponsibilitiesSource','inventory','abyss_inventory'],
 ['act1-choice','preAct1ChoiceSource','act1','abyss_act1_events'],
 ['defect-plan','preDefectPlanSource','defect','abyss_defect_engine_cards'],
 ['colorless-catalog','preColorlessCatalogSource','colorless','abyss_combat_catalog'],
 ['potion-callback','prePotionCallbackSource','potion','abyss_relic_hooks'],
 ['end-turn-responsibilities','preEndTurnResponsibilitiesSource','endTurn','abyss_end_turn_powers'],
 ['actor-presence','preActorPresenceSource','actor','abyss_actor'],
 ['reward-query-boundary','preRewardQueryBoundarySource','reward','abyss_relic_choices'],
];
for(const [file,name,target,module]of cases){
 const exported=await import(`./helpers/${file}-source-inverse.mjs`),fn=exported[name];
 test(`${name}: current source and configuration match original target projection`,()=>{
  const targetRead=p=>proof.targets[target].files[p]?.source??null;
  for(const path of [`src/lua/${module}.lua`,'config/architecture.json']){
   const expected=fn(path,targetRead(path),{readSource:targetRead});
   assert.equal(fn(path,raw(path),{readSource:raw}),expected,path);
  }
 });
 test(`${name}: foreign input stays opaque and performs no linked reads`,()=>{
  const path=`src/lua/${module}.lua`,foreign=raw(path)+'\n';let count=0;
  assert.equal(fn(path,foreign,{readSource(){count++;throw Error('unexpected read');}}),foreign);assert.equal(count,0);
 });
}
test('root combined projection rejects fresh missing/foreign/late-linked drift after success',async()=>{
 const {preRelicQuerySource:fn}=await import('./helpers/relic-query-source-inverse.mjs');
 const path='config/architecture.json',last=proof.owners.at(-1);let corrupt=false,count=0;
 const reader=p=>{count++;return corrupt&&p===last?raw(p)+'\n':raw(p);};
 fn(path,raw(path),{readSource:reader});assert(count>=proof.owners.length);
 corrupt=true;assert.throws(()=>fn(path,raw(path),{readSource:reader}),/linked owner/);
});
test('round3 absent catalog still retires Actor, Potion, and Colorless witnesses',async()=>{
 const {prepareRound3CatalogModuleRetirement:prepare}=await import('./helpers/round3-catalog-source-inverse.mjs');
 const root=mkdtempSync(join(tmpdir(),'retirement-proposal-'));
 const paths=['src/lua/abyss_actor_presence.lua','src/lua/abyss_relic_potion_hooks.lua','src/lua/abyss_colorless_catalog.lua'];
 const liveBefore=Object.fromEntries(paths.map(path=>[path,readFileSync(join(sandbox,path),'utf8')]));
 for(const path of paths){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),raw(path));}
 const retire=prepare(root,{sourceRoot:sandbox});retire();for(const path of paths)assert.equal(existsSync(join(root,path)),false,path);
 for(const path of paths)assert.equal(readFileSync(join(sandbox,path),'utf8'),liveBefore[path],'live source retained');
});
test('round3 present catalog retires all witnesses and rechecks bytes before deletion',async()=>{
 const {prepareRound3CatalogModuleRetirement:prepare}=await import('./helpers/round3-catalog-source-inverse.mjs');
 const paths=['src/lua/abyss_combat_catalog.lua','src/lua/abyss_actor_presence.lua','src/lua/abyss_relic_potion_hooks.lua','src/lua/abyss_colorless_catalog.lua'];
 for(const mutate of [false,true]){
  const root=mkdtempSync(join(tmpdir(),'retirement-present-'));
  for(const path of paths){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),raw(path));}
  const retire=prepare(root,{sourceRoot:sandbox});
  if(mutate){writeFileSync(join(root,paths[0]),raw(paths[0])+'\n');assert.throws(retire,/identity/);for(const path of paths)assert(existsSync(join(root,path)));}
  else{retire();for(const path of paths)assert(!existsSync(join(root,path)));}
 }
});
test('round3 retirement rejects live hardlinks and live source roots',async()=>{
 const {prepareRound3CatalogModuleRetirement:prepare}=await import('./helpers/round3-catalog-source-inverse.mjs');
 assert.throws(()=>prepare(sandbox,{sourceRoot:sandbox}),/separate/);
 const root=mkdtempSync(join(sandbox,'retirement-hardlink-')),path='src/lua/abyss_combat_catalog.lua';mkdirSync(dirname(join(root,path)),{recursive:true});
 linkSync(join(sandbox,path),join(root,path));try{assert.throws(()=>prepare(root,{sourceRoot:sandbox}),/single link|inode/);}finally{unlinkSync(join(root,path));}
});
