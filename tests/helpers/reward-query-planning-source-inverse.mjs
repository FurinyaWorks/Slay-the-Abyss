// Exact outer timing epoch only. Historical projection never supplies current costs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {deepFreezeSourceProof} from './pure-source-projection-cache.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const bytes=readFileSync(new URL('../fixtures/reward-query-planning-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'88a553e0409af13bc63c29c594dd0d76fa71b4962ed195049f13e7f423183e89','complete reward-query timing source proof');
export const rewardQueryPlanningProof=deepFreezeSourceProof(JSON.parse(gunzipSync(bytes)));
const proof=rewardQueryPlanningProof;
assert.equal(proof.file,'scripts/ci-test-timings.json');
assert.equal(proof.revision,'d8a57cae2a867200ca8e588abc0d368e6cdb3799');
assert.equal(hash(proof.beforeSource),proof.beforeSha256);
assert.equal(hash(proof.afterSource),proof.afterSha256);
assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(proof.beforeSource)}\0`).update(proof.beforeSource).digest('hex'),proof.beforeGitBlob);
export function preRewardQueryPlanningSource(path,source){
 if(path!==proof.file||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==proof.afterSha256)return source;
 return proof.beforeSource;
}
