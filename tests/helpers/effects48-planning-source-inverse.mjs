// Exact test-only cost boundary; all published floor records remain immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./effects48-planning-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'fc8d583cea0a8d419e7c10122d1c4d989706191da4aab75fb800bf05b686aa91');
export const effects48PlanningProof=JSON.parse(gunzipSync(archive));
assert.equal(hash(effects48PlanningProof.beforeSource),effects48PlanningProof.beforeSha256);
export function preEffects48PlanningSource(path,source){
 const proof=effects48PlanningProof;
 if(path!==proof.path||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==proof.afterSha256)return source;
 return proof.beforeSource;
}
