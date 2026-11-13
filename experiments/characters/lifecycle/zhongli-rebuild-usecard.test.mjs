import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Zhongli 20 and 62 paid empty jade with native draw and exhaust',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/zhongli-rebuild-usecard.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/AUTHOR_PUBLIC_ZL_REBUILD_PAID_PASS/);assert.match(r.stdout,/ZHONGLI_REBUILD_TRANSACTION_PASS/);
});
