import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Xiao actual public mask owner-end and reserved energy start',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/xiao-public-end-turn.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/PASS PUBLIC base expires/);assert.match(r.stdout,/PASS PUBLIC endTurn failure/);assert.match(r.stdout,/XIAO_PUBLIC_LIFECYCLE_TRANSACTION_PASS/);
});
