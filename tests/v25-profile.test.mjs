import test from 'node:test';
import assert from 'node:assert/strict';
import {v25ChromeArgs,validateV25Chrome,v25ChromeFromReceipt} from '../scripts/v25-profile.mjs';
import {artFeatureReceipt,artBuildOptionsFromReceipt} from '../scripts/art-features.mjs';
import {auditUiBuildArgs} from '../scripts/audit-native-candidate.mjs';
import {buildNativeCandidate} from '../scripts/build-native-candidate.mjs';
import {validateUiProfileOptions,uiProfileReceipt,uiProfileFromReceipt} from '../scripts/ui-profile.mjs';

test('V25 chrome is explicit, rejects flat artwork and cannot become an RC',()=>{
  assert.equal(validateV25Chrome({}),false);
  assert.equal(validateV25Chrome({v25BattleChrome:true}),true);
  for(const options of [{v25BattleChrome:1},{v25BattleChrome:true,lightweight2d:true},{v25BattleChrome:true,releaseCandidate:true}])
    assert.throws(()=>validateV25Chrome(options));
});
test('CLI rejects duplicates and malformed chrome options',()=>{
  assert.deepEqual(v25ChromeArgs(['base.gil','--v25-battle-chrome']),{args:['base.gil'],v25BattleChrome:true});
  for(const args of [['--v25-battle-chrome=false'],['--v25-battle-chrome','--v25-battle-chrome']])assert.throws(()=>v25ChromeArgs(args));
});
test('receipt reconstruction preserves chrome and rejects unrecognized profiles',()=>{
  assert.equal(v25ChromeFromReceipt({}),false);
  assert.equal(v25ChromeFromReceipt({experimentalBattleChrome:'v25-layered-v1'}),true);
  assert.throws(()=>v25ChromeFromReceipt({experimentalBattleChrome:'v25'}));
  assert.throws(()=>v25ChromeFromReceipt({experimentalBattleChrome:'v25-layered-v1',experimentalProfile:'bounded-native-2d-v1'}));
});
test('source audit regenerates the same chrome instead of silently falling back',()=>{
  const receipt={artFeatures:artFeatureReceipt({}),experimentalBattleChrome:'v25-layered-v1'};
  assert.equal(artBuildOptionsFromReceipt(receipt).v25BattleChrome,true);
  assert.ok(auditUiBuildArgs(receipt).includes('--v25-battle-chrome'));
  assert.ok(!auditUiBuildArgs({artFeatures:artFeatureReceipt({})}).includes('--v25-battle-chrome'));
});
test('candidate rejects a fake preparation that could label old UI as V25 chrome',async()=>{
  await assert.rejects(buildNativeCandidate({v25BattleChrome:true,prepare(){}}),/actual UI builder/);
});
test('V25 can stop hidden pages without enabling flat card or low-detail art',()=>{
  assert.equal(validateUiProfileOptions({nativePageLifecycle:true,v25BattleChrome:true}),true);
  const receipt={uiProfile:uiProfileReceipt(true),experimentalBattleChrome:'v25-layered-v1',artFeatures:artFeatureReceipt({})};
  assert.equal(uiProfileFromReceipt(receipt),true);
  const args=auditUiBuildArgs(receipt);
  assert.ok(args.includes('--native-page-lifecycle'));
  assert.ok(args.includes('--v25-battle-chrome'));
  assert.ok(!args.includes('--lightweight-2d'));
  assert.throws(()=>validateUiProfileOptions({nativePageLifecycle:true}));
});
