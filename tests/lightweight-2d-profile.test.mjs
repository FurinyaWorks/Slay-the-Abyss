import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {boundedAssets,lightweightInventory,writeLightweightProfile,isLightweightProfile} from '../scripts/lightweight-2d-profile.mjs';
import {writePortraitModule,portraitRuntimeInventory,portraitInventory,portraitRuntimeInputs} from '../scripts/official-portraits.mjs';
import {artFeatureReceipt,artBuildOptionsFromReceipt} from '../scripts/art-features.mjs';
import {buildNativeCandidate} from '../scripts/build-native-candidate.mjs';
const flags={cards:false,menuBackground:true,selectionAvatar:true,battlePortrait:true,monsters:false};
test('original assets bind their actual geometry identity and bound each drawable to 60',()=>{
 const assets=boundedAssets();
 for(const a of Object.values(assets)){
  assert.equal(a.count,a.rows.length);assert.ok(a.count<=60);
  assert.equal(a.sourceSha256,a.artworkSha256);assert.equal(a.jsonSha256,a.artworkSha256);
  for(const row of a.rows){assert.ok(row.every(Number.isFinite));assert.ok(row[3]>0&&row[4]>0);}
 }
 assert.equal(lightweightInventory().peakDynamicControls,264);
 assert.equal(portraitInventory(flags).peakDynamicControls,8011,'normal candidate keeps its approved default inventory');
});
test('bounded portrait binding cannot be confused with frozen portrait bytes or a stale marker',()=>{
 const dir=mkdtempSync(join(tmpdir(),'abyss-bounded-'));
 try{
  writeLightweightProfile(dir);
  const source=writePortraitModule(dir,{...flags,imageTemplateIndex:41,containerTemplateIndex:73});
  assert.match(source,/bounded-2d-v1/);assert.match(source,/imagePrefabId.*41/);
  assert.deepEqual(portraitRuntimeInventory(dir),lightweightInventory());
  assert.throws(()=>writePortraitModule(dir,{...flags,cards:true}),/fixed experiment/);
  const marker=JSON.parse(readFileSync(join(dir,'lightweight-2d.json'),'utf8'));marker.peakDynamicControls=1;
  writeFileSync(join(dir,'lightweight-2d.json'),JSON.stringify(marker));
  assert.throws(()=>isLightweightProfile(dir),/identity differs/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('lightweight profile refuses release mode, custom preparation and mismatched artwork',async()=>{
 for(const options of [{releaseCandidate:true},{prepare:()=>{}},{artFeatures:{...flags,cards:true}},{artFeatures:{...flags,selectionAvatar:false}}]){
  await assert.rejects(buildNativeCandidate({lightweight2d:true,artFeatures:flags,...options}),/fixed-flags non-release/);
 }
});
test('full experimental inventory validation is deferred only until the pinned audit source is available',()=>{
 const receipt={artFeatures:artFeatureReceipt(flags),experimentalProfile:'bounded-2d-v1',officialBackground:{},
  officialPortraits:{...lightweightInventory(),inputs:portraitRuntimeInputs(flags).map(path=>({path}))}};
 assert.equal(artBuildOptionsFromReceipt(receipt).lightweight2d,true);
 receipt.officialPortraits.assets[0].artworkSha256='a'.repeat(64);
 assert.throws(()=>artBuildOptionsFromReceipt(receipt),/differs.*assets/);
 assert.equal(artBuildOptionsFromReceipt(receipt,{deferExperimentalInventory:true}).lightweight2d,true);
 assert.throws(()=>artBuildOptionsFromReceipt({...receipt,experimentalProfile:'unrecognized'},{deferExperimentalInventory:true}),/Invalid experimental/);
});
