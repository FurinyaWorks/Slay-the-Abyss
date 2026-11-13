import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Ganyu explicit Run candidate preserves acquired UID across real battles',()=>{buildLuaData();const r=runLua('experiments/characters/lifecycle/ganyu-run-candidate.test.lua',{timeout:60000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/GANYU_RUN_CANDIDATE_PASS/);});
