import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Ganyu 05 actual paid storm to public end-turn lifecycle',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/ganyu-storm-usecard.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/PASS2 base\/up public storm/);assert.match(r.stdout,/GANYU_STORM_TRANSACTION_PASS/);
});
