import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Xiao 02 and 06 actual public defense and exit',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/xiao-defense-exit.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/PASS PUBLIC x02/);assert.match(r.stdout,/PASS PUBLIC empty exit/);assert.match(r.stdout,/XIAO_DEFENSE_EXIT_TRANSACTION_PASS/);
});
