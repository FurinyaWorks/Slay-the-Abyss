import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import luaparse from 'luaparse';
import {instrumentNativeEntry,buildNative3d,assertBaseSnapshot} from '../scripts/build-native-3d.mjs';
import {payloadDigest} from '../scripts/build-native-candidate.mjs';
import {artFeatureReceipt} from '../scripts/art-features.mjs';
import {fileRecord} from '../scripts/evidence-files.mjs';
test('3D candidate retains the production entry and campaign; bridges updates and teardown',()=>{
 const original=readFileSync('src/lua/abyss_ui.lua','utf8');
 const source=instrumentNativeEntry(original,'12345678-1234-1234-1234-123456789abc');
 assert.doesNotThrow(()=>luaparse.parse(source,{luaVersion:'5.3'}));
 assert.match(source,/competition-two-act/);
 assert.match(source,/nativeBattle:update\(dt\)/);
 assert.match(source,/nativeBattle:destroy\(\)/);
 assert.ok(source.indexOf("require('abyss_native_battle_geometry').configure(true)")<source.indexOf('view = GameUI.new'));
 assert.match(source,/templates, \{nativeBattle=true\}/);
 assert.match(source,/LAB3D_POSITION/);
 assert.match(source,/nativeBattle:resize\(width, height\)/);
 assert.match(source,/ABYSS_WIN/);
 assert.doesNotMatch(source,/labPanel|seed=42|startBattle/);
 assert.throws(()=>instrumentNativeEntry(source,'12345678-1234-1234-1234-123456789abc'),/anchor changed/);
});
test('stale base snapshot is refused before starting MCP or writing a candidate',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'abyss-stale-base-')),mapPath=join(directory,'base.gil'),receiptPath=join(directory,'receipt.json');
 writeFileSync(mapPath,'stale-input-guard');
 writeFileSync(receiptPath,JSON.stringify({mapPath,candidate:fileRecord(mapPath),statuses:{staticCheck:'pass'},artFeatures:artFeatureReceipt({}),payloadDigest:'stale'}));
 await assert.rejects(buildNative3d({productionReceipt:receiptPath}),/Base source snapshot is stale/);
});
test('base guard covers rules, data and UI builder while assembly files have a separate snapshot',()=>{
 const inputs=['src/lua/abyss_native_battle.lua','data/cards.json','scripts/build-ui.mjs','scripts/native-3d/camera.mjs','scripts/build-native-3d.mjs'].map(path=>({path,sha256:'before',bytes:1}));
 const receipt={inputs,payloadDigest:payloadDigest(inputs)};
 const changed=path=>inputs.map(row=>row.path===path?{...row,sha256:'after'}:row);
 for(const path of ['src/lua/abyss_native_battle.lua','data/cards.json','scripts/build-ui.mjs'])assert.throws(()=>assertBaseSnapshot(receipt,changed(path)),/stale/);
 for(const path of ['scripts/native-3d/camera.mjs','scripts/build-native-3d.mjs'])assert.doesNotThrow(()=>assertBaseSnapshot(receipt,changed(path)));
 assert.throws(()=>assertBaseSnapshot({...receipt,payloadDigest:'tampered'},inputs),/stale/);
});
