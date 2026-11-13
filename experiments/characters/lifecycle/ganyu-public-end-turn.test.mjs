import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Ganyu actual owner-end separates bank and storm phases',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/ganyu-public-end-turn.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/GANYU_PUBLIC_END_TURN_TRANSACTION_PASS/);assert.match(r.stdout,/GANYU_ICE_CREAM_COMPATIBILITY_PASS/);
});
