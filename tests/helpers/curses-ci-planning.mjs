// Exact outer CI compatibility and complete local planning floors for Curses.
// Current production gates/scheduling still execute raw sources, never this view.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){for(const value of Object.values(x))freeze(value);Object.freeze(x);}return x;};
export const cursesPlanningFloors=freeze({
  "tests/curses-shape-responsibilities.test.mjs": {
    "durationMs": 47752,
    "environment": "cloud Linux local",
    "tests": 3,
    "coverage": "3/3 complete file; zero failed, cancelled, skipped or todo. Fresh serial run with unchanged before/after input hashes.",
    "kind": "Local complete-run planning floor only; not a hosted measurement, execution permission or timeout change.",
    "nodeReportedDurationMs": 47623.685248,
    "wallDurationMs": 47751.606226,
    "testSha256": "e482abadfebed52eb217774773ee5d966abc43b95b6defe0390ad49002d2c9dd",
    "sourceReceipt": "docs/evidence/replay-curses-ci-20261111/planning/curses-shape-responsibilities/measurement.json",
    "sourceReceiptSha256": "4a576a0afb1f6c46c4f53e74352875fffec49d15d959ae445412c4c038399f66",
    "sourceLog": "docs/evidence/replay-curses-ci-20261111/planning/curses-shape-responsibilities/stdout.log",
    "sourceLogSha256": "c6cd89a898e2a6259579c8dfd8da370006a2fe603f778735877bd30f82c5835f"
  },
  "tests/curses-source-epoch.test.mjs": {
    "durationMs": 13670,
    "environment": "cloud Linux local",
    "tests": 5,
    "coverage": "5/5 complete file; zero failed, cancelled, skipped or todo. Fresh serial run with unchanged before/after input hashes.",
    "kind": "Local complete-run planning floor only; not a hosted measurement, execution permission or timeout change.",
    "nodeReportedDurationMs": 13566.234271,
    "wallDurationMs": 13669.293745,
    "testSha256": "39d2e2d9e6af99a37c7d43ff20d767b708c8fc4407b3f1f7efc6143d9d6f502a",
    "sourceReceipt": "docs/evidence/replay-curses-ci-20261111/planning/curses-source-epoch/measurement.json",
    "sourceReceiptSha256": "5f7d23a231971d897bc7b80c006cccc690b43514a744faa35e61ef4d8eb308cb",
    "sourceLog": "docs/evidence/replay-curses-ci-20261111/planning/curses-source-epoch/stdout.log",
    "sourceLogSha256": "7700c937e0b23590996413973350b7304d4b97a82ae990736efb7a6c3e52ff53"
  }
});
export const cursesGateProof=Object.freeze({path:'scripts/check-lua-static.mjs',beforeSha256:'b0beb25d11044e525285d778d60c82a552c31d518228a04f4c3967fe25936066',afterSha256:'0daa4d3a640364612e9f6508e604fb8f6c0a8a1da4c56a9bfa8732153abd4c07'});
export function cursesGateMatches(path,source){return path===cursesGateProof.path&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===cursesGateProof.afterSha256;}
export function preCursesGateSource(path,source){
 if(!cursesGateMatches(path,source))return source;
 let prior=source.replaceAll('\r\n','\n');
 for(const edit of ["  'src/lua/abyss_curses.lua': [\"function 'M.isImplemented'\"],\n", "  || file==='src/lua/abyss_curses.lua'\n"]){assert.equal(prior.split(edit).length,2,'one exact Curses gate addition');prior=prior.replace(edit,'');}
 assert.equal(hash(prior),cursesGateProof.beforeSha256,'complete unchanged predecessor gate');return prior;
}

// Old CI cost receipts measured the original Curses bytes. This pure historical
// source view does not authorize a live production-owner projection.
const cursesBefore=readFileSync(new URL('../fixtures/curses-shape-before.lua',import.meta.url),'utf8').replaceAll('\r\n','\n');
assert.equal(hash(cursesBefore),'942e7c65da29875fefbff132182ce7a7aab16afb4405e28d2a71e31d589a44b7','original Curses receipt source');
export function cursesReceiptMatches(path,source){
 return cursesGateMatches(path,source)||(path==='src/lua/abyss_curses.lua'&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))==='65d912f1d2dbd5245bb4734103c762eb9667c5161c33e4c850062e35572c3642');
}
export function preCursesReceiptSource(path,source){
 if(cursesGateMatches(path,source))return preCursesGateSource(path,source);
 return cursesReceiptMatches(path,source)?cursesBefore:source;
}
