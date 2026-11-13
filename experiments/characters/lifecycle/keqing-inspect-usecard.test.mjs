import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Keqing044 paid bounded top window with native pile continuation',()=>{buildLuaData();const r=runLua('experiments/characters/lifecycle/keqing-inspect-usecard.test.lua',{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KQ044_PUBLIC_INSPECT_PASS/);assert.match(r.stdout,/KQ044_AUTOMATIC_GATE_PASS/);});
