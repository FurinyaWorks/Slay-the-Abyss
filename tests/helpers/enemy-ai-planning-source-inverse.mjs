// Exact planning-only outer epoch. No live reads, fallback or authorization cache.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const normalize=s=>s.replaceAll('\r\n','\n');
const hash=s=>createHash('sha256').update(s).digest('hex');
export const enemyAiPlanningKey='tests/enemy-ai-lifecycle.test.mjs';
export const enemyAiPlanningFloor=Object.freeze({
  "durationMs": 30000,
  "environment": "cloud Linux local",
  "coverage": "11/11 complete file passed; no selected or skipped groups",
  "kind": "Conservative local complete-run planning estimate; not hosted or Windows measurement, execution permission or timeout change.",
  "sourceLog": "build/enemy-ai-evidence/targeted-final-local-keys.log",
  "sourceLogSha256": "64d2062d9dad8b5443bddeab4165c2a74e58a08196c7bfb2fb6ccc4c0cd9bf0e",
  "baseHead": "d8a57cae2a867200ca8e588abc0d368e6cdb3799",
  "sourceRevision": "Enemy AI responsibility slice over base head; uncommitted at capture",
  "nodeReportedDurationMs": 27916.657737
});
export const enemyAiPlanningProof=Object.freeze({
 path:'scripts/ci-test-timings.json',
 beforeSha256:'a5841ddaa53d8bc810f9c16ae342ed2de8cb5479bbcb073562d2c6c921ed1b24',
 beforeGitBlob:'00c4c883615de2df657b350a1aba526269bede0d',
 afterSha256:'2030a7b180492df2710854a5b050f7b4f9f4b808ba2b3672cffc30b36a6db2cb',
});
const insertion=',\n      '+JSON.stringify(enemyAiPlanningKey)+': '+JSON.stringify(enemyAiPlanningFloor,null,2).replaceAll('\n','\n      ');
export function preEnemyAiPlanningSource(path,source){
 const proof=enemyAiPlanningProof;
 if(path!==proof.path||typeof source!=='string'||hash(normalize(source))!==proof.afterSha256)return source;
 const current=normalize(source);
 assert.equal(current.split(insertion).length,2,'one exact Enemy AI local planning floor');
 const previous=current.replace(insertion,'');
 assert.equal(hash(previous),proof.beforeSha256,'complete pre-Enemy-AI timing source');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(previous)}\0`).update(previous).digest('hex'),proof.beforeGitBlob,'independent pre-Enemy-AI timing Git blob');
 return previous;
}
