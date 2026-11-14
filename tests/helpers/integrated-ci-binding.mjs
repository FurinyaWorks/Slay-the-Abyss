// Fixed trust leaf; excluded from its own archive.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const integratedCiBytes=readFileSync(new URL('./integrated-ci-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(integratedCiBytes).digest('hex'),"7e2f6f1d6af75ecf9906df5a5686cd5c82ec0dfbf7f13e00f2aad33ced11b90f",'complete reviewed integration CI sources');
