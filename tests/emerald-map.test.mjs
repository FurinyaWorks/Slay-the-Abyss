import test from 'node:test';
import assert from 'node:assert/strict';
import { runLua } from '../scripts/test-lua.mjs';

test('Emerald map preserves legacy graphs and owns one source selection/entry boost across strict restore', () => {
  const result = runLua('tests/lua/emerald_map.lua');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /EMERALD_MAP 6 groups; 0 failed; battle integration NOT_RUN/);
});

import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {mapEmeraldBefore,mapEmeraldVm} from './helpers/map-emerald-vm.mjs';

test('Emerald owner preserves complete independent-VM graph, errors, guard effects and RNG observations', () => {
  const before=mapEmeraldBefore();
  const current=readFileSync('src/lua/abyss_map.lua','utf8');
  assert.deepEqual(mapEmeraldVm(current),mapEmeraldVm(before));
});

// Real semantic mutations must diverge from the independent old module, not
// merely from an asserted output string or a mutation-generated expectation.
test('Emerald differential rejects owner, guard, RNG, return and alias semantic regressions', () => {
  const current=readFileSync('src/lua/abyss_map.lua','utf8');
  const before=mapEmeraldVm(mapEmeraldBefore(),{integration:false});
  const mutations=[
    ['false boost bypass', 'or map.emeraldBoost~=nil', 'or map.emeraldBoost'],
    ['selection upper bound', 'selection.x>6', 'selection.x>7'],
    ['map seed identity bypass', 'return ok and map.mapSeed==mapSeed', 'return ok'],
    ['false marked key bypass', 'node.hasEmeraldKey~=nil and', 'node.hasEmeraldKey and'],
    ['duplicate selection bypass', "if found or node.type~='elite'", "if node.type~='elite'"],
    ['late node validation skipped', 'found=node', 'return node'],
    ['shape before seed reordered',
      'if not emeraldSelectionShape(selection) then return end\n    if not emeraldSelectionOwner(map,selection,nodeId,act) then return end',
      'if not emeraldSelectionOwner(map,selection,nodeId,act) then return end\n    if not emeraldSelectionShape(selection) then return end'],
    ['unavailable private draw', "return nil,nil,'emerald_node_unavailable'", 'return prepareEmerald(map,nodeId)'],
    ['bad RNG reason collapsed', "return nil,nil,'invalid_map_rng'", "return nil,nil,'invalid_emerald_map_owner'"],
    ['nil return changed to false', "if not emeraldNode(map,nodeId) then return nil,nil,'invalid_emerald_map_owner'", "if not emeraldNode(map,nodeId) then return false,nil,'invalid_emerald_map_owner'"],
    ['before RNG alias leak', 'beforeRng=copy(map.mapRng)', 'beforeRng=map.mapRng'],
    ['next RNG alias leak', 'afterRng=copy(after)', 'afterRng=after'],
    ['commit caller alias leak', 'map.emeraldBoost,map.mapRng=copy(expected),copy(nextRng)', 'map.emeraldBoost,map.mapRng=boost,nextRng'],
    ['commit path ownership bypass', 'or map.path[#map.path]~=nodeId', 'or false'],
  ];
  for(const [name,from,to] of mutations){
    assert.ok(current.includes(from),`mutation anchor missing: ${name}`);
    const mutant=current.replace(from,to);
    assert.equal(isDeepStrictEqual(mapEmeraldVm(mutant,{integration:false}),before),false,`semantic negative control survived: ${name}`);
  }
});

import './helpers/map-emerald-complexity.mjs';
import './helpers/map-emerald-source-contract.mjs';
