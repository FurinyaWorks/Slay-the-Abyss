import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';
import {runLua} from '../../../scripts/test-lua.mjs';
test('frozen reducer identity and real owner-end queue/snapshot seam',()=>{
 const fixture='experiments/characters/lifecycle/fixtures/keqing-resource.lua';
 assert.equal(createHash('sha256').update(readFileSync(fixture)).digest('hex'),'bfe8e578a88f75b15211716bfa0555296cb7166f7678b8524c87a2dac8f80632');
 buildLuaData();
 const r=runLua('experiments/characters/lifecycle/keqing-owner-end.test.lua',{timeout:30000});
 assert.equal(r.status,0,r.stdout+r.stderr);
 assert.match(r.stdout,/KEQING_OWNER_END_SEAM_PASS/);
});
