// Exact menu owners; current reads remain fresh and all prior targets stay intact.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./menu-red-production-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'ee888fd1686beaeffc2e439164619ecedee9ac00d2ca00a2711bd74c63e28cae','complete menu production source');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const menuRedProductionPatch=freeze(JSON.parse(gunzipSync(bytes)));
const paths=['src/lua/abyss_game_ui_menu_view.lua','src/lua/abyss_game_ui_view.lua','src/lua/abyss_v25_menu_view.lua'];
export function extendMenuRedSourceEpoch(original,patch=menuRedProductionPatch){
 const prior=original.proof;
 assert.equal(patch.schemaVersion,1);assert.equal(patch.normalization,'LF');
 assert.equal(patch.baseCommit,'e805a87dc4df1a048ba5995931d98a4e4899b5e9');
 assert.equal(patch.sourceCommit,'ee4f8febcd384b60ed43e68a172585968b9be42f');
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
