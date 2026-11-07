import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import luaparse from 'luaparse';
import {instrumentNativeEntry} from '../scripts/build-native-3d.mjs';
test('3D candidate retains the production entry and campaign; bridges updates and teardown',()=>{
 const original=readFileSync('src/lua/abyss_ui.lua','utf8');
 const source=instrumentNativeEntry(original,'12345678-1234-1234-1234-123456789abc');
 assert.doesNotThrow(()=>luaparse.parse(source,{luaVersion:'5.3'}));
 assert.match(source,/competition-two-act/);
 assert.match(source,/nativeBattle:update\(dt\)/);
 assert.match(source,/nativeBattle:destroy\(\)/);
 assert.match(source,/ABYSS_WIN/);
 assert.doesNotMatch(source,/labPanel|seed=42|startBattle/);
 assert.throws(()=>instrumentNativeEntry(source,'12345678-1234-1234-1234-123456789abc'),/anchor changed/);
});
