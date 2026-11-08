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
 if(path!=='scripts/ci-quality-shape.mjs'||typeof source!=='string')return source;
 return source.replaceAll('\r\n','\n')===posix14Source?posix13Source:source;
}
// This placement-only bridge returns the existing complete approved source.
// It adds no live owner, fixture dependency or permission-bearing cache.
export function preCurrentCiPlacementSource(path,source){
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
 source=preWatcherFlowPlanningSource(path,source);
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
