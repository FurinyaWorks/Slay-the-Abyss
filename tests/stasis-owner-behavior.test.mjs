import test from 'node:test';
import assert from 'node:assert/strict';
import {sources,runStasis,metadata} from './helpers/stasis-owner-vm.mjs';
const actor='src/lua/abyss_actor.lua',stasis='src/lua/abyss_act2_stasis.lua';
function good(result){assert.equal(result.status,0,result.error+'\n'+result.logs.join('\n'));}
test('Stasis owner preserves independent full-source state graphs, aliases, lazy callbacks and errors',()=>{
 assert.equal(metadata.baseCommit,'4a51905537fa223e5df4e5ee475152c8a6629af5');
 const before=runStasis(sources(true)),after=runStasis(sources());good(before);good(after);
 assert.equal(before.graphs.length,16);assert.deepEqual(after.graphs,before.graphs);assert.deepEqual(after.logs,before.logs);
});
test('Stasis owner replays the complete original card/death acquisition and rollback fixture in separate VMs',()=>{
 const before=runStasis(sources(true),'tests/lua/death_power_order.lua'),after=runStasis(sources(),'tests/lua/death_power_order.lua');good(before);good(after);
 assert.ok(before.graphs.length>=24,'whole fixture action graph checkpoints');assert.deepEqual(after.graphs,before.graphs);
 assert.deepEqual(after.logs,before.logs);assert.match(after.logs.at(-1),/DEATH_POWER_ORDER 11 groups; 0 failed/);
});
test('Stasis owner assertions reject real threshold, dynamic-slot and failure-order mutations',()=>{
 const mutations=[
  [stasis,'#s.hand==s.rules.player.maxHand','#s.hand>=s.rules.player.maxHand','lazy threshold overflow'],
  [stasis,'(s.player.statuses.master_reality or 0)>0','(s.player.statuses.master_reality or 0)>=0','lazy threshold master-zero'],
  [actor,'if combat.canUpgrade(s,c)then combat.upgrade(s,c)end','local upgrade=combat.upgrade; if combat.canUpgrade(s,c)then upgrade(s,c)end','error outcome normal'],
  [actor,'if combat.canUpgrade(s,c)then combat.upgrade(s,c)end','combat.canUpgrade(s,c); combat.upgrade(s,c)','dynamic upgrade false'],
  [actor,'if combat.canUpgrade(s,c)then combat.upgrade(s,c)end','if combat.canUpgrade(s,c)then pcall(combat.upgrade,s,c)end','error outcome upgrade-error'],
 ];
 for(const [path,old,replacement,assertion]of mutations){const bundle=sources();assert.equal(bundle[path].split(old).length,2,'unique semantic site');bundle[path]=bundle[path].replace(old,replacement);const result=runStasis(bundle);assert.notEqual(result.status,0);assert.match(result.error,new RegExp('STASIS_OWNER '+assertion));}
});
