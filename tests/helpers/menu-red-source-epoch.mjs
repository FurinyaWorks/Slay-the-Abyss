// Exact menu owners; current reads remain fresh and all prior targets stay intact.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./menu-red-production-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'eac84b07c06da9afb0f37a63ac8b57ea4b88e825ec57f6efe50a00d9c2bae5d7','complete menu production source');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const menuRedProductionPatch=freeze(JSON.parse(gunzipSync(bytes)));
const paths=['src/lua/abyss_game_ui_menu_view.lua','src/lua/abyss_game_ui_view.lua','src/lua/abyss_v25_menu_view.lua'];
export function extendMenuRedSourceEpoch(original,patch=menuRedProductionPatch){
 const prior=original.proof;
 assert.equal(patch.schemaVersion,1);assert.equal(patch.normalization,'LF');
 assert.equal(patch.baseCommit,'da7e3b2ff6946f0824a5a20439dbedf27622c866');
 assert.equal(patch.sourceCommit,'5c2e8173487418c71b607a75eeb043053d1a705c');
 assert.deepEqual(patch.inventory,Object.keys(prior.current).sort(),'complete menu predecessor inventory');
 assert.deepEqual(Object.keys(patch.before).sort(),paths);assert.deepEqual(Object.keys(patch.current).sort(),paths);
 for(const path of paths){
  assert.deepEqual(patch.before[path],prior.current[path],'complete menu predecessor: '+path);
  assert.notEqual(patch.current[path].sha256,patch.before[path].sha256,'actual menu source edit');
 }
 assert(!Object.hasOwn(prior.targets,'menuRedPrior'),'cannot replace historical menu target');
 const current={...prior.current,...patch.current},targets={...prior.targets,menuRedPrior:{commit:patch.baseCommit,files:prior.current}};
 const owners=Object.keys(current).filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path].sha256));
 return createSourceEpochProjector(freeze({...prior,currentTreeCommitted:false,currentCommit:patch.sourceCommit,
  currentCommitRole:'exact committed red menu sources; subsequent proof continuation',current,targets,owners}),
 {allowConfigLayout:true,reuseFrozenInput:true});
}
// Keep the reviewed three-owner menu archive above immutable. This exact
// one-owner refactor continues it without replacing any historical target.
const presentationBytes=readFileSync(new URL('./menu-presentation-source.json.gz',import.meta.url));
assert.equal(hash(presentationBytes),'abcc561be5a49560684b70bc68a1b320485f8084039a64910d05ff9810fc8e9b','complete menu presentation continuation');
export const menuPresentationPatch=freeze(JSON.parse(gunzipSync(presentationBytes)));
export function extendMenuPresentationEpoch(original,patch=menuPresentationPatch){
 const prior=original.proof,path='src/lua/abyss_v25_menu_view.lua';
 assert.equal(patch.schemaVersion,1);assert.equal(patch.normalization,'LF');
 assert.equal(patch.path,path);
 assert.equal(patch.baseCommit,'5c2e8173487418c71b607a75eeb043053d1a705c');
 assert.equal(prior.currentCommit,patch.baseCommit);
 assert.equal(patch.sourceCommit,'436a030e5ef8857595672f24a8f385d5edf2a9aa');
 assert.deepEqual(patch.before,prior.current[path],'complete menu presentation predecessor');
 assert.notEqual(patch.after.sha256,patch.before.sha256,'actual presentation source edit');
 assert(!Object.hasOwn(prior.targets,'menuPresentationPrior'),'cannot replace reviewed menu target');
 const current={...prior.current,[path]:patch.after};
 const targets={...prior.targets,menuPresentationPrior:{commit:patch.baseCommit,files:prior.current}};
 const owners=Object.keys(current).filter(p=>Object.values(targets).some(target=>target.files[p]?.sha256!==current[p].sha256));
 return createSourceEpochProjector(freeze({...prior,currentTreeCommitted:false,currentCommit:patch.sourceCommit,
  currentCommitRole:'exact committed menu scenery refactor; reviewed menu retained',current,targets,owners}),
 {allowConfigLayout:true,reuseFrozenInput:true});
}
