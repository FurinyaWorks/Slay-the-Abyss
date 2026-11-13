import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Zhongli actual owner-end resolves pillar before repair',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/zhongli-public-end-turn.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/AUTHOR_PUBLIC_ZL_OWNER_END_PASS 24/);assert.match(r.stdout,/ZHONGLI_PUBLIC_END_TURN_TRANSACTION_PASS/);assert.match(r.stdout,/ZHONGLI_REMOVE_REBUILD_PASS/);
});
