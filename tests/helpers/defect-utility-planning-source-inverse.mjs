// Exact planning-only outer epoch. No live reads, fallback or authorization cache.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const normalize=s=>s.replaceAll('\r\n','\n');
const hash=s=>createHash('sha256').update(s).digest('hex');
export const defectUtilityPlanningKey='tests/defect-utility-planning.test.mjs';
export const defectUtilityPlanningFloor=Object.freeze({
  "durationMs": 20000,
  "environment": "cloud Linux local",
  "coverage": "11/11 complete file passed; no selected or skipped groups",
  "kind": "Conservative local complete-run planning estimate; not hosted or Windows measurement, execution permission or timeout change.",
  "sourceLog": "docs/evidence/defect-utility-planning-local-20261108.log",
  "sourceLogSha256": "9ce747d58fc9ded4d1ebecdeaea7579d2ca169630eee36499033643ed30cfe0f",
  "baseHead": "d8a57cae2a867200ca8e588abc0d368e6cdb3799",
  "sourceRevision": "Defect utility responsibility slice over base head; uncommitted at capture",
  "nodeReportedDurationMs": 15812.642915
});
export const defectUtilityPlanningProof=Object.freeze({
 path:'scripts/ci-test-timings.json',
 beforeSha256:'a5841ddaa53d8bc810f9c16ae342ed2de8cb5479bbcb073562d2c6c921ed1b24',
 beforeGitBlob:'00c4c883615de2df657b350a1aba526269bede0d',
 afterSha256:'28a6d1317385181b00c89b11efea2598c3a06ce72cde7b5b61562c139910254c',
});
const insertion=',\n      '+JSON.stringify(defectUtilityPlanningKey)+': '+JSON.stringify(defectUtilityPlanningFloor,null,2).replaceAll('\n','\n      ');
export function preDefectUtilityPlanningSource(path,source){
 const proof=defectUtilityPlanningProof;
 if(path!==proof.path||typeof source!=='string'||hash(normalize(source))!==proof.afterSha256)return source;
 const current=normalize(source);
 assert.equal(current.split(insertion).length,2,'one exact Defect utility local planning floor');
 const previous=current.replace(insertion,'');
 assert.equal(hash(previous),proof.beforeSha256,'complete pre-Defect-utility timing source');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(previous)}\0`).update(previous).digest('hex'),proof.beforeGitBlob,'independent pre-Defect-utility timing Git blob');
 return previous;
}
