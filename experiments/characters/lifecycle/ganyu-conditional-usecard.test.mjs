import test from 'node:test';import assert from 'node:assert/strict';
import{buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('Ganyu seven conditional actual paid/Run and continuation',()=>{
 buildLuaData();for(const [file,mark]of [['ganyu-public-conditional.test.lua','PUBLIC_CONDITIONAL_PASS 84'],['ganyu-public-conditional-run.test.lua','PASS 14'],['ganyu-conditional-transaction.test.lua','GANYU_CONDITIONAL_TRANSACTION_PASS']]){const r=runLua('experiments/characters/lifecycle/'+file,{timeout:60000});assert.equal(r.status,0,r.stdout+r.stderr);assert.ok(r.stdout.includes(mark),r.stdout+r.stderr)}
});
