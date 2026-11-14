import test from 'node:test';
import assert from 'node:assert/strict';
import {runLua} from '../scripts/test-lua.mjs';
test('merchant pages preserve sentences and original copy within existing budgets',()=>{
 const r=runLua('tests/lua/merchant_pages.lua');
 assert.equal(r.status,0,r.stdout+r.stderr);
});
