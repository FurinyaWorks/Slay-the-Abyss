import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Xiao explicit Run preserves acquired UID and resets mask resources',()=>{buildLuaData();const r=runLua('experiments/characters/lifecycle/xiao-run-candidate.test.lua',{timeout:60000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/XIAO_RUN_CANDIDATE_PASS/);assert.match(r.stdout,/XIAO_RUN_PAID_MASK_PASS/);});
