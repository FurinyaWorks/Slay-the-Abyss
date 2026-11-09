import {preFlowLiveReaderSource} from './flow-live-reader-source-inverse.mjs';
import {preWindows18ShapeSource} from './windows18-shape-source-inverse.mjs';
import {preWatcherFlowPreparationCiSource} from './watcher-flow-preparation-ci-source-inverse.mjs';
import {preEncounterFormationCiSource} from './encounter-formation-ci-source-inverse.mjs';
import {prePosix15ShapeSource} from './posix15-shape-source-inverse.mjs';
import {preDefectFinalCiSource} from './defect-final-ci-source-inverse.mjs';
import {preSilentFinalCiSource} from './silent-final-ci-source-inverse.mjs';
import {preRelicEquipCiSource} from './relic-equip-ci-source-inverse.mjs';
import {preDefectIntegrationPlanningSource} from './defect-integration-planning-source-inverse.mjs';
import {preDefectUtilityPlanningSource} from './defect-utility-planning-source-inverse.mjs';
import {preEnemyIntegrationPlanningSource} from './enemy-integration-planning-source-inverse.mjs';
import {preEnemyAiPlanningSource} from './enemy-ai-planning-source-inverse.mjs';
import {preWatcherPlanningSource} from './watcher-planning-source-inverse.mjs';
import {preClassPotionPlanningSource} from './class-potion-planning-source-inverse.mjs';
// Exact test-only outer epoch. No live reads, production fallback or cache.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {deepFreezeSourceProof} from './pure-source-projection-cache.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('../fixtures/ci-complete-calibration.json.gz',import.meta.url));
assert.equal(hash(bytes),'c0b66bf5ffd13baaea0f9a035dd43636f7419a0b607cc4eab3f0c1f73155d5ab','complete approved TASK-75.6 source proof');
export const ciCompleteCalibrationProof=deepFreezeSourceProof(JSON.parse(gunzipSync(bytes)));
assert.deepEqual(Object.keys(ciCompleteCalibrationProof.files),['scripts/ci-test-timings.json','scripts/ci-quality-shape.mjs']);
for(const binding of Object.values(ciCompleteCalibrationProof.files)){
 assert.equal(hash(binding.beforeSource),binding.beforeSha256);assert.equal(hash(binding.afterSource),binding.afterSha256);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.beforeSource)}\0`).update(binding.beforeSource).digest('hex'),binding.beforeGitBlob);
}
const currentPlacementSha256=Object.freeze({
 'scripts/ci-test-timings.json':Object.freeze(["119d296f254629aa5316ff9a9fef5b51ff5f5bb3d25c7d5a912df9066b4ebde3", "1832a5f395318af201322666f31f601ffb183c0870fcc6fa62a5d8e48af0922d", "39ad201a4b9bf0486820a23a95937a879a47092e2e07cf7ee848acd4a8f0ff14", "5d942af0c708da1d260c69cac85c753a7a163f17920c850739810c97e4b6bc74", "69b5e0640831032a24a27309b0349c623417890b58700aec56188203e70bb147", "a5841ddaa53d8bc810f9c16ae342ed2de8cb5479bbcb073562d2c6c921ed1b24", "b734512fdfbcd3d7362e7b2f0bbb232eba3b58563799d240e04972967778a219", "ff45c2819a7000cea148d421305ab1afac780d0b71de1196b2dc68c69fb8fd66"]),
 'scripts/ci-quality-shape.mjs':Object.freeze(['0d6c82c2a7e7db82e276eb563978d5253d9a225039329e171ed3f907f98609d1']),
});
// Exact complete source epoch for the additional POSIX shard. Historical
// receipts and the former 17/13 identity remain intact and independently usable.
const posix13Source=ciCompleteCalibrationProof.files['scripts/ci-quality-shape.mjs'].afterSource
 .replace('length:16','length:17').replace('length:12','length:13');
assert.equal(hash(posix13Source),currentPlacementSha256['scripts/ci-quality-shape.mjs'][0]);
const posix14Source=posix13Source.replace('length:13','length:14');
export function prePosix14ShapeSource(path,source){
 const outer=preWindows18ShapeSource(path,source);
 if(outer!==source)source=prePosix15ShapeSource(path,outer);
 if(path!=='scripts/ci-quality-shape.mjs'||typeof source!=='string')return source;
 return source.replaceAll('\r\n','\n')===posix14Source?posix13Source:source;
}
// This placement-only bridge returns the existing complete approved source.
// It adds no live owner, fixture dependency or permission-bearing cache.
export function preCurrentCiPlacementSource(path,source){
 source=prePosix15ShapeSource(path,preWindows18ShapeSource(path,source));
 source=originalPlanningSource(path,source);
 source=preDefectUtilityPlanningSource(path,preDefectIntegrationPlanningSource(path,source));
 source=preEnemyAiPlanningSource(path,prePosix14ShapeSource(path,preClassPotionPlanningSource(path,preWatcherPlanningSource(path,preEnemyIntegrationPlanningSource(path,source)))));
 if(!Object.hasOwn(currentPlacementSha256,path)||typeof source!=='string'||!currentPlacementSha256[path].includes(hash(source.replaceAll('\r\n','\n'))))return source;
 return ciCompleteCalibrationProof.files[path].afterSource;
}
export function preCiCompleteCalibrationSource(path,source){
 source=preCurrentCiPlacementSource(path,source);
 const binding=ciCompleteCalibrationProof.files[path];
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}

// Only the complete merged source may enter either immutable original epoch.
// Removing extra floors is never a generic drift-masking fallback.
export function originalPlanningSource(path,source,epoch='develop'){
 source=preCombinedPlanningSource(path,source);
 source=preWatcherFlowPlanningSource(path,preSilentTacticsPlanningSource(path,preEffectsTargetGroupPlanningSource(path,source)));
 source=preGameUiLocalPlanningSource(path,prePartialCasePlanningSource(path,source));
 if(path!=='scripts/ci-test-timings.json'||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!=='aca81cae4ade8e6ddb1590bc6afae965f0a55dd0ff3052aec2d3a555e5c8f7a8')return source;
 const value=JSON.parse(source);
 const remove=epoch==='seven'?["tests/actor-presence.test.mjs", "tests/end-turn-responsibilities.test.mjs", "tests/potion-callback.test.mjs", "tests/power-shop-boundaries.test.mjs", "tests/reward-query-boundary.test.mjs", "tests/run-catalog-responsibilities.test.mjs"]:["tests/class-potion-orb-boundary.test.mjs", "tests/defect-utility-planning.test.mjs", "tests/enemy-ai-lifecycle.test.mjs", "tests/watcher-actor-boundary.test.mjs"];
 for(const key of remove)delete value.jsPlanning.localLowerBounds[key];
 const original=JSON.stringify(value,null,2)+'\n';
 assert.equal(hash(original),epoch==='seven'?'fdbe17987d4a07a9de1ee3c4ce3ed9c4d9b4a6bb667e06def5ffc4e0002ebde5':'119d296f254629aa5316ff9a9fef5b51ff5f5bb3d25c7d5a912df9066b4ebde3');
 return original;
}


export const gameUiLocalPlanningKey='tests/game-ui-extraction-source-inverse.test.mjs';
export const gameUiLocalPlanningFloor=Object.freeze({"durationMs":77215,"environment":"cloud Linux local","coverage":"13/13 complete file passed; 0 skipped; single-file Node execution.","kind":"Local complete-run planning floor only; not a hosted measurement, execution permission or timeout change.","nodeReportedDurationMs":77214.241194,"sourceLog":"docs/evidence/seven-current-integration-20261108/game-ui-extraction-local.log","sourceLogSha256":"1779bc98d11ed261d6b2e96256a6030df337c978d95356b18ce8cf1041c2f326","sourceReceipt":"docs/evidence/seven-current-integration-20261108/game-ui-extraction-planning.json","sourceReceiptSha256":"0a7cb353d3a795706a33a3049e65d730be31861083eba807fd5019684c6feb30"});
export function preGameUiLocalPlanningSource(path,source){
 if(path!=='scripts/ci-test-timings.json'||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!=='b12d89163c76dabdf09e7af728fab0aceada1b0409e8b15898baad59749d61e1')return source;
 const value=JSON.parse(source);
 assert.deepEqual(value.jsPlanning.localLowerBounds[gameUiLocalPlanningKey],gameUiLocalPlanningFloor);
 delete value.jsPlanning.localLowerBounds[gameUiLocalPlanningKey];
 const prior=JSON.stringify(value,null,2)+'\n';
 assert.equal(hash(prior),'aca81cae4ade8e6ddb1590bc6afae965f0a55dd0ff3052aec2d3a555e5c8f7a8','all nineteen prior floors, measured maps and safety values remain byte-identical');
 return prior;
}


export const partialCasePlanningFloors=Object.freeze({"tests/combat-reactions-architecture-inverse.test.mjs":Object.freeze({"durationMs":80063,"environment":"cloud Linux local","coverage":"One successful named case in a 79-test batch (76 passed, 3 failed); not a full-file duration or completion claim.","kind":"Partial-case local planning lower bound; not hosted measurement, execution permission or timeout change.","sourceCase":"reaction architecture inverse restores complete prior bytes through LF, CRLF and layout variants","caseDurationMs":80062.022369,"sourceLog":"docs/evidence/seven-current-integration-20261108/source-inverse-partial-cases.log","sourceLogSha256":"2c6376cb852312812e6813dc88e02c196955da52282624036cdc61780dbeaed6","sourceReceipt":"docs/evidence/seven-current-integration-20261108/source-inverse-partial-planning.json","sourceReceiptSha256":"99438fc4e37b780eaacab1f6f0a5ee6d7d48b35b3156d46de6e17ca8bf56ab58"}),"tests/compendium-source-inverse.test.mjs":Object.freeze({"durationMs":42675,"environment":"cloud Linux local","coverage":"One successful named case in a 79-test batch (76 passed, 3 failed); not a full-file duration or completion claim.","kind":"Partial-case local planning lower bound; not hosted measurement, execution permission or timeout change.","sourceCase":"Runtime host projection recognizes complete before/after bytes but rejects partial, duplicate and foreign edits","caseDurationMs":42674.303005,"sourceLog":"docs/evidence/seven-current-integration-20261108/source-inverse-partial-cases.log","sourceLogSha256":"2c6376cb852312812e6813dc88e02c196955da52282624036cdc61780dbeaed6","sourceReceipt":"docs/evidence/seven-current-integration-20261108/source-inverse-partial-planning.json","sourceReceiptSha256":"99438fc4e37b780eaacab1f6f0a5ee6d7d48b35b3156d46de6e17ca8bf56ab58"})});
export function prePartialCasePlanningSource(path,source){
 if(path!=='scripts/ci-test-timings.json'||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!=='54d5380ac20148b37866cb5a01e16bee76f6d9df5b013af9a29459d841969f56')return source;
 const value=JSON.parse(source);
 for(const [key,floor]of Object.entries(partialCasePlanningFloors)){
  assert.deepEqual(value.jsPlanning.localLowerBounds[key],floor);
  delete value.jsPlanning.localLowerBounds[key];
 }
 const prior=JSON.stringify(value,null,2)+'\n';
 assert.equal(hash(prior),'b12d89163c76dabdf09e7af728fab0aceada1b0409e8b15898baad59749d61e1','all twenty prior floors and every observation remain byte-identical');
 return prior;
}

// Exact outer planning epoch; all previous sources and observations remain frozen.
export const watcherFlowPlanningKey="tests/watcher-flow-planning.test.mjs";
export const savedWatcherFlowPlanningFloor=Object.freeze({"durationMs":51776,"environment":"cloud Linux local","coverage":"11/11 complete file passed; 0 failed, cancelled or skipped. Saved pre-integration slice run.","kind":"Local complete-run planning floor only; not a hosted measurement, current integration pass, execution permission or timeout change.","nodeReportedDurationMs":51775.185427,"sourceLog":"docs/evidence/m7-watcher-flow-targeted-final-20261108.log.gz","sourceLogSha256":"53d4055898de21c7584806acbcf739d88decc4ee40d248f436a03b778a1125d4","sourceLogUncompressedSha256":"e17ba6aeda94b106701f3e9eb18e6a3adc15c41eb3a5949365634e38b8aba7e9","sourceReceipt":"docs/evidence/m7-watcher-flow-planning-20261108.json","sourceReceiptSha256":"e69e5441c4c90cfb03786859c9aa76a45e92f87c532745ae60397c4af2de33d9"});
export const watcherFlowPlanningFloor=Object.freeze({"durationMs":55668,"environment":"cloud Linux local","coverage":"11/11 complete file passed; 0 failed, cancelled or skipped. Current local integration run.","kind":"Local complete-run planning floor only; not a hosted measurement, current integration pass, execution permission or timeout change.","nodeReportedDurationMs":55667.073989,"sourceLog":"docs/evidence/watcher-flow-integration-behavior-20261109.log.gz","sourceLogSha256":"b50a5e0bdc257b8e00636ff64b5dda76130ef72a43b239864764a28733da8add","sourceLogUncompressedSha256":"437f163287d7db816e0ce584709eeb904122f55a92c7d8a2a6484ed067e8b941","sourceReceipt":"docs/evidence/watcher-flow-integration-behavior-20261109.json","sourceReceiptSha256":"2171cef97972a096779972244ccfbe248caba188d0ce83e208203c39ec7a7fc5"});
export function preWatcherFlowPlanningSource(path,source){
 if(path!=='scripts/ci-test-timings.json'||typeof source!=='string'||!['fa041e8a3ed7b10e0498491eb5ba1aba18af019db76ffa746fe85268ae562e34','20a43c9723de6f8b85a28ef863e0cdb977cc1432a8ceb25ac794d0bd6cff6543'].includes(hash(source.replaceAll('\r\n','\n'))))return source;
 const value=JSON.parse(source);
 assert.deepEqual(value.jsPlanning.localLowerBounds[watcherFlowPlanningKey],hash(source.replaceAll('\r\n','\n'))==='fa041e8a3ed7b10e0498491eb5ba1aba18af019db76ffa746fe85268ae562e34'?savedWatcherFlowPlanningFloor:watcherFlowPlanningFloor);
 delete value.jsPlanning.localLowerBounds[watcherFlowPlanningKey];
 const prior=JSON.stringify(value,null,2)+'\n';
 assert.equal(hash(prior),'54d5380ac20148b37866cb5a01e16bee76f6d9df5b013af9a29459d841969f56','every old floor, raw observation, worker-safety and deadline input remains byte-identical');
 return prior;
}

export const silentTacticsPlanningKey="tests/silent-tactics-planning.test.mjs";
export const silentTacticsPlanningFloor=Object.freeze({"durationMs":21636,"environment":"cloud Linux local","coverage":"12/12 complete file passed; 0 failed, cancelled or skipped. Includes independent old/new VMs and original Combat fixture.","kind":"Local complete-run planning floor only; not hosted measurement, execution permission or timeout change.","nodeReportedDurationMs":21635.944135,"sourceLog":"docs/evidence/m7-silent-tactics-20261109/behavior-final.log.gz","sourceLogSha256":"65196bba152dd0ab7c83ecc4ab69d785fe9560ac1069dc37b8ff61205b00b764","sourceLogUncompressedSha256":"71565f0ad153f1f33987f070501d9c0bfeda014515f35b59de0097bb8192ac7c","sourceReceipt":"docs/evidence/m7-silent-tactics-20261109/behavior-receipt.json","sourceReceiptSha256":"8420d4211ac076a603623b538766af49209910733de05a7f8105918e7bcf9bd9"});
export function preSilentTacticsPlanningSource(path,source){
 if(path!=='scripts/ci-test-timings.json'||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!=='9c088a8c3a6d4c553e58e85ef10f89f049e0f39dad14c494885568bd9352f310')return source;
 const value=JSON.parse(source);
 assert.deepEqual(value.jsPlanning.localLowerBounds[silentTacticsPlanningKey],silentTacticsPlanningFloor);
 delete value.jsPlanning.localLowerBounds[silentTacticsPlanningKey];
 const prior=JSON.stringify(value,null,2)+'\n';
 assert.equal(hash(prior),'54d5380ac20148b37866cb5a01e16bee76f6d9df5b013af9a29459d841969f56','all prior floors, observations and execution safety inputs remain byte-identical');
 return prior;
}

export const effectsTargetGroupPlanningKey="tests/effects-target-group.test.mjs";
export const effectsTargetGroupPlanningFloor=Object.freeze({"durationMs":7662,"environment":"cloud Linux local","coverage":"5/5 complete file passed; 0 failed, cancelled or skipped. Includes independent old/new complete VMs, 306 snapshots each and 11 semantic mutants.","kind":"Local complete-run planning floor only; not hosted measurement, execution permission or timeout change.","nodeReportedDurationMs":7661.276801,"sourceLog":"docs/evidence/m7-effects-target-group-20261109/behavior-final.log.gz","sourceLogSha256":"a8212eeb561ca1fb79669333c936867e43cffaa621d279b5c392302c26858fe4","sourceLogUncompressedSha256":"0b64f5530975fb458e44679d7e014f2e69b56d10fdb51363c814c5a9ca5d553f","sourceReceipt":"docs/evidence/m7-effects-target-group-20261109/behavior-receipt.json","sourceReceiptSha256":"ed8a7599f1c1dabc43e291a2a801a004c8cb07aaed60d03bbb0a1dce5a38d0ea"});
export function preEffectsTargetGroupPlanningSource(path,source){
 if(path!=='scripts/ci-test-timings.json'||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!=="aa5a35f348c759ef3aa14411aa0d52e7c7d9fd02b9086fb7a369b1aad7abd75d")return source;
 const value=JSON.parse(source);
 assert.deepEqual(value.jsPlanning.localLowerBounds[effectsTargetGroupPlanningKey],effectsTargetGroupPlanningFloor);
 delete value.jsPlanning.localLowerBounds[effectsTargetGroupPlanningKey];
 const prior=JSON.stringify(value,null,2)+'\n';
 assert.equal(hash(prior),"54d5380ac20148b37866cb5a01e16bee76f6d9df5b013af9a29459d841969f56",'every prior floor, observation and execution safety input remains byte-identical');
 return prior;
}

// Only this complete combined identity can project to frozen sibling planning epochs.
// Arbitrary source, partial floor sets and changed execution inputs pass through untouched.
export function preCombinedPlanningSource(path,source,epoch='base'){
 source=preFlowLiveReaderSource(path,source);
 if(path==='scripts/ci-test-timings.json')source=preRelicEquipCiSource(path,preSilentFinalCiSource(path,preDefectFinalCiSource(path,preEncounterFormationCiSource(path,preWatcherFlowPreparationCiSource(path,source)))));
 if(path!=='scripts/ci-test-timings.json'||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!=='db3b3dbb80f68d57c655f30efc2fb851fc83a61c5ce682b726a5369dc34ad9ba')return source;
 const targets={base:'54d5380ac20148b37866cb5a01e16bee76f6d9df5b013af9a29459d841969f56',flow:'20a43c9723de6f8b85a28ef863e0cdb977cc1432a8ceb25ac794d0bd6cff6543',silent:'9c088a8c3a6d4c553e58e85ef10f89f049e0f39dad14c494885568bd9352f310',effects:'aa5a35f348c759ef3aa14411aa0d52e7c7d9fd02b9086fb7a369b1aad7abd75d'};
 assert.ok(Object.hasOwn(targets,epoch),'known frozen sibling planning epoch');
 const value=JSON.parse(source);
 for(const [name,key,floor]of [['flow',watcherFlowPlanningKey,watcherFlowPlanningFloor],['silent',silentTacticsPlanningKey,silentTacticsPlanningFloor],['effects',effectsTargetGroupPlanningKey,effectsTargetGroupPlanningFloor]]){
  assert.deepEqual(value.jsPlanning.localLowerBounds[key],floor);
  if(name!==epoch)delete value.jsPlanning.localLowerBounds[key];
 }
 const prior=JSON.stringify(value,null,2)+'\n';
 assert.equal(hash(prior),targets[epoch],'complete original sibling planning bytes');
 return prior;
}

// Historical receipt source proof, gated by both complete merged and published identities.
export function preCombinedGateSource(path,source,epoch){
 if(path==='scripts/check-lua-static.mjs')source=preRelicEquipCiSource(path,preSilentFinalCiSource(path,preDefectFinalCiSource(path,preEncounterFormationCiSource(path,preWatcherFlowPreparationCiSource(path,source)))));
 if(path!=='scripts/check-lua-static.mjs'||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!=='8253029479f041be7ec8235fcff181f941f9e3190412c587a3b06904452903c1')return source;
 const targets={"flow": "c90c522a35efa86a444d973d6c90d0e42c7e02cc4bd1d4a49e5e94fdd331fa51", "silent": "61b3588acbea2e47e2812903acfbbe149eac1858fbb6a0ed86d38fe96074df8d", "effects": "10d11c5f5294ac48929d9d4946cb7b92d18881507c09b5825e1dd2b8a813715c"},edits={"flow": [["  'src/lua/abyss_silent_tactics_cards.lua': [],\n", ""], ["    ...['visitTargetGroup','discoverTargetGroup','targetGroupCount','validTargetGroupMember',\n      'targetGroupMembers','validTargetGroupPair','targetGroup','denseEffectCount','scrySequenceSupported','supportedEffectOp','conditionalAllowed',\n", "    ...['denseEffectCount','scrySequenceSupported','supportedEffectOp','conditionalAllowed',\n"], ["  || file==='src/lua/abyss_silent_tactics_cards.lua'\n", ""]], "silent": [["  'src/lua/abyss_watcher_flow_cards.lua': ['M.planEffect','planDamage','planStance','planCollect','planPower','planRecall']\n    .map(name=>`function '${name}'`),\n", ""], ["    ...['visitTargetGroup','discoverTargetGroup','targetGroupCount','validTargetGroupMember',\n      'targetGroupMembers','validTargetGroupPair','targetGroup','denseEffectCount','scrySequenceSupported','supportedEffectOp','conditionalAllowed',\n", "    ...['denseEffectCount','scrySequenceSupported','supportedEffectOp','conditionalAllowed',\n"]], "effects": [["  'src/lua/abyss_silent_tactics_cards.lua': [],\n  'src/lua/abyss_watcher_flow_cards.lua': ['M.planEffect','planDamage','planStance','planCollect','planPower','planRecall']\n    .map(name=>`function '${name}'`),\n", ""], ["  || file==='src/lua/abyss_silent_tactics_cards.lua'\n", ""]]};
 assert.ok(Object.hasOwn(targets,epoch),'known frozen sibling gate epoch');
 let prior=source.replaceAll('\r\n','\n');
 for(const [from,to]of edits[epoch]){
  assert.equal(prior.split(from).length,2,'one exact gate slice');
  prior=prior.replace(from,to);
 }
 assert.equal(hash(prior),targets[epoch],'complete published sibling gate bytes');
 return prior;
}
