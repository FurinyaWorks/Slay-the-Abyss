import test from 'node:test';
import assert from 'node:assert/strict';
import {runLua} from '../scripts/test-lua.mjs';

test('treasure hover explains related statuses and curses without claiming; hold and stale ownership stay isolated',()=>{
 const result=runLua('tests/lua/treasure_keyword_details.lua');
 assert.equal(result.status,0,result.stderr||result.stdout);
 assert.match(result.stdout,/TREASURE_KEYWORD_DETAILS_PASS/);
});
