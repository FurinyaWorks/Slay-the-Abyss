import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Zhongli 16 and 57 paid resource defense with native block and Weak',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/zhongli-defense-usecard.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/AUTHOR_PUBLIC_ZL_DEFENSE_PAID_PASS/);assert.match(r.stdout,/ZHONGLI_DEFENSE_TRANSACTION_PASS/);
});
