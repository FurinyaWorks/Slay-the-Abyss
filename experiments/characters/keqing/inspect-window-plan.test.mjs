import test from'node:test';import assert from'node:assert/strict';import{runLua}from'../../../scripts/test-lua.mjs';
test('044 private bounded window preserves Lua bottom-to-top order',()=>{const r=runLua('experiments/characters/keqing/inspect-window-plan.test.lua',{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KQ044_WINDOW_PLAN_PASS/);});
