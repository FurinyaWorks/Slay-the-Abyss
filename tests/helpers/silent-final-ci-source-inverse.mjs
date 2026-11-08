// Exact outer CI source epoch. Original observed costs and historical gate proofs stay immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./silent-final-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),"061f63eb40dd03dfecb8bdaf60ecc722f49da40ed75645568666fa29bddf8c2e");
const bytes=gunzipSync(archive);assert.equal(hash(bytes),"2c2b5c88e1fbe7380886c2e9413767c9b2d06a626bc6064f0c26568028612b11");
const proof=JSON.parse(bytes);
for(const binding of Object.values(proof.files))assert.equal(hash(binding.beforeSource),binding.beforeSha256);
export const silentFinalPlanningKey="tests/silent-final-apply.test.mjs";
export const silentFinalPlanningFloor=Object.freeze({"durationMs":46617,"environment":"cloud Linux local","coverage":"16/16 complete file passed; 0 failed, cancelled or skipped. Full behavior graph and semantic mutant coverage.","kind":"Local complete-run planning floor only; not a hosted measurement, execution permission or timeout change.","nodeReportedDurationMs":46301.022236,"sourceLog":"docs/evidence/m7-silent-final-20261109/behavior.log.gz","sourceLogSha256":"6924bb4a3b7d1713a97de64dc8bf7eabbf12484392ef900edcb1321da2693ce5","sourceLogUncompressedSha256":"4f85b9d113ece391aa15a76995fd74300235ef261d507af772869a1c47da2d10","sourceReceipt":"docs/evidence/m7-silent-final-20261109/behavior-receipt.json","sourceReceiptSha256":"eeeac5c795e5f54bc96b4922375fca1fc23c5b9c70dd4759f02b26c47d4c781d","priorCompleteRun":{"nodeReportedDurationMs":46616.416469,"sourceLog":"docs/evidence/m7-silent-final-20261109/behavior-intermediate.log.gz","sourceLogSha256":"86c598b69cd6a3fbdac635321791dfc85ac3e9f4f144b03586595b4af42f8a69","scope":"Earlier complete successful test version, before deep-proxy and malformed-error probes. No test-source hash was captured for that run; retained only as a conservative cost lower bound. Final-version identity is bound separately by sourceReceipt."}});
export function preSilentFinalCiSource(path,source){
 const binding=proof.files[path];
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}

export const silentFinalSourcePlanningKey="tests/silent-final-source-epoch.test.mjs";
export const silentFinalSourcePlanningFloor=Object.freeze({"durationMs":10937,"environment":"cloud Linux local","coverage":"9/9 complete file passed; 0 failed, cancelled or skipped. Includes live LF/CRLF reads and warm-owner drift for all 49 owners.","kind":"Local complete-run planning floor only; not a hosted measurement, execution permission or timeout change.","nodeReportedDurationMs":10936.736773,"sourceLog":"docs/evidence/m7-silent-final-20261109/source-standalone.log.gz","sourceLogSha256":"e7bd39f5e66f924f7cbf64c291fc58ea4fea0e23944c58398c033630224592ba","sourceLogUncompressedSha256":"1acfc2fcab2179cdfc66d8cfa75344ec42bc2204ebc7fc5b14d39a2f7b768b00","testSha256":"cafb4492b21ec529c905cea3d80b366b2eb02c096d22c4278fcbb2f930edb9e6","measurementScope":"Complete local run; other independent validation may have been active. Conservative planning cost, not an isolated or hosted benchmark.","inputSha256":{"src/lua/abyss_silent_final_cards.lua":"21766502d620d7fb9885cc3884d79c557739bac3bf750b5105fe34aa18bf8fdb","tests/helpers/silent-final-source-epoch.mjs":"62621989d65db4db12a6b7251fc8216bbd5851b196c87d28f0cffd222d8a28b4","tests/helpers/silent-final-source-epoch.json.gz":"8d70652c025b8075e2a03936f12c2509dbca427abd555e472f197b1ac4850b49","tests/helpers/combined-epoch/source-epoch.mjs":"ee1631bc3e9e29ac7ef4f96b9c42769d75cb3bfe11881b2e07b868344c3e51fa","tests/helpers/combined-epoch/source-epoch-runtime.mjs":"911ada4af92457deed01e7b2132ce227d27f4ea87956516630178d364bcccbeb","tests/helpers/copy-integration-source-closure.mjs":"98030ef27b74af88a111fea3d3560a85d2e01ec146fbd69eb1e2f0a4f1bcd1b4"}});
