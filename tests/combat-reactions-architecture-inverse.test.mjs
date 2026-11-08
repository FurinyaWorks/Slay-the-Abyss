import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,mkdtempSync,rmSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {preCombatReactionArchitecture} from './helpers/architecture-source-format.mjs';
import {preCardOriginSource} from './helpers/card-origin-source-inverse.mjs';
import {preCompendiumSource} from './helpers/compendium-source-inverse.mjs';
import {preGameUiExtractionSource} from './helpers/game-ui-extraction-source-inverse.mjs';
import * as extractionEpoch from './helpers/game-ui-extraction-source-inverse.mjs';
const path='config/architecture.json';
const source=preGameUiExtractionSource(path,readFileSync(path,'utf8').replaceAll('\r\n','\n'));
const hash=s=>createHash('sha256').update(s).digest('hex');
const prior='3cc15d6f573fa5a5c637c2d2a4ef9086f444bb761a64ee1e6aef80dad40d0cc5';

test('native-page outer epoch removes only reviewed registrations and preserves complete external bytes',()=>{
 assert.equal(typeof extractionEpoch.preNativePageSource,'function','missing strict native-page outer epoch');
 const current=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 const delta='    "abyss_ui_profile": "platform",\n    "abyss_native_pages": "ui",\n';
 const before=current.replace(delta,'');
 assert.equal(hash(before),'0e75d9e1f08cfb7738215b9a31cce141f03cc2469077bce0db3376fe1f446a9c');
 for(const variant of [current,current.replaceAll('\n','\r\n'),JSON.stringify(JSON.parse(current)),JSON.stringify(JSON.parse(current),null,'\t')])
  assert.equal(extractionEpoch.preNativePageSource(path,variant),before);
 const bad=[current.replace(delta,''),current.replace('"abyss_ui_profile": "platform"','"abyss_ui_profile": "ui"'),
  current.replace('"abyss_native_pages": "ui"','"abyss_native_pages": "platform"'),current.replace(delta,delta+delta),
  current.replace(delta,'').replace('  "layers": {\n','  "layers": {\n'+delta),
  current.replace(delta,delta.split('\n').filter(Boolean).reverse().join('\n')+'\n'),current+'-- unrelated\n',
  current.replace('"abyss_actor": "core"','"abyss_actor": "ui"')];
 for(const variant of bad)assert.equal(extractionEpoch.preNativePageSource(path,variant),variant,'foreign native epoch was hidden');
 const linked=Object.fromEntries([path,'src/lua/abyss_game_ui.lua','src/lua/abyss_game_ui_view.lua'].map(p=>[p,readFileSync(p,'utf8')]));
 const readSource=p=>{assert.ok(Object.hasOwn(linked,p));return linked[p];};
 assert.equal(extractionEpoch.preNativePageSource(path,current,{readSource}),before);
 for(const p of Object.keys(linked)){
  const saved=linked[p];linked[p]=saved+' \n';
  assert.equal(extractionEpoch.preNativePageSource(path,current,{readSource}),current,'warm linked foreign bytes were normalized away');
  delete linked[p];assert.equal(extractionEpoch.preNativePageSource(path,current,{readSource}),current,'warm missing owner was cached');
  linked[p]=saved;
 }
});
test('reaction architecture inverse restores complete prior bytes through LF, CRLF and layout variants',()=>{
 for(const variant of [source,source.replaceAll('\n','\r\n'),JSON.stringify(JSON.parse(source)),JSON.stringify(JSON.parse(source),null,'\t')]){
  assert.equal(hash(preCombatReactionArchitecture(path,variant)),prior);
  assert.equal(hash(preCardOriginSource(path,variant)),'640bb51f60c831ad2162de7907b5b7e6a241dfa6f50b15b8527234eb2da47b64');
  assert.equal(hash(preCompendiumSource(path,variant)),'8c6e10716cb4ba38d49f9164d6349e8eb2a80ca13b6c364f69181a056b7bfdbf');
 }
 assert.equal(preCombatReactionArchitecture('unrelated.json',source),source);
 assert.equal(preCombatReactionArchitecture(path,null),null);
});
test('reaction inverse never hides partial registrations, boundary drift, duplicates or reordered policy',()=>{
 const policy=JSON.parse(source),variants=[];
 const mutate=fn=>{const copy=structuredClone(policy);fn(copy);variants.push(JSON.stringify(copy));};
 mutate(p=>delete p.layers.abyss_combat_reactions);
 mutate(p=>p.layers.abyss_combat_reactions='ui');
 mutate(p=>delete p.dependencyBoundaries);
 mutate(p=>p.dependencyBoundaries=[]);
 mutate(p=>p.dependencyBoundaries.reverse());
 mutate(p=>p.dependencyBoundaries[0].forbiddenTargets=[]);
 mutate(p=>p.dependencyBoundaries[1].reason+=' changed');
 mutate(p=>p.dependencyBoundaries.push(p.dependencyBoundaries[0]));
 mutate(p=>p.deferredImports.reverse());
 mutate(p=>p.layers.abyss_actor='ui');
 const key='"abyss_combat_reactions": "core"';
 variants.push(source.replace(key,key+', '+key),source+'-- unknown\n');
 for(const variant of variants)for(const ending of [variant,variant.replaceAll('\n','\r\n')]){
  assert.notEqual(ending,source);
  assert.equal(preCombatReactionArchitecture(path,ending),ending);
  assert.equal(preCardOriginSource(path,ending),ending);
  assert.equal(preCompendiumSource(path,ending),ending);
 }
});
test('warm reaction projection freshly binds linked config and exposes disk mutation or deletion',async t=>{
 const root=mkdtempSync(join(tmpdir(),'reaction-architecture-inverse-'));
 copyIntegrationSourceClosure(root);
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'tests/helpers'),{recursive:true});mkdirSync(join(root,'config'));
 copyFileSync('tests/helpers/architecture-source-format.mjs',join(root,'tests/helpers/architecture-source-format.mjs'));
 for(const name of ['game-ui-extraction-source-inverse.mjs','game-ui-extraction-source-layer.json','core-lifecycle-source-inverse.mjs','actor-lifecycle-before.lua','combat-lifecycle-before.json','relic-query-source-inverse.mjs','relic-query-baseline-391306af.json.gz','query-living-wall-before.lua','relic-lifecycle-baseline-391306af.json.gz','relic-lifecycle-architecture-source-inverse.json','m7-core-final-source-inverse.mjs','m7-core-final-before.json.gz','reward-query-boundary-source-inverse.mjs','reward-query-boundary-before.json','actor-presence-source-inverse.mjs','actor-presence-source-proof.json','colorless-catalog-before-2ad07111.json.gz','end-turn-responsibilities-source-inverse.mjs','potion-callback-source-inverse.mjs','potion-callback-source-proof.json','colorless-catalog-source-inverse.mjs','colorless-catalog-source-proof.json','defect-plan-source-inverse.mjs','defect-plan-before.lua','act1-choice-source-inverse.mjs','act1-choice-before.lua','inventory-responsibilities-source-inverse.mjs','session-reward-source-inverse.mjs','session-reward-source-proof.json','watcher-final-execution-source-inverse.mjs','watcher-final-execution-before.lua','power-shop-source-inverse.mjs','power-shop-before-2c85.json.gz'])copyFileSync('tests/helpers/'+name,join(root,'tests/helpers',name));
 // The existing owner carries the inline outer epoch; copy its linked owners too.
 mkdirSync(join(root,'src/lua'),{recursive:true});
 for(const name of ['abyss_game_ui.lua','abyss_game_ui_view.lua'])copyFileSync('src/lua/'+name,join(root,'src/lua',name));
 const file=join(root,path),native=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 writeFileSync(file,native);
 const {preNativePageSource:nativeProject}=await import(pathToFileURL(join(root,'tests/helpers/game-ui-extraction-source-inverse.mjs')));
 const nativeBefore=native.replace('    "abyss_ui_profile": "platform",\n    "abyss_native_pages": "ui",\n','');
 assert.equal(nativeProject(path,native),nativeBefore);
 writeFileSync(file,native.replace('    "abyss_ui_profile"','     "abyss_ui_profile"'));
 assert.equal(nativeProject(path,native),native,'warm disk whitespace must remain exposed');
 writeFileSync(file,native);
 const viewFile=join(root,'src/lua/abyss_game_ui_view.lua'),view=readFileSync(viewFile,'utf8');
 writeFileSync(viewFile,view+'-- foreign linked owner\n');
 assert.equal(nativeProject(path,native),native,'isolated projection borrowed a warm or live owner');
 writeFileSync(viewFile,view);assert.equal(nativeProject(path,native),nativeBefore);
 writeFileSync(file,source);
 const {preCombatReactionArchitecture:project}=await import(pathToFileURL(join(root,'tests/helpers/architecture-source-format.mjs')));
 assert.equal(hash(project(path,source)),prior);
 writeFileSync(file,source.replace('"abyss_combat_reactions": "core"','"abyss_combat_reactions": "ui"'));
 assert.equal(project(path,source),source);
 writeFileSync(file,source.replaceAll('\n','\r\n'));assert.equal(hash(project(path,source)),prior);
 unlinkSync(file);assert.equal(project(path,source),source);
});
