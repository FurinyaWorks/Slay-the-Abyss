import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Zhongli 21 and 31 use real paid Power commands',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/zhongli-paid-usecard.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/ZHONGLI_PAID_USECARD_PASS/);
});
