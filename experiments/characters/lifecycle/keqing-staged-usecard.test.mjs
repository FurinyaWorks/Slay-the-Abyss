import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('staged KQ003 uses real paid actions and source terminal policy',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/keqing-staged-usecard.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KEQING_STAGED_USECARD_PASS/);
});
