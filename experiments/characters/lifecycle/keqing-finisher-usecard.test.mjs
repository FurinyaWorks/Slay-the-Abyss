import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('staged KQ004 resolves its wedge at the actual queue stage',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/keqing-finisher-usecard.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KEQING_FINISHER_USECARD_PASS/);
});
