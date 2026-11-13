import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Zhongli explicit single-enemy Run preserves paid resources and acquired UID',()=>{buildLuaData();const r=runLua('experiments/characters/lifecycle/zhongli-run-candidate.test.lua',{timeout:60000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/AUTHOR_ZL_RUN_PUBLIC_PASS/);assert.match(r.stdout,/ZHONGLI_RUN_CONTEXT_GATES_PASS/);});
