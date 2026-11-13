import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('candidate initialization and real paid UseCard preserve pause/resume transactions',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/keqing-paid-usecard.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KEQING_PAID_USECARD_PASS/);
});
