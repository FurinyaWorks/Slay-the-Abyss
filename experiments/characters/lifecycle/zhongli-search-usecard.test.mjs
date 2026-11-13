import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Zhongli 19 and 24 paid resource search with native draw and exhaust',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/zhongli-search-usecard.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/AUTHOR_PUBLIC_ZL_SEARCH_PAID_PASS/);assert.match(r.stdout,/ZHONGLI_SEARCH_TRANSACTION_PASS/);
});
