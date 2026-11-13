import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('KQ043 actual paid draw discard block continuation',()=>{
 buildLuaData();const r=runLua('experiments/characters/lifecycle/keqing-discard-usecard.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KQ043_PUBLIC_DISCARD_PASS/);assert.match(r.stdout,/KQ043_TRANSACTION_AND_TRIGGER_PASS/);assert.match(r.stdout,/KQ043_ADMISSION_PASS/);
});
