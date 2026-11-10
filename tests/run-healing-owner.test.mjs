import test from 'node:test';
import assert from 'node:assert/strict';
import {runLua} from '../scripts/test-lua.mjs';
test('permanent healing preserves raw public method replacement and partial mutation order',()=>{
 const result=runLua('tests/lua/run_healing_owner.lua');assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/RUN_HEAL_CONTRACT 12/);
});
test('cold Meat on the Bone healing does not initialize Run gameplay orchestration',()=>{
 const result=runLua('tests/lua/run_healing_owner_cold.lua');assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/COLD_PERMANENT_HEAL_INDEPENDENT/);
});
