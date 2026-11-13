import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Zhongli 03 and 04 actual paid jade storage and consumption',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/zhongli-resource-usecard.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/AUTHOR_PUBLIC_ZL_RESOURCE_PAID_PASS/);assert.match(r.stdout,/ZHONGLI_RESOURCE_TRANSACTION_PASS/);
});
