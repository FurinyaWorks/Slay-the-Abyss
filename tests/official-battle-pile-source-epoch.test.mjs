import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{pileSourceProof,prePileSource}from'./helpers/official-battle-pile-source-inverse.mjs';
import{preOfficialBattleSource}from'./helpers/official-battle-source-inverse.mjs';
test('battle pile epoch projects only exact complete reviewed Git sources',()=>{
 assert.equal(pileSourceProof.afterCommit,'d7ac8353c1d74f84f7c8fa161685ba73da0023cc');
 assert.equal(pileSourceProof.beforeCommit,'97b755a5bdcd42b4ef06fc78fc09433f32baafe5');
 assert.deepEqual(Object.keys(pileSourceProof.files),['src/lua/abyss_battle_ui.lua','src/lua/abyss_deck_ui.lua','src/lua/abyss_relic_view_ui.lua']);
 for(const [path,r]of Object.entries(pileSourceProof.files)){
  assert.equal(readFileSync(path,'utf8').replaceAll('\r\n','\n'),r.afterSource);
  assert.equal(prePileSource(path,r.afterSource),r.beforeSource);
  assert.equal(preOfficialBattleSource(path,r.afterSource),preOfficialBattleSource(path,r.beforeSource));
  const drift=r.afterSource+'\n-- unreviewed drift';assert.equal(preOfficialBattleSource(path,drift),drift);
 }
 assert.deepEqual(pileSourceProof.unprojectedChanges,{});
 assert(Object.isFrozen(pileSourceProof)&&Object.isFrozen(pileSourceProof.files));
});
