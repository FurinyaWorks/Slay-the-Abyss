import test from 'node:test';import assert from 'node:assert/strict';
import {buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('Zhongli 26/38 native paid reserve, retain/exhaust and Run acquisition',()=>{
 buildLuaData();for(const [file,marker] of [['zhongli-reserve-usecard.test.lua','ZHONGLI_RESERVE_TRANSACTION_PASS'],['zhongli-reserve-run-author.test.lua','AUTHOR_ZL_RESERVE_RUN_PASS']]){
  const r=runLua(`experiments/characters/lifecycle/${file}`,{timeout:60000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,new RegExp(marker));assert.doesNotMatch(r.stdout+r.stderr,/stack traceback/);
 }
});
